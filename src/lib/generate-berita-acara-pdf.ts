import jsPDF from "jspdf";
import { BusinessActor, SurveyDinasData } from "@/app/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: wrap text and return array of lines
// ─────────────────────────────────────────────────────────────────────────────
function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "-", maxWidth);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export - EXACT 1 PAGE A4
// ─────────────────────────────────────────────────────────────────────────────
export async function generateBeritaAcaraPDF(
  actor: BusinessActor,
  surveyData: SurveyDinasData
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR; // 180 mm

  doc.setFont("helvetica");

  // ── LOAD LOGO ──────────────────────────────────────────────────────────────
  let logoBase64: string | null = null;
  try {
    let res = await fetch("/logo-kepri.png");
    if (!res.ok) {
      res = await fetch("/logo.png");
    }
    const blob = await res.blob();
    logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    logoBase64 = null;
  }

  // ── 1. KOP SURAT ───────────────────────────────────────────────────────────
  let y = 8;

  // Logo Kepri (kiri)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", marginL, y, 18, 18);
  }

  // Teks KOP (tengah)
  const kopX = pageW / 2;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("PEMERINTAH PROVINSI KEPULAUAN RIAU", kopX, y + 2, { align: "center" });

  doc.setFontSize(11.5);
  doc.setFont("helvetica", "bold");
  doc.text("DINAS KOPERASI, USAHA KECIL DAN MENENGAH", kopX, y + 6.5, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Pusat Pemerintahan Provinsi Kepulauan Riau Bandar Seri Kota Piring", kopX, y + 10, { align: "center" });
  doc.text("Kawasan Perkantoran Sultan Mahmud Riayat Syah Gedung Daeng Marewah B1", kopX, y + 13, { align: "center" });
  doc.text("Lantai 3 Pulau Dompak Seri Darul Makmur \u2013 Tanjungpinang Kode Pos 29124", kopX, y + 16, { align: "center" });
  doc.text("Pos-el : diskopukmsprovinsikepri@gmail.com    Laman : www.dinaskoperasiukm.kepriprov.go.id", kopX, y + 19, { align: "center" });

  // Garis tebal & tipis KOP
  y = 28.5;
  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);
  y += 0.8;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);

  // ── 2. JUDUL DOKUMEN ───────────────────────────────────────────────────────
  y += 4.5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BERITA ACARA SURVEY", kopX, y, { align: "center" });
  y += 4;
  doc.text("DANA HIBAH PENGUATAN MODAL KUMKM", kopX, y, { align: "center" });
  y += 4;
  doc.text("PROVINSI KEPULAUAN RIAU", kopX, y, { align: "center" });

  // ── 3. TANGGAL ─────────────────────────────────────────────────────────────
  y += 5.5;
  const now = new Date();
  const hariNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulanNames = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const hari = hariNames[now.getDay()];
  const tgl = now.getDate();
  const bln = bulanNames[now.getMonth()];
  const thn = now.getFullYear();

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Pada hari ini,  ", marginL, y);
  const prefixW = doc.getTextWidth("Pada hari ini,  ");
  doc.setFont("helvetica", "bolditalic");
  doc.text(hari, marginL + prefixW, y);
  const hariW = doc.getTextWidth(hari);
  doc.setFont("helvetica", "normal");
  const afterHari = `   ,  tanggal  ${tgl} ${bln} ${thn}   ,  yang bertandatangan dibawah ini :`;
  doc.text(afterHari, marginL + prefixW + hariW, y);

  // ── 4. PEJABAT 1, 2, 3 (Dikosongkan) ───────────────────────────────────────
  const pejabat = [
    { no: "1.", fields: ["NAMA", "NIPPPK", "Pangkat/Gol. Ruang", "Jabatan"] },
    { no: "2", fields: ["NAMA", "NIPPPK", "Pangkat/Gol. Ruang", "Jabatan"] },
    { no: "3.", fields: ["NAMA", "NRTHL", "Pangkat/Gol. Ruang", "Jabatan"] },
  ];

  const labelColW = 32;
  const colonX = marginL + 6 + labelColW;
  const valueX = colonX + 4;

  y += 4.5;
  doc.setFontSize(8.5);

  pejabat.forEach((p, idx) => {
    doc.setFont("helvetica", "normal");
    doc.text(p.no, marginL, y);

    p.fields.forEach((label, fi) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, marginL + 6, y);
      doc.text(":", colonX, y);
      doc.text("", valueX, y); // dikosongkan

      if (fi < p.fields.length - 1) y += 3.8;
    });

    y += (idx < pejabat.length - 1) ? 5 : 4;
  });

  // ── 5. KALIMAT PEMBUKA ─────────────────────────────────────────────────────
  y += 0.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Telah melaksanakan survey kepada calon penerima bantuan usaha Mikro dan Kecil Provinsi Kepulauan Riau yaitu :", marginL, y);
  y += 4.5;

  // ── 6. DATA PELAKU USAHA (No 1-14) ─────────────────────────────────────────
  const noW = 5;
  const dataLabelW = 68; // Lebar cukup untuk label panjang tanpa menabrak :
  const dataColonX = marginL + noW + dataLabelW; // 15 + 5 + 68 = 88mm
  const dataValueX = dataColonX + 3; // 91mm
  const dataValueW = pageW - marginR - dataValueX; // 210 - 15 - 91 = 104mm
  const lineY_offset = 1.0;

  doc.setFontSize(8.5);

  // Row 1 & 2
  doc.setFont("helvetica", "normal");
  doc.text("1.", marginL, y);
  doc.text("Nama Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.namaUsaha || "-", dataValueX, y);
  doc.setLineWidth(0.2);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  doc.text("2.", marginL, y);
  doc.text("Nama Pemilik Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.namaPemilik || actor.fullName || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 3: Jenis Kelamin-Status *
  doc.text("3.", marginL, y);
  doc.text("Jenis Kelamin-Status *", marginL + noW, y);
  doc.text(":", dataColonX, y);
  const optJK = ["P", "L", "Janda", "Duda", "Lajang", "Kepala Keluarga"];
  let oxJK = dataValueX;
  optJK.forEach((opt) => {
    doc.text(opt, oxJK, y);
    oxJK += doc.getTextWidth(opt) + 5;
  });
  y += 4.2;

  // Row 4: Alamat Usaha
  doc.text("4.", marginL, y);
  doc.text("Alamat Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(actor.businessLocation || actor.address || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 5: Alamat Rumah
  doc.text("5.", marginL, y);
  doc.text("Alamat Rumah", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.alamatRumah || actor.address || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // No HP Pemilik Usaha
  doc.text("No HP Pemilik Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.noHp || actor.phone || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 3.9;

  // Email
  doc.text("Email", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.email || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 3.9;

  // Account Media Sosial
  doc.text("Account Media Sosial", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.sosmed || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 3.9;

  // Row 6: DTKS
  doc.text("6.", marginL, y);
  doc.text("Apakah Saudara Masuk dalam DTKS ?", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  doc.text("Jika YA, DTKS Kategori *:", marginL + noW + 4, y);
  const optDTKS = ["PKH", "BPNT", "KIP", "LANSIA"];
  let oxDTKS = marginL + noW + 4 + doc.getTextWidth("Jika YA, DTKS Kategori *: ");
  optDTKS.forEach((opt) => {
    doc.setFont("helvetica", "bold");
    doc.text(opt, oxDTKS, y);
    doc.setFont("helvetica", "normal");
    oxDTKS += doc.getTextWidth(opt) + 4;
  });
  y += 4.2;

  // Row 7: Bidang Usaha
  doc.text("7.", marginL, y);
  doc.text("Bidang Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.bidangUsaha || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 8: Peralatan Yang Digunakan
  doc.text("8.", marginL, y);
  doc.text("Peralatan Yang Digunakan", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.peralatan || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 9: Tahun Berdiri
  doc.text("9.", marginL, y);
  doc.text("Tahun Berdiri", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.tahunBerdiri || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 10: Izin Yang dimiliki *
  doc.text("10.", marginL, y);
  doc.text("Izin Yang dimiliki *", marginL + noW, y);
  doc.text(":", dataColonX, y);
  const optIzin = ["NIB", "HALAL", "PIRT", "Lainnya :"];
  let oxIzin = dataValueX;
  optIzin.forEach((opt) => {
    doc.text(opt, oxIzin, y);
    oxIzin += doc.getTextWidth(opt) + 6;
  });
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 11: Modal Usaha dan Omset per bulan
  doc.text("11.", marginL, y);
  doc.text("Modal Usaha dan Omset per bulan", marginL + noW, y);
  doc.text(":", dataColonX, y);
  const val11 = `Modal: Rp ${surveyData.modalUsaha || "-"}  |  Omset: Rp ${surveyData.omset || "-"}`;
  doc.text(val11, dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 12: Apakah Pernah Menerima Dana Hibah ?
  doc.text("12.", marginL, y);
  doc.text("Apakah Pernah Menerima Dana Hibah ?", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text("YA  dari mana :", dataValueX, y);
  const ymW = doc.getTextWidth("YA  dari mana : ");
  doc.line(dataValueX + ymW, y + lineY_offset, dataValueX + ymW + 38, y + lineY_offset);
  doc.text("Tahun berapa :", dataValueX + ymW + 40, y);
  const thnW = doc.getTextWidth("Tahun berapa : ");
  doc.line(dataValueX + ymW + 40 + thnW, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 3.8;

  doc.text("TIDAK", dataValueX, y);
  y += 4.2;

  // Row 13: Rencana Penggunaan Dana Hibah
  doc.text("13.", marginL, y);
  doc.text("Rencana Penggunaan Dana Hibah", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.rencanaPenggunaan || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // Row 14: Hasil Survey
  doc.text("14.", marginL, y);
  doc.text("Hasil Survey", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.hasilSurvey || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.2;

  // ── 7. TABEL TANDA TANGAN (SAMA PERSIS SESUAI GAMBAR 2) ───────────────────
  y += 2.5; // Spasi pas di bawah poin 14 Hasil Survey

  const ttStartY = y;
  const col1W = 45;
  const col2W = 45;
  const col3W = 45;
  const col4W = 45; // total 180 mm

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.4);

  // --- HEADER 1: TIM SURVEY (3 Kolom) & CALON PENERIMA DANA HIBAH (1 Kolom) ---
  const header1H = 6;
  doc.setFillColor(226, 239, 218); // Hijau muda #E2EFDA
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);

  // Rect Header Tim Survey
  doc.rect(marginL, ttStartY, col1W + col2W + col3W, header1H, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TIM SURVEY", marginL + (col1W + col2W + col3W) / 2, ttStartY + 4.2, { align: "center" });

  // Rect Header Calon Penerima Dana Hibah (juga hijau muda)
  doc.setFillColor(226, 239, 218);
  doc.rect(marginL + col1W + col2W + col3W, ttStartY, col4W, header1H, "FD");
  doc.setFontSize(7.5);
  doc.text("CALON PENERIMA DANA HIBAH", marginL + col1W + col2W + col3W + col4W / 2, ttStartY + 4.2, { align: "center" });

  // --- BOX TTD TIM SURVEY (3 KOLOM) & PENERIMA (1 KOLOM) ---
  const signBoxH = 22;
  const signY = ttStartY + header1H;

  doc.rect(marginL, signY, col1W, signBoxH);
  doc.rect(marginL + col1W, signY, col2W, signBoxH);
  doc.rect(marginL + col1W + col2W, signY, col3W, signBoxH);
  doc.rect(marginL + col1W + col2W + col3W, signY, col4W, signBoxH);

  // Nama Tim Survey 1, 2, 3 DIKOSONGKAN (siap diisi nanti).
  // Hanya nama Calon Penerima Dana Hibah yang dicetak di kolom 4.
  const nameLabelY = signY + signBoxH - 2.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text((actor.fullName || "").toUpperCase(), marginL + col1W + col2W + col3W + col4W / 2, nameLabelY, { align: "center" });

  // --- HEADER 2: MENGETAHUI/VERIFIKATOR ---
  const metaHeaderY = signY + signBoxH;
  const metaHeaderH = 6;

  doc.setFillColor(226, 239, 218);
  doc.rect(marginL, metaHeaderY, contentW, metaHeaderH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("MENGETAHUI/VERIFIKATOR", marginL + contentW / 2, metaHeaderY + 4.2, { align: "center" });

  // --- BARIS BAWAH: 4 SUB-KOLOM (KORLAP / CATATAN) ---
  const metaSignY = metaHeaderY + metaHeaderH;
  const metaSignH = 26;

  // Box 1: Kosong + titik-titik di bawah
  doc.rect(marginL, metaSignY, col1W, metaSignH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("....................................................................", marginL + col1W / 2, metaSignY + metaSignH - 3, { align: "center" });

  // Box 2: Header Catatan :
  doc.rect(marginL + col1W, metaSignY, col2W, metaSignH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Catatan :", marginL + col1W + 2, metaSignY + 4);

  // Box 3: Header KORLAP/RT/RT/LURAH/CAMAT SETEMPAT (light green fill) + titik-titik di bawah
  const subH3 = 5.5;
  doc.setFillColor(226, 239, 218);
  doc.rect(marginL + col1W + col2W, metaSignY, col3W, subH3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("KORLAP/RT/RT/LURAH/CAMAT SETEMPAT", marginL + col1W + col2W + col3W / 2, metaSignY + 3.8, { align: "center" });
  doc.rect(marginL + col1W + col2W, metaSignY + subH3, col3W, metaSignH - subH3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("....................................................................", marginL + col1W + col2W + col3W / 2, metaSignY + metaSignH - 3, { align: "center" });

  // Box 4: Header Catatan :
  doc.rect(marginL + col1W + col2W + col3W, metaSignY, col4W, metaSignH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Catatan :", marginL + col1W + col2W + col3W + 2, metaSignY + 4);

  // BORDER TEBAL LUAR KESELURUHAN TABEL TANDA TANGAN
  const totalTtH = header1H + signBoxH + metaHeaderH + metaSignH;
  doc.setLineWidth(0.8);
  doc.rect(marginL, ttStartY, contentW, totalTtH);

  // ── SIMPAN PDF ─────────────────────────────────────────────────────────────
  const safeName = (actor.fullName || "Pelaku-Usaha").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Berita_Acara_Survey_${safeName}.pdf`);
}
