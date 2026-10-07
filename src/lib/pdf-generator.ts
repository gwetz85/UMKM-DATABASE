import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessActor } from '@/app/lib/types';
import { generateBarcodeBase64, generateQRCodeBase64 } from './barcode-utils';
import { parsePobDob, calculateAge, extractDobFromNik, formatCurrency } from './utils';
import { getActorCurrentMenu } from './actor-menu-status';

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

interface ResolvedOfficerInfo {
  nama: string;
  nipppk: string;
}

const buildOfficerResolver = (allActors: BusinessActor[], systemUsers?: any[]) => {
  const userByName = new Map<string, any>();
  const userByUsername = new Map<string, any>();
  const surveyorToVerif = new Map<string, ResolvedOfficerInfo>();

  if (Array.isArray(systemUsers)) {
    systemUsers.forEach((u: any) => {
      if (!u) return;
      const fullUpper = u.fullName ? String(u.fullName).toUpperCase().trim() : '';
      const idUpper = u.id ? String(u.id).toUpperCase().trim() : '';
      const unameLower = u.username ? String(u.username).toLowerCase().trim() : '';
      if (fullUpper) userByName.set(fullUpper, u);
      if (idUpper) userByName.set(idUpper, u);
      if (unameLower) userByUsername.set(unameLower, u);

      const pdVerif = u.pejabatData?.verifikator;
      if (pdVerif?.nama && pdVerif.nama.trim() !== '' && pdVerif.nama.trim() !== '-' && pdVerif.nama.trim() !== 'Belum Ditentukan') {
        const vInfo: ResolvedOfficerInfo = {
          nama: String(pdVerif.nama).trim().toUpperCase(),
          nipppk: pdVerif.nipppk ? String(pdVerif.nipppk).trim() : '',
        };
        if (fullUpper) surveyorToVerif.set(fullUpper, vInfo);
        if (idUpper) surveyorToVerif.set(idUpper, vInfo);
        if (unameLower) surveyorToVerif.set(unameLower.toUpperCase(), vInfo);
      }
    });
  }

  // Enrich surveyor -> verifikator mapping from actors that already have both recorded
  allActors.forEach((a) => {
    if (!a) return;
    const sd = (a as any).surveyData || {};
    const pRaw = (
      a.petugasSurvey ||
      a.pejabatData?.petugas?.nama ||
      sd.pejabatData?.petugas?.nama ||
      ''
    ).toUpperCase().trim();

    const vRaw = (
      a.pejabatData?.verifikator?.nama ||
      sd.pejabatData?.verifikator?.nama ||
      a.verifikatorDinas ||
      (a as any).berkasDinasVerifiedBy ||
      ''
    ).trim();

    if (
      pRaw &&
      pRaw !== '-' &&
      pRaw !== 'BELUM ADA' &&
      vRaw &&
      vRaw !== '-' &&
      vRaw !== 'Belum Ditentukan' &&
      vRaw !== 'Verifikator Dinas'
    ) {
      const vNip =
        a.pejabatData?.verifikator?.nipppk ||
        sd.pejabatData?.verifikator?.nipppk ||
        '';
      if (!surveyorToVerif.has(pRaw)) {
        surveyorToVerif.set(pRaw, {
          nama: vRaw.toUpperCase(),
          nipppk: vNip ? String(vNip).trim() : '',
        });
      }
    }
  });

  const isValidName = (val?: string | null, invalidPlaceholders: string[] = []) => {
    if (!val) return false;
    const clean = String(val).trim();
    if (!clean || clean === '-') return false;
    const upper = clean.toUpperCase();
    return !invalidPlaceholders.some((p) => p.toUpperCase() === upper);
  };

  const resolvePetugas = (actor: BusinessActor): ResolvedOfficerInfo => {
    const sd = (actor as any).surveyData || {};
    const pdPetugas = actor.pejabatData?.petugas || sd.pejabatData?.petugas;

    let rawName = '';
    if (isValidName(actor.petugasSurvey, ['BELUM ADA'])) {
      rawName = String(actor.petugasSurvey).trim();
    } else if (isValidName(pdPetugas?.nama, ['BELUM ADA', 'Belum Ditentukan'])) {
      rawName = String(pdPetugas.nama).trim();
    } else if (isValidName(actor.verifiedDinasBy, ['Petugas Survey', 'Verifikator Dinas', 'BELUM ADA'])) {
      rawName = String(actor.verifiedDinasBy).trim();
    } else if (isValidName(actor.createdBy, ['BELUM ADA', 'Admin'])) {
      rawName = String(actor.createdBy).trim();
    }

    let nipppk = pdPetugas?.nipppk ? String(pdPetugas.nipppk).trim() : '';

    if (rawName) {
      const upper = rawName.toUpperCase().trim();
      const lower = rawName.toLowerCase().trim();
      const found = userByName.get(upper) || userByUsername.get(lower);
      if (found) {
        if (found.fullName) rawName = String(found.fullName).trim();
        if (!nipppk && found.nipppk) nipppk = String(found.nipppk).trim();
      }
    }

    return {
      nama: rawName ? rawName.toUpperCase() : '-',
      nipppk,
    };
  };

  const resolveVerifikator = (actor: BusinessActor, petugasInfo: ResolvedOfficerInfo): ResolvedOfficerInfo => {
    const sd = (actor as any).surveyData || {};
    const pdVerif = actor.pejabatData?.verifikator || sd.pejabatData?.verifikator;

    let rawName = '';
    if (isValidName(pdVerif?.nama, ['Belum Ditentukan', 'BELUM ADA'])) {
      rawName = String(pdVerif.nama).trim();
    } else if (isValidName(actor.verifikatorDinas, ['Belum Ditentukan', 'BELUM ADA'])) {
      rawName = String(actor.verifikatorDinas).trim();
    } else if (isValidName((actor as any).berkasDinasVerifiedBy, ['Verifikator Dinas', 'Belum Ditentukan', 'BELUM ADA'])) {
      rawName = String((actor as any).berkasDinasVerifiedBy).trim();
    }

    let nipppk = pdVerif?.nipppk ? String(pdVerif.nipppk).trim() : '';

    if (!rawName && petugasInfo.nama && petugasInfo.nama !== '-') {
      const mapped = surveyorToVerif.get(petugasInfo.nama.toUpperCase().trim());
      if (mapped) {
        rawName = mapped.nama;
        if (!nipppk && mapped.nipppk) nipppk = mapped.nipppk;
      }
    }

    if (rawName) {
      const upper = rawName.toUpperCase().trim();
      const lower = rawName.toLowerCase().trim();
      const found = userByName.get(upper) || userByUsername.get(lower);
      if (found) {
        if (found.fullName) rawName = String(found.fullName).trim();
        if (!nipppk && found.nipppk) nipppk = String(found.nipppk).trim();
      }
    }

    return {
      nama: rawName ? rawName.toUpperCase() : '-',
      nipppk,
    };
  };

  return { resolvePetugas, resolveVerifikator };
};

