// Hannah's Meal Planner — Service Worker
// Caches the app shell for offline support and fast loads.

const CACHE_NAME = 'meal-planner-v1';

// Core files to cache on install
const PRECACHE_URLS = [
  '/meal-planner/',
  '/meal-planner/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap'
];

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fall back to cache ──────────────────────────────────
// Network-first ensures the live API calls (Anthropic, JSONBin) always go
// through. Only falls back to cache when genuinely offline.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go straight to network for API calls — never cache these
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname === 'api.jsonbin.io' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        // Cache a fresh copy on success
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // If it's a navigation request, fall back to the app shell
          if (request.mode === 'navigate') {
            return caches.match('/meal-planner/index.html');
          }
        });
      })
  );
});
