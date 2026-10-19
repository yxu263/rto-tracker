// Service worker for the RTO tracker.
// Caches ONLY the app shell. Never caches GitHub API traffic, otherwise stale
// attendance data would be served after a sync.
const CACHE = 'rto-shell-v1';
const SHELL = [
  './',
  './RTO.html',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Anything that is not our own origin (notably api.github.com) goes straight
  // to the network and is never cached.
  if (url.origin !== self.location.origin) return;

  // Network-first so a redeploy is picked up, with cache as the offline fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./RTO.html')))
  );
});
