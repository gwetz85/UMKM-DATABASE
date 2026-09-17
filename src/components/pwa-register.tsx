'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge any outdated or corrupted caches immediately from CacheStorage
    if ('caches' in window) {
      window.caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'simpu-pwa-v3') {
            console.log('[PWA] Purging outdated cache storage:', key);
            window.caches.delete(key);
          }
        });
      });
    }

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
    // If CSS completely failed to load after 2.5 seconds (stale/broken SW cache on mobile),
    // automatically unregister all service workers and force reload fresh styles from server.
    const safetyTimer = setTimeout(() => {
      try {
        if (document.styleSheets.length === 0) {
          console.warn('[PWA Safety] Stylesheet not detected. Recovering client...');
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              regs.forEach((r) => r.unregister());
            });
          }
          if ('caches' in window) {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
          }
          const hasRecovered = sessionStorage.getItem('pwa_recovery_attempt');
          if (!hasRecovered) {
            sessionStorage.setItem('pwa_recovery_attempt', Date.now().toString());
            window.location.reload();
          }
        }
      } catch (e) {
        // ignore
      }
    }, 2500);

    return () => clearTimeout(safetyTimer);
  }, []);

  return null;
}
