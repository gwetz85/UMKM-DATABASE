/**
 * Utility OCR & Prapemrosesan Citra Khusus Dokumen Kependudukan Indonesia (KTP & KK)
 * Mengoptimalkan akurasi pembacaan 16 digit NIK dan No. KK melalui:
 * 1. Image Preprocessing (Grayscale, Contrast Enhancement, Binarization/Thresholding, Upscale, ROI)
 * 2. Multi-pass OCR (Original, Grayscale+Kontras, Binarisasi, Crop ROI NIK/KK 2x, Upscale 2x)
 * 3. Candidate Voting & Early Stopping berdasarkan validasi struktur dan confidence
 * 4. Character Confusion Correction (e.g. O/D -> 0, I/l/| -> 1, S -> 5, B -> 8, G -> 6, g/q -> 9)
 * 5. Validasi Ketat 16 Digit Kependudukan Indonesia (Kode Provinsi & Tanggal Lahir NIK)
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

// Daftar Kode Provinsi Indonesia Lengkap untuk Verifikasi NIK / KK
export const PROVINCE_MAP: Record<string, string> = {
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
  "93": "Papua Selatan",
  "94": "Papua Tengah",
  "95": "Papua Pegunungan",
  "96": "Papua Barat Daya",
};

/**
 * Prapemrosesan Canvas: Konversi ke Grayscale, Penajaman Kontras, Binarisasi, Crop ROI, dan Skala
 */
export function preprocessCanvasForOcr(
  sourceCanvas: HTMLCanvasElement,
  options: {
    contrast?: number; // default 1.5
    threshold?: number; // 0-255, default adaptive
    sharpen?: boolean;
    cropRoi?: { x: number; y: number; width: number; height: number };
    binarize?: boolean; // default true. Jika false: grayscale + kontras saja tanpa binarisasi keras
    scale?: number; // scale factor e.g. 2 for 2x upscale
  } = {}
): HTMLCanvasElement {
  const { contrast = 1.5, threshold, cropRoi, binarize = true, scale = 1 } = options;

  const sourceW = cropRoi ? Math.max(1, cropRoi.width) : sourceCanvas.width;
  const sourceH = cropRoi ? Math.max(1, cropRoi.height) : sourceCanvas.height;
  const targetWidth = Math.max(1, Math.round(sourceW * scale));
  const targetHeight = Math.max(1, Math.round(sourceH * scale));

  const processedCanvas = document.createElement("canvas");
  processedCanvas.width = targetWidth;
  processedCanvas.height = targetHeight;
  const ctx = processedCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

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
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  }

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;

  // 1. Grayscale & Contrast
  const clampedContrast = Math.min(2.5, Math.max(0.5, contrast));
  const factor = (259 * (clampedContrast * 100 + 255)) / (255 * (259 - clampedContrast * 100));

  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    // Luminance grayscale (ITU-R BT.601)
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
    d[i] = adjusted;
    d[i + 1] = adjusted;
    d[i + 2] = adjusted;
    sum += adjusted;
  }

  // 2. Adaptive Thresholding / Binarization (hanya bila binarize = true)
  if (binarize) {
    const avg = threshold !== undefined ? threshold : sum / (d.length / 4);
    const cutoff = Math.min(180, Math.max(80, avg));

    for (let i = 0; i < d.length; i += 4) {
      const val = d[i] < cutoff ? 0 : 255;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }
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
    .replace(/[Il|\][!iL]/g, "1")
    .replace(/[Zz]/g, "2")
    .replace(/[Ss$]/g, "5")
    .replace(/[G]/g, "6")
    .replace(/[B&]/g, "8")
    .replace(/[gq]/g, "9");
}

/**
 * Memvalidasi apakah string angka 16 digit memiliki format NIK / KK yang valid
 * - Panjang tepat 16 digit
 * - Kode provinsi terdaftar di Indonesia (PROVINCE_MAP)
 * - Untuk KTP: tanggal lahir valid (hari 1-31, wanita +40 jadi 41-71, bulan 1-12)
 */
