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

  // --- REGISTRATION CODE & BARCODE (TOP RIGHT) ---
  const regCode = actor.registrationCode || 'PENDING';
  const barcodeBase64 = generateBarcodeBase64(regCode);

  if (barcodeBase64 && regCode !== 'PENDING') {
    doc.addImage(barcodeBase64, 'PNG', pageWidth - margin - 45, 20, 45, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(regCode, pageWidth - margin - 22.5, 37, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('REGISTRATION CODE', pageWidth - margin - 22.5, 40, { align: 'center' });
  }

  // --- DOCUMENT TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FORMULIR BIODATA PELAKU USAHA', pageWidth / 2, 55, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, 57, pageWidth / 2 + 40, 57);

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
    startY: 65,
    body: tableData as any,
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
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, 285, { align: 'center' });

  // Save the PDF
  const filename = `FORMULIR_${regCode}_${actor.fullName.replace(/\s+/g, '_').toUpperCase()}.pdf`;
  doc.save(filename);
};
