const CACHE_VERSION = 'v1';
const CACHE_NAME = `wanderless-shell-${CACHE_VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and external requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API routes: network-first with fallback to cached data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request) || new Response('Offline', { status: 503 })),
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.match(/\.(js|css|woff2|png|jpg|svg)$/)
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((response) => response || fetch(request))
        .catch(() => new Response('Not found', { status: 404 })),
    );
    return;
  }

  // HTML pages: stale-while-revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });

        return cached || fetchPromise;
      }),
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request) || new Response('Offline', { status: 503 })),
  );
});
