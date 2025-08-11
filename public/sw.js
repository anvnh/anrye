const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `anrye-${CACHE_VERSION}`;
const STATIC_CACHE = `anrye-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `anrye-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico',
  '/icons/apple-touch-icon.png',
  '/offline.html'
];

// Install event - cache static resources
// Avoid caching when running on localhost (dev safety)
const isLocalhost = typeof self !== 'undefined' && (
  self.location?.hostname === 'localhost' ||
  self.location?.hostname === '127.0.0.1' ||
  self.location?.hostname === '::1'
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    isLocalhost
      ? Promise.resolve()
      : caches.open(STATIC_CACHE)
          .then((cache) => {
            return cache.addAll(STATIC_ASSETS);
          })
  );
});

// Fetch event - cache first strategy for static assets, network first for others
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle static assets with cache-first strategy
  if (!isLocalhost && (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/_next/static/'))) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request)
            .then((fetchResponse) => {
              return caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, fetchResponse.clone());
                  return fetchResponse;
                });
            });
        })
    );
  } else {
    // Network first strategy for other requests
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (!isLocalhost && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return (isLocalhost ? Promise.resolve(undefined) : caches.match(request))
            .then((response) => {
              // If no cached response and it's a navigation request, show offline page
              if (!response && request.mode === 'navigate' && !isLocalhost) {
                return caches.match('/offline.html');
              }
              return response;
            });
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 