const CACHE_NAME = 'simpu-pwa-v3';

// Install: Activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: Purge all old caches (v1, v2, etc.) to guarantee zero stale chunk/CSS mismatch
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[PWA SW] Clearing outdated cache:', name);
          return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message handler for immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: NEVER intercept Next.js static assets, css, or js bundles.
// Browser native HTTP cache already handles immutable chunk caching flawlessly with Cache-Control headers.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Let browser handle non-GET requests natively
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip cross-origin requests (Firebase, external APIs, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Static assets (_next/static, public assets, fonts, css, js) -> ALWAYS native fetch
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|css|js|json)$/)
  ) {
    return;
  }

  // HTML Page Navigation: Network-first, fallback to clean offline notice only when network completely fails
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          `<!DOCTYPE html>
          <html lang="id">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Offline - SIMPU</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #020617;
                color: #f8fafc;
                text-align: center;
                padding: 24px;
              }
              .box {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 32px 24px;
                max-width: 360px;
                width: 100%;
              }
              h1 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: -0.025em; }
              p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; line-height: 1.5; }
              button {
                padding: 12px 24px;
                border-radius: 14px;
                background: #2563eb;
                color: #fff;
                border: none;
                font-weight: 700;
                font-size: 0.875rem;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>Koneksi Terputus</h1>
              <p>Aplikasi SIMPU memerlukan koneksi internet untuk memuat data terbaru.</p>
              <button onclick="window.location.reload()">Muat Ulang</button>
            </div>
          </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
  }
});