export function validate16DigitCode(
  code: string,
  type: "ktp" | "noKK"
): {
  isValid: boolean;
  provinceCode?: string;
  provinceName?: string;
  message?: string;
} {
  const clean = (code || "").replace(/\D/g, "");
  if (clean.length !== 16) {
    return {
      isValid: false,
      message: `Panjang nomor harus 16 digit (terbaca ${clean.length} digit)`,
    };
  }

  const provCode = clean.substring(0, 2);
  const provName = PROVINCE_MAP[provCode];

  if (!provName) {
    return {
      isValid: false,
      provinceCode: provCode,
      message: `Kode provinsi "${provCode}" tidak dikenal di Indonesia.`,
    };
  }

  // Validasi tanggal lahir untuk NIK jika tipe ktp
  if (type === "ktp") {
    const day = parseInt(clean.substring(6, 8), 10);
    const month = parseInt(clean.substring(8, 10), 10);

    const isValidDay = (day >= 1 && day <= 31) || (day >= 41 && day <= 71); // Wanita +40
    const isValidMonth = month >= 1 && month <= 12;

    if (!isValidDay || !isValidMonth) {
      return {
        isValid: false,
        provinceCode: provCode,
        provinceName: provName,
        message: `Tanggal lahir pada NIK (${clean.substring(6, 8)}/${clean.substring(8, 10)}) tidak valid.`,
      };
    }
  }

  return {
    isValid: true,
    provinceCode: provCode,
    provinceName: provName,
    message: "16 digit valid terverifikasi",
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

  const addCandidate = (cand: string) => {
    const clean = cand.replace(/\D/g, "");
    if (clean.length === 16 && !candidates.includes(clean)) {
      candidates.push(clean);
    }
  };

  // 1. Scan baris per baris
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // Deteksi Nama jika ada
    if (upper.includes("NAMA") && !detectedName) {
      const nameMatch = line.match(/NAMA\s*[:=\-]?\s*([A-Za-z\s.,]+)/i);
      if (nameMatch && nameMatch[1].trim().length > 2) {
        detectedName = nameMatch[1].trim().toUpperCase();
      } else if (i + 1 < lines.length && !lines[i + 1].includes(":") && lines[i + 1].trim().length > 2) {
        const nextClean = lines[i + 1].replace(/[^A-Za-z\s.,]/g, "").trim();
        if (nextClean.length > 2) {
          detectedName = nextClean.toUpperCase();
        }
      }
    }

    // Periksa baris kata kunci (NIK atau NO. KK)
    const isKeywordLine =
      upper.includes("NIK") ||
      upper.includes("N.I.K") ||
      upper.includes("NOMOR") ||
      upper.includes("KARTU KELUARGA") ||
      upper.includes("NO. KK") ||
      upper.includes("NO.KK") ||
      upper.includes("NO KK");

    if (isKeywordLine) {
      // Ambil teks setelah kata kunci
      const matchIdx = upper.search(/NIK|NOMOR|KARTU|NO/);
      const afterKeyword = matchIdx >= 0 ? line.substring(matchIdx) : line;
      const normalizedKeywordSegment = normalizeOcrDigits(afterKeyword);
      const digitsOnly = normalizedKeywordSegment.replace(/\D/g, "");

      if (digitsOnly.length === 16) {
        addCandidate(digitsOnly);
      } else if (digitsOnly.length > 16) {
        for (let j = 0; j <= digitsOnly.length - 16; j++) {
          addCandidate(digitsOnly.substring(j, j + 16));
        }
      }
    }

    // Normalisasi karakter yang mirip angka pada baris
    const normalizedLine = normalizeOcrDigits(line);

    // Cari deret angka 16 digit langsung
    const directMatches = normalizedLine.match(/\b\d{16}\b/g);
    if (directMatches) {
      directMatches.forEach(addCandidate);
    }

    // Cari angka dengan spasi di tengahnya (misal "2172 0423 0879 0003")
    const spacedDigits = normalizedLine.replace(/[^\d\s]/g, "").trim();
    const joined = spacedDigits.replace(/\s+/g, "");
    if (joined.length === 16) {
      addCandidate(joined);
    } else if (joined.length > 16) {
      const sub16 = joined.match(/\d{16}/g);
      if (sub16) {
        sub16.forEach(addCandidate);
      }
    }
  }

  // 2. Jika belum ditemukan kandidat dari per-baris, lakukan ekstraksi global
  if (candidates.length === 0) {
    const globalNormalized = normalizeOcrDigits(rawText);
    const globalMatches = globalNormalized.match(/\b\d{16}\b/g);
    if (globalMatches) {
      globalMatches.forEach(addCandidate);
    } else {
      const allDigits = globalNormalized.replace(/\D/g, "");
      if (allDigits.length >= 16) {
        for (let i = 0; i <= allDigits.length - 16; i++) {
          const chunk = allDigits.substring(i, i + 16);
          const pCode = chunk.substring(0, 2);
          if (PROVINCE_MAP[pCode]) {
            addCandidate(chunk);
          }
        }
        if (candidates.length === 0) {
          addCandidate(allDigits.substring(0, 16));
        }
      }
    }
  }

  // 3. Scoring dan Pemilihan Kandidat Terbaik
  // Prioritas:
  // - Lolos validasi penuh (validate16DigitCode)
  // - Kode wilayah Kepulauan Riau (21) memiliki prioritas tertinggi
  // - Kode wilayah provinsi lain yang valid
  let bestNumber: string | null = null;
  let bestScore = -Infinity;

  for (const cand of candidates) {
    const validation = validate16DigitCode(cand, docType);
    let score = 0;
    if (validation.isValid) score += 1000;
    if (cand.startsWith("21")) score += 500;
    else if (PROVINCE_MAP[cand.substring(0, 2)]) score += 200;

    if (score > bestScore) {
      bestScore = score;
      bestNumber = cand;
    }
  }

  if (!bestNumber && candidates.length > 0) {
    bestNumber = candidates[0];
  }

  return {
    number: bestNumber,
    detectedName,
    candidates,
  };
}

