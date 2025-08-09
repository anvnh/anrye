// Service Worker Registration
// Only register in production and not on localhost to avoid caching during development
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1'
);

if (typeof window !== 'undefined') {
  // Expose a helper to manually unregister and clear caches in dev
  window.__ANRYE_SW_RESET__ = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if (window.caches) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      console.log('[anrye] SW and caches cleared');
    } catch (e) {
      console.error('[anrye] Failed to clear SW/caches', e);
    }
  };
}

if (isLocalhost && 'serviceWorker' in navigator) {
  // In development: proactively unregister any existing SW and clear caches
  window.addEventListener('load', async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if (window.caches) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      console.log('[anrye] Dev mode: unregistered SW and cleared caches');
    } catch (e) {
      console.error('[anrye] Dev cleanup failed', e);
    }
  });
}

if (!isLocalhost && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available');
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('Service Worker registration failed:', registrationError);
      });
  });

  // Handle service worker updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller changed');
  });
} else {
  console.log('Service Worker not registered in development/local');
}