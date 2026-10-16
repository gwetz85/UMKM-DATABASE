'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle, ShieldCheck } from 'lucide-react';
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

  useEffect(() => {
    console.error('SIMPU App Error Boundary caught:', error);

    // If it's a chunk loading failure after deployment, auto-recover once
    const isChunkError =
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      const lastReload = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('simpu_error_reload') : null;
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8000) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('simpu_error_reload', String(now));
        }
        clearAndReload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Pembaruan Versi Terdeteksi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Aplikasi telah diperbarui dengan versi terbaru. Silakan klik tombol di bawah untuk menyegarkan data.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={() => clearAndReload('/')}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Muat Ulang Aplikasi (Segarkan)
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
