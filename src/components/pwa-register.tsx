'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge outdated v1 cache immediately if found in browser cache storage
    if ('caches' in window) {
      window.caches.has('simpu-pwa-v1').then((hasOldCache) => {
        if (hasOldCache) {
          console.log('[PWA] Purging legacy simpu-pwa-v1 cache...');
          window.caches.delete('simpu-pwa-v1').then(() => {
            window.location.reload();
          });
        }
      });
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates on load
            registration.update().catch(() => {});

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version detected, reloading to apply latest styles...');
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration failed:', error);
          });
      });

      // Handle controllerchange event to ensure new CSS and bundles are immediately active
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}