/**
 * Helper untuk membuat Tesseract Worker dengan fallback bahasa:
 * Coba createWorker("ind+eng"), jika gagal fallback ke createWorker("eng").
 */
async function initTesseractWorker(
  createWorkerFn: any,
  loggerFn?: (m: any) => void
): Promise<any> {
  try {
    const worker = await createWorkerFn("ind+eng", 1, {
      logger: loggerFn,
    });
    return worker;
  } catch (err1) {
    console.warn("Gagal memuat paket bahasa ind+eng, mencoba fallback eng:", err1);
    try {
      const fallbackWorker = await createWorkerFn("eng", 1, {
        logger: loggerFn,
      });
      return fallbackWorker;
    } catch (err2) {
      console.error("Gagal memuat paket bahasa eng:", err2);
      throw new Error(
        "Gagal menginisialisasi modul pengenal karakter (Tesseract OCR). Periksa koneksi internet untuk mengunduh model bahasa."
      );
    }
  }
}

interface CandidateVote {
  code: string;
  count: number;
  confidences: number[];
  passes: string[];
  isValid: boolean;
  provinceCode: string;
  isKepri: boolean;
}

/**
 * Menjalankan Multi-Pass OCR menggunakan Tesseract.js secara dinamis pada canvas
 * Multi-pass passes:
 * (a) Canvas Asli
 * (b) Grayscale + Kontras tanpa binarisasi keras
 * (c) Binarisasi Adaptive / Threshold
 * (d) Crop ROI area atas KTP/KK (tempat NIK / No. KK berada) + Upscale 2x
 * (e) Full Canvas Upscale 2x
 *
 * Early Stop: Berhenti awal jika sebuah kandidat sudah lolos validasi penuh dan muncul di minimal 2 pass dengan confidence cukup.
 */
