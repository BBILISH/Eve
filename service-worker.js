// service-worker.js

const CACHE_NAME = 'workout-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add paths to your CSS, JS, and image files here
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  'https://placehold.co/192x192/87CEEB/87CEEB', // Favicon
  'https://placehold.co/32x32/87CEEB/87CEEB', // Favicon
  // Placeholder for YouTube thumbnails (you might want to cache common ones or handle dynamically)
  'https://placehold.co/120x90/cccccc/ffffff?text=No+Video',
  // Add your custom icons for the PWA here (e.g., in an 'icons' folder)
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Install event: caches all the essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activates the new service worker immediately
  );
});

// Activate event: cleans up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Takes control of existing clients immediately
  );
});

// Fetch event: serves content from cache or network
self.addEventListener('fetch', (event) => {
  // Check if the request is for an external YouTube thumbnail
  if (event.request.url.startsWith('https://img.youtube.com/vi/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // If cached, return the cached response
        if (response) {
          return response;
        }
        // Otherwise, fetch from network, cache, and return
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // Fallback for network failure for YouTube thumbnails
          return caches.match('https://placehold.co/120x90/cccccc/ffffff?text=No+Video');
        });
      })
    );
    return; // Stop further processing for YouTube URLs
  }

  // For all other requests, use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // No cache hit - fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          // IMPORTANT: Clone the response. A response is a stream
          // and can only be consumed once. We must clone it so that
          // we can consume one in the cache and one in the browser.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(() => {
          // If network fails, and it's a navigation request, try to serve index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // For other failed requests, you might return a generic offline page
          // return caches.match('/offline.html'); // If you have an offline page
        });
      })
  );
});
