import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: any): string {
  if (!value) return "Rp 0";
  if (typeof value === "object") return "Rp 0"; // Prevent rendering objects
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : Number(value);
  if (isNaN(num)) return String(value); // Convert to string to avoid rendering issues
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

export function extractDobFromNik(nik: string): string {
  if (!nik) return "";
  const cleanNik = nik.replace(/[^0-9]/g, "");
  if (cleanNik.length < 12) return "";

  // Angka ke 7 dan 8 itu merupakan tanggal lahir
  let dayVal = parseInt(cleanNik.substring(6, 8), 10);
  if (isNaN(dayVal)) return "";

  // Ketentuan:
  // - apabila angka ke 7 >= 4 (yaitu 40-79), maka dikurangi 40
  // - apabila <= 31, tetap
  if (dayVal > 40) {
    dayVal = dayVal - 40;
  }
  
  const dayStr = String(dayVal).padStart(2, "0");

  // Angka ke 9 dan 10 adalah bulan lahir
  const monthStr = cleanNik.substring(8, 10);
  const monthVal = parseInt(monthStr, 10);
  if (isNaN(monthVal) || monthVal < 1 || monthVal > 12) return "";

  // Angka ke 11 dan 12 adalah tahun lahir (format: yy)
  const year2DigitStr = cleanNik.substring(10, 12);
  const year2Digit = parseInt(year2DigitStr, 10);
  if (isNaN(year2Digit)) return "";

  // Ketentuan tahun:
  // - apabila yy <= currentYear2Digit (tahun sekarang, misal 26), maka tahunnya 2000 + yy
  // - jika tidak, maka tahunnya 1900 + yy
  const currentYear = new Date().getFullYear();
  const currentYear2Digit = currentYear % 100;
  let year = 1900 + year2Digit;
  if (year2Digit <= currentYear2Digit) {
    year = 2000 + year2Digit;
  }

  return `${dayStr}-${monthStr}-${year}`;
}

export function extractGenderFromNik(nik: string): 'Laki-laki' | 'Perempuan' | '' {
  if (!nik) return "";
  const cleanNik = nik.replace(/[^0-9]/g, "");
  if (cleanNik.length < 8) return "";
  const dayVal = parseInt(cleanNik.substring(6, 8), 10);
  if (isNaN(dayVal)) return "";
  return dayVal > 40 ? "Perempuan" : "Laki-laki";
}

export const AGAMA_INDONESIA = [
  "Islam",
  "Kristen Protestan",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Kepercayaan Terhadap Tuhan YME",
] as const;

export const STATUS_KELUARGA_LIST = [
  "Kepala Keluarga",
  "Suami",
  "Istri",
  "Anak",
] as const;

export const PEKERJAAN_DUKCAPIL = [
  "BELUM / TIDAK BEKERJA",
  "MENGURUS RUMAH TANGGA",
  "PELAJAR / MAHASISWA",
  "PENSIUNAN",
  "PEGAWAI NEGERI SIPIL (PNS)",
  "TENTARA NASIONAL INDONESIA (TNI)",
  "KEPOLISIAN RI (POLRI)",
  "PERDAGANGAN",
  "PETANI / PEKEBUN",
  "PETERNAK",
  "NELAYAN / PERIKANAN",
  "INDUSTRI",
  "KONSTRUKSI",
  "TRANSPORTASI",
  "KARYAWAN SWASTA",
  "KARYAWAN BUMN",
  "KARYAWAN BUMD",
  "KARYAWAN HONORER",
  "BURUH HARIAN LEPAS",
  "BURUH TANI / PERKEBUNAN",
  "BURUH NELAYAN / PERIKANAN",
  "BURUH PETERNAKAN",
  "PEMBANTU RUMAH TANGGA",
  "TUKANG CUKUR",
  "TUKANG LISTRIK",
  "TUKANG BATU",
  "TUKANG KAYU",
  "TUKANG SOL SEPATU",
  "TUKANG LAS / PANDAI BESI",
  "TUKANG JAHIT",
  "TUKANG GIGI",
  "PENATA RIAS",
  "PENATA BUSANA",
  "PENATA RAMBUT",
  "MEKANIK",
  "SENIMAN",
  "TABIB",
  "PARAJI",
  "PERANCANG BUSANA",
  "PENTERJEMAH",
  "IMAM MASJID",
  "PENDETA",
  "PASTOR",
  "WARTAWAN",
  "USTADZ / MUBALIGH",
  "JURU MASAK",
  "PROMOTOR ACARA",
  "ANGGOTA DPR-RI",
  "ANGGOTA DPD",
  "ANGGOTA BPK",
  "PRESIDEN",
  "WAKIL PRESIDEN",
  "ANGGOTA MAHKAMAH KONSTITUSI",
  "ANGGOTA KABINET / KEMENTERIAN",
  "DUTA BESAR",
  "GUBERNUR",
  "WAKIL GUBERNUR",
  "BUPATI",
  "WAKIL BUPATI",
  "WALIKOTA",
  "WAKIL WALIKOTA",
  "ANGGOTA DPRD PROVINSI",
  "ANGGOTA DPRD KABUPATEN / KOTA",
  "DOSEN",
  "GURU",
  "PILOT",
  "PENGACARA",
  "NOTARIS",
  "ARSITEK",
  "AKUNTAN",
  "KONSULTAN",
  "DOKTER",
  "BIDAN",
  "PERAWAT",
  "APOTEKER",
  "PSIKIATER / PSIKOLOG",
  "PENYIAR TELEVISI",
  "PENYIAR RADIO",
  "PELAUT",
  "PENELITI",
  "SOPIR",
  "PIALANG",
  "PARANORMAL",
  "PEDAGANG",
  "PERANGKAT DESA",
  "KEPALA DESA",
  "BIARAWATI",
  "WIRASWASTA",
  "LAINNYA",
] as const;

export function parsePobDob(pobDob: any): { pob: string; dob: string } {
  if (!pobDob || pobDob === "-") return { pob: "", dob: "" };
  try {
    const str = String(pobDob).trim();
    const parts = str.split(",");
    if (parts.length >= 2) {
      const dob = parts.pop()?.trim() || "";
      const pob = parts.join(",").trim();
      return { pob, dob };
    }
    return { pob: "", dob: str };
  } catch {
    return { pob: "", dob: "" };
  }
}

export function calculateAge(dobStr: any): string {
  if (!dobStr || dobStr === "-") return "-";
  
  try {
    const raw = String(dobStr).trim();
    if (!raw || raw === "-") return "-";

    let day: number, month: number, year: number;

    if (raw.includes("-")) {
      const parts = raw.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
        }
      } else return "-";
    } else if (raw.includes("/")) {
      const parts = raw.split("/");
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
        } else {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        }
      } else return "-";
    } else {
      return "-";
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return "-";

    const dob = new Date(year, month, day);
    if (isNaN(dob.getTime())) return "-";

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return `${Math.max(0, age)} Tahun`;
  } catch {
    return "-";
  }
}

