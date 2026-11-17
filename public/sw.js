// चला खेळूया — shows the daily reminder and opens today's puzzle when it is tapped.
// Notifications only: this file does not cache or change how pages load.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (err) {
    d = { body: e.data ? e.data.text() : '' };
  }
  const title = d.title || 'चला खेळूया';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/brand/icon-192.png',
      tag: d.tag || 'ck-' + Date.now(), // each message its own slot, so none replaces another
      renotify: true,
      lang: 'mr',
      data: { url: d.url || '/?s=pn' },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/?s=pn', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'navigate' in c) {
          return c.navigate(url).then((w) => (w || c).focus());
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