const renderCoordinatorSectionTable = (
  doc: jsPDF,
  coordinator: string,
  actors: BusinessActor[],
  resolver: ReturnType<typeof buildOfficerResolver>
) => {
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm on landscape A4
  const margin = 8;
  const coordUpper = (coordinator || 'TANPA KOORDINATOR').toUpperCase().trim();

  // Sort actors alphabetically by fullName for neat presentation
  const sortedActors = [...actors].sort((a, b) =>
    String(a.fullName || '').localeCompare(String(b.fullName || ''))
  );

  // Compute Coordinator Summary Stats
  let surveyCount = 0;
  let layakCount = 0;
  let rekeningCount = 0;
  let verifDinasCount = 0;

  sortedActors.forEach((a) => {
    const sd = (a as any).surveyData || {};
    const hasSurvey = Boolean(sd.hasilSurvey || sd.tanggalSurvey || sd.namaUsaha || sd.modalUsaha);
    if (hasSurvey) surveyCount++;
    if (String(sd.hasilSurvey || '').toLowerCase() === 'layak' || a.hasilVerifikasiDinas === 'Lolos') {
      layakCount++;
    }
    if (a.bankNumber && String(a.bankNumber).trim() !== '' && String(a.bankNumber).trim() !== '-') {
      rekeningCount++;
    }
    if (a.berkasDinasVerified || a.status === 'finish' || (a.status === 'verified_dinas' && a.hasilVerifikasiDinas === 'Lolos')) {
      verifDinasCount++;
    }
  });

  // --- TIER 1: TOP HEADER BANNER ---
  doc.setFillColor(30, 58, 138); // Deep Blue header bar
  doc.roundedRect(margin, 7, pageWidth - margin * 2, 13.5, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TUNAS BANGSA KEPULAUAN RIAU - DATABASE PELAKU USAHA (SIMPU)', margin + 4, 12.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(219, 234, 254); // blue-100
  doc.text(
    'Laporan Lengkap Biodata, Hasil Survey, Rekening Bank, Petugas Survey & Verifikator Dinas',
    margin + 4,
    17.6
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(191, 219, 254); // blue-200
  doc.text('PENANGGUNG JAWAB / KOORDINATOR', pageWidth - margin - 4, 12.2, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(254, 240, 138); // yellow-200
  doc.text(`KOORDINATOR: ${coordUpper}`, pageWidth - margin - 4, 17.6, { align: 'right' });

  // --- TIER 2: DEDICATED SUMMARY STATS RIBBON BAR (NO OVERLAP) ---
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, 21.8, pageWidth - margin * 2, 6.2, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(`REKAPITULASI DATA (${coordUpper})`, margin + 4, 25.9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(
    `Total: ${sortedActors.length} Pelaku Usaha   |   Sudah Survey: ${surveyCount}   |   Layak/Lolos: ${layakCount}   |   Sudah Rekening: ${rekeningCount}   |   Lolos Verifikasi: ${verifDinasCount}`,
    pageWidth - margin - 4,
    25.9,
    { align: 'right' }
  );

  doc.setTextColor(0);

  // Build rows with complete information
  const rowMeta: { hasilSurvey: string; hasBank: boolean }[] = [];

  const tableData = sortedActors.map((actor, index) => {
    const sd = (actor as any).surveyData || {};
    const parsedPobDob = parsePobDob(actor.pobDob || '');
    const pob = (actor.pob || parsedPobDob.pob || '-').toUpperCase();
    const dob = actor.dob || parsedPobDob.dob || extractDobFromNik(actor.nik || '') || '-';
    const age = calculateAge(dob);
    const gender = actor.gender || sd.jenisKelamin || '-';
    const regCode = actor.registrationCode || '-';

    // Col 1: Biodata Pelaku Usaha
    const colBiodata = [
      (actor.fullName || '-').toUpperCase(),
      `Reg: ${regCode}`,
      `JK: ${gender}`,
      `TTL: ${pob}, ${dob}`,
      `Umur: ${age}`,
    ].join('\n');

    // Col 2: NIK, No. KK & Kontak
    const phoneVal = actor.phone || sd.noHp || '-';
    const colIdentitasLines = [
      `NIK: ${actor.nik || '-'}`,
      `KK: ${actor.noKK || '-'}`,
      `HP: ${phoneVal}`,
    ];
    if (sd.email && sd.email !== '-') colIdentitasLines.push(`Email: ${sd.email}`);
    if (sd.sosmed && sd.sosmed !== '-') colIdentitasLines.push(`Sosmed: ${sd.sosmed}`);
    const colIdentitas = colIdentitasLines.join('\n');

    // Col 3: Alamat Domisili Lengkap
    const addressVal = (actor.address || sd.alamatRumah || '-').toUpperCase();
    const colAlamat = [
      addressVal,
      `RT/RW: ${actor.rtRw || '-'}`,
      `Kel: ${(actor.kelurahan || '-').toUpperCase()}`,
      `Kec: ${(actor.kecamatan || '-').toUpperCase()}`,
    ].join('\n');

    // Col 4: Data Usaha & Lokasi
    const usahaName = (actor.businessName || sd.namaUsaha || '-').toUpperCase();
    const kategori = (actor.businessCategory || '-').toUpperCase();
    const bidang = sd.bidangUsaha || '-';
    const thnBerdiri = sd.tahunBerdiri || '-';
    const izinStr = Array.isArray(sd.izin) && sd.izin.length > 0 ? sd.izin.join(', ') : '-';
    const lokasiUsaha = (actor.businessLocation || sd.alamatUsaha || actor.address || '-').toUpperCase();
    const colUsaha = [
      usahaName,
      `Kat: ${kategori}`,
      `Bidang: ${bidang}`,
      `Thn: ${thnBerdiri} | Izin: ${izinStr}`,
      `Lokasi: ${lokasiUsaha}`,
    ].join('\n');

    // Col 5: Rincian Hasil Survey Lapangan
    const statusKeluarga = sd.status || '-';
    const dtksStr =
      sd.dtks?.masuk === true
        ? `Ya (${sd.dtks.jenis || 'Bansos'})`
        : sd.dtks?.masuk === false
          ? 'Tidak'
          : '-';
    const modalStr = sd.modalUsaha ? formatCurrency(sd.modalUsaha) : '-';
    const omsetStr = sd.omset ? formatCurrency(sd.omset) : '-';
    const peralatanStr = sd.peralatan || '-';
    const hibahStr =
      sd.hibah?.pernah === true
        ? `Pernah${sd.hibah.dariMana ? ' (' + sd.hibah.dariMana + (sd.hibah.tahun ? ' ' + sd.hibah.tahun : '') + ')' : ''}`
        : sd.hibah?.pernah === false
          ? 'Tidak'
          : '-';

    const colRincianSurvey = [
      `Keluarga: ${statusKeluarga}`,
      `DTKS: ${dtksStr}`,
      `Modal: ${modalStr}`,
      `Omset: ${omsetStr}`,
      `Alat: ${peralatanStr}`,
      `Hibah: ${hibahStr}`,
    ].join('\n');

    // Col 6: Rencana Penggunaan
    const colRencana = sd.rencanaPenggunaan || '-';

    // Col 7: Hasil Survey & Status Verifikasi
    const hasilSurveyRaw = sd.hasilSurvey || (actor.hasilVerifikasiDinas === 'Lolos' ? 'Layak' : '');
    const hasilSurveyDisplay = hasilSurveyRaw ? hasilSurveyRaw.toUpperCase() : 'BELUM SURVEY';
    const tglSurveyDisplay = sd.tanggalSurvey || '-';
    const menuInfo = getActorCurrentMenu(actor);
    const verifStatusDisplay = actor.berkasDinasVerified
      ? 'LOLOS VERIFIKASI'
      : actor.hasilVerifikasiDinas
        ? actor.hasilVerifikasiDinas.toUpperCase()
        : 'PROSES';

    const colKeputusanLines = [
      `Survey: ${hasilSurveyDisplay}`,
      `Tgl: ${tglSurveyDisplay}`,
      `Verif: ${verifStatusDisplay}`,
      `Posisi: ${menuInfo.menuName}`,
    ];
    if (actor.keteranganDinas && actor.keteranganDinas !== '-') {
      colKeputusanLines.push(`Ket: ${actor.keteranganDinas}`);
    }
    const colKeputusan = colKeputusanLines.join('\n');

    // Col 8: Rekening Bank
    const hasBank = Boolean(actor.bankNumber && String(actor.bankNumber).trim() !== '' && String(actor.bankNumber).trim() !== '-');
    const colRekening = hasBank
      ? [
          `Bank: ${(actor.bankName || '-').toUpperCase()}`,
          `No: ${String(actor.bankNumber).trim()}`,
          `A.n: ${(actor.bankOwner || actor.fullName || '-').toUpperCase()}`,
        ].join('\n')
      : 'BELUM DIINPUT';

    // Col 9: Petugas Survey
    const petugasInfo = resolver.resolvePetugas(actor);
    const colPetugas =
      petugasInfo.nama !== '-'
        ? petugasInfo.nipppk
          ? `${petugasInfo.nama}\nNIP: ${petugasInfo.nipppk}`
          : petugasInfo.nama
        : 'BELUM ADA';

    // Col 10: Verifikator Dinas
    const verifInfo = resolver.resolveVerifikator(actor, petugasInfo);
    const colVerifikator =
      verifInfo.nama !== '-'
        ? verifInfo.nipppk
          ? `${verifInfo.nama}\nNIP: ${verifInfo.nipppk}`
          : verifInfo.nama
        : 'BELUM DITENTUKAN';

    rowMeta.push({ hasilSurvey: hasilSurveyDisplay, hasBank });

    return [
      index + 1,
      colBiodata,
      colIdentitas,
      colAlamat,
      colUsaha,
      colRincianSurvey,
      colRencana,
      colKeputusan,
      colRekening,
      colPetugas,
      colVerifikator,
    ];
  });

  const initialPage = doc.getCurrentPageInfo().pageNumber;

  autoTable(doc, {
    startY: 29.8,
    head: [[
      'NO',
      'BIODATA PELAKU USAHA',
      'NIK / NO. KK / HP',
      'ALAMAT DOMISILI',
      'DATA USAHA & LOKASI',
      'RINCIAN HASIL SURVEY',
      'RENCANA PENGGUNAAN',
      'KEPUTUSAN & STATUS',
      'REKENING BANK',
      'PETUGAS SURVEY',
      'VERIFIKATOR DINAS',
    ]],
    body: tableData,
    theme: 'grid',
    rowPageBreak: 'avoid',
    headStyles: {
      fillColor: [30, 64, 175], // blue-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 6.2,
      cellPadding: { top: 2, right: 1.5, bottom: 2, left: 1.5 },
      lineColor: [30, 58, 138],
      lineWidth: 0.2,
    },
    styles: {
      font: 'helvetica',
      fontSize: 5.8,
      cellPadding: { top: 1.6, right: 1.6, bottom: 1.6, left: 1.6 },
      valign: 'top',
      overflow: 'linebreak',
      lineColor: [203, 213, 225], // slate-300
      lineWidth: 0.15,
      textColor: [15, 23, 42], // slate-900
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    // Sum of widths = 7 + 31 + 28 + 29 + 31 + 35 + 24 + 25 + 25 + 23 + 23 = 281mm (exact fit for 297mm - 16mm margins)
    columnStyles: {
      0: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellWidth: 7 },
      1: { cellWidth: 31 },
      2: { cellWidth: 28 },
      3: { cellWidth: 29 },
      4: { cellWidth: 31 },
      5: { cellWidth: 35 },
      6: { cellWidth: 24 },
      7: { cellWidth: 25 },
      8: { cellWidth: 25 },
      9: { cellWidth: 23 },
      10: { cellWidth: 23 },
    },
    margin: { top: 18, bottom: 11, left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const meta = rowMeta[data.row.index];
        if (!meta) return;

        // Highlight Keputusan Survey column
        if (data.column.index === 7) {
          if (meta.hasilSurvey.includes('LAYAK') && !meta.hasilSurvey.includes('TIDAK')) {
            data.cell.styles.fillColor = [240, 253, 244]; // emerald-50
            data.cell.styles.textColor = [20, 83, 45]; // emerald-900
            data.cell.styles.fontStyle = 'bold';
          } else if (meta.hasilSurvey.includes('TIDAK')) {
            data.cell.styles.fillColor = [254, 242, 242]; // rose-50
            data.cell.styles.textColor = [127, 29, 29]; // rose-900
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Highlight Rekening Bank column
        if (data.column.index === 8) {
          if (meta.hasBank) {
            data.cell.styles.fillColor = [239, 246, 255]; // blue-50
            data.cell.styles.textColor = [30, 58, 138]; // blue-900
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [148, 163, 184]; // slate-400
            data.cell.styles.halign = 'center';
            data.cell.styles.valign = 'middle';
          }
        }

        // Bold officer names
        if (data.column.index === 9 || data.column.index === 10) {
          const rawText = String(data.cell.raw || '');
          if (rawText === 'BELUM ADA' || rawText === 'BELUM DITENTUKAN') {
            data.cell.styles.textColor = [148, 163, 184];
            data.cell.styles.halign = 'center';
            data.cell.styles.valign = 'middle';
          } else {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    didDrawPage: () => {
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      if (currentPage > initialPage) {
        // Compact continuation header on overflow pages
        doc.setFillColor(30, 58, 138);
        doc.roundedRect(margin, 7, pageWidth - margin * 2, 8.5, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(
          `TUNAS BANGSA KEPRI - LAPORAN LENGKAP PELAKU USAHA (LANJUTAN)`,
          margin + 3,
          12.5
        );
        doc.text(
          `KOORDINATOR: ${coordUpper}`,
          pageWidth - margin - 3,
          12.5,
          { align: 'right' }
        );
        doc.setTextColor(0);
      }
    },
  });
};

const addStandardLandscapeFooters = (doc: jsPDF, reportLabel: string) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const printedAt = new Date().toLocaleString('id-ID');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 8.5, pageWidth - margin, pageHeight - 8.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `SIMPU Kepulauan Riau  |  ${reportLabel}`,
      margin,
      pageHeight - 4.8
    );
    doc.text(
      `Dicetak pada: ${printedAt}  |  Halaman ${i} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 4.8,
      { align: 'right' }
    );
  }
};

export const generateCoordinatorReport = (
  coordinator: string,
  actors: BusinessActor[],
  systemUsers?: any[]
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const resolver = buildOfficerResolver(actors, systemUsers);
  renderCoordinatorSectionTable(doc, coordinator, actors, resolver);
  addStandardLandscapeFooters(doc, `Koordinator: ${(coordinator || '-').toUpperCase()}`);

  const cleanCoord = (coordinator || 'KOORDINATOR').replace(/\s+/g, '_').toUpperCase();
  const filename = `LAPORAN_LENGKAP_PELAKU_USAHA_${cleanCoord}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const generateAllCoordinatorsReport = (
  groupedActors: Record<string, BusinessActor[]>,
  systemUsers?: any[]
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const allFlatActors: BusinessActor[] = [];
  Object.values(groupedActors).forEach((list) => {
    if (Array.isArray(list)) allFlatActors.push(...list);
  });

  const resolver = buildOfficerResolver(allFlatActors, systemUsers);
  const sortedEntries = Object.entries(groupedActors)
    .filter(([, list]) => Array.isArray(list) && list.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  let isFirstSection = true;
  sortedEntries.forEach(([coordinator, actors]) => {
    if (!isFirstSection) {
      doc.addPage();
    }
    isFirstSection = false;
    renderCoordinatorSectionTable(doc, coordinator, actors, resolver);
  });

  addStandardLandscapeFooters(doc, `Laporan Lengkap Seluruh Koordinator (${sortedEntries.length} Koordinator)`);

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

export const renderSuratPernyataanPages = (doc: jsPDF, actor: BusinessActor, isFirstActor: boolean = true) => {
  if (!isFirstActor) {
    doc.addPage();
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const now = new Date();
  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const bulan = bulanNames[now.getMonth()];
  const tahun = now.getFullYear();
  const dateStr = `Tanjungpinang , ...... ${bulan} ${tahun}`;

  const materaiWidth = 20;
  const materaiHeight = 27;

  // ═══════════════════════════════════════════════════════════════════════════
  // HALAMAN 1 : KUITANSI (UKURAN & PROPORSI 100% PERSIS DOKUMEN CETAKAN ASLI)
  // ═══════════════════════════════════════════════════════════════════════════

  const kBoxLeft = 16;
  const kBoxTop = 28;
  const kBoxWidth = 178;
  const kBoxHeight = 240;
  const kBoxRight = kBoxLeft + kBoxWidth;
  const kBoxBottom = kBoxTop + kBoxHeight;

  // 1. Kotak Bingkai Luar Utama
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(kBoxLeft, kBoxTop, kBoxWidth, kBoxHeight);

  // 2. Header Judul "KUITANSI"
  const kTitleLineY = kBoxTop + 26; // y = 54
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text('KUITANSI', pageWidth / 2, kBoxTop + 16, { align: 'center' });

  const kuitansiWidth = doc.getTextWidth('KUITANSI');
  doc.setLineWidth(0.7);
  doc.line(pageWidth / 2 - kuitansiWidth / 2 - 1, kBoxTop + 18, pageWidth / 2 + kuitansiWidth / 2 + 1, kBoxTop + 18);

  // Garis horizontal pembatas bawah judul
  doc.setLineWidth(0.5);
  doc.line(kBoxLeft, kTitleLineY, kBoxRight, kTitleLineY);

  // 3. Grid Tengah
  const kMiddleSplitY = kBoxTop + 124; // y = 152
  doc.line(kBoxLeft, kMiddleSplitY, kBoxRight, kMiddleSplitY);

  // ── STRUKTUR KOLOM KUITANSI ──
  // Kolom 1 (Tahun Anggaran, Rekening Lembaga, Nomor Rekening): lebar 64mm
  const kCol1Width = 64;
  const kLineA = kBoxLeft + kCol1Width; // Garis A (x = 80) MENEMBUS HINGGA DASAR KOTAK KUITANSI!
  doc.line(kLineA, kTitleLineY, kLineA, kBoxBottom);

  // Kolom 2 (Labels: Sudah terima dari, Uang sejumlah, Yaitu): lebar 23mm
  const kCol2Width = 23;
  const kLineB1 = kLineA + kCol2Width; // Garis B1 (x = 103)
  
  // Kolom Khusus Titik Dua (lebar 5mm): garis double membatasi titik dua ( : )
  const kColonColWidth = 5.0;
  const kLineB2 = kLineB1 + kColonColWidth; // Garis B2 (x = 108)
  const kColonCenterX = kLineB1 + (kColonColWidth / 2); // x = 105.5

  // Garis Double (Line B1 dan Line B2) HANYA di grid tengah
  doc.line(kLineB1, kTitleLineY, kLineB1, kMiddleSplitY);
  doc.line(kLineB2, kTitleLineY, kLineB2, kMiddleSplitY);

  // ── ISI KOLOM 1 (Tahun Anggaran, Rekening Lembaga, Nomor Rekening) ──
  const kCol1Center = kBoxLeft + (kCol1Width / 2); // x = 48

  // Blok 1: Tahun Anggaran
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Tahun Anggaran', kCol1Center, kTitleLineY + 18, { align: 'center' });
  doc.text('2026', kCol1Center, kTitleLineY + 24, { align: 'center' });

  // Blok 2: Rekening Lembaga
  doc.text('Rekening Lembaga', kCol1Center, kTitleLineY + 46, { align: 'center' });
  doc.text('PT. BANK RAKYAT INDONESIA', kCol1Center, kTitleLineY + 52, { align: 'center' });
  doc.text('Yayasan Tunas Bangsa Kepri', kCol1Center, kTitleLineY + 57.5, { align: 'center' });

  // Blok 3: Nomor Rekening
  doc.text('Nomor Rekening', kCol1Center, kTitleLineY + 76, { align: 'center' });
  doc.text('0174-01-017706-53-3', kCol1Center, kTitleLineY + 82, { align: 'center' });

  // ── ISI KOLOM 2 (Labels di sebelah kiri garis double) ──
  const kCol2X = kLineA + 2.5;

  // Row 1: Sudah terima dari
  doc.text('Sudah', kCol2X, kTitleLineY + 18);
  doc.text('terima dari', kCol2X, kTitleLineY + 23.5);

  // Row 2: Uang sejumlah
  doc.text('Uang', kCol2X, kTitleLineY + 46);
  doc.text('sejumlah', kCol2X, kTitleLineY + 51.5);

  // Row 3: Yaitu
  doc.text('Yaitu', kCol2X, kTitleLineY + 76);

  // ── ISI KOLOM TITIK DUA ( : ) PAS DI DALAM GARIS DOUBLE ──
  doc.text(':', kColonCenterX, kTitleLineY + 18, { align: 'center' });
  doc.text(':', kColonCenterX, kTitleLineY + 51.5, { align: 'center' });
  doc.text(':', kColonCenterX, kTitleLineY + 76, { align: 'center' });

  // ── ISI KOLOM 3 (Values di sebelah kanan garis double) ──
  const kCol3ValX = kLineB2 + 3.5;
  const kCol3ValWidth = kBoxRight - kCol3ValX - 3.5;

  // Row 1 Value: Sudah terima dari
  doc.text('Yayasan Tunas Bangsa Kepri', kCol3ValX, kTitleLineY + 18);

  // Row 2 Value: Uang sejumlah
  doc.text('Rp. 1.000.000', kCol3ValX, kTitleLineY + 46);
  doc.text('Satu Juta Rupiah', kCol3ValX, kTitleLineY + 51.5);

  // Row 3 Value: Yaitu
  const yaituDesc = 'Bantuan Modal Usaha Bagi Pelaku Usaha Kota Tanjungpinang untuk Kegiatan Bantuan Penguatan Pemodalan Usaha Mikro Kecil Dan Menengah ( UMKM ) Tahun 2026';
  doc.text(yaituDesc, kCol3ValX, kTitleLineY + 72, {
    maxWidth: kCol3ValWidth,
    lineHeightFactor: 1.25,
  });

  // ── BAGIAN BAWAH (TANDA TANGAN KUITANSI PERSIS ASLI) ──
  // 1. Tanda Tangan Kiri (Ketua Yayasan) - Terpusat di dalam kolom 1
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Mengetahui/menyetujui', kCol1Center, kMiddleSplitY + 16, { align: 'center' });
  doc.text('Ketua Yayasan Tunas Bangsa', kCol1Center, kMiddleSplitY + 21.5, { align: 'center' });
  doc.text('Kepulauan Riau', kCol1Center, kMiddleSplitY + 27, { align: 'center' });

  // Nama Ketua Yayasan dengan Garis Bawah
  const ketuaName = 'Toh Muandy Saputra';
  doc.text(ketuaName, kCol1Center, kMiddleSplitY + 74, { align: 'center' });
  const ketuaNameWidth = doc.getTextWidth(ketuaName);
  doc.setLineWidth(0.5);
  doc.line(kCol1Center - ketuaNameWidth / 2, kMiddleSplitY + 75.5, kCol1Center + ketuaNameWidth / 2, kMiddleSplitY + 75.5);

  // 2. Tanda Tangan Kanan (Penerima Dana Bantuan) - Terpusat di area kanan
  const kRightColCenter = kLineA + ((kBoxRight - kLineA) / 2); // x = 137

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(dateStr, kRightColCenter, kMiddleSplitY + 30, { align: 'center' });
  doc.text('Penerima Dana Bantuan', kRightColCenter, kMiddleSplitY + 36, { align: 'center' });

  // Kotak Materai di area tanda tangan kanan
  const kMateraiX = kRightColCenter - materaiWidth;
  const kMateraiY = kMiddleSplitY + 42;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(kMateraiX, kMateraiY, materaiWidth, materaiHeight);
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text('MATERAI', kMateraiX + materaiWidth / 2, kMateraiY + materaiHeight / 2 - 1.5, { align: 'center' });
  doc.text('TEMPEL', kMateraiX + materaiWidth / 2, kMateraiY + materaiHeight / 2 + 2.5, { align: 'center' });

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

  const spDateCenterX = pageWidth - margin - 38; // x = 156

  // 1. Tanggal
  doc.text(dateStr, spDateCenterX, y, { align: 'center' });
  y += 5.0;

  // 2. Teks "Penerima Dana Bantuan"
  doc.text('Penerima Dana Bantuan', spDateCenterX, y, { align: 'center' });

  // 3. Kotak Materai
  const spMateraiX = spDateCenterX - materaiWidth;
  y += 5.0;

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(spMateraiX, y, materaiWidth, materaiHeight);
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text('MATERAI', spMateraiX + materaiWidth / 2, y + materaiHeight / 2 - 1.5, { align: 'center' });
  doc.text('TEMPEL', spMateraiX + materaiWidth / 2, y + materaiHeight / 2 + 2.5, { align: 'center' });

  // 4. Nama Pelaku Usaha
  y += materaiHeight + 5.0;
  doc.setTextColor(0);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text((actor.fullName || '-').toUpperCase(), spDateCenterX, y, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════════
  // HALAMAN 3 : LAPORAN PENGGUNAAN BANTUAN DANA PERMODALAN PENGEMBANGAN USAHA
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  const lpjMarginX = 22;
  const lpjContentWidth = pageWidth - lpjMarginX * 2; // 166 mm

  // Helper untuk menggambar baris teks rata kanan-kiri (justified) dengan dukungan multi font-style (bold/italic)
  const drawLpjJustifiedLine = (
    words: { text: string; fontStyle?: 'normal' | 'bold' | 'italic' }[],
    isLastLine: boolean = false,
    fontSize: number = 10.5
  ) => {
    doc.setFontSize(fontSize);
    let totalWordsW = 0;
    words.forEach(w => {
      doc.setFont('times', w.fontStyle || 'normal');
      totalWordsW += doc.getTextWidth(w.text);
    });

    if (isLastLine) {
      let curX = lpjMarginX;
      words.forEach(w => {
        doc.setFont('times', w.fontStyle || 'normal');
        doc.text(w.text, curX, lpjY);
        curX += doc.getTextWidth(w.text) + doc.getTextWidth(' ');
      });
      return;
    }

    const numGaps = words.length - 1;
    const gapW = numGaps > 0 ? (lpjContentWidth - totalWordsW) / numGaps : 0;
    let curX = lpjMarginX;
    words.forEach(w => {
      doc.setFont('times', w.fontStyle || 'normal');
      doc.text(w.text, curX, lpjY);
      curX += doc.getTextWidth(w.text) + gapW;
    });
  };

  let lpjY = 24;

  // 1. Header Judul (Sesuai contoh berkas asli)
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('LAPORAN', pageWidth / 2, lpjY, { align: 'center' });
  lpjY += 4.5;
  doc.text('PENGGUNAAN BANTUAN DANA PERMODALAN', pageWidth / 2, lpjY, { align: 'center' });
  lpjY += 4.5;
  doc.text('PENGEMBANGAN USAHA', pageWidth / 2, lpjY, { align: 'center' });
  lpjY += 14.0;

  // 2. Salam Pembuka
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text('Dengan Hormat,', lpjMarginX, lpjY);
  lpjY += 6.5;

  // 3. Paragraf Pembuka (4 baris persis seperti di contoh berkas asli, Yayasan Tunas Bangsa Kepri tebal)
  const p1Line1 = [
    { text: 'Sehubungan' }, { text: 'dengan' }, { text: 'Pemberian' }, { text: 'dana' },
    { text: 'bantuan' }, { text: 'modal' }, { text: 'usaha' }, { text: 'dari' },
    { text: 'Yayasan', fontStyle: 'bold' as const }, { text: 'Tunas', fontStyle: 'bold' as const },
    { text: 'Bangsa', fontStyle: 'bold' as const }, { text: 'Kepri', fontStyle: 'bold' as const }
  ];

  const p1Line2 = [
    'sebesar', 'Rp.', '1.000.000,-', '(Satu', 'Juta', 'Rupiah),',
    'saya', 'sebagai', 'pelaku', 'usaha', 'mikro', 'kecil', 'menengah'
  ].map(text => ({ text }));

  const p1Line3 = [
    'penerima', 'bantuan', 'tersebut', 'telah', 'memanfaatkan', '/',
    'menggunakan', 'dana', 'tersebut', 'untuk', 'memajukan', '/'
  ].map(text => ({ text }));

  const p1Line4 = [
    'mengembangkan', 'usaha', 'yang', 'telah', 'saya', 'jalani', 'selama', 'ini,'
  ].map(text => ({ text }));

  const lpjParaLh = 5.0;
  drawLpjJustifiedLine(p1Line1, false, 10.5);
  lpjY += lpjParaLh;
  drawLpjJustifiedLine(p1Line2, false, 10.5);
  lpjY += lpjParaLh;
  drawLpjJustifiedLine(p1Line3, false, 10.5);
  lpjY += lpjParaLh;
  drawLpjJustifiedLine(p1Line4, true, 10.5);
  lpjY += 7.0;

  // 4. Kalimat Pengantar
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text('Bersama ini saya sampaikan rincian Laporan pengunaan dana sebagai berikut:', lpjMarginX, lpjY);
  lpjY += 6.5;

  // 5. Data Pelaku Usaha (dengan Nomor Ponsel di bawah NIK otomatis ter-generate)
  const idLabelX = lpjMarginX + 12;
  const idColonX = lpjMarginX + 42;
  const idValX = idColonX + 3;
  const maxValW = pageWidth - lpjMarginX - idValX;

  const drawIdRow = (label: string, value: string) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(label, idLabelX, lpjY);
    doc.text(':', idColonX, lpjY);
    const lines = doc.splitTextToSize(value || '-', maxValW);
    doc.text(lines, idValX, lpjY);
    lpjY += lines.length * 4.6 + 0.8;
  };

  drawIdRow('Nama', (actor.fullName || '-').toUpperCase());
  drawIdRow('NIK', actor.nik || '-');
  drawIdRow('Nomor Ponsel', actor.phone || '-');
  drawIdRow('Usaha', (actor.businessName || actor.businessCategory || '-').toUpperCase());
  drawIdRow('Alamat Usaha', (actor.businessLocation || actor.address || '-').toUpperCase());

  lpjY += 3.5;

  // 6. Pengeluaran
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('Pengeluaran', idLabelX, lpjY);
  lpjY += 5.0;
  doc.text('Rincian Pengeluaran :', idLabelX, lpjY);
  lpjY += 5.5;

  // 7. Tabel Rincian Pengeluaran 1-10
  const numX = idLabelX;
  const descStartX = numX + 8;
  const rpX = lpjMarginX + lpjContentWidth - 45;
  const amountStartX = rpX + 7;
  const amountEndX = lpjMarginX + lpjContentWidth;

  const createDots = (pixelWidth: number) => {
    const dotW = doc.getTextWidth('.');
    const count = Math.floor(pixelWidth / dotW);
    return '.'.repeat(count);
  };

  const descDots = createDots(rpX - 3 - descStartX);
  const amountDots = createDots(amountEndX - amountStartX);

  for (let i = 1; i <= 10; i++) {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`${i}.`, numX, lpjY);
    doc.text(descDots, descStartX, lpjY);
    doc.text('Rp.', rpX, lpjY);
    doc.text(amountDots, amountStartX, lpjY);
    if (i < 10) {
      lpjY += 7.5;
    }
  }

  // Garis Pembatas Bawah Tabel
  lpjY += 4.5;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(lpjMarginX, lpjY, lpjMarginX + lpjContentWidth, lpjY);
  lpjY += 6.5;

  // Baris TOTAL
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', (idLabelX + rpX) / 2, lpjY, { align: 'center' });
  doc.text('Rp.', rpX, lpjY);
  lpjY += 9.5;

  // 8. Paragraf Penutup (persis seperti di contoh berkas dengan italic)
  const pCloseLine1 = [
    { text: 'Demikian' }, { text: 'disampaikan' }, { text: 'laporan' }, { text: 'ini' },
    { text: 'dengan' }, { text: 'Melampirkan' },
    { text: 'fotocopi', fontStyle: 'italic' as const },
    { text: 'Nota', fontStyle: 'italic' as const },
    { text: 'Pembelian', fontStyle: 'italic' as const },
    { text: 'yang', fontStyle: 'italic' as const },
    { text: 'Sah,', fontStyle: 'italic' as const }
  ];

  const pCloseLine2 = [
    'saya', 'sampaikan', 'dengan', 'sebenar-benarnya,', 'atas', 'bantuan',
    'yang', 'telah', 'diberikan', 'saya', 'ucapkan'
  ].map(text => ({ text }));

  const pCloseLine3 = [{ text: 'terima' }, { text: 'kasih.' }];

  drawLpjJustifiedLine(pCloseLine1, false, 10.5);
  lpjY += lpjParaLh;
  drawLpjJustifiedLine(pCloseLine2, false, 10.5);
  lpjY += lpjParaLh;
  drawLpjJustifiedLine(pCloseLine3, true, 10.5);
  lpjY += 9.0;

  // 9. Tanda Tangan
  const lpjSigCenterX = lpjMarginX + lpjContentWidth - 36;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(dateStr, lpjSigCenterX, lpjY, { align: 'center' });
  lpjY += 5.5;

  doc.text('Hormat saya,', lpjSigCenterX, lpjY, { align: 'center' });
  lpjY += 26.0;

  const actorName = (actor.fullName || '-').toUpperCase();
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text(actorName, lpjSigCenterX, lpjY, { align: 'center' });
  const nameW = Math.max(doc.getTextWidth(actorName), 50);
  doc.setLineWidth(0.4);
  doc.line(lpjSigCenterX - nameW / 2, lpjY + 1.5, lpjSigCenterX + nameW / 2, lpjY + 1.5);

};

export const generateSuratPernyataan = (actor: BusinessActor) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  renderSuratPernyataanPages(doc, actor, true);
  const safeName = (actor.fullName || 'PELAKU_USAHA').replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const safeNik = actor.nik || 'NIK';
  doc.save(`BERKAS_PENCAIRAN_${safeName}_${safeNik}.pdf`);
};

export const generateSuratPernyataanBulk = (actors: BusinessActor[], customFilename?: string) => {
  if (!actors || actors.length === 0) return;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  actors.forEach((actor, index) => {
    renderSuratPernyataanPages(doc, actor, index === 0);
  });
  const filename = customFilename || `BERKAS_PENCAIRAN_GABUNGAN_${actors.length}_DATA.pdf`;
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
};
