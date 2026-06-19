// Service Worker — تخزين كل الملفات للعمل أوفلاين + استقبال تنبيهات الخلفية
const CACHE = 'yawmi-v7';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './data.js',
  './prayer.js',
  './quran.js',
  './tools.js',
  './adhkar.js',
  './push.js',
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

// ===== تنبيهات الخلفية =====
self.addEventListener('push', (e) => {
  let d = { title: 'ورقة اليوم', body: '' };
  try { d = e.data.json(); } catch (x) { try { d.body = e.data.text(); } catch (y) {} }
  e.waitUntil(self.registration.showNotification(d.title || 'ورقة اليوم', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png',
    tag: d.tag || 'yawmi', dir: 'rtl', lang: 'ar', vibrate: [200, 100, 200],
    silent: false, renotify: true, data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cl) => {
    for (const c of cl) { if ('focus' in c) { c.postMessage({ type: 'navigate', url }); return c.focus(); } }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
