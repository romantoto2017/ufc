// Service worker: red primero para todo el juego (siempre la última versión);
// la caché queda como respaldo para jugar sin conexión.
const VERSION = 'pixelmma-v5';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/main.js', 'js/store.js', 'js/i18n.js', 'js/audio.js', 'js/ratings.js', 'js/sim.js',
  'js/fight/engine.js', 'js/fight/ai.js', 'js/fight/moves.js', 'js/fight/render.js',
  'js/gfx/face.js', 'js/gfx/flag.js', 'js/gfx/logo.js',
  'js/ui/common.js', 'js/ui/screens.js', 'js/ui/fightScreen.js', 'js/ui/careerScreens.js', 'js/ui/tutorial.js',
  'js/career/career.js', 'js/career/generator.js', 'js/gfx/scenes.js',
  'data/fighters.json', 'data/promotions.json', 'data/names.json', 'data/settings.json',
  'lang/es.json', 'lang/en.json',
  'assets/logos/ufc.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/favicon-32.png', 'assets/icons/favicon-64.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Archivos del juego: red primero (siempre la última versión); la caché solo se usa sin conexión.
  if (url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
    return;
  }
  // Fuentes externas: caché primero.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
