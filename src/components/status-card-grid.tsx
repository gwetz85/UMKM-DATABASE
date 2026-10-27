'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Sun, 
  Moon, 
  Monitor, 
  TrendingUp, 
  ArrowUpRight 
} from 'lucide-react';

// Tipe varian badge status
export type StatusType = 'active' | 'pending' | 'warning' | 'inactive';

export interface DataItem {
  id: string;
  title: string;
  category: string;
  status: StatusType;
  statusText: string;
  metric: string;
  metricLabel: string;
  description: string;
  updatedAt: string;
}

// Konfigurasi warna badge status dengan kontras tinggi (WCAG AA/AAA)
export const statusVariants: Record<StatusType, {
  badge: string;
  dot: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  active: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/80',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    icon: CheckCircle2,
  },
  pending: {
    badge: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700/80',
    dot: 'bg-sky-600 dark:bg-sky-400',
    icon: Clock,
  },
  warning: {
    badge: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/80',
    dot: 'bg-amber-600 dark:bg-amber-400',
    icon: AlertTriangle,
  },
  inactive: {
    badge: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700/80',
    dot: 'bg-rose-600 dark:bg-rose-400',
    icon: XCircle,
  },
};

// Komponen Badge Status Berkualitas Kontras Tinggi
export function StatusBadge({ status, label }: { status: StatusType; label: string }) {
  const config = statusVariants[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-xs transition-colors ${config.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${config.dot}`} />
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

// Komponen Kartu Responsif
export function StatusCard({ item }: { item: DataItem }) {
  return (
    <article className="flex flex-col justify-between p-5 rounded-2xl transition-all duration-200 border bg-white text-zinc-900 border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 dark:hover:border-zinc-700">
      
      {/* Header Kartu: Menggunakan Flexbox responsif */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <span className="text-xs font-medium tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            {item.category}
          </span>
          <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
            {item.title}
          </h3>
        </div>
        <div className="shrink-0 self-start">
          <StatusBadge status={item.status} label={item.statusText} />
        </div>
      </div>

      {/* Konten Deskripsi */}
      <p className="text-sm line-clamp-2 text-zinc-600 dark:text-zinc-300 mb-5">
        {item.description}
      </p>

      {/* Bagian Metrik / Nilai Penunjang */}
      <div className="flex items-center justify-between p-3.5 mb-4 rounded-xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-800/60 dark:border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.metricLabel}</p>
          <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">{item.metric}</p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>

      {/* Footer: Flexbox baris dengan detail tanggal dan aksi */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
        <span>Diperbarui {item.updatedAt}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-hidden transition-colors"
        >
          Lihat Detail
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
}

// Komponen Utama dengan Grid Responsif & Pengendali Mode Otomatis
export function ResponsiveStatusDashboard({
  data,
  title = "Monitoring Status Pelaku Usaha",
  subtitle = "Daftar status perizinan dan omzet dengan dukungan tema otomatis."
}: {
  data?: DataItem[];
  title?: string;
  subtitle?: string;
}) {
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');

  // Deteksi dan sinkronisasi otomatis preferensi tema sistem (OS Theme)
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = 
        themeMode === 'dark' || 
        (themeMode === 'system' && mediaQuery.matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = () => {
      if (themeMode === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeMode]);

  // Data default
  const defaultData: DataItem[] = [
    {
      id: '1',
      title: 'Sentra Batik Madu Laut',
      category: 'Kuliner & Kerajinan',
      status: 'active',
      statusText: 'Terverifikasi',
      metric: 'Rp 45.200.000',
      metricLabel: 'Omzet Bulanan',
      description: 'Produsen batik lokal bersertifikat halal dan SNI dengan 15 perajin aktif binaan daerah.',
      updatedAt: '2 jam lalu',
    },
    {
      id: '2',
      title: 'Kopi Robusta Tradisi',
      category: 'F&B Olahan',
      status: 'pending',
      statusText: 'Menunggu Verifikasi',
      metric: 'Rp 18.500.000',
      metricLabel: 'Estimasi Omzet',
      description: 'Pengajuan izin edar BPOM dan verifikasi lapangan kelayakan lokasi usaha.',
      updatedAt: '1 hari lalu',
    },
    {
      id: '3',
      title: 'Keripik Tempe Aneka Rasa',
      category: 'Industri Rumahan',
      status: 'warning',
      statusText: 'Perlu Perbaikan Data',
      metric: 'Rp 8.900.000',
      metricLabel: 'Omzet Bulanan',
      description: 'Surat NIB perlu pembaruan KBLI sesuai kegiatan usaha operasional terbaru.',
      updatedAt: '3 hari lalu',
    },
    {
      id: '4',
      title: 'Bengkel Kayu Jati Murni',
      category: 'Manufaktur Kayu',
      status: 'inactive',
      statusText: 'Nonaktif',
      metric: 'Rp 0',
      metricLabel: 'Omzet Terdata',
      description: 'Usaha sementara tidak beroperasi karena sedang dalam proses relokasi tempat produksi.',
      updatedAt: '1 minggu lalu',
    },
  ];

  const displayData = data && data.length > 0 ? data : defaultData;

  return (
    <section className="w-full min-h-screen p-4 sm:p-6 md:p-8 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Dashboard: Flexbox Responsif */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>

          {/* Pengalih Mode: Otomatis (Sistem), Terang, Gelap */}
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-zinc-700/60 self-start sm:self-auto">
            <button
              onClick={() => setThemeMode('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                themeMode === 'light'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Terang</span>
            </button>

            <button
              onClick={() => setThemeMode('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                themeMode === 'dark'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Gelap</span>
            </button>

            <button
              onClick={() => setThemeMode('system')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                themeMode === 'system'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Otomatis</span>
            </button>
          </div>
        </header>

        {/* Layout Grid Responsif: 1 kolom di HP, 2 di Tablet, 3-4 di Desktop */}
        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {displayData.map((item) => (
            <StatusCard key={item.id} item={item} />
          ))}
        </main>

      </div>
    </section>
  );
}

export default ResponsiveStatusDashboard;
