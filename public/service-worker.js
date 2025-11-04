// A basic service worker for PWA functionality (caching, offline support)

const CACHE_NAME = 'myovae-cache-v1';
const IMMUTABLE_URLS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const AUTH_PATH_PATTERNS = [/^\/dashboard(\/|$)/, /^\/users(\/|$)/, /^\/communityPosts(\/|$)/];

const isSensitivePath = (url) => {
  try {
    const parsedUrl = new URL(url, self.location.origin);
    if (parsedUrl.origin !== self.location.origin) {
      return false;
    }

    return AUTH_PATH_PATTERNS.some(pattern => pattern.test(parsedUrl.pathname));
  } catch (error) {
    // If parsing fails, default to not caching the request.
    return true;
  }
};

const clearSensitiveCacheEntries = async () => {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter(request => isSensitivePath(request.url))
      .map(request => cache.delete(request))
  );
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(IMMUTABLE_URLS))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  let requestUrl;

  try {
    requestUrl = new URL(event.request.url);
  } catch (error) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isSensitivePath(requestUrl.href)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_PRIVATE_CACHE') {
    event.waitUntil(clearSensitiveCacheEntries());
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
