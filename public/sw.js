const CACHE_NAME = 'homestay-helper-react-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching core offline shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // 1. Ignore unsupported request schemes (chrome-extension, blob, data, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 2. Bypass service worker entirely in localhost / development mode or for Vite HMR assets
  const isDevHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const isViteOrDevAsset =
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/wasm/') ||
    url.pathname.includes('ort-wasm') ||
    url.pathname.includes('node_modules') ||
    url.pathname.includes('vite') ||
    url.pathname.includes('hot-update') ||
    url.search.includes('t=');

  if (isDevHost || isViteOrDevAsset) {
    return;
  }

  const isOllamaOrApi = url.pathname.includes('/api/ollama') || url.pathname.startsWith('/api/') || url.port === '11434';

  // 3. Pass-through for non-GET requests and Ollama / API requests without caching or interception
  if (event.request.method !== 'GET' || isOllamaOrApi) {
    return;
  }

  // 3. Stale-While-Revalidate caching strategy for normal static GET assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.protocol === 'http:' || url.protocol === 'https:') &&
            event.request.method === 'GET'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch((err) => {
                console.warn('[Service Worker] Cache put skipped:', err.message);
              });
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch((fetchErr) => {
          // Network failed (Airplane mode / Zero Bars) - fallback to cache silently if available
          if (cachedResponse) {
            return cachedResponse;
          }
          throw fetchErr;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
