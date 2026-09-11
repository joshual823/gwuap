/* Gwuap service worker.
 *
 * Deliberately does NOT cache anything.
 *
 * A service worker is required before Chrome will offer to install the
 * app, and before any push notification can be delivered — those are the
 * two reasons this file exists. Caching is a third thing it *could* do
 * and shouldn't: almost every page here is live scores, a running game
 * chat or a feed that changes by the minute, and the failure mode of a
 * stale cache on that is showing somebody a final score that isn't.
 * "Slightly slower" beats "quietly wrong" on a site whose entire claim
 * is that its numbers are right.
 *
 * The fetch handler passes straight through. It's here because Chrome
 * has historically wanted one present to treat the app as installable.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* pass through to the network */ })

/* Push: the reason people said they'd rather have an app.
 * The payload is written by the server; this only renders it. */
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* non-JSON push */ }

  const title = data.title || 'Gwuap'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Same tag replaces rather than stacks, so ten reactions on one post
    // don't become ten notifications.
    tag: data.tag || 'gwuap',
    data: { url: data.url || '/notifications' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url || '/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus a tab that's already open rather than piling up new ones.
      for (const client of list) {
        if ('focus' in client) { client.navigate(target); return client.focus() }
      }
      return self.clients.openWindow(target)
    }),
  )
})
