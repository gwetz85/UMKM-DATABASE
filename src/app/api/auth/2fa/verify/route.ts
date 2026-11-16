import { NextRequest, NextResponse } from 'next/server';
import { ref, get, set, update } from 'firebase/database';
import { getServerFirebase } from '@/lib/server-firebase';
import { verifyOtpCode, verifyTotpToken, OTP_MAX_ATTEMPTS } from '@/lib/two-factor';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userKey, otpCode, sessionToken, methodType } = body;

    if (!userKey || !otpCode) {
      return NextResponse.json(
        { error: 'Username dan kode verifikasi 6 angka wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanKey = String(userKey).trim();
    const cleanCode = String(otpCode).trim();

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: 'Kode verifikasi harus berupa 6 angka numerik.' },
        { status: 400 }
      );
    }

    const { database } = await getServerFirebase();

    // 1. Fetch user node
    let userSnap = await get(ref(database, `system_users/${cleanKey}`));
    let actualUserKey = cleanKey;

    if (!userSnap.exists()) {
      const normalizedKey = cleanKey.toLowerCase().replace(/\s+/g, '_');
      userSnap = await get(ref(database, `system_users/${normalizedKey}`));
      if (userSnap.exists()) {
        actualUserKey = normalizedKey;
      }
    }

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan.', sessionCancelled: true },
        { status: 404 }
      );
    }

    const userData = userSnap.val() || {};
    const configuredMethod = userData.twoFactorMethod || 'email';
    const isTotpVerification =
      methodType === 'authenticator' ||
      (configuredMethod === 'authenticator' && !userData.twoFactorOtp);

    // =========================================================================
    // CASE A: GOOGLE AUTHENTICATOR (RFC 6238 TOTP) VERIFICATION
    // =========================================================================
    if (isTotpVerification) {
      const secret = userData.twoFactorTotpSecret;

      if (!secret) {
        return NextResponse.json(
          {
            error:
              'Kunci Google Authenticator belum diatur untuk akun ini. Hubungi Administrator untuk konfigurasi 2FA.',
            sessionCancelled: true,
          },
          { status: 400 }
        );
      }

      const currentFailed = Number(userData.twoFactorFailedAttempts || 0);

      if (currentFailed >= OTP_MAX_ATTEMPTS) {
        await update(ref(database, `system_users/${actualUserKey}`), {
          twoFactorFailedAttempts: null,
          twoFactorOtp: null,
        });
        return NextResponse.json(
          {
            error: 'Batas maksimal 5 kali percobaan salah telah tercapai. Sesi login dibatalkan.',
            sessionCancelled: true,
          },
          { status: 403 }
        );
      }

      const isMatch = verifyTotpToken(cleanCode, secret);

      if (!isMatch) {
        const newAttempts = currentFailed + 1;

        if (newAttempts >= OTP_MAX_ATTEMPTS) {
          await update(ref(database, `system_users/${actualUserKey}`), {
            twoFactorFailedAttempts: null,
            twoFactorOtp: null,
          });

          await logActivity(
            {
              query: `VERIFIKASI 2FA AUTHENTICATOR GAGAL (BATAS 5X TERCAPAI): ${actualUserKey.toUpperCase()}`,
              results: 'Sesi Dibatalkan (5x Salah)',
              device: 'Server',
              source: 'Web',
              method: '2FA_VERIFY',
              userId: actualUserKey.toUpperCase(),
            },
            database
          );

          return NextResponse.json(
            {
              error:
                'Kode Google Authenticator tidak cocok. Anda telah mencapai batas maksimal 5 kali percobaan salah. Sesi login dibatalkan.',
              sessionCancelled: true,
              attempts: newAttempts,
              remainingAttempts: 0,
            },
            { status: 403 }
          );
        } else {
          await update(ref(database, `system_users/${actualUserKey}`), {
            twoFactorFailedAttempts: newAttempts,
          });

          const remaining = OTP_MAX_ATTEMPTS - newAttempts;

          await logActivity(
            {
              query: `VERIFIKASI 2FA AUTHENTICATOR SALAH: ${actualUserKey.toUpperCase()}`,
              results: `Percobaan ${newAttempts}/${OTP_MAX_ATTEMPTS} Salah`,
              device: 'Server',
              source: 'Web',
              method: '2FA_VERIFY',
              userId: actualUserKey.toUpperCase(),
            },
            database
          );

          return NextResponse.json(
            {
              error: `Kode Google Authenticator tidak cocok. Pastikan jam pada perangkat Anda sinkron. Sisa kesempatan: ${remaining} kali percobaan.`,
              sessionCancelled: false,
              attempts: newAttempts,
              remainingAttempts: remaining,
            },
            { status: 400 }
          );
        }
      }

      // Success with Google Authenticator
      await update(ref(database, `system_users/${actualUserKey}`), {
        twoFactorFailedAttempts: null,
        twoFactorOtp: null,
      });

      await logActivity(
        {
          query: `VERIFIKASI 2FA GOOGLE AUTHENTICATOR BERHASIL: ${actualUserKey.toUpperCase()}`,
          results: 'Sukses Terverifikasi (TOTP)',
          device: 'Server',
          source: 'Web',
          method: '2FA_VERIFY',
          userId: actualUserKey.toUpperCase(),
        },
        database
      );

      return NextResponse.json({
        success: true,
        method: 'authenticator',
        message: 'Verifikasi Google Authenticator berhasil.',
      });
    }

    // =========================================================================
    // CASE B: EMAIL OTP VERIFICATION
    // =========================================================================
    const twoFactorOtp = userData.twoFactorOtp;

    // Check if active OTP session exists
    if (!twoFactorOtp || !twoFactorOtp.otpHash) {
      return NextResponse.json(
        {
          error: 'Tidak ada sesi verifikasi OTP email yang aktif. Silakan login kembali.',
          sessionCancelled: true,
        },
        { status: 400 }
      );
    }

    // Verify sessionToken if provided
    if (sessionToken && twoFactorOtp.sessionToken && twoFactorOtp.sessionToken !== sessionToken) {
      return NextResponse.json(
        {
          error: 'Sesi verifikasi tidak valid atau telah digantikan. Silakan login kembali.',
          sessionCancelled: true,
        },
        { status: 401 }
      );
    }

    const now = Date.now();

    // Check expiration (10 minutes - Ketentuan 2)
    if (now > (twoFactorOtp.expiresAt || 0)) {
      await set(ref(database, `system_users/${actualUserKey}/twoFactorOtp`), null);
      await logActivity(
        {
          query: `VERIFIKASI 2FA KEDALUWARSA: ${actualUserKey.toUpperCase()}`,
          results: 'OTP Kedaluwarsa (>10 Menit)',
          device: 'Server',
          source: 'Web',
          method: '2FA_VERIFY',
          userId: actualUserKey.toUpperCase(),
        },
        database
      );
      return NextResponse.json(
        {
          error: 'Kode OTP telah kedaluwarsa (lebih dari 10 menit). Silakan kirim ulang kode baru atau login kembali.',
          isExpired: true,
        },
        { status: 410 }
      );
    }

    const currentAttempts = twoFactorOtp.attempts || 0;

    // Check if maximum attempts already reached
    if (currentAttempts >= OTP_MAX_ATTEMPTS) {
      await set(ref(database, `system_users/${actualUserKey}/twoFactorOtp`), null);
      return NextResponse.json(
        {
          error: 'Batas maksimal 5 kali percobaan salah telah tercapai. Sesi login dibatalkan.',
          sessionCancelled: true,
        },
        { status: 403 }
      );
    }

    // Verify OTP against stored hash (Ketentuan 5: Timing-safe comparison)
    const isMatch = verifyOtpCode(cleanCode, actualUserKey, twoFactorOtp.otpHash);

    if (!isMatch) {
      const newAttempts = currentAttempts + 1;

      // Ketentuan 3: Maksimal 5 kali percobaan salah sebelum sesi dibatalkan
      if (newAttempts >= OTP_MAX_ATTEMPTS) {
        await set(ref(database, `system_users/${actualUserKey}/twoFactorOtp`), null);

        await logActivity(
          {
            query: `VERIFIKASI 2FA GAGAL (BATAS 5X TERCAPAI): ${actualUserKey.toUpperCase()}`,
            results: 'Sesi Dibatalkan (5x Salah)',
            device: 'Server',
            source: 'Web',
            method: '2FA_VERIFY',
            userId: actualUserKey.toUpperCase(),
          },
          database
        );

        return NextResponse.json(
          {
            error:
              'Kode OTP tidak sesuai. Anda telah mencapai batas maksimal 5 kali percobaan salah. Sesi login dibatalkan, silakan login kembali dari awal.',
            sessionCancelled: true,
            attempts: newAttempts,
            remainingAttempts: 0,
          },
          { status: 403 }
        );
      } else {
        await update(ref(database, `system_users/${actualUserKey}/twoFactorOtp`), {
          attempts: newAttempts,
        });

        const remaining = OTP_MAX_ATTEMPTS - newAttempts;

        await logActivity(
          {
            query: `VERIFIKASI 2FA SALAH: ${actualUserKey.toUpperCase()}`,
            results: `Percobaan ${newAttempts}/${OTP_MAX_ATTEMPTS} Salah`,
            device: 'Server',
            source: 'Web',
            method: '2FA_VERIFY',
            userId: actualUserKey.toUpperCase(),
          },
          database
        );

        return NextResponse.json(
          {
            error: `Kode OTP tidak sesuai. Sisa kesempatan: ${remaining} kali percobaan.`,
            sessionCancelled: false,
            attempts: newAttempts,
            remainingAttempts: remaining,
          },
          { status: 400 }
        );
      }
    }

    // SUCCESS: Kode hanya berlaku satu kali (Ketentuan 3)
    await set(ref(database, `system_users/${actualUserKey}/twoFactorOtp`), null);
    await update(ref(database, `system_users/${actualUserKey}`), {
      twoFactorFailedAttempts: null,
    });

    await logActivity(
      {
        query: `VERIFIKASI 2FA OTP EMAIL BERHASIL: ${actualUserKey.toUpperCase()}`,
        results: 'Sukses Terverifikasi (Email OTP)',
        device: 'Server',
        source: 'Web',
        method: '2FA_VERIFY',
        userId: actualUserKey.toUpperCase(),
      },
      database
    );

    return NextResponse.json({
      success: true,
      method: 'email',
      message: 'Verifikasi dua langkah berhasil.',
    });
  } catch (error: any) {
    console.error('[SIMPU 2FA] Error in /api/auth/2fa/verify:', error?.message || error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memverifikasi kode verifikasi.' },
      { status: 500 }
    );
  }
}
