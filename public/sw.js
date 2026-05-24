// Ravenof PWA Service Worker v2
// Strategy:
//   - Static assets (scripts, styles, images, fonts, audio) → Cache-first
//   - Supabase / API requests → Network-only (never cache auth/live data)
//   - Navigation (HTML pages) → Network-first, offline fallback /offline
//   - Pre-cache: app shell only — sounds load lazily on first /life-tracker visit

const CACHE_NAME = 'ravenof-pwa-v2'

const PRECACHE_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(
        PRECACHE_URLS.map((url) => new Request(url, { credentials: 'same-origin' }))
      ).catch(() => {
        // Pre-cache failures are non-fatal — individual assets may 404 during dev
      })
    ).then(() => self.skipWaiting())
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Only handle GET — let POST/PUT/DELETE go through untouched
  if (request.method !== 'GET') return

  // 2. Supabase or any external API → Network-only, no caching
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io') ||
    url.pathname.startsWith('/api/')
  ) {
    return // browser handles it natively
  }

  // 3. Next.js internal routes → Network-only
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__nextjs')
  ) {
    // Cache static Next.js chunks (immutable filenames with content hash)
    if (url.pathname.includes('/_next/static/')) {
      event.respondWith(cacheFirst(request))
    }
    return
  }

  // 4. Static assets → Cache-first
  const dest = request.destination
  if (
    dest === 'script' ||
    dest === 'style' ||
    dest === 'image' ||
    dest === 'font' ||
    dest === 'audio' ||
    dest === 'manifest'
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // 5. Navigation (HTML pages) → Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // 6. Everything else → Network-first
  event.respondWith(networkFirst(request))
})

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    // Only cache successful, non-auth, non-dynamic responses
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME)
      // Don't cache user-specific pages that could serve stale auth state
      const skipCache = ['/login', '/register', '/admin', '/profile', '/me']
      const shouldSkip = skipCache.some((p) => new URL(request.url).pathname.startsWith(p))
      if (!shouldSkip) {
        cache.put(request, response.clone())
      }
    }
    return response
  } catch {
    // Offline: try cache first
    const cached = await caches.match(request)
    if (cached) return cached
    // Fallback to /offline page
    const offlinePage = await caches.match('/offline')
    return offlinePage ?? new Response('<h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
