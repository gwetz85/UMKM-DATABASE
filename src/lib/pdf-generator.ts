import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessActor } from '@/app/lib/types';
import { generateBarcodeBase64, generateQRCodeBase64 } from './barcode-utils';
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

export const generateRegistrationForm = async (actor: BusinessActor, sequenceNumber?: number) => {
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
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('FORMULIR BIODATA PELAKU USAHA', pageWidth / 2, 50, { align: 'center' });
  
  if (sequenceNumber !== undefined) {
    const seqText = `NO: ${sequenceNumber}`;
    doc.setFontSize(9);
    const textWidth = doc.getTextWidth(seqText);
    const boxWidth = textWidth + 12;
    const boxHeight = 6.5;
    const boxX = pageWidth - margin - boxWidth;
    const boxY = 45;
    
    doc.setFillColor(37, 99, 235); // Primary Blue
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255); // White text
    doc.text(seqText, boxX + boxWidth / 2, boxY + 4.5, { align: 'center' });
    
    doc.setTextColor(0); // Reset
  }

  // Modern subtle underline for title
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.2);
  doc.line(pageWidth / 2 - 25, 54, pageWidth / 2 + 25, 54);

  // --- ACTOR DATA TABLE ---
  const sectionStyle = { 
    fillColor: [239, 246, 255], // blue-50
    textColor: [30, 64, 175], // blue-800
    fontStyle: 'bold' as any,
    halign: 'left' as any,
    fontSize: 8.5,
  };

  const tableData = [
    [{ content: 'I. DATA PRIBADI', colSpan: 2, styles: sectionStyle }],
    ['Nama Lengkap', `:  ${actor.fullName || '-'}`],
    ['NIK', `:  ${actor.nik || '-'}`],
    ['Nomor Kartu Keluarga', `:  ${actor.noKK || '-'}`],
    ['Jenis Kelamin', `:  ${actor.gender || '-'}`],
    ['Tempat Lahir', `:  ${actor.pob || parsePobDob(actor.pobDob || '').pob || '-'}`],
    ['Tanggal Lahir', `:  ${actor.dob || parsePobDob(actor.pobDob || '').dob || '-'}`],
    ['Nomor HP / WhatsApp', `:  ${actor.phone || '-'}`],
    ['Kecamatan / Kelurahan', `:  ${actor.kecamatan || '-'} / ${actor.kelurahan || '-'}`],
    ['Alamat Domisili', `:  ${actor.address || '-'}`],
    [{ content: 'II. INFORMASI USAHA', colSpan: 2, styles: sectionStyle }],
    ['Nama Usaha', `:  ${actor.businessName || '-'}`],
    ['Kategori Usaha', `:  ${actor.businessCategory || '-'}`],
    ['Lokasi Usaha', `:  ${actor.businessLocation || '-'}`],
    ['Korlap / Koordinator', `:  ${actor.coordinator || '-'}`],
    [{ content: 'III. DATA PERBANKAN', colSpan: 2, styles: sectionStyle }],
    ['Nama Bank', `:  ${actor.bankName || '-'}`],
    ['Nomor Rekening', `:  ${actor.bankNumber || '-'}`],
    ['Nama Pemilik Rekening', `:  ${actor.bankOwner || '-'}`],
  ];

  autoTable(doc, {
    startY: 60,
    body: tableData as any,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 4 },
      font: 'helvetica',
      textColor: [51, 65, 85], // slate-700
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 60 }, // slate-900
      1: { cellWidth: 'auto', textColor: [71, 85, 105] }, // slate-600
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      // Draw modern subtle bottom border for normal rows
      const rawRow = data.row.raw as any[];
      const isSection = Array.isArray(rawRow) && rawRow[0] && typeof rawRow[0] === 'object' && rawRow[0].content;
      if (!isSection) {
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.1);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- QR CODE ---
  const qrData = `Nomor Registrasi: ${regCode}\nNama Pelaku Usaha: ${actor.fullName || '-'}\nJenis Usaha: ${actor.businessCategory || '-'}\nKontak: ${actor.phone || '-'}\nAlamat: ${actor.address || '-'}`;
  const qrBase64 = await generateQRCodeBase64(qrData);
  
  // QR section needs ~25mm of space (18mm QR + some padding)
  const qrSectionHeight = 25;
  let qrY: number;

  if (finalY + 7 + qrSectionHeight > pageHeight - 10) {
    // Not enough space on this page, add a new page
    doc.addPage();
    qrY = 20;
  } else {
    // Enough space: place QR right below the table, but prefer bottom of page for aesthetics
    qrY = Math.max(finalY + 7, pageHeight - 10 - qrSectionHeight);
  }
  
  if (qrBase64) {
    const qrSize = 18;
    doc.addImage(qrBase64, 'PNG', margin, qrY, qrSize, qrSize);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('INFORMASI DIGITAL', margin + qrSize + 4, qrY + 4);
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(
      `Scan untuk melihat data:\n- ${regCode}\n- ${actor.fullName || '-'}\n- ${actor.businessCategory || '-'}`, 
      margin + qrSize + 4, 
      qrY + 8
    );
  }

  // --- FOOTER ---
  // Place footer parallel to the QR code on the right side
  const footerY = qrY + 16; // Align near the bottom of the QR code
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'italic');
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth - margin, footerY, { align: 'right' });

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

