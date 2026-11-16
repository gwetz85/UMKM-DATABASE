import { NextRequest, NextResponse } from 'next/server';
import { ref, get, update } from 'firebase/database';
import { getServerFirebase } from '@/lib/server-firebase';
import {
  isTwoFactorRole,
  generateOtpCode,
  hashOtpCode,
  maskEmail,
  OTP_EXPIRY_MS,
  OTP_MAX_RESENDS,
  OTP_RESEND_COOLDOWN_MS,
  TwoFactorMethod,
} from '@/lib/two-factor';
import { sendOtpEmail } from '@/lib/email-service';
import { logActivity } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userKey, sessionToken: providedToken, isResend, skipEmail } = body;

    if (!userKey || typeof userKey !== 'string') {
      return NextResponse.json(
        { error: 'User key atau username diperlukan.' },
        { status: 400 }
      );
    }

    const { database } = await getServerFirebase();
    const cleanKey = userKey.trim();

    // 1. Fetch user data from system_users
    let userSnap = await get(ref(database, `system_users/${cleanKey}`));
    let actualUserKey = cleanKey;

    if (!userSnap.exists()) {
      // Try lowercase with underscore
      const normalizedKey = cleanKey.toLowerCase().replace(/\s+/g, '_');
      userSnap = await get(ref(database, `system_users/${normalizedKey}`));
      if (userSnap.exists()) {
        actualUserKey = normalizedKey;
      }
    }

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan dalam sistem Manajemen User.' },
        { status: 404 }
      );
    }

    const userData = userSnap.val() || {};

    // 2. Check if 2FA is required and enabled for this user
    const role = userData.role || '';
    const requires2FA = isTwoFactorRole(role, actualUserKey);
    const isExplicitlyDisabled = userData.twoFactorEnabled === false;

    if (!requires2FA || isExplicitlyDisabled) {
      return NextResponse.json({
        twoFactorNotRequired: true,
        message: 'Pengguna tidak memerlukan verifikasi 2FA.',
      });
    }

    const method: TwoFactorMethod = userData.twoFactorMethod || 'email';
    const hasTotpSecret = Boolean(userData.twoFactorTotpSecret);

    // 3. If user exclusively uses Google Authenticator, do NOT send email OTP
    if (method === 'authenticator') {
      if (!hasTotpSecret) {
        return NextResponse.json(
          {
            error:
              'Akun Anda dikonfigurasi menggunakan Google Authenticator, namun belum memiliki kunci rahasia. Silakan hubungi Administrator untuk mengatur ulang 2FA.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        twoFactorMethod: 'authenticator',
        hasTotp: true,
        sessionToken: providedToken || crypto.randomUUID(),
        message: 'Silakan masukkan 6 digit kode dari aplikasi Google Authenticator Anda.',
      });
    }

    // 4. If method is 'both' and client explicitly requested to skip email (user chose Authenticator)
    if (method === 'both' && skipEmail && hasTotpSecret) {
      return NextResponse.json({
        success: true,
        twoFactorMethod: 'both',
        hasTotp: true,
        sessionToken: providedToken || crypto.randomUUID(),
        message: 'Silakan masukkan kode dari Google Authenticator.',
      });
    }

    // 5. Resolve registered email for Email OTP
    let registeredEmail = userData.email || userData.emailAddress || '';
    if (!registeredEmail && (actualUserKey.toLowerCase() === 'agus' || actualUserKey === 'agus@umkm.id')) {
      registeredEmail = process.env.EMAIL_USER || 'agussuriyadipunya@gmail.com';
    }

    if (!registeredEmail || !registeredEmail.includes('@')) {
      // If method is 'both' and user has TOTP, allow them to use Authenticator even if email is missing
      if (method === 'both' && hasTotpSecret) {
        return NextResponse.json({
          success: true,
          twoFactorMethod: 'authenticator',
          hasTotp: true,
          sessionToken: providedToken || crypto.randomUUID(),
          warning: 'Email belum terdaftar, Anda dialihkan ke Google Authenticator.',
        });
      }

      return NextResponse.json(
        {
          error:
            'Akun Anda belum memiliki email terdaftar untuk verifikasi 2FA. Silakan hubungi Administrator untuk mendaftarkan/memperbarui email Anda pada Manajemen User.',
          noEmailRegistered: true,
        },
        { status: 400 }
      );
    }

    const existingOtp = userData.twoFactorOtp || {};
    const now = Date.now();

    // 6. Validate resend constraints
    let currentResendCount = existingOtp.resendCount || 0;
    let sessionToken = providedToken || existingOtp.sessionToken || crypto.randomUUID();

    if (isResend) {
      // Cooldown check (60 seconds)
      const lastSentAt = existingOtp.lastSentAt || 0;
      const elapsed = now - lastSentAt;
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          {
            error: `Harap tunggu ${remainingSeconds} detik sebelum meminta kode baru.`,
            cooldownRemaining: remainingSeconds,
          },
          { status: 429 }
        );
      }

      // Max resends check (3 times per login session)
      if (currentResendCount >= OTP_MAX_RESENDS) {
        return NextResponse.json(
          {
            error: `Batas maksimal kirim ulang kode (${OTP_MAX_RESENDS} kali) telah tercapai untuk sesi ini.`,
            maxResendsReached: true,
          },
          { status: 403 }
        );
      }

      currentResendCount += 1;
    } else {
      // Fresh login session: reset resend count and attempts
      currentResendCount = 0;
      sessionToken = crypto.randomUUID();
    }

    // 7. Generate secure 6-digit OTP code and hash it
    // Plaintext code is ONLY passed to email sender; NEVER saved in DB or logs!
    const otpCode = generateOtpCode();
    const otpHash = hashOtpCode(otpCode, actualUserKey);
    const expiresAt = now + OTP_EXPIRY_MS;

    const otpData = {
      otpHash,
      expiresAt,
      attempts: 0, // Reset wrong attempts on new code
      resendCount: currentResendCount,
      lastSentAt: now,
      sessionToken,
    };

    // 8. Save OTP hash to database (Ketentuan 2 & 5)
    await update(ref(database, `system_users/${actualUserKey}/twoFactorOtp`), otpData);

    // 9. Send email via Nodemailer
    const emailResult = await sendOtpEmail({
      toEmail: registeredEmail,
      fullName: userData.fullName || actualUserKey,
      otpCode,
    });

    // 10. Log activity safely (Ketentuan 5: NEVER log plain OTP!)
    await logActivity(
      {
        query: `2FA OTP ${isResend ? 'KIRIM ULANG' : 'TERKIRIM'}: ${actualUserKey.toUpperCase()}`,
        results: emailResult.success
          ? `Berhasil Terkirim ke ${maskEmail(registeredEmail)}`
          : 'Gagal Kirim Email',
        device: 'Server',
        source: 'Web',
        method: '2FA_SEND',
        userId: actualUserKey.toUpperCase(),
      },
      database
    );

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error:
            emailResult.error ||
            'Gagal mengirim email verifikasi OTP. Pastikan email terdaftar aktif.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      twoFactorMethod: method,
      hasTotp: hasTotpSecret,
      emailMasked: maskEmail(registeredEmail),
      sessionToken,
      resendCount: currentResendCount,
      maxResends: OTP_MAX_RESENDS,
      cooldownSeconds: 60,
      expiresInMinutes: 10,
      simulated: emailResult.simulated || false,
    });
  } catch (error: any) {
    console.error('[SIMPU 2FA] Error in /api/auth/2fa/send:', error?.message || error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses verifikasi 2FA.' },
      { status: 500 }
    );
  }
}
