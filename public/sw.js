/// <reference lib="webworker" />

// ============================================================================
// Service Worker for YICDVP – Production-Grade, Cloudflare-Optimised
// ============================================================================

const SW_VERSION = 'v14';
const CACHE_NAME = `yicdvp-${SW_VERSION}`;
const DATA_CACHE = `yicdvp-data-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';

const MAX_DATA_ENTRIES = 100;
const MAX_IMAGE_ENTRIES = 200;
const FETCH_TIMEOUT_MS = 8000;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/club-logo.png',
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each asset individually so one failure doesn't block the rest
      const results = await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch((err) => {
          console.warn(`[SW] Failed to precache ${url}:`, err.message);
        }))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn(`[SW] ${failed.length} precache items failed`);
      }
    }).catch((err) => {
      console.error('[SW] Install cache open failed:', err);
    })
  );
  self.skipWaiting();
});

// ─── Activate — clean old caches ────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_NAME, DATA_CACHE]);
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => !allowedCaches.has(n))
          .map((n) => {
            console.log(`[SW] Deleting old cache: ${n}`);
            return caches.delete(n);
          })
      )
    ).catch((err) => {
      console.error('[SW] Activate cache cleanup failed:', err);
    })
  );
  self.clients.claim();
});

// ─── Offline detection ─────────────────────────────────────────────────────

function broadcastOnlineStatus(isOnline) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'ONLINE_STATUS',
        payload: { isOnline, timestamp: Date.now() },
      });
    });
  }).catch(() => { /* clients not available */ });
}

// ─── Message Handler ────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  switch (event.data.type) {
    case 'CHECK_ONLINE':
      fetchWithTimeout('/manifest.json', { method: 'HEAD', cache: 'no-store' }, 5000)
        .then(() => broadcastOnlineStatus(true))
        .catch(() => broadcastOnlineStatus(false));
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      if (event.source) {
        event.source.postMessage({ type: 'SW_VERSION', payload: SW_VERSION });
      }
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .catch((err) => console.error('[SW] Clear cache failed:', err))
      );
      break;
  }
});

// ─── Fetch Handler ──────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return; // malformed URL
  }

  // Skip non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Skip analytics / tracking
  if (
    url.hostname.includes('cloudflareinsights.com') ||
    url.hostname.includes('google-analytics.com') ||
    url.hostname.includes('googletagmanager.com')
  ) return;

  // Skip auth endpoints (never cache tokens)
  if (url.pathname.includes('/auth/v1/')) return;

  // Skip browser extension resources
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

  // Bypass Vite dev server requests to prevent ERR_ABORTED timeouts on localhost
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    if (url.pathname.includes('node_modules') || url.pathname.includes('/@') || url.pathname.includes('/src/')) {
      return;
    }
  }

  try {
    // ── Supabase REST data → Stale-While-Revalidate ──
    if (url.hostname.includes('supabase') && url.pathname.includes('/rest/v1/')) {
      event.respondWith(staleWhileRevalidate(request, DATA_CACHE, MAX_DATA_ENTRIES));
      return;
    }

    // ── Hashed static assets (/assets/*) → Network-first ──
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(networkFirstWithFallback(request, CACHE_NAME));
      return;
    }

    // ── Fonts & CDN resources → Cache-first ──
    if (
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.jsdelivr.net')
    ) {
      event.respondWith(cacheFirst(request, CACHE_NAME));
      return;
    }

    // ── External images → Stale-While-Revalidate ──
    if (isImageRequest(request, url)) {
      event.respondWith(staleWhileRevalidate(request, CACHE_NAME, MAX_IMAGE_ENTRIES));
      return;
    }

    // ── Navigation → Network-first with SPA offline fallback ──
    if (request.mode === 'navigate') {
      event.respondWith(handleNavigation(request));
      return;
    }

    // ── Everything else → Network-first ──
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
    if (isValidResponse(response)) {
      await safeCachePut(cacheName, request, response.clone());
    }
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
    if (isValidResponse(response)) {
      await safeCachePut(cacheName, request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    console.warn('[SW] networkFirst offline, no cache:', request.url);
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
      broadcastOnlineStatus(true);
      return response;
    })
    .catch((err) => {
      broadcastOnlineStatus(false);
      console.warn('[SW] SWR network failed:', request.url, err.message);
      return cached || new Response('{}', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'application/json' },
      });
    });

  return cached || networkPromise;
}

// Helper to prevent "redirected response" errors on navigation requests
function cleanRedirect(response) {
  if (!response || !response.redirected) return response;
  const cloned = response.clone();
  return new Response(cloned.body, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers: cloned.headers
  });
}

async function handleNavigation(request) {
  try {
    const response = await fetchWithTimeout(request, undefined, FETCH_TIMEOUT_MS);
    if (isValidResponse(response)) {
      await safeCachePut(CACHE_NAME, request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Navigation offline:', request.url);

    // Try cached version of this exact page
    const cachedPage = await caches.match(request);
    if (cachedPage) return cleanRedirect(cachedPage);

    // Try cached index (SPA client-side routing)
    const cachedIndex = await caches.match('/');
    if (cachedIndex) return cleanRedirect(cachedIndex);

    // Last resort: offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    return cleanRedirect(offlinePage) || new Response(
      '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
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
  // Don't cache error responses or opaque responses from no-cors
  if (!response) return false;
  if (response.status === 0) return false; // opaque
  if (response.status >= 400) return false;
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
    event.waitUntil(
      syncPendingForms().catch((err) => {
        console.error('[SW] Background sync failed:', err);
      })
    );
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
    } catch (e) {
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

  try {
    event.waitUntil(
      self.registration.showNotification(data.title || 'YICDVP', options)
        .catch((err) => {
          console.warn('[SW] showNotification failed (likely no permission):', err.message);
        })
    );
  } catch (err) {
    console.error('[SW] Push notification error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if available
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(targetUrl);
      })
      .catch((err) => {
        console.error('[SW] Notification click handler error:', err);
      })
  );
});
