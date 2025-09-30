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
          .then(() => {
            return self.skipWaiting();
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

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    image: data.image,
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
    actions: data.actions || [],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AnRye Notes Notification', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Handle different notification actions
  if (action === 'view') {
    // Open the app to a specific page
    event.waitUntil(
      clients.openWindow(data.url || '/')
    );
  } else if (action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/');
        }
      })
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Sync data with server
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      // Show success notification
      self.registration.showNotification('Sync Complete', {
        body: 'Your data has been synced successfully',
        icon: '/icons/icon-192x192.png',
        tag: 'sync-success',
      });
    } else {
      throw new Error('Sync failed');
    }
  } catch (error) {
    console.error('Background sync failed:', error);
    // Show error notification
    self.registration.showNotification('Sync Failed', {
      body: 'Failed to sync your data. Please check your connection.',
      icon: '/icons/icon-192x192.png',
      tag: 'sync-error',
      requireInteraction: true,
    });
  }
}

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
