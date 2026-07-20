const CACHE = 'gym-tracker-v1';

const BASE = (() => {
  const path = self.location.pathname;
  return path.slice(0, path.lastIndexOf('/') + 1);
})();

const ASSETS = [
  '.',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './images/icon.svg',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/leg-press.svg',
  './images/leg-curl.svg',
  './images/lat-pulldown.svg',
  './images/chest-press.svg',
  './images/biceps-curl.svg',
  './images/triceps-pushdown.svg',
  './images/burpee.svg',
  './images/crunch.svg',
  './images/plank.svg',
  './images/treadmill.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