export async function performKtpKkOcr(
  canvas: HTMLCanvasElement,
  docType: "ktp" | "noKK",
  onProgress?: (status: string, progress: number) => void
): Promise<OcrResult> {
  onProgress?.("Menyiapkan pemindai OCR Multi-Pass...", 10);

  const { createWorker } = await import("tesseract.js");

  let currentPassPercent = 20;
  const worker = await initTesseractWorker(createWorker, (m) => {
    if (m.status === "recognizing text" && typeof m.progress === "number") {
      const p = currentPassPercent + Math.round(m.progress * 15);
      onProgress?.("Membaca angka & karakter KTP/KK...", Math.min(95, p));
    }
  });

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:.-/ ",
    });

    // Siapkan 5 variasi citra (passes)
    const passesConfig: Array<{ name: string; getCanvas: () => HTMLCanvasElement; weight: number }> = [
      {
        name: "Pass A (Asli)",
        getCanvas: () => canvas,
        weight: 1.0,
      },
      {
        name: "Pass B (Grayscale + Kontras)",
        getCanvas: () => preprocessCanvasForOcr(canvas, { contrast: 1.5, binarize: false }),
        weight: 1.2,
      },
      {
        name: "Pass C (Binarisasi)",
        getCanvas: () => preprocessCanvasForOcr(canvas, { contrast: 1.6, binarize: true }),
        weight: 1.0,
      },
      {
        name: "Pass D (Crop ROI Area Nomor 2x)",
        getCanvas: () => {
          const roiX = Math.round(canvas.width * 0.04);
          const roiY = Math.round(canvas.height * (docType === "ktp" ? 0.08 : 0.05));
          const roiW = Math.round(canvas.width * 0.92);
          const roiH = Math.round(canvas.height * (docType === "ktp" ? 0.40 : 0.35));
          return preprocessCanvasForOcr(canvas, {
            cropRoi: { x: roiX, y: roiY, width: roiW, height: roiH },
            scale: 2,
            contrast: 1.5,
            binarize: false,
          });
        },
        weight: 1.4,
      },
      {
        name: "Pass E (Upscale 2x)",
        getCanvas: () => preprocessCanvasForOcr(canvas, { scale: 2, contrast: 1.3, binarize: false }),
        weight: 1.1,
      },
    ];

    const votesMap = new Map<string, CandidateVote>();
    const allRawTexts: string[] = [];
    let detectedName: string | undefined;
    let bestCandidateOverall: string | null = null;
    let highestPassConfidence = 0;

    for (let i = 0; i < passesConfig.length; i++) {
      const pass = passesConfig[i];
      currentPassPercent = 20 + Math.round((i / passesConfig.length) * 70);
      onProgress?.(`Memproses ${pass.name}...`, currentPassPercent);

      let passCanvas: HTMLCanvasElement;
      try {
        passCanvas = pass.getCanvas();
      } catch (prepErr) {
        console.warn(`Error generating canvas for ${pass.name}:`, prepErr);
        continue;
      }

      const { data } = await worker.recognize(passCanvas);
      const passText = data.text || "";
      const passConf = typeof data.confidence === "number" ? data.confidence : 75;
      if (passConf > highestPassConfidence) {
        highestPassConfidence = passConf;
      }

      allRawTexts.push(`[${pass.name}]\n${passText}`);

      const extracted = extract16DigitNumber(passText, docType);
      if (extracted.detectedName && !detectedName) {
        detectedName = extracted.detectedName;
      }

      const passCandidates = Array.from(new Set([
        ...(extracted.number ? [extracted.number] : []),
        ...extracted.candidates,
      ]));

      for (const cand of passCandidates) {
        const val = validate16DigitCode(cand, docType);
        const existing = votesMap.get(cand);
        if (existing) {
          existing.count += 1;
          existing.confidences.push(passConf * pass.weight);
          existing.passes.push(pass.name);
        } else {
          votesMap.set(cand, {
            code: cand,
            count: 1,
            confidences: [passConf * pass.weight],
            passes: [pass.name],
            isValid: val.isValid,
            provinceCode: val.provinceCode || cand.substring(0, 2),
            isKepri: cand.startsWith("21"),
          });
        }
      }

      // Early Stop Check:
      // Berhenti awal hanya bila kandidat sudah lolos validasi penuh dan muncul di minimal 2 pass dengan confidence cukup
      if (i >= 1) {
        let earlyStopFound = false;
        for (const [, vote] of votesMap.entries()) {
          const avgConf = vote.confidences.reduce((a, b) => a + b, 0) / vote.confidences.length;
          if (vote.isValid && vote.count >= 2 && avgConf >= 65) {
            earlyStopFound = true;
            break;
          }
        }
        if (earlyStopFound) {
          onProgress?.("Kandidat 16 digit terverifikasi di multi-pass, menyelesaikan...", 96);
          break;
        }
      }
    }

    // Hitung skor akhir untuk menentukan kandidat terbaik
    let highestScore = -Infinity;
    for (const [code, vote] of votesMap.entries()) {
      const avgConf = vote.confidences.reduce((a, b) => a + b, 0) / vote.confidences.length;
      let score = 0;
      // Validasi penuh: bobot tertinggi
      if (vote.isValid) score += 1000;
      // Prioritas Kepulauan Riau (21)
      if (vote.isKepri) score += 500;
      else if (PROVINCE_MAP[vote.provinceCode]) score += 200;
      // Jumlah kemunculan di berbagai pass
      score += vote.count * 150;
      // Rata-rata confidence
      score += avgConf;

      if (score > highestScore) {
        highestScore = score;
        bestCandidateOverall = code;
      }
    }

    // Fallback jika tidak ada kandidat dari votesMap
    if (!bestCandidateOverall) {
      const globalExtract = extract16DigitNumber(allRawTexts.join("\n"), docType);
      bestCandidateOverall = globalExtract.number;
      if (!detectedName && globalExtract.detectedName) {
        detectedName = globalExtract.detectedName;
      }
    }

    const finalValidation = bestCandidateOverall
      ? validate16DigitCode(bestCandidateOverall, docType)
      : { isValid: false, message: "Nomor 16 digit tidak terdeteksi" };

    onProgress?.("Selesai memindai!", 100);

    return {
      rawText: allRawTexts.join("\n\n"),
      extractedNumber: bestCandidateOverall,
      documentType: docType,
      isValid16Digit: finalValidation.isValid,
      provinceCode: finalValidation.provinceCode,
      provinceName: finalValidation.provinceName,
      detectedName,
      confidence: highestPassConfidence,
    };
  } finally {
    await worker.terminate();
  }
}
