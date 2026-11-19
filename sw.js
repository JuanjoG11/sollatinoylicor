/* =====================================================
   Service Worker - POS Sol Latino & Licores San Pedro
   Estrategia: Cache-first para assets, Network-first para Supabase
===================================================== */

const CACHE_NAME  = 'pos-v1';
const CACHE_STATIC = 'pos-static-v1';

// Assets que se cachean en la instalacion
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/LOGO EL SOL LATINO.PNG',
  '/LOGO LICORES SAN PEDRO PNG.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  // CDN assets
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap'
];

// ── INSTALL ──────────────────────────────────────
self.addEventListener('install', function(e) {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(function(cache) {
        // Cache assets one by one to not fail if one is missing
        return Promise.allSettled(
          STATIC_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Could not cache:', url, err.message);
            });
          })
        );
      })
      .then(function() {
        console.log('[SW] Installed');
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ─────────────────────────────────────
self.addEventListener('activate', function(e) {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_STATIC; })
          .map(function(key) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH ─────────────────────────────────────────
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Supabase API calls → Network first, no cache
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request)
        .catch(function() {
          // If offline and Supabase fails, return a JSON error
          return new Response(
            JSON.stringify({ error: 'Sin conexion. Los datos no se pudieron sincronizar.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Google Fonts → Cache first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_STATIC).then(function(cache) { cache.put(e.request, clone); });
          return response;
        }).catch(function() { return cached; });
      })
    );
    return;
  }

  // CDN scripts → Cache first
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('unpkg.com')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_STATIC).then(function(cache) { cache.put(e.request, clone); });
          return response;
        });
      })
    );
    return;
  }

  // App shell (HTML, CSS, JS, images) → Cache first, fallback network
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_STATIC).then(function(cache) { cache.put(e.request, clone); });
          }
          return response;
        }).catch(function() {
          // Offline fallback: return index.html for navigation requests
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
    );
    return;
  }

  // Everything else → network
  e.respondWith(fetch(e.request));
});

// ── BACKGROUND SYNC (futuro) ──────────────────────
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-ventas') {
    console.log('[SW] Background sync: ventas');
  }
});

// ── PUSH NOTIFICATIONS (futuro) ──────────────────
self.addEventListener('push', function(e) {
  if (!e.data) return;
  var data = e.data.json();
  self.registration.showNotification(data.title || 'POS Alerta', {
    body:  data.body  || '',
    icon:  '/icons/icon-192.svg',
    badge: '/icons/icon-96.svg',
    tag:   data.tag   || 'pos-notification'
  });
});
