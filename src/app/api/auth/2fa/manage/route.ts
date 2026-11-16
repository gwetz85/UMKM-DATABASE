import { NextRequest, NextResponse } from 'next/server';
import { ref, get, update, set } from 'firebase/database';
import { getServerFirebase } from '@/lib/server-firebase';
import { logActivity } from '@/lib/logger';
import {
  generateTotpSecret,
  generateTotpAuthUri,
  verifyTotpToken,
  formatSecretKey,
  TwoFactorMethod,
} from '@/lib/two-factor';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, userKey, enabled, newEmail, adminId, method, totpSecret, verifyCode } = body;

    if (!userKey || !action) {
      return NextResponse.json(
        { error: 'User key dan action wajib diisi.' },
        { status: 400 }
      );
    }

    const { database } = await getServerFirebase();
    const cleanKey = String(userKey).trim();

    // Check user exists
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
        { error: 'Pengguna tidak ditemukan dalam sistem Manajemen User.' },
        { status: 404 }
      );
    }

    const userData = userSnap.val() || {};

    // -------------------------------------------------------------------------
    // ACTION: TOGGLE 2FA (Enable / Disable)
    // -------------------------------------------------------------------------
    if (action === 'toggle') {
      const newEnabled = Boolean(enabled);
      await update(ref(database, `system_users/${actualUserKey}`), {
        twoFactorEnabled: newEnabled,
      });

      // If disabled, also clear any active OTP session and failed attempts
      if (!newEnabled) {
        await update(ref(database, `system_users/${actualUserKey}`), {
          twoFactorOtp: null,
          twoFactorFailedAttempts: null,
        });
      }

      await logActivity(
        {
          query: `${newEnabled ? 'AKTIFKAN' : 'NONAKTIFKAN'} 2FA: ${actualUserKey.toUpperCase()}`,
          results: 'Berhasil',
          device: 'Web',
          source: 'Web',
          method: '2FA_MANAGE',
          userId: adminId || 'Admin',
        },
        database
      );

      return NextResponse.json({
        success: true,
        twoFactorEnabled: newEnabled,
        message: newEnabled
          ? `2FA untuk ${userData.fullName || actualUserKey} telah diaktifkan.`
          : `2FA untuk ${userData.fullName || actualUserKey} telah dinonaktifkan.`,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: RESET 2FA (Clear OTP session & wrong attempts)
    // -------------------------------------------------------------------------
    if (action === 'reset') {
      await update(ref(database, `system_users/${actualUserKey}`), {
        twoFactorOtp: null,
        twoFactorFailedAttempts: null,
      });

      await logActivity(
        {
          query: `RESET 2FA: ${actualUserKey.toUpperCase()}`,
          results: 'Sesi OTP Direset',
          device: 'Web',
          source: 'Web',
          method: '2FA_MANAGE',
          userId: adminId || 'Admin',
        },
        database
      );

      return NextResponse.json({
        success: true,
        message: `Sesi 2FA untuk ${userData.fullName || actualUserKey} telah berhasil direset.`,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE EMAIL (Edit email yang sudah didaftarkan)
    // -------------------------------------------------------------------------
    if (action === 'update-email') {
      if (!newEmail || !newEmail.includes('@')) {
        return NextResponse.json(
          { error: 'Format email baru tidak valid. Pastikan menggunakan format email yang benar.' },
          { status: 400 }
        );
      }

      const cleanEmail = String(newEmail).trim().toLowerCase();
      await update(ref(database, `system_users/${actualUserKey}`), {
        email: cleanEmail,
        twoFactorOtp: null, // Clear active OTP to prevent mismatch
      });

      await logActivity(
        {
          query: `UBAH EMAIL 2FA: ${actualUserKey.toUpperCase()}`,
          results: `Email diubah ke ${cleanEmail}`,
          device: 'Web',
          source: 'Web',
          method: '2FA_MANAGE',
          userId: adminId || 'Admin',
        },
        database
      );

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        message: `Email untuk ${userData.fullName || actualUserKey} telah diperbarui ke ${cleanEmail}.`,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: SETUP TOTP (Generate new TOTP Secret & QR Code for Google Authenticator)
    // -------------------------------------------------------------------------
    if (action === 'setup-totp') {
      const secret = generateTotpSecret(20);
      const displayName = userData.fullName || actualUserKey;
      const otpauthUrl = generateTotpAuthUri(displayName, secret, 'SIMPU');
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#042111',
          light: '#ffffff',
        },
      });

      return NextResponse.json({
        success: true,
        secret,
        formattedSecret: formatSecretKey(secret),
        otpauthUrl,
        qrCodeDataUrl,
        userDisplayName: displayName,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: SAVE 2FA CONFIGURATION (Method: 'email' | 'authenticator' | 'both')
    // -------------------------------------------------------------------------
    if (action === 'save-config') {
      const selectedMethod: TwoFactorMethod = method || 'email';
      const isEnabled = enabled !== false;

      const updates: Record<string, any> = {
        twoFactorEnabled: isEnabled,
        twoFactorMethod: selectedMethod,
      };

      // If method includes Google Authenticator, validate and save secret
      if (selectedMethod === 'authenticator' || selectedMethod === 'both') {
        const cleanSecret = String(totpSecret || userData.twoFactorTotpSecret || '').trim();

        if (!cleanSecret) {
          return NextResponse.json(
            { error: 'Kunci rahasia (Secret Key) Google Authenticator belum dibuat. Silakan klik buat kunci baru.' },
            { status: 400 }
          );
        }

        // If a test code was submitted to verify the setup
        if (verifyCode) {
          const isValid = verifyTotpToken(String(verifyCode).trim(), cleanSecret);
          if (!isValid) {
            return NextResponse.json(
              {
                error:
                  'Kode 6 angka dari Google Authenticator tidak cocok. Pastikan waktu/jam pada HP Anda sinkron dengan waktu internet.',
              },
              { status: 400 }
            );
          }
        }

        updates.twoFactorTotpSecret = cleanSecret;
      }

      // If disabled or method switched, clear pending email OTP
      updates.twoFactorOtp = null;
      updates.twoFactorFailedAttempts = null;

      await update(ref(database, `system_users/${actualUserKey}`), updates);

      const methodLabel =
        selectedMethod === 'authenticator'
          ? 'Google Authenticator'
          : selectedMethod === 'both'
          ? 'Keduanya (Pilihan saat login)'
          : 'OTP Email';

      await logActivity(
        {
          query: `KONFIGURASI 2FA: ${actualUserKey.toUpperCase()}`,
          results: `Metode: ${methodLabel} (${isEnabled ? 'Aktif' : 'Nonaktif'})`,
          device: 'Web',
          source: 'Web',
          method: '2FA_MANAGE',
          userId: adminId || 'Admin',
        },
        database
      );

      return NextResponse.json({
        success: true,
        twoFactorEnabled: isEnabled,
        twoFactorMethod: selectedMethod,
        message: `Konfigurasi 2FA berhasil disimpan dengan metode ${methodLabel}.`,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: RESET TOTP SECRET (In case officer loses their phone)
    // -------------------------------------------------------------------------
    if (action === 'reset-totp') {
      await update(ref(database, `system_users/${actualUserKey}`), {
        twoFactorTotpSecret: null,
        twoFactorMethod: 'email', // Revert to email
        twoFactorOtp: null,
        twoFactorFailedAttempts: null,
      });

      await logActivity(
        {
          query: `RESET GOOGLE AUTHENTICATOR: ${actualUserKey.toUpperCase()}`,
          results: 'Secret Key Dihapus, Kembali ke OTP Email',
          device: 'Web',
          source: 'Web',
          method: '2FA_MANAGE',
          userId: adminId || 'Admin',
        },
        database
      );

      return NextResponse.json({
        success: true,
        message: `Kunci Google Authenticator untuk ${userData.fullName || actualUserKey} telah direset. Metode dikembalikan ke OTP Email.`,
      });
    }

    return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 });
  } catch (error: any) {
    console.error('[SIMPU 2FA] Error in /api/auth/2fa/manage:', error?.message || error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat mengelola 2FA: ' + (error?.message || '') },
      { status: 500 }
    );
  }
}
