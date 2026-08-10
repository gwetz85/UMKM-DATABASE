import jsPDF from "jspdf";
import { BusinessActor, SurveyDinasData, PejabatData } from "@/app/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: wrap text and return array of lines
// ─────────────────────────────────────────────────────────────────────────────
function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "-", maxWidth);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Load survey photo and convert to base64 with dimensions
// ─────────────────────────────────────────────────────────────────────────────
async function loadSurveyPhoto(url: string): Promise<{ base64: string; format: string; w: number; h: number } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const isPng = blob.type.includes("png");
          const format = isPng ? "PNG" : "JPEG";
          const base64 = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85);
          resolve({ base64, format, w: img.width, h: img.height });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export - EXACT 1 PAGE A4
// ─────────────────────────────────────────────────────────────────────────────
export async function generateBeritaAcaraPDF(
  actor: BusinessActor,
  surveyData: SurveyDinasData,
  pejabatData?: PejabatData
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR; // 180 mm

  doc.setFont("helvetica");

  // ── LOAD LOGO & SURVEY PHOTO ────────────────────────────────────────────────
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

  const surveyPhotoUrl = surveyData?.fotoSurveyUrl || actor?.photoUsahaUri || actor?.comparisonPhotoUrl || "";
  const surveyPhotoData = surveyPhotoUrl ? await loadSurveyPhoto(surveyPhotoUrl) : null;

  // ── 1. KOP SURAT (SAMA PERSIS DENGAN GAMBAR REFERENSI) ─────────────────────
  let y = 6;
  const logoH = 23;
  const logoW = 23;

  // Logo Kepri (kiri)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", marginL, y, logoW, logoH);
  }

  // Center X untuk teks KOP (berada di tengah area sebelah kanan logo)
  const kopTextCenterX = marginL + logoW + (contentW - logoW) / 2; // 116.5 mm

  // Baris 1: P E M E R I N T A H   P R O V I N S I   K E P U L A U A N   R I A U
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text("P E M E R I N T A H   P R O V I N S I   K E P U L A U A N   R I A U", kopTextCenterX, y + 3, { align: "center" });

  // Baris 2: DINAS KOPERASI, USAHA KECIL DAN MENENGAH (BOLD, BESAR)
  doc.setFontSize(13.5);
  doc.setFont("helvetica", "bold");
  doc.text("DINAS KOPERASI, USAHA KECIL DAN MENENGAH", kopTextCenterX, y + 8, { align: "center" });

  // Baris 3-6: Alamat & Kontak (7.5pt)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Pusat Pemerintahan Provinsi Kepulauan Riau Bandar Seri Kota Piring", kopTextCenterX, y + 12, { align: "center" });
  doc.text("Kawasan Perkantoran Sultan Mahmud Riayat Syah Gedung Daeng Marewah B1", kopTextCenterX, y + 15.5, { align: "center" });
  doc.text("Lantai 3 Pulau Dompak Seri Darul Makmur – Tanjungpinang Kode Pos 29124", kopTextCenterX, y + 19, { align: "center" });
  doc.text("Pos-el : diskopukmsprovinsikepri@gmail.com Laman : www.dinaskoperasiukm.kepriprov.go.id", kopTextCenterX, y + 22.5, { align: "center" });

  // Garis Bawah KOP (Satu garis tebal hitam presisi)
  y = 30;
  doc.setLineWidth(1.0);
  doc.setDrawColor(0, 0, 0);
  doc.line(marginL, y, pageW - marginR, y);

  // ── 2. JUDUL DOKUMEN ───────────────────────────────────────────────────────
  const kopX = pageW / 2;
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

  // ── 4. PEJABAT 1 & 2 ───────────────────────────────────────────────────────
  const p1 = pejabatData?.verifikator || { nama: "", nipppk: "", pangkat: "", jabatan: "" };
  const p2 = pejabatData?.petugas || { nama: "", nipppk: "", pangkat: "", jabatan: "" };

  const pejabatList = [
    {
      no: "1.",
      fields: [
        { label: "NAMA", val: p1.nama || "" },
        { label: "NIPPPK", val: p1.nipppk || "" },
        { label: "Pangkat/Gol. Ruang", val: p1.pangkat || "" },
        { label: "Jabatan", val: p1.jabatan || "" },
      ]
    },
    {
      no: "2.",
      fields: [
        { label: "NAMA", val: p2.nama || "" },
        { label: "NIPPPK", val: p2.nipppk || "" },
        { label: "Pangkat/Gol. Ruang", val: p2.pangkat || "" },
        { label: "Jabatan", val: p2.jabatan || "" },
      ]
    },
  ];

  const labelColW = 32;
  const colonX = marginL + 6 + labelColW;
  const valueX = colonX + 4;

  y += 4.5;
  doc.setFontSize(8.5);

  pejabatList.forEach((p, idx) => {
    doc.setFont("helvetica", "normal");
    doc.text(p.no, marginL, y);

    p.fields.forEach((item, fi) => {
      doc.setFont("helvetica", "normal");
      doc.text(item.label, marginL + 6, y);
      doc.text(":", colonX, y);
      doc.setFont("helvetica", "bold");
      doc.text(item.val, valueX, y);

      if (fi < p.fields.length - 1) y += 3.8;
    });

    y += (idx < pejabatList.length - 1) ? 5 : 4;
  });

  // ── 5. KALIMAT PEMBUKA ─────────────────────────────────────────────────────
  y += 0.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Telah melaksanakan survey kepada calon penerima bantuan usaha Mikro dan Kecil Provinsi Kepulauan Riau yaitu :", marginL, y);
  y += 4.5;

  // ── 6. DATA PELAKU USAHA (No 1-14) ─────────────────────────────────────────
  const noW = 5;
  const dataLabelW = 68;
  const dataColonX = marginL + noW + dataLabelW; // 88mm
  const dataValueX = dataColonX + 3; // 91mm
  const lineY_offset = 1.0;

  doc.setFontSize(8.5);

  // Row 1 & 2 & 3
  doc.setFont("helvetica", "normal");
  doc.text("1.", marginL, y);
  doc.text("Nama Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.namaUsaha || "-", dataValueX, y);
  doc.setLineWidth(0.2);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  doc.text("2.", marginL, y);
  doc.text("Nama Pemilik Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.namaPemilik || actor.fullName || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 3: NIK
  doc.text("3.", marginL, y);
  doc.text("NIK", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(actor.nik || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 4: Jenis Kelamin-Status *
  doc.text("4.", marginL, y);
  doc.text("Jenis Kelamin-Status *", marginL + noW, y);
  doc.text(":", dataColonX, y);
  const optJK = ["P", "L", "Janda", "Duda", "Lajang", "Kepala Keluarga"];
  let oxJK = dataValueX;
  optJK.forEach((opt) => {
    doc.text(opt, oxJK, y);
    oxJK += doc.getTextWidth(opt) + 5;
  });
  y += 4.0;

  // Row 5: Alamat Usaha
  doc.text("5.", marginL, y);
  doc.text("Alamat Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(actor.businessLocation || actor.address || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 6: Alamat Rumah
  doc.text("6.", marginL, y);
  doc.text("Alamat Rumah", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.alamatRumah || actor.address || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // No HP Pemilik Usaha
  doc.text("No HP Pemilik Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.noHp || actor.phone || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 3.8;

  // Email
  doc.text("Email", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.email || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 3.8;

  // Account Media Sosial
  doc.text("Account Media Sosial", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.sosmed || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 3.8;

  // Row 7: DTKS
  doc.text("7.", marginL, y);
  doc.text("Apakah Saudara Masuk dalam DTKS ?", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  doc.text("Jika YA, DTKS Kategori *:", marginL + noW + 4, y);
  const optDTKS = ["PKH", "BPNT", "KIP", "LANSIA"];
  let oxDTKS = marginL + noW + 4 + doc.getTextWidth("Jika YA, DTKS Kategori *: ");
  optDTKS.forEach((opt) => {
    doc.setFont("helvetica", "bold");
    doc.text(opt, oxDTKS, y);
    doc.setFont("helvetica", "normal");
    oxDTKS += doc.getTextWidth(opt) + 4;
  });
  y += 4.0;

  // Row 8: Bidang Usaha
  doc.text("8.", marginL, y);
  doc.text("Bidang Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.bidangUsaha || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 9: Peralatan Yang Digunakan
  doc.text("9.", marginL, y);
  doc.text("Peralatan Yang Digunakan", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.peralatan || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 10: Tahun Berdiri
  doc.text("10.", marginL, y);
  doc.text("Tahun Berdiri", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.tahunBerdiri || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 11: Izin Yang dimiliki *
  doc.text("11.", marginL, y);
  doc.text("Izin Yang dimiliki *", marginL + noW, y);
  doc.text(":", dataColonX, y);
  const optIzin = ["NIB", "HALAL", "PIRT", "Lainnya :"];
  let oxIzin = dataValueX;
  optIzin.forEach((opt) => {
    doc.text(opt, oxIzin, y);
    oxIzin += doc.getTextWidth(opt) + 6;
  });
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 12: Modal Usaha dan Omset per bulan
  doc.text("12.", marginL, y);
  doc.text("Modal Usaha dan Omset per bulan", marginL + noW, y);
  doc.text(":", dataColonX, y);
  const val11 = `Modal: Rp ${surveyData.modalUsaha || "-"}  |  Omset: Rp ${surveyData.omset || "-"}`;
  doc.text(val11, dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 13: Apakah Pernah Menerima Dana Hibah ?
  doc.text("13.", marginL, y);
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
  y += 4.0;

  // Row 14: Rencana Penggunaan Dana Hibah
  doc.text("14.", marginL, y);
  doc.text("Rencana Penggunaan Dana Hibah", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.rencanaPenggunaan || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // Row 15: Hasil Survey
  doc.text("15.", marginL, y);
  doc.text("Hasil Survey", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.hasilSurvey || "-", dataValueX, y);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 4.0;

  // ── 7. TABEL TANDA TANGAN ───────────────────────────────────────────────────
  y += 2.5;

  const ttStartY = y;
  const colTimSurveyW = 110; // 2 Kolom x 55mm = 110mm
  const colPenerimaW = 70;   // 1 Kolom = 70mm (Total 180mm)
  const col1W = 55;
  const col2W = 55;

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.4);

  // --- HEADER 1: TIM SURVEY (2 Kolom) & CALON PENERIMA DANA HIBAH (1 Kolom) ---
  const header1H = 6;
  doc.setFillColor(226, 239, 218); // Hijau muda #E2EFDA
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);

  // Rect Header Tim Survey (2 Kolom = 110mm)
  doc.rect(marginL, ttStartY, colTimSurveyW, header1H, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TIM SURVEY", marginL + colTimSurveyW / 2, ttStartY + 4.2, { align: "center" });

  // Rect Header Calon Penerima Dana Hibah (70mm)
  doc.setFillColor(226, 239, 218);
  doc.rect(marginL + colTimSurveyW, ttStartY, colPenerimaW, header1H, "FD");
  doc.setFontSize(7.5);
  doc.text("CALON PENERIMA DANA HIBAH", marginL + colTimSurveyW + colPenerimaW / 2, ttStartY + 4.2, { align: "center" });

  // --- BOX TTD TIM SURVEY (2 KOLOM) & PENERIMA (1 KOLOM – TANDA TANGAN BIASA) ---
  const signBoxH = 26;
  const signY = ttStartY + header1H;

  // Box Tim Survey 1 & 2
  doc.rect(marginL, signY, col1W, signBoxH);
  doc.rect(marginL + col1W, signY, col2W, signBoxH);

  if (p1.nama) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(p1.nama.toUpperCase(), marginL + col1W / 2, signY + signBoxH - 2.5, { align: "center" });
  }
  if (p2.nama) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(p2.nama.toUpperCase(), marginL + col1W + col2W / 2, signY + signBoxH - 2.5, { align: "center" });
  }

  // Box Calon Penerima Dana Hibah – kolom tanda tangan biasa (kosong)
  const penerimaX = marginL + colTimSurveyW;
  doc.rect(penerimaX, signY, colPenerimaW, signBoxH);

  // Titik-titik nama di bagian bawah kotak penerima
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("...........................................", penerimaX + colPenerimaW / 2, signY + signBoxH - 2.5, { align: "center" });

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
  const subColW = 45; // 45mm x 4 = 180mm

  // Box 1: Kosong + titik-titik
  doc.rect(marginL, metaSignY, subColW, metaSignH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("...................................................", marginL + subColW / 2, metaSignY + metaSignH - 3, { align: "center" });

  // Box 2: Catatan :
  doc.rect(marginL + subColW, metaSignY, subColW, metaSignH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Catatan :", marginL + subColW + 2, metaSignY + 4);

  // Box 3: KORLAP/RT/RW/LURAH/CAMAT SETEMPAT
  const subH3 = 5.5;
  doc.setFillColor(226, 239, 218);
  doc.rect(marginL + subColW * 2, metaSignY, subColW, subH3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.2);
  doc.text("KORLAP/RT/RW/LURAH/CAMAT SETEMPAT", marginL + subColW * 2 + subColW / 2, metaSignY + 3.6, { align: "center" });
  doc.rect(marginL + subColW * 2, metaSignY + subH3, subColW, metaSignH - subH3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("...................................................", marginL + subColW * 2 + subColW / 2, metaSignY + metaSignH - 3, { align: "center" });

  // Box 4: Catatan :
  doc.rect(marginL + subColW * 3, metaSignY, subColW, metaSignH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Catatan :", marginL + subColW * 3 + 2, metaSignY + 4);

  // BORDER TEBAL LUAR KESELURUHAN TABEL TANDA TANGAN
  const totalTtH = header1H + signBoxH + metaHeaderH + metaSignH;
  doc.setLineWidth(0.8);
  doc.rect(marginL, ttStartY, contentW, totalTtH);

  // ── HALAMAN 2: FOTO SURVEY + BADGE TERVERIFIKASI ───────────────────────────
  doc.addPage();
  doc.setFont("helvetica");

  // KOP halaman 2
  let y2 = 6;
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", marginL, y2, logoW, logoH);
  }
  const kopTextCenterX2 = marginL + logoW + (contentW - logoW) / 2;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text("P E M E R I N T A H   P R O V I N S I   K E P U L A U A N   R I A U", kopTextCenterX2, y2 + 3, { align: "center" });
  doc.setFontSize(13.5);
  doc.setFont("helvetica", "bold");
  doc.text("DINAS KOPERASI, USAHA KECIL DAN MENENGAH", kopTextCenterX2, y2 + 8, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Pusat Pemerintahan Provinsi Kepulauan Riau Bandar Seri Kota Piring", kopTextCenterX2, y2 + 12, { align: "center" });
  doc.text("Kawasan Perkantoran Sultan Mahmud Riayat Syah Gedung Daeng Marewah B1", kopTextCenterX2, y2 + 15.5, { align: "center" });
  doc.text("Lantai 3 Pulau Dompak Seri Darul Makmur – Tanjungpinang Kode Pos 29124", kopTextCenterX2, y2 + 19, { align: "center" });
  doc.text("Pos-el : diskopukmsprovinsikepri@gmail.com Laman : www.dinaskoperasiukm.kepriprov.go.id", kopTextCenterX2, y2 + 22.5, { align: "center" });

  y2 = 30;
  doc.setLineWidth(1.0);
  doc.setDrawColor(0, 0, 0);
  doc.line(marginL, y2, pageW - marginR, y2);

  // Subjudul halaman 2
  y2 += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("FOTO SURVEY", pageW / 2, y2, { align: "center" });
  y2 += 4.5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Pelaku Usaha: ${actor.fullName || "-"}`, pageW / 2, y2, { align: "center" });
  y2 += 8;

  if (surveyPhotoData) {
    // Hitung dimensi foto agar proporsional, maks 140mm x 160mm
    const maxImgW = 140;
    const maxImgH = 160;
    let imgW = maxImgW;
    let imgH = imgW * (surveyPhotoData.h / surveyPhotoData.w);
    if (imgH > maxImgH) {
      imgH = maxImgH;
      imgW = imgH * (surveyPhotoData.w / surveyPhotoData.h);
    }
    const imgX = (pageW - imgW) / 2;

    // Border kotak foto
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(imgX - 2, y2 - 2, imgW + 4, imgH + 4);

    try {
      doc.addImage(surveyPhotoData.base64, surveyPhotoData.format, imgX, y2, imgW, imgH);
    } catch (e) {
      console.error("Error embedding survey photo page 2:", e);
    }

    y2 += imgH + 8;

    // Badge TERVERIFIKASI di bawah foto
    const textVerif = "TERVERIFIKASI";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const textVerifW = doc.getTextWidth(textVerif);
    const iconW = 6;
    const badgeTotalW = iconW + 2 + textVerifW;
    const badgeStartX = (pageW - badgeTotalW) / 2;
    const badgeY = y2;

    // Lingkaran hijau
    doc.setFillColor(34, 197, 94);
    doc.circle(badgeStartX + 2.8, badgeY - 1.8, 3.0, "F");

    // Centang putih
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.line(badgeStartX + 1.5, badgeY - 1.8, badgeStartX + 2.4, badgeY - 0.8);
    doc.line(badgeStartX + 2.4, badgeY - 0.8, badgeStartX + 4.4, badgeY - 2.8);

    // Teks TERVERIFIKASI hijau
    doc.setTextColor(22, 163, 74);
    doc.text(textVerif, badgeStartX + iconW + 2, badgeY, { align: "left" });

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  } else {
    // Tidak ada foto: tampilkan placeholder
    const boxW = 120;
    const boxH = 80;
    const boxX = (pageW - boxW) / 2;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.setFillColor(248, 248, 248);
    doc.rect(boxX, y2, boxW, boxH, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("[ Foto Survey Tidak Tersedia ]", pageW / 2, y2 + boxH / 2, { align: "center" });

    y2 += boxH + 8;

    // Badge TERVERIFIKASI tetap ditampilkan meski tanpa foto
    const textVerif = "TERVERIFIKASI";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const textVerifW = doc.getTextWidth(textVerif);
    const iconW = 6;
    const badgeTotalW = iconW + 2 + textVerifW;
    const badgeStartX = (pageW - badgeTotalW) / 2;
    const badgeY = y2;

    doc.setFillColor(34, 197, 94);
    doc.circle(badgeStartX + 2.8, badgeY - 1.8, 3.0, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.line(badgeStartX + 1.5, badgeY - 1.8, badgeStartX + 2.4, badgeY - 0.8);
    doc.line(badgeStartX + 2.4, badgeY - 0.8, badgeStartX + 4.4, badgeY - 2.8);
    doc.setTextColor(22, 163, 74);
    doc.text(textVerif, badgeStartX + iconW + 2, badgeY, { align: "left" });

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  }

  // ── SIMPAN PDF ─────────────────────────────────────────────────────────────
  const safeName = (actor.fullName || "Pelaku-Usaha").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Berita_Acara_Survey_${safeName}.pdf`);
}

