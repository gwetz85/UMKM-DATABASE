import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { logActivity } from '@/lib/logger';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

export async function POST(request: Request) {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const body = await request.json();
    const { actorId, fullName, nik, email, businessName, surveyData, verifiedBy } = body;

    if (!actorId || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'ID Pelaku Usaha dan Email yang valid wajib diisi.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const emailLogRef = ref(database, `email_logs/${actorId}`);

    const emailUser = process.env.EMAIL_USER || 'agussuriyadipunya@gmail.com';
    const emailPass = process.env.EMAIL_PASS || '';

    // If EMAIL_PASS is not configured, record skipped status
    if (!emailPass) {
      console.warn("EMAIL_PASS is not set in environment. Email simulation recorded.");
      await set(emailLogRef, {
        actorId,
        fullName: fullName || '',
        nik: nik || '',
        email,
        status: 'skipped',
        note: 'Kredensial EMAIL_PASS belum diatur pada server.',
        timestamp: now,
        verifiedBy: verifiedBy || 'System'
      });

      return NextResponse.json({
        success: true,
        status: 'skipped',
        message: 'Kredensial email server belum diatur. Log dicatat sebagai skipped.'
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">SIMPU - VERIFIKASI SURVEY DINAS</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Dinas Koperasi & UKM Kota Tanjungpinang</p>
        </div>

        <div style="padding: 24px; color: #334155;">
          <p style="font-size: 14px; margin-top: 0;">Yth. <strong>${fullName || 'Pelaku Usaha'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Pemberitahuan resmi dari <strong>Sistem Informasi Manajemen Pelaku Usaha (SIMPU)</strong>. 
            Petugas survey dinas telah selesai melakukan verifikasi lapangan terhadap usaha Anda dengan data sebagai berikut:
          </p>

          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase;">Ringkasan Data Verifikasi Survey</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; font-weight: bold; width: 35%; color: #64748b;">Nama Pemilik</td>
                <td style="padding: 4px 0;">: ${fullName || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">NIK</td>
                <td style="padding: 4px 0;">: ${nik || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Nama Usaha</td>
                <td style="padding: 4px 0;">: ${businessName || surveyData?.namaUsaha || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Bidang Usaha</td>
                <td style="padding: 4px 0;">: ${surveyData?.bidangUsaha || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Alamat Usaha/Rumah</td>
                <td style="padding: 4px 0;">: ${surveyData?.alamatRumah || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Nomor HP / WA</td>
                <td style="padding: 4px 0;">: ${surveyData?.noHp || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Status Terdaftar DTKS</td>
                <td style="padding: 4px 0;">: ${surveyData?.dtks?.masuk ? `Ya (${surveyData.dtks.jenis || 'DTKS'})` : 'Tidak'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Bantuan Hibah Pernah Terima</td>
                <td style="padding: 4px 0;">: ${surveyData?.hibah?.pernah ? `Pernah (${surveyData.hibah.dariMana || '-'}, ${surveyData.hibah.tahun || '-'})` : 'Belum Pernah'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Hasil Rekomendasi Survey</td>
                <td style="padding: 4px 0; font-weight: bold; color: #16a34a;">: ${surveyData?.hasilSurvey || 'Lolos Verifikasi Dinas'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #166534;">
            <strong>Status Verifikasi:</strong> 🟢 <strong>LOLOS VERIFIKASI DINAS (100%)</strong><br/>
            Data Anda telah terverifikasi oleh Petugas Survey Dinas (${verifiedBy || 'Tim Survey'}) dan diteruskan ke proses verifikasi tahap berikutnya.
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center;">
            Email ini dikirim secara otomatis oleh Sistem SIMPU. Harap tidak membalas email ini.
          </p>
        </div>

        <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © ${new Date().getFullYear()} SIMPU - Sistem Informasi Manajemen Pelaku Usaha Kota Tanjungpinang
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"SIMPU Dinas Koperasi & UKM" <${emailUser}>`,
      to: email,
      subject: `[SIMPU] Pemberitahuan Hasil Survey Lapangan - ${fullName}`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    // Save successful log in Firebase
    await set(emailLogRef, {
      actorId,
      fullName: fullName || '',
      nik: nik || '',
      email,
      status: 'sent',
      sentAt: now,
      verifiedBy: verifiedBy || 'Petugas'
    });

    await logActivity({
      query: `EMAIL SURVEY SENT: ${fullName} (${email})`,
      results: "Terkirim",
      device: 'Server API',
      source: 'Web',
      method: 'SEND EMAIL SURVEY',
      userId: verifiedBy || 'Petugas'
    });

    return NextResponse.json({
      success: true,
      status: 'sent',
      message: `Email pemberitahuan berhasil dikirim ke ${email}.`
    });

  } catch (error: any) {
    console.error('Error sending survey email:', error);

    // Record failure in Firebase email_logs if actorId exists
    try {
      const body = await request.clone().json();
      if (body?.actorId) {
        const failLogRef = ref(database, `email_logs/${body.actorId}`);
        await set(failLogRef, {
          actorId: body.actorId,
          fullName: body.fullName || '',
          nik: body.nik || '',
          email: body.email || '',
          status: 'failed',
          error: error.message || 'Gagal mengirim email',
          failedAt: new Date().toISOString(),
          verifiedBy: body.verifiedBy || 'Petugas'
        });
      }
    } catch (_) {
      // Ignore fallback clone error
    }

    return NextResponse.json(
      { error: 'Gagal mengirim email pemberitahuan: ' + (error.message || 'Server Error') },
      { status: 500 }
    );
  }
}
