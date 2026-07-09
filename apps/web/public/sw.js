// Service worker AlertDeals — reçoit les notifications Web Push et les affiche,
// puis ouvre la bonne page au clic. Fichier vanilla JS servi tel quel (pas de
// build) : il tourne dans le scope navigateur, hors de l'app React.

// Handler fetch minimal (passe-plat) : on ne fait pas de cache offline, mais sa
// présence est requise par les critères d'installabilité de Chrome pour que le
// bouton « Installer » soit proposé. On laisse le navigateur gérer la requête.
self.addEventListener('fetch', () => {});

// Réception d'un push : le worker envoie un payload JSON { title, body, url }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'AlertDeals';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Conserve l'URL cible pour le handler de clic ci-dessous.
    data: { url: data.url || '/' },
  };

  // waitUntil garde le SW vivant le temps d'afficher la notif.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notif : focus un onglet existant de l'app si possible, sinon en
// ouvre un nouveau sur l'URL du deal.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
