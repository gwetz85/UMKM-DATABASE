'use client';

import React, { useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function GlobalError({
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
    console.error('SIMPU Global Error Boundary caught:', error);

    if (isChunkError) {
      const lastReload = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('simpu_global_reload') : null;
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 6000) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('simpu_global_reload', String(now));
        }
        clearAndReload();
      }
    }
  }, [error, isChunkError]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#090d16', color: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#f59e0b' }}>
            <AlertTriangle style={{ width: '32px', height: '32px' }} />
          </div>

          <h1 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.025em', margin: '0 0 8px 0', color: '#ffffff' }}>
            {isChunkError ? 'Menyinkronkan Versi Terbaru' : 'Terjadi Kendala Memuat Data'}
          </h1>

          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 24px 0' }}>
            {isChunkError
              ? 'Aplikasi sedang memuat pembaruan sistem. Halaman akan termuat ulang otomatis.'
              : 'Sistem mendeteksi kendala pada memori halaman. Silakan muat ulang halaman untuk melanjutkan.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => clearAndReload()}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Muat Ulang Halaman
            </button>

            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '12px',
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Coba Lagi
            </button>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
            <ShieldCheck style={{ width: '14px', height: '14px', color: '#10b981' }} />
            <span>SIMPU 2026 • Sistem Pemulihan Otomatis</span>
          </div>
        </div>
      </body>
    </html>
  );
}