export function maskLast4Digits(val: string | number | undefined | null): string {
  if (!val) return "-";
  const str = String(val).trim();
  if (str.length <= 4) return "****";
  return `${str.slice(0, -4)}****`;
}

export function maskPhoneNumber(phone: string | number | undefined | null): string {
  if (!phone) return "-";
  const str = String(phone).trim();
  if (str.length <= 6) return str;
  const start = str.slice(0, 4);
  const end = str.slice(-3);
  return `${start}****${end}`;
}

export function formatDateTimeIndo(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    const dateStr = d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\./g, ':');
    return `${dateStr}, ${timeStr} WIB`;
  } catch {
    return "-";
  }
}

export const KELURAHAN_TO_KECAMATAN: Record<string, string> = {
  // Bukit Bestari
  "SEIJANG": "BUKIT BESTARI",
  "SEI JANG": "BUKIT BESTARI",
  "DOMPAK": "BUKIT BESTARI",
  "TANJUNG UNGGAT": "BUKIT BESTARI",
  "TUNGGAT": "BUKIT BESTARI",
  "TANJUNG AYUN SAKTI": "BUKIT BESTARI",
  "TJ AYUN SAKTI": "BUKIT BESTARI",
  "AYUN SAKTI": "BUKIT BESTARI",
  "BUKIT BESTARI": "BUKIT BESTARI",

  // Tanjungpinang Timur
  "TANJUNGPINANG TIMUR": "TANJUNGPINANG TIMUR",
  "TANJUNJGPINANG TIMUR": "TANJUNGPINANG TIMUR",
  "TANJUNGPINNAG TIMUR": "TANJUNGPINANG TIMUR",
  "TANJUNG PINANG TIMUR": "TANJUNGPINANG TIMUR",
  "AIR RAJA": "TANJUNGPINANG TIMUR",
  "AIRRAJA": "TANJUNGPINANG TIMUR",
  "PINANG KENCANA": "TANJUNGPINANG TIMUR",
  "PINANGKENCANA": "TANJUNGPINANG TIMUR",
  "BATU IX": "TANJUNGPINANG TIMUR",
  "BATUIX": "TANJUNGPINANG TIMUR",
  "BATU 9": "TANJUNGPINANG TIMUR",
  "BATU9": "TANJUNGPINANG TIMUR",
  "KAMPUNG BULANG": "TANJUNGPINANG TIMUR",
  "KP BULANG": "TANJUNGPINANG TIMUR",
  "BULANG": "TANJUNGPINANG TIMUR",
  "MELAYU KOTA PIRING": "TANJUNGPINANG TIMUR",
  "MKP": "TANJUNGPINANG TIMUR",
  "KOTA PIRING": "TANJUNGPINANG TIMUR",

  // Tanjungpinang Kota
  "KAMPUNG BUGIS": "TANJUNGPINANG KOTA",
  "KP BUGIS": "TANJUNGPINANG KOTA",
  "SENGGARANG": "TANJUNGPINANG KOTA",
  "TANJUNGPINANG KOTA": "TANJUNGPINANG KOTA",
  "TANJUNG PINANG KOTA": "TANJUNGPINANG KOTA",
  "PENYENGAT": "TANJUNGPINANG KOTA",

  // Tanjungpinang Barat
  "TANJUNGPINANG BARAT": "TANJUNGPINANG BARAT",
  "TANJUNG PINANG BARAT": "TANJUNGPINANG BARAT",
  "KEMBOJA": "TANJUNGPINANG BARAT",
  "KAMBOJA": "TANJUNGPINANG BARAT",
  "KAMPUNG BARU": "TANJUNGPINANG BARAT",
  "KP BARU": "TANJUNGPINANG BARAT",
  "BUKIT CERMIN": "TANJUNGPINANG BARAT",
  "BKT CERMIN": "TANJUNGPINANG BARAT",
};

