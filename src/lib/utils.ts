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

export function parsePobDob(pobDob: string): { pob: string; dob: string } {
  if (!pobDob || pobDob === "-") return { pob: "", dob: "" };
  const parts = pobDob.split(",");
  if (parts.length >= 2) {
    const dob = parts.pop()?.trim() || "";
    const pob = parts.join(",").trim();
    return { pob, dob };
  }
  return { pob: "", dob: pobDob.trim() };
}

export function calculateAge(dobStr: string): string {
  if (!dobStr || dobStr === "-") return "-";
  
  let day: number, month: number, year: number;

  if (dobStr.includes("-")) {
    const parts = dobStr.split("-");
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
  } else if (dobStr.includes("/")) {
    const parts = dobStr.split("/");
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
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return `${age} Tahun`;
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

