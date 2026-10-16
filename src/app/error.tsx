'use client';

import React, { useEffect, useMemo } from 'react';
import { RefreshCw, Home, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const clearAndReload = (targetUrl?: string) => {
    if (typeof window === 'undefined') return;
    const navigate = () => {
      if (targetUrl) {
        window.location.href = targetUrl;
      } else {
        window.location.reload();
      }
    };
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(navigate);
    } else {
      navigate();
    }
  };

  const isChunkError = useMemo(() => {
    const msg = (error?.message || '').toLowerCase();
    const name = (error?.name || '').toLowerCase();
    return (
      name.includes('chunkloaderror') ||
      msg.includes('loading chunk') ||
      msg.includes('chunkloaderror') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('failed to load') ||
      msg.includes('is not a valid javascript mime type')
    );
  }, [error]);

  useEffect(() => {
    console.error('SIMPU App Error Boundary caught:', error);

    if (isChunkError) {
      const lastReload = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('simpu_error_reload') : null;
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 6000) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('simpu_error_reload', String(now));
        }
        clearAndReload();
      }
    }
  }, [error, isChunkError]);

  if (isChunkError) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-5 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-spin">
            <Loader2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Menyinkronkan Versi Terbaru
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aplikasi sedang memperbarui berkas ke versi terkini. Halaman akan termuat ulang otomatis...
            </p>
          </div>
          <Button
            onClick={() => clearAndReload()}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md text-xs cursor-pointer"
          >
            Segarkan Sekarang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Terjadi Kendala Memuat Halaman
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Sistem mendeteksi kendala saat memuat data. Silakan muat ulang halaman untuk menyegarkan tampilan.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800 truncate max-w-full" title={error.message}>
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={() => clearAndReload()}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Muat Ulang Halaman
          </Button>

          <Button
            variant="outline"
            onClick={() => reset()}
            className="w-full h-10 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Coba Lagi
          </Button>

          <Button
            variant="ghost"
            onClick={() => { if (typeof window !== 'undefined') window.location.href = '/'; }}
            className="w-full h-10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            Kembali ke Beranda
          </Button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>SIMPU 2026 • Sistem Pemulihan Otomatis</span>
        </div>
      </div>
    </div>
  );
}
