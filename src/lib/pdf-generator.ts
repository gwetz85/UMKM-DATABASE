import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessActor } from '@/app/lib/types';

export const generateRegistrationForm = (actor: BusinessActor) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // --- TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FORMULIR PENDAFTARAN', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.text('SISTEM INFORMASI MANAJEMEN PELAKU USAHA (SIMPU)', pageWidth / 2, 26, { align: 'center' });

  // --- ACTOR DATA TABLE ---
  const tableData = [
    ['NAMA LENGKAP', `: ${actor.fullName || '-'}`],
    ['NIK', `: ${actor.nik || '-'}`],
    ['NOMOR KK', `: ${actor.noKK || '-'}`],
    ['JENIS KELAMIN', `: ${actor.gender || '-'}`],
    ['TEMPAT, TGL LAHIR', `: ${actor.pobDob || '-'}`],
    ['NOMOR HP / WA', `: ${actor.phone || '-'}`],
    ['KECAMATAN', `: ${actor.kecamatan || '-'}`],
    ['KELURAHAN', `: ${actor.kelurahan || '-'}`],
    ['ALAMAT LENGKAP', `: ${actor.address || '-'}`],
    ['', ''], // Spacer
    ['NAMA USAHA', `: ${actor.businessName || '-'}`],
    ['KATEGORI USAHA', `: ${actor.businessCategory || '-'}`],
    ['LOKASI USAHA', `: ${actor.businessLocation || '-'}`],
    ['KOORDINATOR', `: ${actor.coordinator || '-'}`],
    ['REKENING BANK', `: ${actor.bankName || '-'} - ${actor.bankNumber || '-'}`],
    ['PEMILIK REKENING', `: ${actor.bankOwner || '-'}`],
  ];

  autoTable(doc, {
    startY: 35,
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
      font: 'helvetica',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin + 5 },
  });

  // --- VERIFICATION CHECKLIST ---
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TABEL VERIFIKASI BERKAS (Oleh Petugas)', margin + 5, finalY + 15);

  const checklistData = [
    ['1', 'Fhotocopy KTP Pelaku Usaha', '[      ]'],
    ['2', 'Fhotocopy Kartu Keluarga', '[      ]'],
    ['3', 'Nomor Induk Berusaha (NIB)', '[      ]'],
    ['4', 'Fhoto Usaha dan Pelaku Usaha', '[      ]'],
    ['5', 'Map', '[      ]'],
  ];

  autoTable(doc, {
    startY: finalY + 20,
    head: [['NO', 'PERSYARATAN / DOKUMEN', 'CEKLIST']],
    body: checklistData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 100 },
      2: { halign: 'center', cellWidth: 30 },
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    margin: { left: margin + 5 },
  });

  // --- FOOTER ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, margin, 285);
  doc.text('SIMPU - Sistem Informasi Manajemen Pelaku Usaha', pageWidth / 2, 285, { align: 'center' });
  doc.text(`Halaman 1 / 1`, pageWidth - margin, 285, { align: 'right' });

  // Save the PDF
  const filename = `FORMULIR_PENDAFTARAN_${actor.fullName.replace(/\s+/g, '_').toUpperCase()}.pdf`;
  doc.save(filename);
};
