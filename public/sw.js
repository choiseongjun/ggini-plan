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
    data: {url: data.url || '/?from=push', productId: data.productId || null, menuName: data.menuName || ''},
    actions: Array.isArray(data.actions) && data.productId ? data.actions.slice(0, 2) : [],
  }));
});

// [먹었어요]: 앱을 열지 않고 1인분을 기록한다. 로그인이 풀려 있거나 실패하면 그 끼니 기록 화면을 연다.
async function logFromNotification(data) {
  try {
    const response = await fetch('/api/food-intake', {
      method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'log', id: self.crypto.randomUUID(), version: 0, productId: data.productId, portions: 1, source: 'push'}),
    });
    if (!response.ok) return false;
    await self.registration.showNotification('기록했어요', {
      body: `${data.menuName || '오늘 메뉴'} 1인분을 오늘 기록에 남겼어요.`, icon: '/icons/app-192.png', badge: '/icons/app-192.png', tag: 'meal-logged',
      data: {url: '/record'},
    });
    return true;
  } catch { return false; }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = new URL(data.url || '/?from=push', self.location.origin).href;
  if (event.action === 'eaten' && data.productId) {
    event.waitUntil(logFromNotification(data).then((ok) => ok ? undefined : openApp(url)));
    return;
  }
  event.waitUntil(openApp(url));
});

async function openApp(url) {
  const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
  for (const client of windows) {
    if (new URL(client.url).origin === self.location.origin && 'focus' in client) { await client.navigate(url); return client.focus(); }
  }
  return self.clients.openWindow(url);
}
