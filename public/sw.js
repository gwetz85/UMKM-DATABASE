const CACHE_NAME = 'simpu-pwa-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-kepri.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[PWA SW] Deleting outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and external third-party API/Firebase queries
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip API routes, Next server actions, and dynamic Firebase paths
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) {
    return;
  }

  // HTML Page Navigation: Network-First (Never serve stale HTML which breaks CSS chunk hashes)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || Response.error();
          });
        })
    );
    return;
  }

  // Static assets (_next/static, public images/fonts): Stale-While-Revalidate / Network-First with Cache Fallback
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          // Only cache successful 200 OK responses, NEVER cache 404 or 500 errors
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse || Response.error();
        });
      })
    );
    return;
  }
});