export const generateSuratPernyataan = (actor: BusinessActor) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  const dateStr = `Tanjungpinang, ${day} ${month} ${year}`;

  const materaiWidth = 24;
  const materaiHeight = 22;

  // ═══════════════════════════════════════════════════════════════════════════
  // HALAMAN 1 : KUITANSI (DENGAN KOLOM KHUSUS TITIK DUA DI DALAM GARIS DOUBLE)
  // ═══════════════════════════════════════════════════════════════════════════

  const kBoxLeft = margin;
  const kBoxTop = 12;
  const kBoxWidth = contentWidth;
  const kBoxHeight = 270;
  const kBoxRight = kBoxLeft + kBoxWidth;
  const kBoxBottom = kBoxTop + kBoxHeight;

  // 1. Kotak Bingkai Luar Utama
  doc.setDrawColor(0);
  doc.setLineWidth(0.7);
  doc.rect(kBoxLeft, kBoxTop, kBoxWidth, kBoxHeight);

  // 2. Header Judul "KUITANSI" (Font Times Bold dengan Garis Bawah)
  const kTitleLineY = kBoxTop + 26;
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text('KUITANSI', pageWidth / 2, kBoxTop + 16, { align: 'center' });

  const kuitansiWidth = doc.getTextWidth('KUITANSI');
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - kuitansiWidth / 2 - 1, kBoxTop + 18, pageWidth / 2 + kuitansiWidth / 2 + 1, kBoxTop + 18);

  // Garis horizontal pembatas bawah judul
  doc.setLineWidth(0.6);
  doc.line(kBoxLeft, kTitleLineY, kBoxRight, kTitleLineY);

  // 3. Grid Tengah
  const kMiddleSplitY = kBoxTop + 144; // Garis horizontal batas tengah
  doc.line(kBoxLeft, kMiddleSplitY, kBoxRight, kMiddleSplitY);

  // ── STRUKTUR KOLOM KUITANSI ──
  // Kolom 1 (Tahun Anggaran, Rekening Lembaga, Nomor Rekening): lebar 62mm
  const kCol1Width = 62;
  const kLineA = kBoxLeft + kCol1Width; // Garis A - MENEMBUS HINGGA DASAR KOTAK KUITANSI!
  doc.line(kLineA, kTitleLineY, kLineA, kBoxBottom);

  // Kolom 2 (Labels: Sudah terima dari, Uang sejumlah, Yaitu): lebar 22mm
  const kCol2Width = 22;
  const kLineB1 = kLineA + kCol2Width; // Garis B1 (garis kiri kolom titik dua)
  
  // Kolom Khusus Titik Dua (lebar 4.5mm): garis double membatasi titik dua ( : )
  const kColonColWidth = 4.5;
  const kLineB2 = kLineB1 + kColonColWidth; // Garis B2 (garis kanan kolom titik dua)
  const kColonCenterX = kLineB1 + (kColonColWidth / 2); // Posisi titik dua pas di tengah garis double

  // Garis Double (Line B1 dan Line B2) HANYA di grid tengah
  doc.line(kLineB1, kTitleLineY, kLineB1, kMiddleSplitY);
  doc.line(kLineB2, kTitleLineY, kLineB2, kMiddleSplitY);

  // ── ISI KOLOM 1 (Tahun Anggaran, Rekening Lembaga, Nomor Rekening) ──
  const kCol1Center = kBoxLeft + (kCol1Width / 2);

  // Blok 1: Tahun Anggaran
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Tahun Anggaran', kCol1Center, kTitleLineY + 22, { align: 'center' });
  doc.text('2026', kCol1Center, kTitleLineY + 28, { align: 'center' });

  // Blok 2: Rekening Lembaga
  doc.text('Rekening Lembaga', kCol1Center, kTitleLineY + 52, { align: 'center' });
  doc.text('PT. BANK RAKYAT INDONESIA', kCol1Center, kTitleLineY + 58, { align: 'center' });
  doc.text('Yayasan Tunas Bangsa Kepri', kCol1Center, kTitleLineY + 63.5, { align: 'center' });

  // Blok 3: Nomor Rekening
  doc.text('Nomor Rekening', kCol1Center, kTitleLineY + 86, { align: 'center' });
  doc.text('0174-01-017706-53-3', kCol1Center, kTitleLineY + 92, { align: 'center' });

  // ── ISI KOLOM 2 (Labels di sebelah kiri garis double) ──
  const kCol2X = kLineA + 2.5;

  // Row 1: Sudah terima dari
  doc.text('Sudah', kCol2X, kTitleLineY + 22);
  doc.text('terima dari', kCol2X, kTitleLineY + 27.5);

  // Row 2: Uang sejumlah
  doc.text('Uang', kCol2X, kTitleLineY + 52);
  doc.text('sejumlah', kCol2X, kTitleLineY + 57.5);

  // Row 3: Yaitu
  doc.text('Yaitu', kCol2X, kTitleLineY + 86);

  // ── ISI KOLOM TITIK DUA ( : ) PAS DI DALAM GARIS DOUBLE ──
  doc.text(':', kColonCenterX, kTitleLineY + 22, { align: 'center' });
  doc.text(':', kColonCenterX, kTitleLineY + 57.5, { align: 'center' });
  doc.text(':', kColonCenterX, kTitleLineY + 86, { align: 'center' });

  // ── ISI KOLOM 3 (Values di sebelah kanan garis double) ──
  const kCol3ValX = kLineB2 + 3.5;
  const kCol3ValWidth = kBoxRight - kCol3ValX - 3.5;

  // Row 1 Value: Sudah terima dari
  doc.text('Yayasan Tunas Bangsa Kepri', kCol3ValX, kTitleLineY + 22);

  // Row 2 Value: Uang sejumlah
  doc.text('Rp. 1.000.000', kCol3ValX, kTitleLineY + 52);
  doc.text('Satu Juta Rupiah', kCol3ValX, kTitleLineY + 57.5);

  // Row 3 Value: Yaitu
  const yaituDesc = 'Bantuan Modal Usaha Bagi Pelaku Usaha Kota Tanjungpinang untuk Kegiatan Bantuan Penguatan Pemodalan Usaha Mikro Kecil Dan Menengah ( UMKM ) Tahun 2026';
  doc.text(yaituDesc, kCol3ValX, kTitleLineY + 86, {
    maxWidth: kCol3ValWidth,
    lineHeightFactor: 1.25,
  });

  // ── BAGIAN BAWAH (TANDA TANGAN KUITANSI PERSIS ASLI) ──
  // 1. Tanda Tangan Kiri (Ketua Yayasan) - Terpusat di dalam kolom 1
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Mengetahui/menyetujui', kCol1Center, kMiddleSplitY + 18, { align: 'center' });
  doc.text('Ketua Yayasan Tunas Bangsa', kCol1Center, kMiddleSplitY + 24, { align: 'center' });
  doc.text('Kepulauan Riau', kCol1Center, kMiddleSplitY + 30, { align: 'center' });

  // Nama Ketua Yayasan dengan Garis Bawah
  const ketuaName = 'Toh Muandy Saputra';
  doc.text(ketuaName, kCol1Center, kMiddleSplitY + 80, { align: 'center' });
  const ketuaNameWidth = doc.getTextWidth(ketuaName);
  doc.setLineWidth(0.5);
  doc.line(kCol1Center - ketuaNameWidth / 2, kMiddleSplitY + 81.5, kCol1Center + ketuaNameWidth / 2, kMiddleSplitY + 81.5);

  // 2. Tanda Tangan Kanan (Penerima Dana Bantuan) - Terpusat di area kanan
  const kRightColCenter = kLineA + ((kBoxRight - kLineA) / 2);

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(dateStr, kRightColCenter, kMiddleSplitY + 32, { align: 'center' });
  doc.text('Penerima Dana Bantuan', kRightColCenter, kMiddleSplitY + 38, { align: 'center' });

  // Kotak Materai di area tanda tangan kanan
  const kMateraiX = kRightColCenter - 30;
  const kMateraiY = kMiddleSplitY + 45;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(kMateraiX, kMateraiY, materaiWidth, materaiHeight);
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text('MATERAI', kMateraiX + materaiWidth / 2, kMateraiY + materaiHeight / 2 - 1, { align: 'center' });
  doc.text('TEMPEL', kMateraiX + materaiWidth / 2, kMateraiY + materaiHeight / 2 + 3, { align: 'center' });

  // Nama Pelaku Usaha Terpusat di kolom kanan sejajar dengan nama Ketua Yayasan di kiri
  doc.setTextColor(0);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text((actor.fullName || '-').toUpperCase(), kRightColCenter, kMiddleSplitY + 80, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════════
  // HALAMAN 2 : SURAT PERNYATAAN (DENGAN FONT TIMES NEW ROMAN)
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  // ── JUDUL ──────────────────────────────────────────────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('SURAT PERNYATAAN', pageWidth / 2, 22, { align: 'center' });

  // Garis bawah judul
  const spTitleWidth = doc.getTextWidth('SURAT PERNYATAAN');
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - spTitleWidth / 2 - 2, 24, pageWidth / 2 + spTitleWidth / 2 + 2, 24);

  // ── DATA PELAKU USAHA ──────────────────────────────────────────────────────
  let y = 33;
  const labelX = margin;
  const colonX = margin + 55;
  const valueX = colonX + 3;
  const lineH = 5.8;

  // Pembuka
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('Yang bertandatangan dibawah ini :', labelX, y - 2);
  y += 3.8;

  const drawField = (label: string, value: string) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0);

    doc.text(label, labelX, y);
    doc.text(':', colonX, y);
    doc.text(value || '-', valueX, y);
    y += lineH;
  };

  drawField('Nama', (actor.fullName || '-').toUpperCase());
  drawField('N.I.K', actor.nik || '-');
  drawField('Jenis Usaha', (actor.businessName || actor.businessCategory || '-').toUpperCase());
  drawField('Alamat Usaha', (actor.businessLocation || actor.address || '-').toUpperCase());

  // Alamat lengkap + HP (multi-line layout)
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('Alamat dan Nomor Telepon / HP', labelX, y);
  doc.text(':', colonX, y);
  const alamatLine1 = `${(actor.address || '-').toUpperCase()}  RT.${actor.rtRw || '-'}`;
  const alamatLine2 = `Kel. ${(actor.kelurahan || '-').toUpperCase()}   Kec. ${(actor.kecamatan || '-').toUpperCase()}`;
  const alamatLine3 = `Kota Tanjungpinang  Telp / Hp : ${actor.phone || '-'}`;

  doc.text(alamatLine1, valueX, y);
  y += lineH - 0.8;
  doc.text('Pelaku Usaha', labelX, y);
  doc.text(alamatLine2, valueX, y);
  y += lineH - 0.8;
  doc.text(alamatLine3, valueX, y);
  y += lineH + 1.5;

  // ── POIN-POIN PERNYATAAN ───────────────────────────────────────────────────
  doc.setFontSize(10);

  const pointNumX = margin;
  const pointTextX = margin + 6;
  const pointWidth = pageWidth - margin - pointTextX;

  const addPoint = (num: number, text: string) => {
    const lines = doc.splitTextToSize(text, pointWidth);
    doc.setFont('times', 'normal');
    doc.text(`${num}.`, pointNumX, y);
    doc.text(text, pointTextX, y, {
      align: 'justify',
      maxWidth: pointWidth,
      lineHeightFactor: 1.3,
    });
    y += lines.length * 5.2 + 3.8;
  };

  addPoint(
    1,
    'Telah menerima Dana Bantuan Modal Usaha berupa kegiatan Bantuan Penguatan Pemodalan Usaha Mikro Kecil Dan Menengah ( UMKM ) sebesar Rp. 1.000.000,- (Satu Juta Rupiah) Dari Yayasan Tunas Bangsa Kepri berdasarkan proposal yang Telah Diajukan Kepada Pemerintah Provinsi Kepulauan Riau tahun 2026'
  );

  addPoint(
    2,
    'Dana bantuan tersebut akan dipergunakan untuk Pelaksanaan Kegiatan sesuai dengan Peruntukannya.'
  );

  addPoint(
    3,
    'Yang bertandatangan dibawah ini menyatakan tidak akan menggunakan dana bantuan tersebut untuk kepentingan pribadi, dan atau memberikan kepada Pengurus Dari Yayasan Tunas Bangsa Kepri yang berkaitan dengan urusan keuangan serta pihak-pihak lain yang tidak ada kaitannya dengan kegiatan/acara yang tercantum dalam Kegiatan dimaksud.'
  );

  addPoint(
    4,
    'Yang bertandatangan dibawah ini menyatakan bersedia membuat laporan pertanggungjawaban keuangan penggunaan dana bantuan yang diterima dan mengembalikannya kepada Yayasan Tunas Bangsa Kepri, paling lama 2 (dua) minggu setelah dana diterima dari Yayasan Tunas Bangsa Kepri'
  );

  addPoint(
    5,
    'Yang bertandatangan dibawah ini menyatakan akan menyimpan bukti-bukti yang diperlukan dan bersedia menyiapkan data apabila sewaktu-waktu akan diperiksa / diaudit oleh Badan atau Lembaga Pengawas/Pemeriksa/Auditor yang ditunjuk oleh Pemerintah Provinsi Kepulauan Riau.'
  );

  addPoint(
    6,
    'Biaya transfer dana bantuan dibebankan kepada penerima dana bantuan, sesuai dengan tarif yang ditetapkan oleh bank tersebut.'
  );

  addPoint(
    7,
    'Pernyataan ini kami buat dalam kesadaran yang penuh dan tanpa tekanan dari siapapun. Saya selaku pemilik usaha dan Penanggung Jawab Pengguna Dana yang diterima dari Yayasan Tunas Bangsa Kepri bersedia untuk dituntut secara hukum apabila kami tidak membuat laporan pertanggungjawaban sebagaimana tercantum pada butir 4 diatas dan melakukan hal-hal yang dilarang sebagaimana tercantum pada butir 3 diatas.'
  );

  // ── TANDA TANGAN HALAMAN 2 ─────────────────────────────────────────────────
  y += 2;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  const spDateWidth = doc.getTextWidth(dateStr);
  const spDateStartX = pageWidth - margin - spDateWidth;
  const spDateCenterX = spDateStartX + (spDateWidth / 2);

  // 1. Tanggal
  doc.text(dateStr, spDateStartX, y);
  y += 5.0;

  // 2. Teks "Penerima Dana Bantuan"
  doc.text('Penerima Dana Bantuan', spDateCenterX, y, { align: 'center' });

  // 3. Kotak Materai
  const spMateraiX = spDateStartX;
  y += 5.0;

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(spMateraiX, y, materaiWidth, materaiHeight);
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text('MATERAI', spMateraiX + materaiWidth / 2, y + materaiHeight / 2 - 1, { align: 'center' });
  doc.text('TEMPEL', spMateraiX + materaiWidth / 2, y + materaiHeight / 2 + 3, { align: 'center' });

  // 4. Nama Pelaku Usaha
  y += materaiHeight + 5.0;
  doc.setTextColor(0);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text((actor.fullName || '-').toUpperCase(), spDateCenterX, y, { align: 'center' });

  // ── SIMPAN DOKUMEN ────────────────────────────────────────────────────────
  const safeName = (actor.fullName || 'PELAKU_USAHA').replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const safeNik = actor.nik || 'NIK';
  doc.save(`BERKAS_PENCAIRAN_${safeName}_${safeNik}.pdf`);
};
