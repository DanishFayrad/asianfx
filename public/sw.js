// AsianFX service worker: shows signal alerts sent by the server (web push),
// even when the site is closed, and opens the dashboard when one is tapped.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { body: event.data ? event.data.text() : '' };
    }
    const title = data.title || 'AsianFX';
    event.waitUntil(
        self.registration.showNotification(title, {
            body: data.body || 'A new signal is available.',
            icon: '/icon.png',
            badge: '/icon.png',
            tag: data.tag || 'asianfx-signal',
            renotify: true,
            requireInteraction: true,
            data: { url: data.url || '/dashboard' },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            // Reuse an open AsianFX tab if there is one.
            for (const w of wins) {
                if (w.url.startsWith(self.location.origin) && 'focus' in w) {
                    w.navigate(target).catch(() => undefined);
                    return w.focus();
                }
            }
            return self.clients.openWindow(target);
        }),
    );
});