export function inferKecamatanFromText(text: string): string {
  if (!text) return "";
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (
    clean.includes("BARAT") ||
    clean.includes("KEMBOJA") ||
    clean.includes("KAMBOJA") ||
    clean.includes("BUKITCERMIN") ||
    clean.includes("BKTCERMIN") ||
    clean.includes("KAMPUNGBARU") ||
    clean.includes("KPBARU")
  ) {
    return "TANJUNGPINANG BARAT";
  }

  if (
    clean.includes("BESTARI") ||
    clean.includes("SEIJANG") ||
    clean.includes("DOMPAK") ||
    clean.includes("TANJUNGUNGGAT") ||
    clean.includes("TUNGGAT") ||
    clean.includes("AYUNSAKTI")
  ) {
    return "BUKIT BESTARI";
  }

  if (
    clean.includes("BUGIS") ||
    clean.includes("KPBUGIS") ||
    clean.includes("SENGGARANG") ||
    clean.includes("PENYENGAT")
  ) {
    return "TANJUNGPINANG KOTA";
  }

  if (
    clean.includes("TIMUR") ||
    clean.includes("BATUIX") ||
    clean.includes("BATU9") ||
    clean.includes("PINANGKENCANA") ||
    clean.includes("AIRRAJA") ||
    clean.includes("BULANG") ||
    clean.includes("MELAYUKOTAPIRING") ||
    clean.includes("KOTAPIRING") ||
    clean.includes("TANJUNJGPINANG") ||
    clean.includes("TANJUNGPINNAG")
  ) {
    return "TANJUNGPINANG TIMUR";
  }

  if (clean.includes("KOTA")) {
    return "TANJUNGPINANG KOTA";
  }

  return "";
}

