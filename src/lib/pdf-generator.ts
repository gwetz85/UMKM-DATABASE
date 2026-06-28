import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessActor } from '@/app/lib/types';
import { generateBarcodeBase64 } from './barcode-utils';
import { parsePobDob } from './utils';

export const addTunasBangsaHeader = (doc: jsPDF, hasLogo = false) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const textOffset = hasLogo ? 28 : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235); // Primary Blue
  doc.text('TUNAS BANGSA KEPULAUAN RIAU', margin + textOffset, 17);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('PENGAJUAN BANTUAN UMKM TAHUN 2026', margin + textOffset, 23);
  
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 34, pageWidth - margin, 34);
  
  doc.setTextColor(0); // Reset text color
  return 38; // Return the next Y position
};

export const generateRegistrationForm = (actor: BusinessActor, sequenceNumber?: number) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // --- HEADER TUNAS BANGSA ---
  try {
    doc.addImage('/logo-tunas-bangsa.png', 'PNG', margin, 9, 20, 20);
  } catch (e) {
    console.error("Logo not found at /logo-tunas-bangsa.png");
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  addTunasBangsaHeader(doc, true);

  // --- REGISTRATION CODE & BARCODE (TOP RIGHT) ---
  const regCode = actor.registrationCode || 'PENDING';
  const barcodeBase64 = generateBarcodeBase64(regCode);

  if (barcodeBase64 && regCode !== 'PENDING') {
    doc.addImage(barcodeBase64, 'PNG', pageWidth - margin - 45, 12, 45, 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(regCode, pageWidth - margin - 22.5, 29, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('REGISTRATION CODE', pageWidth - margin - 22.5, 32, { align: 'center' });
  }

  // --- DOCUMENT TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('FORMULIR BIODATA PELAKU USAHA', pageWidth / 2, 50, { align: 'center' });
  
  if (sequenceNumber !== undefined) {
    const seqText = `NO: ${sequenceNumber}`;
    doc.setFontSize(10);
    const textWidth = doc.getTextWidth(seqText);
    const boxWidth = textWidth + 10;
    const boxHeight = 7;
    const boxX = pageWidth - margin - boxWidth;
    const boxY = 44.5;
    
    doc.setFillColor(37, 99, 235); // Primary Blue
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255); // White text
    doc.text(seqText, boxX + boxWidth / 2, boxY + 5, { align: 'center' });
    
    doc.setTextColor(0); // Reset
  }

  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, 52, pageWidth / 2 + 40, 52);

  // --- ACTOR DATA TABLE ---
  const tableData = [
    [{ content: 'I. DATA PRIBADI', colSpan: 2, styles: { fillColor: [245, 245, 245], fontStyle: 'bold' as any } }],
    ['NAMA LENGKAP', `: ${actor.fullName || '-'}`],
    ['NIK (NOMOR INDUK KEPENDUDUKAN)', `: ${actor.nik || '-'}`],
    ['NOMOR KARTU KELUARGA', `: ${actor.noKK || '-'}`],
    ['JENIS KELAMIN', `: ${actor.gender || '-'}`],
    ['TEMPAT LAHIR', `: ${actor.pob || parsePobDob(actor.pobDob || '').pob || '-'}`],
    ['TANGGAL LAHIR', `: ${actor.dob || parsePobDob(actor.pobDob || '').dob || '-'}`],
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
  
  // Header Tunas Bangsa
  const startY = addTunasBangsaHeader(doc);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`LAPORAN DATA PELAKU USAHA: ${coordinator.toUpperCase()}`, pageWidth - 14, 17, { align: 'right' });
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Sistem Informasi Manajemen Pelaku Usaha (SIMPU)', pageWidth - 14, 21, { align: 'right' });
  doc.setTextColor(0);

  const tableData = actors.map((actor, index) => [
    index + 1,
    actor.registrationCode || '-',
    (actor.fullName || "").toUpperCase(),
    actor.nik || "-",
    actor.noKK || "-",
    actor.phone || "-",
    (actor.address || "").toUpperCase(),
    (actor.businessName || "").toUpperCase(),
    (actor.businessLocation || "").toUpperCase(),
  ]);

  autoTable(doc, {
    startY: 38,
    head: [['NO', 'REG', 'NAMA', 'NIK', 'NO KK', 'PONSEL', 'ALAMAT', 'USAHA', 'ALAMAT USAHA']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: 255, 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.5
    },
    styles: { 
      fontSize: 6.5, 
      cellPadding: 1.5,
      valign: 'middle',
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'center', cellWidth: 15 },
      2: { cellWidth: 25 },
      3: { halign: 'center', cellWidth: 21 },
      4: { halign: 'center', cellWidth: 21 },
      5: { halign: 'center', cellWidth: 19 },
      6: { cellWidth: 28 },
      7: { cellWidth: 24 },
      8: { cellWidth: 30 },
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
  let globalIndex = 1;

  Object.entries(groupedActors).forEach(([coordinator, actors]) => {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    // Header Tunas Bangsa
    addTunasBangsaHeader(doc);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`LAPORAN KOORDINATOR: ${coordinator.toUpperCase()}`, pageWidth - 14, 17, { align: 'right' });
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.setLineWidth(0.5);
    doc.line(10, 32, pageWidth - 10, 32);

    const tableData = actors.map((actor) => [
      globalIndex++,
      actor.registrationCode || '-',
      (actor.fullName || "").toUpperCase(),
      actor.nik || "-",
      actor.noKK || "-",
      actor.phone || "-",
      (actor.address || "").toUpperCase(),
      (actor.businessName || "").toUpperCase(),
      (actor.businessLocation || "").toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['NO', 'REG', 'NAMA', 'NIK', 'NO KK', 'PONSEL', 'ALAMAT', 'USAHA', 'ALAMAT USAHA']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 6.5
      },
      styles: { 
        fontSize: 6.5, 
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { halign: 'center', cellWidth: 15 },
        2: { cellWidth: 25 },
        3: { halign: 'center', cellWidth: 21 },
        4: { halign: 'center', cellWidth: 21 },
        5: { halign: 'center', cellWidth: 19 },
        6: { cellWidth: 28 },
        7: { cellWidth: 24 },
        8: { cellWidth: 30 },
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

export const generateLPJReceipt = (coordinator: string, actors: BusinessActor[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Tunas Bangsa
  addTunasBangsaHeader(doc);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TANDA TERIMA PENYERAHAN LPJ', pageWidth / 2, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`KOORDINATOR: ${coordinator.toUpperCase()}`, pageWidth / 2, 51, { align: 'center' });
  
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, 53, pageWidth / 2 + 40, 53);

  const tableData = actors.map((actor, index) => [
    index + 1,
    actor.registrationCode || '-',
    (actor.fullName || "").toUpperCase(),
    actor.nik || "-",
    (actor.address || "").toUpperCase(),
    ''  // Ceklist column
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['NO', 'REG ID', 'NAMA LENGKAP', 'NIK', 'ALAMAT', 'CEK']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [37, 99, 235], 
      textColor: 255, 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7
    },
    styles: { 
      fontSize: 7, 
      cellPadding: 1.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { halign: 'center', cellWidth: 35 },
      4: { cellWidth: 'auto' },
      5: { halign: 'center', cellWidth: 15 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Halaman ${data.pageNumber} | Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 
        pageWidth / 2, 
        doc.internal.pageSize.getHeight() - 10, 
        { align: 'center' }
      );
    }
  });

  // --- SIGNATURE & TERMS SECTION ---
  const finalTableY = (doc as any).lastAutoTable?.finalY || 60;
  let sigY = finalTableY + 15;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (sigY + 85 > pageHeight) {
    doc.addPage();
    sigY = 20;
  }

  // Auto-generated timestamp
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Dicetak otomatis pada: ${dateStr} pukul ${timeStr} WIB`, pageWidth - 14, sigY - 5, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Koordinator / Penyerah,', 30, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text(coordinator.toUpperCase(), 30, sigY + 30);

  doc.setFont('helvetica', 'normal');
  doc.text('Tim Verifikator,', pageWidth - 30, sigY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('SIMPU KEPRI', pageWidth - 30, sigY + 30, { align: 'right' });

  const termY = sigY + 45;
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.rect(10, termY, pageWidth - 20, 50, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('KETENTUAN PENYERAHAN LPJ', 15, termY + 8);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const terms = [
    '1. Jumlah Total Nota dan LPJ = Rp. 1.001.000 ( minimal ) dan Rp. 2.500.000 ( maksimal )',
    '2. LPJ diterima jika jumlah pelaku usaha pengajuan dan jumlah tidak ada Revisi / dikembalikan',
    '3. Jika terdapat jumlah yang tidak sesuai maka, semua LPJ dan Nota dikembalikan kepada Koordinator',
    '4. Untuk berkas yang diserahkan adalah LPJ dan Nota yang di Fotocopy ( tulisan harus jelas )',
    '5. Batas akhir penyerahan LPJ adalah 14 hari dan masa perbaikan LPJ yang salah adalah 7 hari',
    '6. Ketentuan ini bersifat mengikat dan wajib dilaksanakan tanpa terkecuali'
  ];

  terms.forEach((term, index) => {
    doc.text(term, 15, termY + 15 + (index * 5.5));
  });

  const cleanName = coordinator.replace(/[^a-z0-9]/gi, '_').toUpperCase();
  doc.save(`TANDA_TERIMA_LPJ_${cleanName}.pdf`);
};
