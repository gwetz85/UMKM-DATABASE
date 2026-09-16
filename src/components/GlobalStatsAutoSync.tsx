"use client";

// Nonaktifkan auto-sync latar belakang untuk menghemat kuota CPU Vercel (Fluid Active CPU).
// Statistik sistem sudah otomatis diperbarui secara inkremental real-time di stats-service.ts
// saat ada data ditambah/diubah/dihapus, dan admin dapat melakukan sinkronisasi penuh manual di /admin-sync.
export function GlobalStatsAutoSync() {
  return null;
}

