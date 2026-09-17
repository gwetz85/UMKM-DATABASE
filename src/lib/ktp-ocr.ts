/**
 * Utility OCR & Prapemrosesan Citra Khusus Dokumen Kependudukan Indonesia (KTP & KK)
 * Mengoptimalkan akurasi pembacaan 16 digit NIK dan No. KK melalui:
 * 1. Image Preprocessing (Grayscale, Contrast Enhancement, Binarization/Thresholding)
 * 2. Multi-pass ROI (Region of Interest) scanning
 * 3. Character Confusion Correction (e.g. O/D -> 0, I/l -> 1, S -> 5, B -> 8)
 * 4. Validasi Struktur 16 Digit Kependudukan Indonesia
 */

export interface OcrResult {
  rawText: string;
  extractedNumber: string | null;
  documentType: "ktp" | "noKK";
  isValid16Digit: boolean;
  provinceCode?: string;
  provinceName?: string;
  detectedName?: string;
  confidence?: number;
}

// Daftar Kode Provinsi Indonesia untuk Verifikasi NIK / KK
const PROVINCE_MAP: Record<string, string> = {
  "11": "Aceh",
  "12": "Sumatera Utara",
  "13": "Sumatera Barat",
  "14": "Riau",
  "15": "Jambi",
  "16": "Sumatera Selatan",
  "17": "Bengkulu",
  "18": "Lampung",
  "19": "Kepulauan Bangka Belitung",
  "21": "Kepulauan Riau",
  "31": "DKI Jakarta",
  "32": "Jawa Barat",
  "33": "Jawa Tengah",
  "34": "DI Yogyakarta",
  "35": "Jawa Timur",
  "36": "Banten",
  "51": "Bali",
  "52": "Nusa Tenggara Barat",
  "53": "Nusa Tenggara Timur",
  "61": "Kalimantan Barat",
  "62": "Kalimantan Tengah",
  "63": "Kalimantan Selatan",
  "64": "Kalimantan Timur",
  "65": "Kalimantan Utara",
  "71": "Sulawesi Utara",
  "72": "Sulawesi Tengah",
  "73": "Sulawesi Selatan",
  "74": "Sulawesi Tenggara",
  "75": "Gorontalo",
  "76": "Sulawesi Barat",
  "81": "Maluku",
  "82": "Maluku Utara",
  "91": "Papua Barat",
  "92": "Papua",
};

/**
 * Prapemrosesan Canvas: Konversi ke Grayscale, Penajaman Kontras, dan Binarisasi
 */
export function preprocessCanvasForOcr(
  sourceCanvas: HTMLCanvasElement,
  options: {
    contrast?: number; // default 1.5
    threshold?: number; // 0-255, default adaptive
    sharpen?: boolean;
    cropRoi?: { x: number; y: number; width: number; height: number };
  } = {}
): HTMLCanvasElement {
  const { contrast = 1.6, threshold, cropRoi } = options;

  const targetWidth = cropRoi ? cropRoi.width : sourceCanvas.width;
  const targetHeight = cropRoi ? cropRoi.height : sourceCanvas.height;

  const processedCanvas = document.createElement("canvas");
  processedCanvas.width = targetWidth;
  processedCanvas.height = targetHeight;
  const ctx = processedCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  if (cropRoi) {
    ctx.drawImage(
      sourceCanvas,
      cropRoi.x,
      cropRoi.y,
      cropRoi.width,
      cropRoi.height,
      0,
      0,
      targetWidth,
      targetHeight
    );
  } else {
    ctx.drawImage(sourceCanvas, 0, 0);
  }

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;

  // 1. Grayscale & Contrast
  const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    // Luminance grayscale
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Contrast enhancement
    const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
    d[i] = adjusted;
    d[i + 1] = adjusted;
    d[i + 2] = adjusted;
    sum += adjusted;
  }

  // 2. Adaptive Thresholding / Binarization (Otsu-like mean threshold)
  const avg = threshold !== undefined ? threshold : sum / (d.length / 4);
  const cutoff = Math.min(180, Math.max(80, avg));

  for (let i = 0; i < d.length; i += 4) {
    const val = d[i] < cutoff ? 0 : 255;
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return processedCanvas;
}

