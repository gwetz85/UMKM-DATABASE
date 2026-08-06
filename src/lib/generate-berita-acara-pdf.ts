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
  const dataRows: { no: number; label: string; value: string; special?: string }[] = [
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

  const noW = 8;
  const dataLabelW = 48;
  const dataColonX = marginL + noW + dataLabelW;
  const dataValueX = dataColonX + 4;
  const dataValueW = pageW - marginR - dataValueX;
  const lineY_offset = 1.2; // garis bawah sedikit di bawah teks

  doc.setFontSize(9.5);

  for (const row of dataRows) {
    doc.setFont("helvetica", "normal");
    doc.text(`${row.no}.`, marginL, y);
    doc.text(row.label, marginL + noW, y);
    doc.text(":", dataColonX, y);

    if (row.special === "jenis_kelamin_status") {
      // Tampilan: P  L  Janda  Duda  Lajang  Kepala Keluarga  (cetak tebal/kotak cek)
      const jk = surveyData.jenisKelamin || "";
      const st = surveyData.status || "";
      const options = ["P", "L", "Janda", "Duda", "Lajang", "Kepala Keluarga"];
      let ox = dataValueX;
      options.forEach((opt) => {
        const isSel =
          (opt === "P" && jk === "Perempuan") ||
          (opt === "L" && (jk === "Laki-Laki" || jk === "Laki-laki")) ||
          opt === st;
        doc.setFont("helvetica", isSel ? "bold" : "normal");
        doc.text(opt, ox, y);
        ox += doc.getTextWidth(opt) + 6;
      });
      // Garis bawah
      doc.setLineWidth(0.2);
      doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
      y += 6;
    } else {
      const lines = splitLines(doc, row.value, dataValueW);
      doc.setFont("helvetica", "normal");
      doc.text(lines, dataValueX, y);
      // Garis bawah (satu atau lebih sesuai jumlah baris)
      doc.setLineWidth(0.2);
      for (let l = 0; l < lines.length; l++) {
        doc.line(dataValueX, y + lineY_offset + l * 4.5, pageW - marginR, y + lineY_offset + l * 4.5);
      }
      y += lines.length * 4.5 + 1.5;
    }
  }

  // No HP
  y += 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("No HP Pemilik Usaha", marginL + noW, y);
  doc.text(":", dataColonX, y);
  doc.text(surveyData.noHp || actor.phone || "-", dataValueX, y);
  doc.setLineWidth(0.2);
  doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
  y += 6;

  // No 6: DTKS
  doc.text("6.", marginL, y);
  doc.text("Apakah Saudara Masuk dalam DTKS ?", marginL + noW, y);
  doc.text(":", dataColonX, y);
  const dtksVal = surveyData.dtks?.masuk ? "YA" : "TIDAK";
  doc.text(dtksVal, dataValueX, y);
  y += 5;

  if (surveyData.dtks?.masuk) {
    const dtksOptions = ["PKH", "BPNT", "KIP", "LANSIA"];
    doc.text("Jika YA, DTKS Kategori *:", marginL + noW, y);
    let ox = marginL + noW + doc.getTextWidth("Jika YA, DTKS Kategori *: ") + 2;
    dtksOptions.forEach((opt) => {
      const isSel = surveyData.dtks?.jenis === opt;
      doc.setFont("helvetica", isSel ? "bold" : "normal");
      doc.text(opt, ox, y);
      ox += doc.getTextWidth(opt) + 5;
    });
    doc.setFont("helvetica", "normal");
    y += 6;
  } else {
    y += 2;
  }

  // Baris 7–14
  const moreRows = [
    { no: 7,  label: "Bidang Usaha",                value: surveyData.bidangUsaha || "-" },
    { no: 8,  label: "Peralatan Yang Digunakan",     value: surveyData.peralatan || "-" },
    { no: 9,  label: "Tahun Berdiri",                value: surveyData.tahunBerdiri || "-" },
    { no: 10, label: "Izin Yang dimiliki *",         value: (surveyData.izin && surveyData.izin.length > 0) ? surveyData.izin.join(", ") : "-", special: "izin" },
    { no: 11, label: "Modal Usaha dan Omset per bulan", value: `Modal: Rp ${surveyData.modalUsaha || "-"}  |  Omset: Rp ${surveyData.omset || "-"}` },
    { no: 12, label: "Apakah Pernah Menerima Dana Hibah ?", value: surveyData.hibah?.pernah ? `YA dari mana : ${surveyData.hibah.dariMana || ""}   Tahun berapa : ${surveyData.hibah.tahun || ""}` : "TIDAK", special: "hibah" },
    { no: 13, label: "Rencana Penggunaan Dana Hibah", value: surveyData.rencanaPenggunaan || "-" },
    { no: 14, label: "Hasil Survey",                 value: surveyData.hasilSurvey || "-" },
  ];

  for (const row of moreRows) {
    // Pastikan ada cukup ruang di halaman
    if (y > pageH - 80) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
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
        ox += doc.getTextWidth(opt) + 8;
      });
      doc.setFont("helvetica", "normal");
      doc.setLineWidth(0.2);
      doc.line(dataValueX, y + lineY_offset, pageW - marginR, y + lineY_offset);
      y += 6;
    } else if (row.special === "hibah") {
      doc.text(row.label, marginL + noW, y);
      doc.text(":", dataColonX, y);
      if (surveyData.hibah?.pernah) {
        doc.text(`YA  dari mana :`, dataValueX, y);
        const ymW = doc.getTextWidth(`YA  dari mana : `);
        doc.text(surveyData.hibah.dariMana || "", dataValueX + ymW, y);
        doc.setLineWidth(0.2);
        doc.line(dataValueX + ymW, y + lineY_offset, dataValueX + ymW + 50, y + lineY_offset);
        const thnLabel = `   Tahun berapa : `;
        const thnLabelW = doc.getTextWidth(thnLabel);
        doc.text(thnLabel, dataValueX + ymW + 50, y);
        doc.text(surveyData.hibah.tahun || "", dataValueX + ymW + 50 + thnLabelW, y);
        doc.line(dataValueX + ymW + 50 + thnLabelW, y + lineY_offset, pageW - marginR, y + lineY_offset);
        y += 6;
        doc.text("TIDAK", dataValueX, y);
        y += 6;
      } else {
        doc.text("TIDAK", dataValueX, y);
        y += 6;
      }
    } else {
      doc.text(row.label, marginL + noW, y);
      doc.text(":", dataColonX, y);
      const lines = splitLines(doc, row.value, dataValueW);
      doc.text(lines, dataValueX, y);
      doc.setLineWidth(0.2);
      for (let l = 0; l < lines.length; l++) {
        doc.line(dataValueX, y + lineY_offset + l * 4.5, pageW - marginR, y + lineY_offset + l * 4.5);
      }
      y += lines.length * 4.5 + 1.5;
    }
  }

  // ── TABEL TANDA TANGAN ────────────────────────────────────────────────────
  // Pastikan cukup ruang
  const ttTableH = 50;
  if (y > pageH - ttTableH - 20) {
    doc.addPage();
    y = 20;
  }

  y += 6;

  // Tabel dengan 4 kolom: 3 kolom Tim Survey + 1 kolom Calon Penerima Dana Hibah
  const ttStartY = y;
  const col1W = 43;
  const col2W = 43;
  const col3W = 43;
  const col4W = contentW - col1W - col2W - col3W; // sisa

  // Header baris 1: "TIM SURVEY" (3 kolom merge) | "CALON PENERIMA DANA HIBAH"
  const headerH = 8;
  doc.setLineWidth(0.3);
  doc.setFillColor(220, 220, 220);

  // Kotak header TIM SURVEY
  doc.rect(marginL, ttStartY, col1W + col2W + col3W, headerH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TIM SURVEY", marginL + (col1W + col2W + col3W) / 2, ttStartY + 5.2, { align: "center" });

  // Kotak header CALON PENERIMA DANA HIBAH
  doc.rect(marginL + col1W + col2W + col3W, ttStartY, col4W, headerH, "FD");
  doc.text("CALON PENERIMA DANA HIBAH", marginL + col1W + col2W + col3W + col4W / 2, ttStartY + 5.2, { align: "center" });

  // Baris tanda tangan (kotak kosong)
  const signH = 30;
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
  const nameLabelY = signY + signH - 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  // Nama Tim Survey dikosongkan (akan diisi nanti)
  // doc.text("NAMA 1", marginL + col1W / 2, nameLabelY, { align: "center" });
  // doc.text("NAMA 2", marginL + col1W + col2W / 2, nameLabelY, { align: "center" });
  // doc.text("NAMA 3", marginL + col1W + col2W + col3W / 2, nameLabelY, { align: "center" });
  doc.text(actor.fullName.toUpperCase(), marginL + col1W + col2W + col3W + col4W / 2, nameLabelY, { align: "center" });

  // ── BARIS MENGETAHUI/VERIFIKATOR ──────────────────────────────────────────
  const metaStartY = signY + signH;
  const metaH = 8;
  const metaSignH = 28;

  // Header MENGETAHUI/VERIFIKATOR (full width)
  doc.setFillColor(220, 220, 220);
  doc.rect(marginL, metaStartY, contentW, metaH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MENGETAHUI/VERIFIKATOR", pageW / 2, metaStartY + 5.2, { align: "center" });

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
  doc.text("KORLAP/RT/RT/LURAH/CAMAT SETEMPAT", marginL + col1W + midW / 2, metaSignY + 5, { align: "center" });

  // Kotak kanan (Catatan)
  doc.rect(marginL + col1W + midW, metaSignY, col4W, metaSignH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Catatan :", marginL + col1W + midW + 2, metaSignY + 4);

  // ── SIMPAN PDF ─────────────────────────────────────────────────────────────
  const safeName = (actor.fullName || "Pelaku-Usaha").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Berita_Acara_Survey_${safeName}.pdf`);
}
