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
