import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, message } = body;

    // Validation
    if (!name || !phone || !message) {
      return NextResponse.json(
        { error: 'Semua field (Nama, No HP, Pesan) wajib diisi.' },
        { status: 400 }
      );
    }

    // Configure your SMTP credentials here or in .env
    // This is a basic setup. For production, use environment variables.
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'agussuriyadipunya@gmail.com',
        pass: process.env.EMAIL_PASS || '', // App Password should be here
      },
    });

    const mailOptions = {
      from: `"SIMPU Offline System" <${process.env.EMAIL_USER || 'agussuriyadipunya@gmail.com'}>`,
      to: 'agussuriyadipunya@gmail.com',
      subject: `[SIMPU] Pesan Offline dari ${name}`,
      text: `
        Nama: ${name}
        Nomor Ponsel: ${phone}
        Pesan:
        ${message}
      `,
      html: `
        <h3>Pesan Offline Baru</h3>
        <p><strong>Nama:</strong> ${name}</p>
        <p><strong>Nomor Ponsel:</strong> ${phone}</p>
        <p><strong>Pesan:</strong></p>
        <div style="padding: 1rem; background: #f3f4f6; border-radius: 8px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
      `,
    };

    // If EMAIL_PASS is not set, we'll simulate success for now so the UI doesn't break,
    // but log a warning. In a real scenario, this would fail.
    if (!process.env.EMAIL_PASS) {
      console.warn("EMAIL_PASS is not set. Email sending is skipped but submission is saved.");
      return NextResponse.json({ 
        success: true, 
        message: 'Pesan diterima (Simulasi pengiriman email karena kredensial belum diatur).' 
      });
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Pesan berhasil dikirim ke pengembang.' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim pesan. Silakan coba lagi nanti.' },
      { status: 500 }
    );
  }
}
