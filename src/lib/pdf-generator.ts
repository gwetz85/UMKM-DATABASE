import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessActor } from '@/app/lib/types';
import { generateBarcodeBase64 } from './barcode-utils';

export const generateRegistrationForm = (actor: BusinessActor) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // --- OFFICIAL HEADER ---
  try {
     // We try to add the logo if possible. In client-side Next.js, /logo.png should work.
     doc.addImage('/logo.png', 'PNG', margin, 12, 22, 22);
  } catch (e) {
     console.warn("Logo not found or could not be loaded");
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PEMERINTAH KABUPATEN / KOTA', pageWidth / 2 + 10, 18, { align: 'center' });
  doc.setFontSize(16);
  doc.text('DINAS KOPERASI DAN UMKM', pageWidth / 2 + 10, 25, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistem Informasi Manajemen Pelaku Usaha (SIMPU)', pageWidth / 2 + 10, 30, { align: 'center' });

  // Double Line Separator
  doc.setLineWidth(0.8);
  doc.line(margin, 38, pageWidth - margin, 38);
  doc.setLineWidth(0.2);
  doc.line(margin, 39, pageWidth - margin, 39);

  // --- REGISTRATION CODE & BARCODE (TOP RIGHT) ---
  const regCode = actor.registrationCode || 'PENDING';
  const barcodeBase64 = generateBarcodeBase64(regCode);

  if (barcodeBase64 && regCode !== 'PENDING') {
    doc.addImage(barcodeBase64, 'PNG', pageWidth - margin - 45, 45, 45, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(regCode, pageWidth - margin - 22.5, 62, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('REGISTRATION CODE', pageWidth - margin - 22.5, 65, { align: 'center' });
  }

  // --- DOCUMENT TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FORMULIR BIODATA PELAKU USAHA', pageWidth / 2, 75, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, 77, pageWidth / 2 + 40, 77);

  // --- ACTOR DATA TABLE ---
  const tableData = [
    [{ content: 'I. DATA PRIBADI', colSpan: 2, styles: { fillColor: [245, 245, 245], fontStyle: 'bold' as any } }],
    ['NAMA LENGKAP', `: ${actor.fullName || '-'}`],
    ['NIK (NOMOR INDUK KEPENDUDUKAN)', `: ${actor.nik || '-'}`],
    ['NOMOR KARTU KELUARGA', `: ${actor.noKK || '-'}`],
    ['JENIS KELAMIN', `: ${actor.gender || '-'}`],
    ['TEMPAT, TANGGAL LAHIR', `: ${actor.pobDob || '-'}`],
    ['NOMOR HP / WHATSAPP', `: ${actor.phone || '-'}`],
    ['KECAMATAN / KELURAHAN', `: ${actor.kecamatan || '-'} / ${actor.kelurahan || '-'}`],
    ['ALAMAT DOMISILI', `: ${actor.address || '-'}`],
    [{ content: 'II. INFORMASI USAHA', colSpan: 2, styles: { fillColor: [245, 245, 245], fontStyle: 'bold' as any } }],
    ['NAMA USAHA', `: ${actor.businessName || '-'}`],
    ['KATEGORI USAHA', `: ${actor.businessCategory || '-'}`],
    ['LOKASI USAHA', `: ${actor.businessLocation || '-'}`],
    ['KORLAP / KOORDINATOR', `: ${actor.coordinator || '-'}`],
    [{ content: 'III. DATA PERBANKAN', colSpan: 2, styles: { fillColor: [245, 245, 245], fontStyle: 'bold' as any } }],
    ['NAMA BANK', `: ${actor.bankName || '-'}`],
    ['NOMOR REKENING', `: ${actor.bankNumber || '-'}`],
    ['NAMA PEMILIK REKENING', `: ${actor.bankOwner || '-'}`],
  ];

  autoTable(doc, {
    startY: 85,
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      font: 'helvetica',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 180;

  // --- SIGNATURE SECTION ---
  const sigWidth = 60;
  const sigY = finalY + 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Left: Applicant
  doc.text('Pemohon / Pelaku Usaha,', margin + 10, sigY);
  doc.line(margin + 10, sigY + 25, margin + 10 + sigWidth, sigY + 25);
  doc.setFont('helvetica', 'bold');
  doc.text(actor.fullName.toUpperCase(), margin + 10 + sigWidth / 2, sigY + 30, { align: 'center' });

  // Right: Officer
  doc.setFont('helvetica', 'normal');
  doc.text('Petugas Verifikasi,', pageWidth - margin - sigWidth - 10, sigY);
  doc.line(pageWidth - margin - sigWidth - 10, sigY + 25, pageWidth - margin - 10, sigY + 25);
  doc.text('( ........................................ )', pageWidth - margin - 10 - sigWidth / 2, sigY + 30, { align: 'center' });

  // --- FOOTER ---
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'italic');
  doc.text(`Dokumen ini di-generate secara otomatis oleh Sistem SIMPU pada ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, 285, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${actor.id} | Page 1 of 1`, pageWidth - margin, 285, { align: 'right' });

  // Save the PDF
  const filename = `FORMULIR_${regCode}_${actor.fullName.replace(/\s+/g, '_').toUpperCase()}.pdf`;
  doc.save(filename);
};
