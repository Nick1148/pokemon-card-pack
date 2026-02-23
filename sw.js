const CACHE_NAME = 'stellar-dream-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/cards.js',
  '/js/gacha.js',
  '/js/app.js',
  '/manifest.json',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Never cache ad/analytics domains - let them go straight to network
  const adDomains = [
    'googlesyndication.com',
    'googleads.g.doubleclick.net',
    'doubleclick.net',
    'google-analytics.com',
    'googletagmanager.com',
    'pagead2.googlesyndication.com',
    'adservice.google.com',
    'fundingchoicesmessages.google.com',
    'tpc.googlesyndication.com',
  ];
  if (adDomains.some(d => url.hostname.includes(d))) {
    return; // Let browser handle directly
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache card images on first load
        if (url.pathname.startsWith('/assets/cards/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
