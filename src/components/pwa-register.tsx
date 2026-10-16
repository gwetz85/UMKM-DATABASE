'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge any outdated or corrupted caches immediately from CacheStorage
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'simpu-pwa-v6') {
            console.log('[PWA] Purging outdated cache storage:', key);
            caches.delete(key);
          }
        });
      });
    }

    // Auto-recovery from chunk loading errors and dynamic import failures after deployments
    const handleChunkError = (errorMsg: string) => {
      const isChunkError =
        errorMsg.includes('Loading chunk') ||
        errorMsg.includes('ChunkLoadError') ||
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('loading tb2026ukm.qzz.io');

      if (isChunkError) {
        console.warn('[PWA] Chunk/deployment mismatch detected. Purging cache and auto-refreshing...');
        const lastReload = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('simpu_auto_recovery_time') : null;
        const now = Date.now();
        // Throttle auto-refresh so it never loops
        if (!lastReload || now - Number(lastReload) > 8000) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('simpu_auto_recovery_time', String(now));
          }
          if (typeof caches !== 'undefined') {
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        }
      }
    };

    const onError = (e: ErrorEvent) => {
      handleChunkError(e?.message || '');
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason = e?.reason?.message || String(e?.reason || '');
      handleChunkError(reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates on every page load
            registration.update().catch(() => {});

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version ready, activating...');
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration failed:', error);
          });
      });

      // Reload once when the new controller takes over to ensure clean state
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Safety net for mobile clients: Check if styles are loaded properly.
    const safetyTimer = setTimeout(() => {
      try {
        if (document.styleSheets.length === 0) {
          console.warn('[PWA Safety] Stylesheet not detected. Recovering client...');
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              regs.forEach((r) => r.unregister());
            });
          }
          if (typeof caches !== 'undefined') {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
          }
          const hasRecovered = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pwa_recovery_attempt') : null;
          if (!hasRecovered) {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('pwa_recovery_attempt', Date.now().toString());
            }
            window.location.reload();
          }
        }
      } catch (e) {
        // ignore
      }
    }, 2500);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      clearTimeout(safetyTimer);
    };
  }, []);

  return null;
}
