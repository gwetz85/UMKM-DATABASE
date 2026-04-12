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
