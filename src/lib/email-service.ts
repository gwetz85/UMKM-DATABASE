import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
  toEmail: string;
  fullName?: string;
  otpCode: string;
}

/**
 * Sends a 2FA OTP verification code email using Nodemailer.
 * IMPORTANT: NEVER print or log otpCode in plain text anywhere!
 */
export async function sendOtpEmail({
  toEmail,
  fullName = 'Pengguna SIMPU',
  otpCode,
}: SendOtpEmailParams): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  try {
    const senderEmail = process.env.EMAIL_USER || 'agussuriyadipunya@gmail.com';
    const emailPass = process.env.EMAIL_PASS || '';

    // If EMAIL_PASS is not set in local environment, simulate safely without breaking UI
    if (!emailPass) {
      console.warn('[SIMPU 2FA] EMAIL_PASS belum diatur di .env. Simulasi pengiriman email untuk:', toEmail);
      return {
        success: true,
        simulated: true,
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: emailPass,
      },
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kode Verifikasi 2FA SIMPU</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
        .container { max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo-title { font-size: 24px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
        .logo-sub { font-size: 11px; font-weight: 600; color: #fde68a; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .desc { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #059669; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .otp-label { font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #065f46; margin: 4px 0; }
        .rules-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
        .rules-title { font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 8px; }
        .rules-list { font-size: 12px; color: #64748b; line-height: 1.8; margin: 0; padding-left: 18px; }
        .warning { font-size: 12px; color: #b91c1c; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px 16px; line-height: 1.5; font-weight: 500; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-title">SIMPU</div>
          <div class="logo-sub">Sistem Informasi Manajemen Pendataan Usaha</div>
        </div>
        <div class="content">
          <div class="greeting">Halo, ${fullName}</div>
          <p class="desc">
            Sistem mendeteksi adanya permintaan login ke akun SIMPU Anda. Gunakan kode verifikasi dua langkah (2FA) di bawah ini untuk melanjutkan akses:
          </p>
          
          <div class="otp-box">
            <div class="otp-label">Kode Verifikasi (OTP)</div>
            <div class="otp-code">${otpCode}</div>
          </div>

          <div class="rules-card">
            <div class="rules-title">Ketentuan Penggunaan Kode:</div>
            <ul class="rules-list">
              <li>Kode verifikasi ini berlaku selama <strong>10 menit</strong> sejak diterbitkan.</li>
              <li>Kode hanya berlaku untuk <strong>satu kali penggunaan</strong>.</li>
              <li>Maksimal <strong>5 kali percobaan salah</strong> sebelum sesi dibatalkan demi keamanan.</li>
            </ul>
          </div>

          <div class="warning">
            <strong>Peringatan Keamanan:</strong> Jangan pernah membagikan kode ini kepada siapa pun, termasuk petugas atau Administrator SIMPU. Jika Anda tidak merasa melakukan login, abaikan pesan ini atau segera hubungi Administrator untuk mereset akun Anda.
          </div>
        </div>
        <div class="footer">
          Email otomatis dari Sistem SIMPU. Harap tidak membalas email ini.<br>&copy; ${new Date().getFullYear()} SIMPU - All Rights Reserved.
        </div>
      </div>
    </body>
    </html>
    `;

    const textContent = `
Kode Verifikasi Dua Langkah (2FA) SIMPU

Halo, ${fullName}

Kode verifikasi Anda adalah: ${otpCode}

Ketentuan:
- Berlaku selama 10 menit.
- Hanya dapat digunakan satu kali.
- Maksimal 5 kali percobaan salah sebelum sesi dibatalkan.
- Jangan berikan kode ini kepada siapa pun.

Jika Anda tidak merasa melakukan login, segera hubungi Administrator SIMPU.
    `;

    await transporter.sendMail({
      from: `"SIMPU Keamanan Akun" <${senderEmail}>`,
      to: toEmail,
      subject: `[SIMPU] Kode Verifikasi Masuk (2FA) - ${fullName}`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[SIMPU 2FA] Gagal mengirim email OTP ke:', toEmail, error?.message || error);
    return {
      success: false,
      error: 'Gagal mengirim email verifikasi OTP. Pastikan alamat email aktif atau hubungi Administrator.',
    };
  }
}