export function resolveRtRw(actor: any): string {
  if (!actor) return "-";
  const direct = actor.rtRw ?? actor.rt_rw ?? actor.rtrw ?? actor["RT/RW"] ?? actor["rt/rw"];
  if (direct !== undefined && direct !== null) {
    const s = String(direct).trim();
    if (s !== "" && s !== "-") return s;
  }
  if (actor.rt && actor.rw) {
    return `${actor.rt}/${actor.rw}`;
  }
  if (actor.rt) return String(actor.rt).trim();
  if (actor.rw) return `RW ${actor.rw}`.trim();

  const surveyRtRw = actor.surveyData?.rtRw || actor.surveyData?.rt_rw;
  if (surveyRtRw && String(surveyRtRw).trim() !== "" && String(surveyRtRw).trim() !== "-") {
    return String(surveyRtRw).trim();
  }

  const addr = `${actor.address || ""} ${actor.alamat || ""} ${actor.businessLocation || ""}`;
  const match1 = addr.match(/RT\s*[:.]?\s*(\d+)[,\s/-]+RW\s*[:.]?\s*(\d+)/i);
  if (match1) return `${match1[1]}/${match1[2]}`;
  const match2 = addr.match(/RT[\s/]*RW\s*[:.]?\s*(\d+)[/\s-]+(\d+)/i);
  if (match2) return `${match2[1]}/${match2[2]}`;
  const match3 = addr.match(/RT\s*[:.]?\s*(\d+)/i);
  if (match3) return `RT ${match3[1]}`;

  return "-";
}

export function resolveKelurahan(actor: any): string {
  if (!actor) return "-";
  const direct = actor.kelurahan ?? actor.kel ?? actor.desa ?? actor.Kelurahan ?? actor.KELURAHAN ?? actor.surveyData?.kelurahan;
  if (direct !== undefined && direct !== null) {
    const clean = String(direct).trim().toUpperCase();
    if (clean !== "" && clean !== "-" && clean !== "#N/A" && clean !== "N/A" && clean !== "NULL") {
      if (clean === "BATUIX" || clean === "BATU9") return "BATU IX";
      if (clean === "TANJUNJGPINANG TIMUR" || clean === "TANJUNGPINNAG TIMUR" || clean === "TANJUNG PINANG TIMUR") return "TANJUNGPINANG TIMUR";
      if (clean === "TANJUNG PINANG BARAT") return "TANJUNGPINANG BARAT";
      if (clean === "TANJUNG PINANG KOTA") return "TANJUNGPINANG KOTA";
      if (clean === "KAMBOJA") return "KEMBOJA";
      return clean;
    }
  }

  const addr = `${actor.address || ""} ${actor.alamat || ""} ${actor.businessLocation || ""}`.toUpperCase();
  for (const kel of [
    "MELAYU KOTA PIRING", "PINANG KENCANA", "AIR RAJA", "BATU IX", "BATU 9", "KAMPUNG BULANG",
    "TANJUNG UNGGAT", "SEI JANG", "DOMPAK", "TANJUNG AYUN SAKTI", "TANJUNGPINANG TIMUR",
    "KAMPUNG BUGIS", "SENGGARANG", "PENYENGAT", "TANJUNGPINANG KOTA",
    "KEMBOJA", "KAMBOJA", "KAMPUNG BARU", "BUKIT CERMIN", "TANJUNGPINANG BARAT"
  ]) {
    if (addr.includes(kel)) {
      if (kel === "BATU 9") return "BATU IX";
      if (kel === "KAMBOJA") return "KEMBOJA";
      return kel;
    }
  }

  return "-";
}

export function resolveKecamatan(actor: any, resolvedKel?: string): string {
  if (!actor) return "-";
  const direct = actor.kecamatan ?? actor.kec ?? actor.Kecamatan ?? actor.KECAMATAN ?? actor.surveyData?.kecamatan;
  if (direct !== undefined && direct !== null) {
    const clean = String(direct).trim().toUpperCase();
    if (clean !== "" && clean !== "-" && clean !== "#N/A" && clean !== "N/A" && clean !== "NULL") {
      const inferred = inferKecamatanFromText(clean);
      if (inferred) return inferred;
      return clean;
    }
  }

  const kel = resolvedKel || resolveKelurahan(actor);
  if (kel && kel !== "-") {
    const cleanKel = kel.toUpperCase().trim();
    const mappedKec = KELURAHAN_TO_KECAMATAN[cleanKel];
    if (mappedKec) return mappedKec;
  }

  const addr = `${actor.address || ""} ${actor.alamat || ""} ${actor.businessLocation || ""}`;
  const inferred = inferKecamatanFromText(addr);
  if (inferred) return inferred;

  return "-";
}

