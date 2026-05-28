// Coach Salle — Service Worker v5
// Stratégie : cache shell uniquement (Index.html + manifest)
// Les GIFs sont servis par le cache HTTP du navigateur (Cache-Control), pas par le SW.
// Cela évite le bug Safari "Response served by service worker has redirections"
// et empêche le SW de saturer le cache avec 37 Mo de GIFs.

const SHELL_CACHE = 'coach-shell-v5';
const SHELL = [
  './Index.html',
  './manifest.json'
];

// ── Install : mise en cache du shell uniquement ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate : nettoyage des anciens caches ──────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ne traiter que les GET du même origin
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // GIFs : laisser le navigateur gérer, ne PAS intercepter
  if (url.pathname.startsWith('/GIF/') || url.pathname.includes('/GIF/')) return;

  // Navigation (ouverture de l'app) → toujours servir Index.html depuis le cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./Index.html').then(r => r || fetch('./Index.html'))
    );
    return;
  }

  // Shell assets (Index.html, manifest) → cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
