// v2 — was cache-first for index.html, which meant once a phone cached it,
// every later update to this app was invisible until the SW file itself
// changed. Now network-first: always try to fetch the latest file, and only
// fall back to the cached copy when there's no connection.
const CACHE_NAME = 'ledger-v2';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls to Apps Script — always go to network.
  if (url.hostname.includes('script.google.com')) {
    return;
  }

  // Only handle our own same-origin shell files this way; let everything
  // else (Google Fonts, Chart.js CDN) pass through to the browser's own
  // default handling.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
