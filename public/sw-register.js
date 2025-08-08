// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
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
  console.log('Service Worker not supported');
} 