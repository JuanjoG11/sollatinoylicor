/* =====================================================
   Service Worker - POS Sol Latino & Licores San Pedro
   Estrategia:
     - index.html / app.js / style.css → Network-first (siempre actualizado)
     - CDN / Fonts → Cache-first (no cambian)
     - Supabase → Network only
===================================================== */

const CACHE_STATIC = 'pos-static-v4';

// Assets CDN que se cachean en la instalacion (no cambian)
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap'
];

// ── INSTALL ──────────────────────────────────────
self.addEventListener('install', function(e) {
  console.log('[SW] Installing v4...');
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(function(cache) {
        return Promise.allSettled(
          CDN_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Could not cache:', url, err.message);
            });
          })
        );
      })
      .then(function() {
        console.log('[SW] Installed v4');
        return self.skipWaiting(); // activa inmediatamente sin esperar tabs cerradas
      })
  );
});

// ── ACTIVATE ─────────────────────────────────────
self.addEventListener('activate', function(e) {
  console.log('[SW] Activating v4...');
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
      return self.clients.claim(); // toma control de todas las tabs abiertas
    })
  );
});

// ── FETCH ─────────────────────────────────────────
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Supabase → Network only, nunca cachear
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(
          JSON.stringify({ error: 'Sin conexion.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // CDN y Fonts → Cache-first (estos archivos nunca cambian)
  if (
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
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

  // App shell (HTML, JS, CSS, imagenes) → Network-first
  // Siempre intenta la red; si falla (sin internet) usa el cache
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        // Guarda la respuesta fresca en cache para uso offline
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_STATIC).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        // Sin internet: sirve desde cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  e.respondWith(fetch(e.request));
});
