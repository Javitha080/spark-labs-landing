/// <reference lib="webworker" />

// Service Worker for YICDVP Website
// Optimization: Dynamic Caching & API Strategy (SWR) for faster data loading

const SW_VERSION = 'v12'; // Improved navigation caching: serve cached pages before offline.html
const CACHE_NAME = `yicdvp-cache-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Log version on load
console.log(`[SW] Service Worker Version: ${SW_VERSION}`);

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
];

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Claim all clients so they use the new SW immediately
    self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests (POST, PUT, DELETE, etc. should always hit network)
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip analytics and tracking scripts (don't cache them)
    if (url.hostname.includes('cloudflareinsights.com') ||
        url.hostname.includes('google-analytics.com') ||
        url.hostname.includes('googletagmanager.com')) {
        return;
    }

    // Explicitly SKIP Auth requests or specific protected routes
    // Supabase Auth usually runs on /auth/v1/ - we don't want to cache stale tokens or auth states
    if (url.pathname.includes('/auth/v1/')) {
        return;
    }

    // Smart Caching Logic

    // 1. Supabase REST API (Data) -> Stale-While-Revalidate
    // This allows immediate rendering of cached data while fetching fresh data in background
    if (url.hostname.includes('supabase') && url.pathname.includes('/rest/v1/')) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // 2. Google Fonts & Static Assets -> Cache First
    // Fonts rarely change, cache them agressively
    if (
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('static.vecteezy.com') || // External images
        url.hostname.includes('cdn.jsdelivr.net')
    ) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 3. Navigation Requests -> Network First (with offline fallback)
    // Try network → cached version of the page → offline.html (last resort)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful navigation responses for future offline use
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    // Network failed — try serving the cached version of this exact page first
                    const cachedPage = await caches.match(request);
                    if (cachedPage) {
                        return cachedPage;
                    }
                    // Also try matching without query string / hash
                    const url = new URL(request.url);
                    const cleanRequest = new Request(url.origin + url.pathname);
                    const cachedClean = await caches.match(cleanRequest);
                    if (cachedClean) {
                        return cachedClean;
                    }
                    // For SPA: try serving cached index.html (client-side routing)
                    const cachedIndex = await caches.match('/');
                    if (cachedIndex) {
                        return cachedIndex;
                    }
                    // Absolute last resort — show the offline page
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }

    // 4. Local Static Assets (JS, CSS, etc.) -> Stale-While-Revalidate
    if (isStaticAsset(url)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // 5. Images -> Stale-While-Revalidate (good balance of speed and freshness)
    if (isImageRequest(request)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Default: Network First
    // For anything else, try network, fallback to cache if available
    event.respondWith(networkFirst(request));
});

// Helper functions
function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.json'];
    return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

function isImageRequest(request) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
    const url = new URL(request.url);
    return (
        imageExtensions.some((ext) => url.pathname.endsWith(ext)) ||
        request.destination === 'image'
    );
}

// Strategy: Cache First
// Look in cache, if found return it. If not, fetch from network and cache it.
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        // Only cache valid responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Cache-first failed:', error);
        throw error;
    }
}

// Strategy: Network First
// Try network, if successful cache it. If fails, return from cache.
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network-first failed, checking cache:', request.url);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // If critical asset fails and not in cache, returning a fallback or throwing is expected
        // We'll swallow the error for non-critical assets to prevent "Uncaught" noise
        if (request.destination === 'image' || request.destination === 'font') {
            console.warn('[SW] Failed to fetch non-critical asset:', request.url);
            return new Response('', { status: 404, statusText: 'Not Found' });
        }
        throw error;
    }
}

// Strategy: Stale-While-Revalidate
// Return cached response IMMEDIATELY (stale), but also update cache from network in background (revalidate).
// If no cache, wait for network.
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            // Network failed — return a proper fallback Response so the SW never
            // yields `undefined` to event.respondWith(), which would crash with
            // "Failed to convert value to 'Response'".
            console.warn('[SW] Background fetch failed, using stale data only if available.', error);
            // Return cached if we have it, otherwise a minimal 503 placeholder
            return cachedResponse || new Response('', {
                status: 503,
                statusText: 'Service Unavailable — offline'
            });
        });

    // Prefer serving the cached copy immediately; background revalidate happens
    // in parallel. If no cache, wait for the network (or the 503 fallback above).
    return cachedResponse || fetchPromise;
}

// Background sync for form submissions (when browser supports it)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(syncForms());
    }
});

async function syncForms() {
    // Get pending form submissions from IndexedDB
    // This would be implemented based on specific form requirements
    console.log('[SW] Syncing forms...');
}

// Push notifications (placeholder for future implementation)
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};

    const options = {
        body: data.body || 'New notification from Young Innovators Club',
        icon: '/club-logo.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
        },
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'YICDVP', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        self.clients.openWindow(event.notification.data.url)
    );
});
