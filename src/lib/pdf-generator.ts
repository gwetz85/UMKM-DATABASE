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

  // --- FOOTER ---
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'italic');
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, 285, { align: 'center' });

  // Save the PDF
  const filename = `FORMULIR_${regCode}_${actor.fullName.replace(/\s+/g, '_').toUpperCase()}.pdf`;
  doc.save(filename);
};

export const generateCoordinatorReport = (coordinator: string, actors: BusinessActor[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN DATA PELAKU USAHA (SIMPU)', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Sistem Informasi Manajemen Pelaku Usaha', pageWidth / 2, 19, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`KOORDINATOR: ${coordinator.toUpperCase()}`, pageWidth / 2, 26, { align: 'center' });
  
  doc.setLineWidth(0.3);
  doc.line(10, 30, pageWidth - 10, 30);

  const tableData = actors.map((actor, index) => [
    index + 1,
    actor.registrationCode || '-',
    (actor.fullName || "").toUpperCase(),
    actor.nik || "-",
    actor.noKK || "-",
    (actor.address || "").toUpperCase(),
    (actor.businessName || "").toUpperCase(),
    (actor.businessLocation || "").toUpperCase(),
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['NO', 'REGISTRASI', 'NAMA', 'NIK', 'NO KK', 'ALAMAT', 'USAHA', 'ALAMAT USAHA']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: 255, 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7
    },
    styles: { 
      fontSize: 6.5, 
      cellPadding: 1.5,
      valign: 'middle',
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 28 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 22 },
      5: { cellWidth: 32 },
      6: { cellWidth: 28 },
      7: { cellWidth: 33 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(6);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Halaman ${data.pageNumber} | Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 
        pageWidth / 2, 
        doc.internal.pageSize.getHeight() - 8, 
        { align: 'center' }
      );
    }
  });

  const filename = `LAPORAN_PELAKU_USAHA_${coordinator.replace(/\s+/g, '_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const generateAllCoordinatorsReport = (groupedActors: Record<string, BusinessActor[]>) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let isFirstPage = true;

  Object.entries(groupedActors).forEach(([coordinator, actors]) => {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN DATA PELAKU USAHA (SIMPU)', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Sistem Informasi Manajemen Pelaku Usaha', pageWidth / 2, 19, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`KOORDINATOR: ${coordinator.toUpperCase()}`, pageWidth / 2, 26, { align: 'center' });
    
    doc.setLineWidth(0.3);
    doc.line(10, 30, pageWidth - 10, 30);

    const tableData = actors.map((actor, index) => [
      index + 1,
      actor.registrationCode || '-',
      (actor.fullName || "").toUpperCase(),
      actor.nik || "-",
      actor.noKK || "-",
      (actor.address || "").toUpperCase(),
      (actor.businessName || "").toUpperCase(),
      (actor.businessLocation || "").toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['NO', 'REGISTRASI', 'NAMA', 'NIK', 'NO KK', 'ALAMAT', 'USAHA', 'ALAMAT USAHA']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7
      },
      styles: { 
        fontSize: 6.5, 
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { halign: 'center', cellWidth: 18 },
        2: { cellWidth: 28 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 22 },
        5: { cellWidth: 32 },
        6: { cellWidth: 28 },
        7: { cellWidth: 33 },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Footer
        doc.setFontSize(6);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Halaman ${data.pageNumber} | Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 
          pageWidth / 2, 
          doc.internal.pageSize.getHeight() - 8, 
          { align: 'center' }
        );
      }
    });
  });

  const filename = `LAPORAN_KOORDINATOR_LENGKAP_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
