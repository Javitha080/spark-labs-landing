/// <reference lib="webworker" />

// ============================================================================
// Service Worker for YICDVP – Cloudflare-Optimised
// ============================================================================
// Strategy:
//   • Cloudflare CDN handles caching of hashed static assets (/assets/*)
//   • SW focuses on: offline support, Supabase data caching (SWR), navigation
//   • Includes offline detection → notifies the UI via postMessage
// ============================================================================

const SW_VERSION = 'v13';
const CACHE_NAME = `yicdvp-${SW_VERSION}`;
const DATA_CACHE = `yicdvp-data-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Maximum cache entries per cache bucket
const MAX_DATA_ENTRIES = 100;
const MAX_IMAGE_ENTRIES = 200;

// Assets to pre-cache for offline shell
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
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
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ─── Offline detection — broadcast to all clients ───────────────────────────

function broadcastOnlineStatus(isOnline) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'ONLINE_STATUS',
        payload: { isOnline, timestamp: Date.now() },
      });
    });
  });
}

// Listen for connectivity messages from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_ONLINE') {
    // The page is asking — we can try a lightweight fetch to verify
    fetch('/api/health', { method: 'HEAD', cache: 'no-store' })
      .then(() => broadcastOnlineStatus(true))
      .catch(() => broadcastOnlineStatus(false));
  }

  // Allow the page to trigger cache cleanup
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map((n) => caches.delete(n)))
      )
    );
  }
});

// ─── Fetch Handler ──────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

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

  // ── Supabase REST data → Stale-While-Revalidate ──
  if (url.hostname.includes('supabase') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE, MAX_DATA_ENTRIES));
    return;
  }

  // ── Hashed static assets (/assets/*) → Network-first (Cloudflare CDN handles caching) ──
  // We only cache them in SW as a fallback for true offline scenarios
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(networkFirstWithFallback(request, CACHE_NAME));
    return;
  }

  // ── Fonts & CDN resources → Cache-first with long TTL ──
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
});

// ─── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    broadcastOnlineStatus(true);
    return response;
  } catch {
    broadcastOnlineStatus(false);
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        // Enforce max entries
        if (maxEntries) await trimCache(cacheName, maxEntries);
      }
      broadcastOnlineStatus(true);
      return response;
    })
    .catch(() => {
      broadcastOnlineStatus(false);
      return cached || new Response('{}', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'application/json' },
      });
    });

  // Serve stale immediately if available, otherwise wait for network
  return cached || networkPromise;
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    broadcastOnlineStatus(true);
    return response;
  } catch {
    broadcastOnlineStatus(false);

    // Try cached version of this exact page
    const cachedPage = await caches.match(request);
    if (cachedPage) return cachedPage;

    // Try cached index (SPA client-side routing)
    const cachedIndex = await caches.match('/');
    if (cachedIndex) return cachedIndex;

    // Last resort: offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response(
      '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function isImageRequest(request, url) {
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif'];
  return exts.some((e) => url.pathname.endsWith(e)) || request.destination === 'image';
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((req) => cache.delete(req)));
  }
}

// ─── Background Sync (form submissions) ─────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncPendingForms());
  }
});

async function syncPendingForms() {
  // Future: replay queued POST requests from IndexedDB
}

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
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
    self.registration.showNotification(data.title || 'YICDVP', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
