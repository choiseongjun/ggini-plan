// 식사 시간 알림용 서비스 워커. 페이지 캐시는 하지 않고 푸시 알림만 다룬다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {title: '끼니랑', body: event.data ? event.data.text() : ''}; }
  const title = data.title || '끼니랑';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/app-192.png',
    badge: '/icons/app-192.png',
    tag: data.tag || 'meal',
    data: {url: data.url || '/?from=push'},
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/?from=push', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) { await client.navigate(url); return client.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