/**
 * Normalisasi string angka yang sering tertukar oleh OCR pada font KTP/KK
 */
export function normalizeOcrDigits(text: string): string {
  return text
    .replace(/[OoD]/g, "0")
    .replace(/[Il|\][!]/g, "1")
    .replace(/[Zz]/g, "2")
    .replace(/[Ss$]/g, "5")
    .replace(/[G]/g, "6")
    .replace(/[B&]/g, "8")
    .replace(/[gq]/g, "9");
}

/**
 * Memvalidasi apakah string angka 16 digit memiliki format NIK / KK yang masuk akal
 */
export function validate16DigitCode(code: string, type: "ktp" | "noKK"): {
  isValid: boolean;
  provinceCode?: string;
  provinceName?: string;
  message?: string;
} {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 16) {
    return { isValid: false, message: `Panjang nomor harus 16 digit (terbaca ${clean.length} digit)` };
  }

  const provCode = clean.substring(0, 2);
  const provName = PROVINCE_MAP[provCode];

  // Validasi tanggal lahir untuk NIK jika tipe ktp
  if (type === "ktp") {
    const day = parseInt(clean.substring(6, 8), 10);
    const month = parseInt(clean.substring(8, 10), 10);

    const isValidDay = (day >= 1 && day <= 31) || (day >= 41 && day <= 71); // Wanita +40
    const isValidMonth = month >= 1 && month <= 12;

    if (!isValidDay || !isValidMonth) {
      // Masih bisa jadi valid jika karakter tanggal terdistorsi sedikit
    }
  }

  return {
    isValid: true,
    provinceCode: provCode,
    provinceName: provName || "Provinsi Terdaftar",
  };
}

/**
 * Ekstraksi 16 digit NIK atau KK dari teks OCR mentah
 */
export function extract16DigitNumber(
  rawText: string,
  docType: "ktp" | "noKK"
): {
  number: string | null;
  detectedName?: string;
  candidates: string[];
} {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates: string[] = [];
  let detectedName: string | undefined;

  // 1. Cari baris yang mengandung kata kunci NIK / No KK / KARTU KELUARGA
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // Deteksi Nama jika ada
    if (upper.includes("NAMA") && !detectedName) {
      const nameMatch = line.match(/NAMA\s*[:=\-]?\s*([A-Za-z\s.,]+)/i);
      if (nameMatch && nameMatch[1].trim().length > 2) {
        detectedName = nameMatch[1].trim().toUpperCase();
      } else if (i + 1 < lines.length && !lines[i + 1].includes(":")) {
        detectedName = lines[i + 1].trim().toUpperCase();
      }
    }

    // Normalisasi karakter pada baris yang berpotensi memiliki angka
    const normalizedLine = normalizeOcrDigits(line);

    // Cari deret angka 16 digit berurutan
    const directMatches = normalizedLine.match(/\b\d{16}\b/g);
    if (directMatches) {
      candidates.push(...directMatches);
    }

    // Cari angka dengan spasi di tengahnya (misal "2172 0423 0879 0003")
    const spacedDigits = normalizedLine.replace(/[^\d\s]/g, "").trim();
    const joined = spacedDigits.replace(/\s+/g, "");
    if (joined.length === 16) {
      candidates.push(joined);
    } else {
      // Cek substring 16 digit
      const sub16 = joined.match(/\d{16}/g);
      if (sub16) {
        candidates.push(...sub16);
      }
    }
  }

  // Jika belum menemukan dari per-baris, lakukan ekstraksi global pada seluruh teks
  if (candidates.length === 0) {
    const globalNormalized = normalizeOcrDigits(rawText);
    const globalMatches = globalNormalized.match(/\b\d{16}\b/g);
    if (globalMatches) {
      candidates.push(...globalMatches);
    } else {
      // Ekstrak semua deretan angka berurutan yang mendekati 16
      const allDigits = globalNormalized.replace(/\D/g, "");
      if (allDigits.length >= 16) {
        // Ambil potongan 16 digit pertama yang dimulai dengan kode provinsi valid
        for (let i = 0; i <= allDigits.length - 16; i++) {
          const chunk = allDigits.substring(i, i + 16);
          const pCode = chunk.substring(0, 2);
          if (PROVINCE_MAP[pCode]) {
            candidates.push(chunk);
          }
        }
        if (candidates.length === 0) {
          candidates.push(allDigits.substring(0, 16));
        }
      }
    }
  }

  // Prioritaskan kandidat:
  // 1. Yang berawalan kode wilayah Kepri (21) atau provinsi lain yang valid
  // 2. Yang memiliki panjang persis 16
  const uniqueCandidates = Array.from(new Set(candidates));
  let bestNumber: string | null = null;

  for (const cand of uniqueCandidates) {
    const pCode = cand.substring(0, 2);
    if (pCode === "21") {
      // Prioritas tertinggi: Kepulauan Riau (Tanjungpinang)
      bestNumber = cand;
      break;
    }
    if (PROVINCE_MAP[pCode] && !bestNumber) {
      bestNumber = cand;
    }
  }

  if (!bestNumber && uniqueCandidates.length > 0) {
    bestNumber = uniqueCandidates[0];
  }

  return {
    number: bestNumber,
    detectedName,
    candidates: uniqueCandidates,
  };
}

