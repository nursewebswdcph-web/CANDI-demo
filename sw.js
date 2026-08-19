const CACHE_NAME = 'ipd-nurse-workbench-demo-v20260817_01';

// Install: Skip waiting immediately to activate new SW
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: Delete ALL old caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch: NETWORK-FIRST strategy for HTML, JS, and local app assets
// Always fetches the fresh version from server when online so updates load instantly without Ctrl+Shift+R.
// Falls back to offline cache when disconnected.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass cross-origin API calls (e.g. Apps Script API)
  if (!url.origin.includes(self.location.hostname)) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
      })
  );
});

// Listen for client messages to clear cache on demand
self.addEventListener('message', (event) => {
  if (event.data && (event.data.action === 'CLEAR_CACHE' || event.data === 'skipWaiting')) {
    self.skipWaiting();
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
});
