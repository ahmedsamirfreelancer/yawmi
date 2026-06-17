// Service Worker — تخزين كل الملفات للعمل أوفلاين
const CACHE = 'yawmi-v4';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './data.js',
  './prayer.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// طلبات الـAPI: شبكة فقط (متتكاشش أبداً)
// باقي الملفات: cache-first عشان تشتغل أوفلاين
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.includes('/api/')) { e.respondWith(fetch(e.request)); return; } // API: شبكة فقط
  const isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  if (isHTML) { // الصفحة: شبكة-أولاً (التحديثات تظهر فوراً) مع رجوع للكاش أوفلاين
    e.respondWith(fetch(e.request).then((res) => { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return res; })
      .catch(() => caches.match(e.request).then((h) => h || caches.match('./index.html'))));
    return;
  }
  // باقي الملفات: كاش-أولاً (سريع وأوفلاين)
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
