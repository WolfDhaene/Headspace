// Service worker: maakt Headspace installeerbaar, laat het offline openen en toont pushmeldingen.
const CACHE = 'headspace-v9';
const SHELL = ['./', 'manifest.webmanifest', 'fonts/newsreader.woff2', 'fonts/newsreader-italic.woff2', 'fonts/instrument-sans.woff2', 'icons/icon-192.png', 'icons/icon-512.png', 'qrcode.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;
  // Lettertypes en iconen veranderen niet: eerst de bewaarde kopie
  if (/\/(fonts|icons)\//.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
    return;
  }
  // De app zelf: eerst het netwerk (updates verschijnen meteen), anders de bewaarde kopie
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./')))
  );
});

// Pushmelding van de server tonen
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Headspace', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge.png',
    tag: d.tag,
    data: { url: d.url || '/' }
  }));
});

// Tik op de melding: open Headspace (of haal het bestaande venster naar voren)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => new URL(c.url).origin === location.origin);
      return open ? open.navigate(url).then(c => (c || open).focus()) : self.clients.openWindow(url);
    })
  );
});
