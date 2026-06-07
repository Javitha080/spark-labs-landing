/// <reference lib="webworker" />
// ============================================================================
// Service Worker for YICDVP – Production-Grade, Cloudflare-Optimised
// ============================================================================
// SW_VERSION is injected at build time by vite.config.ts (spark-sw-version plugin).
// Every production build produces a unique version, forcing the browser to
// detect a new SW and bust every cached entry. In dev the placeholder remains
// (the SW is unregistered in dev anyway).
const SW_VERSION = '__SW_VERSION__';
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__';
const CACHE_NAME = `yicdvp-${SW_VERSION}`;
const FONTS_CACHE = `yicdvp-fonts-${SW_VERSION}`;
const IMAGE_CACHE = `yicdvp-images-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';
const MAX_IMAGE_ENTRIES = 200;
const FETCH_TIMEOUT_MS = 8000;

// NOTE: '/' and '/index.html' are NOT precached on purpose. The HTML references
// HASHED asset filenames, so a cached copy from an old build would 404 against
// the deleted assets. Navigation requests are still cached at runtime (in
// handleNavigation) for offline use, but we never serve a stale precached
// index. /offline.html and /manifest.json have stable URLs and are safe.
const PRECACHE_URLS = ['/offline.html', '/manifest.json'];

// Transparent 1x1 PNG used as a fallback for failed image requests
const TRANSPARENT_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
);

// Hostnames we never want to touch with the SW
const SKIP_HOSTS = [
  'cloudflareinsights.com', 'google-analytics.com', 'googletagmanager.com',
  'challenges.cloudflare.com',
  'ytimg.com', 'img.youtube.com', 'youtube.com', 'youtube-nocookie.com',
  'youtu.be', 'ibb.co', 'instagram.com', 'cdninstagram.com',
  'vimeo.com', 'player.vimeo.com', 'unsplash.com', 'supabase',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        let dynamicUrls = [];
        try {
          const indexRes = await fetch('/index.html');
          if (indexRes.ok) {
            const html = await indexRes.text();
            const assetRegex = /(?:href|src)="(\/assets\/[^"]+)"/g;
            let match;
            while ((match = assetRegex.exec(html)) !== null) {
              dynamicUrls.push(match[1]);
            }
          }
        } catch (err) {
          console.warn('[SW] Could not fetch index.html for dynamic precaching:', err.message);
        }
        const urlsToCache = [...new Set([...PRECACHE_URLS, ...dynamicUrls])];
        console.log(`[SW] Precaching ${urlsToCache.length} assets...`);
        const results = await Promise.allSettled(
          urlsToCache.map((url) =>
            cache.add(url).catch((err) => console.warn(`[SW] Failed to precache ${url}:`, err.message))
          )
        );
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) console.warn(`[SW] ${failed.length} precache items failed`);
        await self.skipWaiting();
      } catch (err) {
        console.error('[SW] Install cache open failed:', err);
      }
    })()
  );
});

// ─── Activate — clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_NAME, FONTS_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    (async () => {
      try {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
        }
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((n) => !allowedCaches.has(n))
            .map((n) => {
              console.log(`[SW] Deleting old cache: ${n}`);
              return caches.delete(n);
            })
        );
        await self.clients.claim();
      } catch (err) {
        console.error('[SW] Activate step failed:', err);
      }
    })()
  );
});

// ─── Offline detection ─────────────────────────────────────────────────────
function broadcastOnlineStatus(isOnline) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'ONLINE_STATUS', payload: { isOnline, timestamp: Date.now() } });
    });
  }).catch(() => { });
}

// ─── Message Handler ────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;
  const reply = (payload) => {
    if (event.source) {
      try { event.source.postMessage(payload); } catch { /* source gone */ }
    }
  };
  switch (event.data.type) {
    case 'CHECK_ONLINE':
      fetchWithTimeout('/manifest.json', { method: 'HEAD', cache: 'no-store' }, 5000)
        .then(() => broadcastOnlineStatus(true))
        .catch(() => broadcastOnlineStatus(false));
      break;
    case 'SKIP_WAITING':
      self.skipWaiting();
      reply({ type: 'SKIP_WAITING_OK' });
      break;
    case 'GET_VERSION':
      reply({ type: 'SW_VERSION', payload: { version: SW_VERSION, buildTimestamp: BUILD_TIMESTAMP } });
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .then(() => reply({ type: 'CLEAR_CACHE_OK' }))
          .catch((err) => {
            console.error('[SW] Clear cache failed:', err);
            reply({ type: 'CLEAR_CACHE_FAIL', error: String(err) });
          })
      );
      break;
    case 'KILL_SWITCH':
      // Nuclear option: delete every cache and unregister this SW entirely.
      // Used when a major version mismatch is detected and we want the page to
      // fall back to a vanilla network-only experience.
      event.waitUntil(
        caches.keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .then(() => self.registration.unregister())
          .then(() => reply({ type: 'KILL_SWITCH_OK' }))
          .catch((err) => {
            console.error('[SW] Kill switch failed:', err);
            reply({ type: 'KILL_SWITCH_FAIL', error: String(err) });
          })
      );
      break;
  }
});

// ─── Fetch Handler ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (!url.protocol.startsWith('http')) return;
  if (SKIP_HOSTS.some((h) => url.hostname.includes(h))) return;
  if (url.pathname.includes('/cdn-cgi/challenge-platform')) return;
  if (url.pathname.includes('/auth/v1/')) return;
  // Bypass online-status connectivity pings — they must hit the network directly
  if (url.search.includes('_cb=')) return;

  // Bypass video — SWs break HTTP 206 Range requests
  if (request.destination === 'video' || /\.(mp4|webm|ogg)$/i.test(url.pathname)) return;

  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

  // Bypass Vite dev server
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    if (url.pathname.includes('node_modules') || url.pathname.includes('/@') || url.pathname.includes('/src/')) {
      return;
    }
  }

  try {
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request, CACHE_NAME));
      return;
    }
    if (
      request.destination === 'font' ||
      /\.(woff|woff2|ttf|otf)$/i.test(url.pathname) ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.jsdelivr.net')
    ) {
      event.respondWith(cacheFirst(request, FONTS_CACHE));
      return;
    }
    if (isImageRequest(request, url)) {
      event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
      return;
    }
    if (request.mode === 'navigate') {
      event.respondWith(handleNavigation(event));
      return;
    }
    event.respondWith(networkFirstWithFallback(request, CACHE_NAME));
  } catch (err) {
    console.error('[SW] Fetch handler error:', err);
  }
});

// ─── Strategies ─────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetchWithTimeout(request, undefined, FETCH_TIMEOUT_MS);
    if (isValidResponse(response)) await safeCachePut(cacheName, request, response.clone());
    return response;
  } catch (err) {
    console.warn('[SW] cacheFirst failed:', request.url, err.message);
    const cached = await caches.match(request);
    return cached || new Response('', { status: 408, statusText: 'Offline' });
  }
}

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetchWithTimeout(request, undefined, FETCH_TIMEOUT_MS);
    if (isValidResponse(response)) await safeCachePut(cacheName, request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const url = new URL(request.url);
      const lastSegment = url.pathname.split('/').pop() || '';
      if (!lastSegment.includes('.')) {
        const cachedIndex = await caches.match('/');
        if (cachedIndex) return cleanRedirect(cachedIndex);
      }
    } catch { }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  let cached;
  try {
    const cache = await caches.open(cacheName);
    cached = await cache.match(request);
  } catch (err) {
    console.warn('[SW] SWR cache read error:', err.message);
  }
  const networkPromise = fetchWithTimeout(request, undefined, FETCH_TIMEOUT_MS)
    .then(async (response) => {
      if (isValidResponse(response)) {
        await safeCachePut(cacheName, request, response.clone());
        if (maxEntries) await trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch((err) => {
      console.warn('[SW] SWR network failed:', request.url, err.message);
      // Return a transparent pixel so images don't show a broken icon
      return (
        cached ||
        new Response(TRANSPARENT_PNG, {
          status: 200,
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
        })
      );
    });
  return cached || networkPromise;
}

// Prevent "redirected response" errors on navigation requests
function cleanRedirect(response) {
  if (!response || !response.redirected) return response;
  const cloned = response.clone();
  return new Response(cloned.body, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers: cloned.headers,
  });
}

// Cache a navigation response, stripping any redirect first
async function cacheNavigation(request, response) {
  if (isValidResponse(response)) {
    await safeCachePut(CACHE_NAME, request, cleanRedirect(response).clone());
  }
}

async function handleNavigation(event) {
  const request = event.request;
  try {
    if (event.preloadResponse) {
      const preloadRes = await event.preloadResponse;
      if (preloadRes && isValidResponse(preloadRes)) {
        await cacheNavigation(request, preloadRes.clone());
        return cleanRedirect(preloadRes);
      }
    }
    const response = await fetchWithTimeout(request, undefined, FETCH_TIMEOUT_MS);
    await cacheNavigation(request, response.clone());
    return cleanRedirect(response);
  } catch {
    console.warn('[SW] Navigation offline:', request.url);
    const cachedPage = await caches.match(request);
    if (cachedPage) return cleanRedirect(cachedPage);
    const cachedIndex = await caches.match('/');
    if (cachedIndex) return cleanRedirect(cachedIndex);
    const offlinePage = await caches.match(OFFLINE_URL);
    return (
      cleanRedirect(offlinePage) ||
      new Response('<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      })
    );
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function fetchWithTimeout(resource, options, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Fetch timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    fetch(resource, { ...options, signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

function isValidResponse(response) {
  if (!response) return false;
  if (response.status === 0) return false; // opaque
  if (response.status >= 400) return false;
  // Only cache responses we fully control
  if (response.type && !['basic', 'cors', 'default'].includes(response.type)) return false;
  return true;
}

async function safeCachePut(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn('[SW] Cache quota exceeded, trimming...');
      await trimCache(cacheName, 50);
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, response);
      } catch {
        console.error('[SW] Cache put failed even after trimming');
      }
    } else {
      console.error('[SW] Cache put error:', err);
    }
  }
}

function isImageRequest(request, url) {
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif'];
  return exts.some((e) => url.pathname.endsWith(e)) || request.destination === 'image';
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const toDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(toDelete.map((req) => cache.delete(req)));
      console.log(`[SW] Trimmed ${toDelete.length} cache entries from ${cacheName}`);
    }
  } catch (err) {
    console.error('[SW] trimCache error:', err);
  }
}

// ─── Background Sync ────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncPendingForms().catch((err) => console.error('[SW] Background sync failed:', err)));
  }
});

async function syncPendingForms() {
  // Future: replay queued POST requests from IndexedDB
}

// ─── Push Notifications ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }
  const options = {
    body: data.body || 'New notification from Young Innovators Club',
    icon: '/club-logo.png',
    badge: '/club-logo.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(
    self.registration
      .showNotification(data.title || 'YICDVP', options)
      .catch((err) => console.warn('[SW] showNotification failed:', err.message))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  // FIXED: was a corrupted markdown-link expression
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      })
      .catch((err) => console.error('[SW] Notification click handler error:', err))
  );
});