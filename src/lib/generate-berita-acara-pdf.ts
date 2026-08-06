import jsPDF from "jspdf";
import { BusinessActor, SurveyDinasData } from "@/app/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: wrap text and return array of lines
// ─────────────────────────────────────────────────────────────────────────────
function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "-", maxWidth);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export async function generateBeritaAcaraPDF(
  actor: BusinessActor,
  surveyData: SurveyDinasData
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR; // 170 mm

  // ── FONTS ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica");

  // ── LOAD LOGO ──────────────────────────────────────────────────────────────
  let logoBase64: string | null = null;
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    logoBase64 = null;
  }

  // ── KOP SURAT ──────────────────────────────────────────────────────────────
  let y = 12;

  // Logo (kiri)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", marginL, y - 2, 22, 22);
  }

  // Teks KOP (tengah)
  const kopX = pageW / 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("PEMERINTAH PROVINSI KEPULAUAN RIAU", kopX, y, { align: "center" });

  y += 5;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("DINAS KOPERASI, USAHA KECIL DAN MENENGAH", kopX, y, { align: "center" });

  y += 4.5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Pusat Pemerintahan Provinsi Kepulauan Riau Bandar Riau Seri Kota Piring", kopX, y, { align: "center" });

  y += 3.8;
  doc.text("Kawasan Perkantoran Sultan Mahmud Riayat Syah Gedung Daeng Marewah B1", kopX, y, { align: "center" });

  y += 3.8;
  doc.text("Lantai 3 Pulau Dompak Seri Darul Makmur \u2013 Tanjungpinang Kode Pos 29124", kopX, y, { align: "center" });

  y += 3.8;
  doc.text("Pos-el : diskopukmsprovinsikepri@gmail.com    Laman : www.dinaskoperasiukm.kepriprov.go.id", kopX, y, { align: "center" });

  // Garis bawah KOP (dua garis tebal)
  y += 4;
  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);
  y += 0.8;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);

  // ── JUDUL DOKUMEN ──────────────────────────────────────────────────────────
  y += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BERITA ACARA SURVEY", kopX, y, { align: "center" });
  y += 5;
  doc.text("DANA HIBAH PENGUATAN MODAL KUMKM", kopX, y, { align: "center" });
  y += 5;
  doc.text("PROVINSI KEPULAUAN RIAU", kopX, y, { align: "center" });

  // ── TANGGAL ────────────────────────────────────────────────────────────────
  y += 8;
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

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text("Pada hari ini,  ", marginL, y);
  const prefix = "Pada hari ini,  ";
  const prefixW = doc.getTextWidth(prefix);
  doc.setFont("helvetica", "bolditalic");
  doc.text(hari, marginL + prefixW, y);
  const hariW = doc.getTextWidth(hari);
  doc.setFont("helvetica", "normal");
  const afterHari = `   ,  tanggal  ${tgl} ${bln} ${thn}   ,  yang bertandatangan dibawah ini :`;
  doc.text(afterHari, marginL + prefixW + hariW, y);

  // ── PEJABAT (Nama 1, 2, 3) ─────────────────────────────────────────────────
  // Sesuai permintaan: NAMA, NIPPPK, Pangkat/Gol Ruang, Jabatan DIKOSONGKAN
  const pejabat = [
    { no: "1.", fields: ["NAMA", "NIPPPK", "Pangkat/Gol. Ruang", "Jabatan"] },
    { no: "2", fields: ["NAMA", "NIPPPK", "Pangkat/Gol. Ruang", "Jabatan"] },
    { no: "3.", fields: ["NAMA", "NRTHL", "Pangkat/Gol. Ruang", "Jabatan"] },
  ];

  const labelColW = 35;
  const colonX = marginL + 7 + labelColW;
  const valueX = colonX + 5;
  const valueW = pageW - marginR - valueX;

  y += 6;
  doc.setFontSize(9.5);

  pejabat.forEach((p, idx) => {
    // Nomor
    doc.setFont("helvetica", "normal");
    doc.text(p.no, marginL, y);

    p.fields.forEach((label, fi) => {
      const isFirst = fi === 0;
      const lineX = isFirst ? marginL + 7 : marginL + 7;

      doc.setFont("helvetica", "normal");
      doc.text(label, lineX, y);
      doc.text(":", colonX, y);
      // Nilai dikosongkan (blank)
      doc.text("", valueX, y);

      if (fi < p.fields.length - 1) y += 4.5;
    });

    // Spasi antar pejabat
    y += (idx < pejabat.length - 1) ? 7 : 5;
  });

  // ── KALIMAT PEMBUKA ────────────────────────────────────────────────────────
  y += 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const kalimat =
    "Telah melaksanakan survey kepada calon penerima bantuan usaha Mikro dan Kecil Provinsi Kepulauan Riau yaitu :";
  const kalimatLines = splitLines(doc, kalimat, contentW);
  doc.text(kalimatLines, marginL, y);
  y += kalimatLines.length * 4.5 + 2;

  // ── DATA PELAKU USAHA ──────────────────────────────────────────────────────
  const dataRowsGroup1: { no: number; label: string; value: string; special?: string }[] = [
    { no: 1,  label: "Nama Usaha",              value: surveyData.namaUsaha || "-" },
    { no: 2,  label: "Nama Pemilik Usaha",       value: surveyData.namaPemilik || actor.fullName || "-" },
    {
      no: 3,
      label: "Jenis Kelamin-Status *",
      value: "",
      special: "jenis_kelamin_status",
    },
    {
      no: 4,
      label: "Alamat Usaha",
      value: actor.businessLocation || actor.address || "-",
    },
    {
      no: 5,
      label: "Alamat Rumah",
      value: surveyData.alamatRumah || actor.address || "-",
    },
  ];

  const noW = 6;
  const dataLabelW = 66; // Cukup lebar untuk label terpanjang seperti "Apakah Pernah Menerima Dana Hibah ?"
  const dataColonX = marginL + noW + dataLabelW; // 20 + 6 + 66 = 92mm
  const dataValueX = dataColonX + 3; // 95mm
  const dataValueW = pageW - marginR - dataValueX; // 210 - 20 - 95 = 95mm
  const lineY_offset = 1.2; // garis bawah sedikit di bawah teks

  doc.setFontSize(9);

  // Helper check page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageH - 15) {
      doc.addPage();
      y = 15;
    }
  };

  for (const row of dataRowsGroup1) {
    checkPageBreak(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${row.no}.`, marginL, y);
    doc.text(row.label, marginL + noW, y);
    doc.text(":", dataColonX, y);

    if (row.special === "jenis_kelamin_status") {
      // Formulir kosong static — semua opsi dicetak datar, diisi manual petugas
      const options = ["P", "L", "Janda", "Duda", "Lajang", "Kepala Keluarga"];
      let ox = dataValueX;
      doc.setFont("helvetica", "normal");
      options.forEach((opt) => {
        doc.text(opt, ox, y);
        ox += doc.getTextWidth(opt) + 4.5;
      });
      y += 5.5;
    } else {
      const lines = splitLines(doc, row.value, dataValueW);
      doc.setFont("helvetica", "normal");
      doc.text(lines, dataValueX, y);
      // Garis bawah (satu atau lebih sesuai jumlah baris)
      doc.setLineWidth(0.2);
      for (let l = 0; l < lines.length; l++) {
        doc.line(dataValueX, y + lineY_offset + l * 4.5, pageW - marginR, y + lineY_offset + l * 4.5);
      }
      y += lines.length * 4.5 + 1;
    }
  }

  // No HP
  checkPageBreak(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("No HP Pemilik Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.noHp || actor.phone || "-", dataValueX, y);
  doc.setLineWidth(0.2);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 5.5;

  // No 6: DTKS — formulir kosong static, diisi manual petugas
  checkPageBreak(14);
  doc.setFont("helvetica", "normal");
  doc.text("6.", marginL, y);
  doc.text("Apakah Saudara Masuk dalam DTKS ?", marginL + noW, y);
  doc.text(":", dataColonX, y);
  // Garis kosong untuk jawaban
  doc.setLineWidth(0.2);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 5.5;

  // Baris DTKS Kategori static
  const dtksOptions = ["PKH", "BPNT", "KIP", "LANSIA"];
  doc.text("Jika YA, DTKS Kategori *:", marginL + noW + 4, y);
  let dtksOx = marginL + noW + 4 + doc.getTextWidth("Jika YA, DTKS Kategori *:  ");
  dtksOptions.forEach((opt) => {
    doc.setFont("helvetica", "normal");
    doc.text(opt, dtksOx, y);
    dtksOx += doc.getTextWidth(opt) + 5;
  });
  y += 6;

  // Baris 7–14
  const moreRows = [
    { no: 7,  label: "Bidang Usaha",                value: surveyData.bidangUsaha || "-" },
    { no: 8,  label: "Peralatan Yang Digunakan",     value: surveyData.peralatan || "-" },
    { no: 9,  label: "Tahun Berdiri",                value: surveyData.tahunBerdiri || "-" },
    { no: 10, label: "Izin Yang dimiliki *",         value: (surveyData.izin && surveyData.izin.length > 0) ? surveyData.izin.join(", ") : "-", special: "izin" },
    { no: 11, label: "Modal Usaha dan Omset per bulan", value: `Modal: Rp ${surveyData.modalUsaha || "-"}  |  Omset: Rp ${surveyData.omset || "-"}` },
    { no: 12, label: "Apakah Pernah Menerima Dana Hibah ?", value: "", special: "hibah" },
    { no: 13, label: "Rencana Penggunaan Dana Hibah", value: surveyData.rencanaPenggunaan || "-" },
    { no: 14, label: "Hasil Survey",                 value: surveyData.hasilSurvey || "-" },
  ];

  for (const row of moreRows) {
    checkPageBreak(12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${row.no}.`, marginL, y);

    if (row.special === "izin") {
      doc.text(row.label, marginL + noW, y);
      doc.text(":", dataColonX, y);
      // Tampilkan sebagai checkboxes
      const opts = ["NIB", "HALAL", "PIRT", "Lainnya"];
      let ox = dataValueX;
      opts.forEach((opt) => {
        const isSel = surveyData.izin?.includes(opt);
        doc.setFont("helvetica", isSel ? "bold" : "normal");
        doc.text(opt, ox, y);
        if (opt === "Lainnya") {
          doc.text(":", ox + doc.getTextWidth(opt) + 1, y);
        }
        ox += doc.getTextWidth(opt) + 6;
      });
      doc.setFont("helvetica", "normal");
      doc.setLineWidth(0.2);
      doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
      y += 5.5;
    } else if (row.special === "hibah") {
      // Formulir kosong static — diisi manual petugas
      doc.text(row.label, marginL + noW, y);
      doc.text(":", dataColonX, y);
      // Baris: YA dari mana : ______________ Tahun berapa : ______
      const yaLabel = "YA  dari mana : ";
      doc.text(yaLabel, dataValueX, y);
      const yaW = doc.getTextWidth(yaLabel);
      doc.setLineWidth(0.2);
      doc.line(dataValueX + yaW, y + lineY_offset, dataValueX + yaW + 40, y + lineY_offset);
      const thnLabel = "   Tahun berapa : ";
      const thnLabelW = doc.getTextWidth(thnLabel);
      doc.text(thnLabel, dataValueX + yaW + 40, y);
      doc.line(dataValueX + yaW + 40 + thnLabelW, y + lineY_offset, pageW - marginR, y + lineY_offset);
      y += 5.5;
      // Baris kedua: TIDAK
      doc.text("TIDAK", dataValueX, y);
      y += 5.5;
    } else {
      doc.text(row.label, marginL + noW, y);
      doc.text(":", dataColonX, y);
      const lines = splitLines(doc, row.value, dataValueW);
      doc.text(lines, dataValueX, y);
      doc.setLineWidth(0.2);
      for (let l = 0; l < lines.length; l++) {
        doc.line(dataValueX, y + lineY_offset + l * 4.5, pageW - marginR, y + lineY_offset + l * 4.5);
      }
      y += lines.length * 4.5 + 1;
    }
  }

  // ── TABEL TANDA TANGAN ────────────────────────────────────────────────────
  // Pastikan cukup ruang untuk tabel tanda tangan
  const ttTableH = 65;
  if (y + ttTableH > pageH - 15) {
    doc.addPage();
    y = 15;
  } else {
    y += 4;
  }

  // Tabel dengan 4 kolom: 3 kolom Tim Survey + 1 kolom Calon Penerima Dana Hibah
  const ttStartY = y;
  const col1W = 43;
  const col2W = 43;
  const col3W = 43;
  const col4W = contentW - col1W - col2W - col3W; // sisa

  // Header baris 1: "TIM SURVEY" (3 kolom merge) | "CALON PENERIMA DANA HIBAH"
  const headerH = 7;
  doc.setLineWidth(0.3);
  doc.setFillColor(220, 220, 220);

  // Kotak header TIM SURVEY
  doc.rect(marginL, ttStartY, col1W + col2W + col3W, headerH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TIM SURVEY", marginL + (col1W + col2W + col3W) / 2, ttStartY + 4.8, { align: "center" });

  // Kotak header CALON PENERIMA DANA HIBAH
  doc.rect(marginL + col1W + col2W + col3W, ttStartY, col4W, headerH, "FD");
  doc.text("CALON PENERIMA DANA HIBAH", marginL + col1W + col2W + col3W + col4W / 2, ttStartY + 4.8, { align: "center" });

  // Baris tanda tangan (kotak kosong)
  const signH = 26;
  const signY = ttStartY + headerH;

  // Kolom 1
  doc.rect(marginL, signY, col1W, signH);
  // Kolom 2
  doc.rect(marginL + col1W, signY, col2W, signH);
  // Kolom 3
  doc.rect(marginL + col1W + col2W, signY, col3W, signH);
  // Kolom 4
  doc.rect(marginL + col1W + col2W + col3W, signY, col4W, signH);

  // Label nama di bawah tanda tangan (di dalam kotak)
  const nameLabelY = signY + signH - 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text((actor.fullName || "").toUpperCase(), marginL + col1W + col2W + col3W + col4W / 2, nameLabelY, { align: "center" });

  // ── BARIS MENGETAHUI/VERIFIKATOR ──────────────────────────────────────────
  const metaStartY = signY + signH;
  const metaH = 7;
  const metaSignH = 24;

  // Header MENGETAHUI/VERIFIKATOR (full width)
  doc.setFillColor(220, 220, 220);
  doc.rect(marginL, metaStartY, contentW, metaH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("MENGETAHUI/VERIFIKATOR", pageW / 2, metaStartY + 4.8, { align: "center" });

  // Sub kolom: col1 (blank), col2 (KORLAP/RT/RT/LURAH/CAMAT SETEMPAT), col3 (Catatan)
  const metaSignY = metaStartY + metaH;

  // Kotak kiri (kosong)
  doc.rect(marginL, metaSignY, col1W, metaSignH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Catatan :", marginL + 2, metaSignY + 4);

  // Kotak tengah (KORLAP/RT/RW/LURAH/CAMAT)
  const midW = col2W + col3W;
  doc.rect(marginL + col1W, metaSignY, midW, metaSignH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("KORLAP/RT/RT/LURAH/CAMAT SETEMPAT", marginL + col1W + midW / 2, metaSignY + 4.5, { align: "center" });

  // Kotak kanan (Catatan)
  doc.rect(marginL + col1W + midW, metaSignY, col4W, metaSignH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Catatan :", marginL + col1W + midW + 2, metaSignY + 4);

  // ── SIMPAN PDF ─────────────────────────────────────────────────────────────
  const safeName = (actor.fullName || "Pelaku-Usaha").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Berita_Acara_Survey_${safeName}.pdf`);
}