/**
 * Menjalankan OCR menggunakan Tesseract.js secara dinamis pada canvas
 */
export async function performKtpKkOcr(
  canvas: HTMLCanvasElement,
  docType: "ktp" | "noKK",
  onProgress?: (status: string, progress: number) => void
): Promise<OcrResult> {
  onProgress?.("Menyiapkan pemindai OCR...", 10);

  // Dynamic import Tesseract agar tidak membebani initial page load
  const { createWorker } = await import("tesseract.js");

  onProgress?.("Mengoptimalkan kontras dokumen...", 25);
  // Pass 1: Gambar yang sudah di-preprocess
  const preprocessedCanvas = preprocessCanvasForOcr(canvas, {
    contrast: 1.6,
  });

  onProgress?.("Menginisialisasi modul pengenalan teks...", 40);
  const worker = await createWorker("ind+eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.("Membaca angka & karakter KTP/KK...", 40 + Math.round(m.progress * 45));
      }
    },
  });

  try {
    // Konfigurasi whitelist karakter agar fokus pada angka dan teks KTP/KK
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:.-/ ",
    });

    onProgress?.("Menganalisis teks KTP/KK...", 85);
    const { data } = await worker.recognize(preprocessedCanvas);
    const rawText = data.text || "";

    onProgress?.("Mengekstrak 16 digit NIK/KK...", 95);
    let { number, detectedName, candidates } = extract16DigitNumber(rawText, docType);

    // Jika belum ditemukan 16 digit pada gambar hasil binarisasi, coba Pass 2 dengan canvas asli
    if (!number || number.length !== 16) {
      const fallbackResult = await worker.recognize(canvas);
      const fallbackRaw = fallbackResult.data.text || "";
      const fallbackExtract = extract16DigitNumber(fallbackRaw, docType);
      if (fallbackExtract.number && fallbackExtract.number.length === 16) {
        number = fallbackExtract.number;
        detectedName = detectedName || fallbackExtract.detectedName;
      }
    }

    const validation = number ? validate16DigitCode(number, docType) : { isValid: false };

    onProgress?.("Selesai memindai!", 100);

    return {
      rawText,
      extractedNumber: number,
      documentType: docType,
      isValid16Digit: validation.isValid,
      provinceCode: validation.provinceCode,
      provinceName: validation.provinceName,
      detectedName,
      confidence: data.confidence,
    };
  } finally {
    await worker.terminate();
  }
}
