/// <reference lib="webworker" />

// Service Worker for Young Innovators Club Website
// Provides offline support, caching, and faster load times

const SW_VERSION = 'v6'; // Update this to force new SW 
const CACHE_NAME = 'yicdvp-cache-v6';
const OFFLINE_URL = '/offline.html';

// Log version on load
console.log(`[SW] Service Worker Version: ${SW_VERSION}`);

// Force immediate activation
self.addEventListener('install', () => {
    console.log(`[SW] Installing version ${SW_VERSION}`);
    self.skipWaiting(); // Force activation
});

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
];

// Cache strategies
const CACHE_STRATEGIES = {
    // Cache first - for static assets
    CACHE_FIRST: 'cache-first',
    // Network first - for dynamic content
    NETWORK_FIRST: 'network-first',
    // Stale while revalidate - for frequently updated content
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
    // Claim all clients
    self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip external requests that should not be intercepted by the service worker
    // This prevents CSP conflicts with cross-origin resources
    const externalDomains = [
        'supabase',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'static.vecteezy.com',
        'i.pinimg.com',
        'cdn.jsdelivr.net',
    ];

    if (
        externalDomains.some(domain => url.hostname.includes(domain)) ||
        url.pathname.startsWith('/api/') ||
        url.pathname.includes('/rest/') ||
        url.pathname.includes('/auth/')
    ) {
        // Let browser handle external requests directly (no SW interception)
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match(OFFLINE_URL);
            })
        );
        return;
    }

    // Handle static assets with cache-first strategy
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Handle images with stale-while-revalidate
    if (isImageRequest(request)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Default: network first with cache fallback
    event.respondWith(networkFirst(request));
});

// Helper functions
function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
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

// Cache-first strategy
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
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

// Network-first strategy
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

// Stale-while-revalidate strategy
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
            console.warn('[SW] Background fetch failed for:', request.url, error);
            // If we have a cached response, the failure is fine.
            // If not, we'll return undefined which might cascade to a failure, but handled better.
        });

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
