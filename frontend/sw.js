/**
 * CampusHub Progressive Web App Service Worker (v2)
 * Features:
 * - Cache-first for static assets
 * - Strict GET-only caching guard (non-GET passes directly to network)
 * - Network-first with cache fallback for GET /api/*
 * - Write-through cache invalidation via postMessage
 */

const STATIC_CACHE_NAME = 'campushub-static-v2';
const API_CACHE_NAME = 'campushub-api-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/tokens.css',
  '/css/reset.css',
  '/css/cards.css',
  '/css/modals.css',
  '/css/toast.css',
  '/css/dock.css',
  '/js/utils.js',
  '/js/api.js',
  '/js/state.js',
  '/js/theme.js',
  '/js/cursor-glow.js',
  '/js/app.js',
  '/js/views/home.js',
  '/js/views/planner.js',
  '/js/views/market.js',
  '/js/views/lostfound.js'
];

// Install: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets for offline use');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Purge obsolete cache generations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== API_CACHE_NAME) {
            console.log('[SW] Purging old cache generation:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Strict GET-only caching
self.addEventListener('fetch', (event) => {
  // STRICT GUARD: Non-GET requests (POST, PUT, DELETE) pass straight through to network
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    // Strategy: Network-first with API cache fallback
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clonedResponse = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[SW] Network unreachable, serving cached API data for:', url.pathname);
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(JSON.stringify({ error: 'Offline mode: data not cached' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
  } else {
    // Strategy: Cache-first for static shell resources
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clonedResponse = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

// Message: Write-through cache invalidation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVALIDATE_API_CACHE') {
    const { pattern } = event.data;
    if (!pattern) return;

    caches.open(API_CACHE_NAME).then((cache) => {
      cache.keys().then((requests) => {
        requests.forEach((req) => {
          if (req.url.includes(pattern)) {
            console.log('[SW] Write-through cache invalidation deleting:', req.url);
            cache.delete(req);
          }
        });
      });
    });
  }
});
