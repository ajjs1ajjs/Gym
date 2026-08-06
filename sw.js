const CACHE = 'gym-tracker-v3';

const BASE = self.location.pathname.replace(/\/[^/]*$/, '/');

addEventListener('install', e => {
  const ASSETS = [
    `${BASE}index.html`,
    `${BASE}style.css`,
    `${BASE}app.js`,
    `${BASE}lib.js`,
    `${BASE}manifest.json`,
    `${BASE}images/icon.svg`,
    `${BASE}images/icon-192.png`,
    `${BASE}images/icon-512.png`,
    `${BASE}images/leg-press.svg`,
    `${BASE}images/leg-curl.svg`,
    `${BASE}images/lat-pulldown.svg`,
    `${BASE}images/chest-press.svg`,
    `${BASE}images/biceps-curl.svg`,
    `${BASE}images/triceps-pushdown.svg`,
    `${BASE}images/burpee.svg`,
    `${BASE}images/crunch.svg`,
    `${BASE}images/plank.svg`,
    `${BASE}images/treadmill.svg`
  ];
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(asset => cache.add(asset)))
    )
  );
  skipWaiting();
});

addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  clients.claim();
});

addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const c = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, c));
        return res;
      }).catch(() => caches.match(`${BASE}index.html`))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const c = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, c));
        }
        return res;
      });
    })
  );
});
