// CaseAlerta · globo en el navegador (Web Push). Solo avisos de tu caso.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'CaseAlerta', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'CaseAlerta', { body: d.body || '', icon: '/sello.png', badge: '/sello.png', data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    for (const w of ws) if (w.url.startsWith(self.location.origin)) { w.navigate(url); return w.focus(); }
    return clients.openWindow(url);
  }));
});
