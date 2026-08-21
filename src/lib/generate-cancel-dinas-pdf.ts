import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessActor } from '@/app/lib/types';
import { generateQRCodeBase64 } from './barcode-utils';
import { parsePobDob } from './utils';

/**
 * Format tanggal dalam format bahasa Indonesia yang rapi (contoh: 19 Agustus 2026, 14:30 WIB)
 */
function formatTanggalIndo(dateInput?: string | Date | null, withTime = true): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    const bulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const tgl = d.getDate();
    const bln = bulan[d.getMonth()];
    const thn = d.getFullYear();

    if (!withTime) {
      return `${tgl} ${bln} ${thn}`;
    }

    const jam = String(d.getHours()).padStart(2, '0');
    const menit = String(d.getMinutes()).padStart(2, '0');
    return `${tgl} ${bln} ${thn}, pukul ${jam}:${menit} WIB`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Helper to fetch logo and convert to base64
 */
async function loadLogoBase64(): Promise<string | null> {
  const logoUrls = ['/logo-kepri.png', '/logo.png', '/icon-192.png'];
  for (const url of logoUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Generate 1-Page A4 Modern PDF for Cancel Dinas
 */
export async function generateCancelDinasPDF(actor: BusinessActor): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR; // 182 mm

  // ── 1. KOP SURAT RESMI ───────────────────────────────────────────────────
  const logoBase64 = await loadLogoBase64();
  const kopTopY = 7;
  const logoSize = 20;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', marginL, kopTopY + 1, logoSize, logoSize);
    } catch (e) {
      console.warn('Gagal memuat logo KOP:', e);
    }
  }

  const kopCenterX = marginL + logoSize + (contentW - logoSize) / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('PEMERINTAH PROVINSI KEPULAUAN RIAU', kopCenterX, kopTopY + 3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('DINAS KOPERASI, USAHA KECIL DAN MENENGAH', kopCenterX, kopTopY + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Pusat Pemerintahan Provinsi Kepulauan Riau Gedung Daeng Marewah Lt. 3', kopCenterX, kopTopY + 12, { align: 'center' });
  doc.text('Pulau Dompak Seri Darul Makmur – Tanjungpinang Kode Pos 29124', kopCenterX, kopTopY + 15.5, { align: 'center' });
  doc.text('Pos-el : diskopukmsprovinsikepri@gmail.com | Laman : www.dinaskoperasiukm.kepriprov.go.id', kopCenterX, kopTopY + 19, { align: 'center' });

  // Double Line Divider
  const lineY = kopTopY + 23;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(marginL, lineY, pageW - marginR, lineY);
  doc.setLineWidth(0.2);
  doc.line(marginL, lineY + 0.9, pageW - marginR, lineY + 0.9);

  // ── 2. JUDUL DOKUMEN & BADGE PEMBATALAN ──────────────────────────────────
  const titleY = lineY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text('FORM PEMBATALAN DINAS', pageW / 2, titleY, { align: 'center' });

  // Status Banner Box (Rose / Red Alert Styling)
  const bannerY = titleY + 4;
  const bannerH = 7.5;
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(252, 165, 165); // red-300
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, bannerY, contentW, bannerH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text('STATUS: DIBATALKAN OLEH DINAS (TIDAK LOLOS VERIFIKASI)', marginL + 4, bannerY + 4.8);

  const regCode = actor.registrationCode || actor.id?.slice(0, 8).toUpperCase() || 'NO-REG';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`KODE REG: ${regCode}`, pageW - marginR - 4, bannerY + 4.8, { align: 'right' });

  // ── 3. SUSUNAN DATA TABEL LENGKAP (A4 PRECISION) ─────────────────────────
  const parsed = parsePobDob(actor.pobDob || '');
  const tempatLahir = actor.pob || parsed.pob || '-';
  const tglLahir = actor.dob || parsed.dob || '-';
  const tempatTglLahir = `${tempatLahir} / ${tglLahir}`;

  const alasanCancel = (actor as any).alasanCancelDinas || actor.rejectionReason || actor.keteranganDinas || 'Tidak ada catatan alasan spesifik dari petugas.';
  let rawPetugas = (actor as any).cancelDinasBy || actor.verifikatorDinas || (actor as any).lastDraftBy || 'Petugas Verifikator Dinas';
  if (rawPetugas.includes('@')) {
    rawPetugas = rawPetugas.split('@')[0].replace(/_/g, ' ').toUpperCase();
  }
  const petugasCancel = rawPetugas;
  const waktuCancel = (actor as any).cancelDinasAt ? formatTanggalIndo((actor as any).cancelDinasAt, true) : formatTanggalIndo(new Date(), true);

  const sectionStylePribadi = {
    fillColor: [241, 245, 249], // slate-100
    textColor: [15, 23, 42], // slate-900
    fontStyle: 'bold' as const,
    fontSize: 7.5,
    cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
  };

  const sectionStyleCancel = {
    fillColor: [254, 226, 226], // red-100
    textColor: [153, 27, 27], // red-900
    fontStyle: 'bold' as const,
    fontSize: 7.5,
    cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
  };

  const tableRows: any[] = [
    // --- SECTION A: DATA PRIBADI ---
    [{ content: 'A. DATA PRIBADI PELAKU USAHA', colSpan: 4, styles: sectionStylePribadi }],
    [
      { content: '1. Nama Lengkap', styles: { fontStyle: 'bold', cellWidth: 38 } },
      { content: `: ${(actor.fullName || '-').toUpperCase()}`, styles: { cellWidth: 53, fontStyle: 'bold' } },
      { content: '2. NIK', styles: { fontStyle: 'bold', cellWidth: 38 } },
      { content: `: ${actor.nik || '-'}`, styles: { cellWidth: 53, fontStyle: 'bold' } },
    ],
    [
      { content: '3. No. Kartu Keluarga (KK)', styles: { fontStyle: 'bold' } },
      { content: `: ${actor.noKK || '-'}` },
      { content: '4. Jenis Kelamin', styles: { fontStyle: 'bold' } },
      { content: `: ${actor.gender || '-'}` },
    ],
    [
      { content: '5. Tempat / Tgl Lahir', styles: { fontStyle: 'bold' } },
      { content: `: ${tempatTglLahir}` },
      { content: '6. Nomor HP / WhatsApp', styles: { fontStyle: 'bold' } },
      { content: `: ${actor.phone || '-'}` },
    ],
    [
      { content: '7. Alamat Domisili', styles: { fontStyle: 'bold' } },
      { content: `: ${(actor.address || '-').toUpperCase()}`, colSpan: 3 },
    ],
    [
      { content: '8. RT / RW', styles: { fontStyle: 'bold' } },
      { content: `: ${actor.rtRw || '-'}` },
      { content: '9. Kelurahan / Kecamatan', styles: { fontStyle: 'bold' } },
      { content: `: ${(actor.kelurahan || '-').toUpperCase()} / ${(actor.kecamatan || '-').toUpperCase()}` },
    ],

    // --- SECTION B: DATA USAHA ---
    [{ content: 'B. DATA USAHA & USULAN', colSpan: 4, styles: sectionStylePribadi }],
    [
      { content: '10. Nama Usaha', styles: { fontStyle: 'bold' } },
      { content: `: ${(actor.businessName || '-').toUpperCase()}`, styles: { fontStyle: 'bold' } },
      { content: '11. Kategori Usaha', styles: { fontStyle: 'bold' } },
      { content: `: ${(actor.businessCategory || '-').toUpperCase()}` },
    ],
    [
      { content: '12. Lokasi / Alamat Usaha', styles: { fontStyle: 'bold' } },
      { content: `: ${(actor.businessLocation || '-').toUpperCase()}`, colSpan: 3 },
    ],
    [
      { content: '13. Koordinator / Usulan', styles: { fontStyle: 'bold' } },
      { content: `: ${(actor.coordinator || '-').toUpperCase()}` },
      { content: '14. Petugas Survey Lapangan', styles: { fontStyle: 'bold' } },
      { content: `: ${(actor.petugasSurvey || '-').toUpperCase()}` },
    ],

    // --- SECTION C: DATA PERBANKAN ---
    [{ content: 'C. DATA PERBANKAN', colSpan: 4, styles: sectionStylePribadi }],
    [
      { content: '15. Nama Bank', styles: { fontStyle: 'bold' } },
      { content: `: ${actor.bankName || '-'}` },
      { content: '16. No. Rekening / Atas Nama', styles: { fontStyle: 'bold' } },
      { content: `: ${actor.bankNumber || '-'} a.n ${(actor.bankOwner || '-').toUpperCase()}` },
    ],

    // --- SECTION D: ALASAN & DETAIL CANCEL DINAS ---
    [{ content: 'D. KETERANGAN & ALASAN PEMBATALAN (DINAS)', colSpan: 4, styles: sectionStyleCancel }],
    [
      { content: '17. Status Pembatalan', styles: { fontStyle: 'bold', textColor: [185, 28, 28] } },
      { content: ': DIBATALKAN PADA TAHAP VERIFIKASI / SURVEY DINAS', colSpan: 3, styles: { fontStyle: 'bold', textColor: [185, 28, 28] } },
    ],
    [
      { content: '18. Petugas Pembatal', styles: { fontStyle: 'bold' } },
      { content: `: ${petugasCancel.toUpperCase()}`, colSpan: 3, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: '19. Waktu Pembatalan', styles: { fontStyle: 'bold' } },
      { content: `: ${waktuCancel}`, colSpan: 3 },
    ],
    [
      { content: '20. Alasan Pembatalan', styles: { fontStyle: 'bold', valign: 'top', textColor: [185, 28, 28] } },
      { 
        content: `: "${alasanCancel}"`, 
        colSpan: 3, 
        styles: { 
          fontStyle: 'bolditalic', 
          textColor: [185, 28, 28],
          fillColor: [255, 241, 242] // light rose
        } 
      },
    ],
  ];

  const tableStartY = bannerY + bannerH + 3.5;

  autoTable(doc, {
    startY: tableStartY,
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: { top: 1.6, right: 2.5, bottom: 1.6, left: 2.5 },
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225], // slate-300
      lineWidth: 0.2,
      valign: 'middle',
    },
    margin: { left: marginL, right: marginR },
  });

  const finalTableY = (doc as any).lastAutoTable.finalY || 205;

  // ── 4. QR CODE & TANDA TANGAN PENGESAHAN ──────────────────────────────────
  const bottomY = Math.max(finalTableY + 4, 215);

  // Generate QR Code with metadata
  const qrMetadata = `PEMBATALAN DINAS (SIMPU)\nNama: ${actor.fullName}\nNIK: ${actor.nik}\nUsaha: ${actor.businessName}\nStatus: CANCEL DINAS\nPetugas: ${petugasCancel}\nAlasan: ${alasanCancel}`;
  const qrBase64 = await generateQRCodeBase64(qrMetadata);

  if (qrBase64) {
    const qrSize = 22;
    doc.addImage(qrBase64, 'PNG', marginL + 2, bottomY, qrSize, qrSize);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('VERIFIKASI DIGITAL', marginL + qrSize + 5, bottomY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Dokumen ini diterbitkan secara elektronik', marginL + qrSize + 5, bottomY + 9);
    doc.text('oleh Sistem SIMPU Dinas Koperasi & UKM', marginL + qrSize + 5, bottomY + 12.5);
    doc.text('Provinsi Kepulauan Riau.', marginL + qrSize + 5, bottomY + 16);
    doc.text(`Kode Otentikasi: ${actor.id.slice(0, 12)}`, marginL + qrSize + 5, bottomY + 19.5);
  }

  // Lembar Tanda Tangan Petugas di sisi kanan
  const sigRightX = pageW - marginR - 5;
  const tglCetak = formatTanggalIndo(new Date(), false);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Tanjungpinang, ${tglCetak}`, sigRightX, bottomY + 2, { align: 'right' });
  doc.text('Petugas Verifikator / Pembatal,', sigRightX, bottomY + 6.5, { align: 'right' });

  // Area tanda tangan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const namaPetugasTtd = (petugasCancel.includes('@') ? petugasCancel.split('@')[0] : petugasCancel).toUpperCase();
  doc.text(`( ${namaPetugasTtd} )`, sigRightX, bottomY + 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Dinas Koperasi & UKM Prov. Kepri', sigRightX, bottomY + 29.5, { align: 'right' });

  // ── 5. FOOTER DOKUMEN ────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(marginL, 287, pageW - marginR, 287);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `SIMPU KEPRI | Dokumen Pembatalan Resmi | Dicetak pada: ${new Date().toLocaleString('id-ID')} | Halaman 1 dari 1 (A4)`,
    pageW / 2,
    291,
    { align: 'center' }
  );

  // ── 6. SIMPAN FILE PDF ───────────────────────────────────────────────────
  const sanitizedName = (actor.fullName || 'PELAKU_USAHA').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const filename = `FORM_CANCEL_DINAS_${regCode}_${sanitizedName}.pdf`;
  doc.save(filename);
}
