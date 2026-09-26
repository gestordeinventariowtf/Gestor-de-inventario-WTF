const NEW_WTF_HOST = "https://gestor-de-inventario-wtf-29056.web.app";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) => {
        clients.forEach((client) => {
          if ("navigate" in client) client.navigate(NEW_WTF_HOST).catch(() => null);
        });
      })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request && event.request.mode === "navigate") {
    event.respondWith(Response.redirect(NEW_WTF_HOST, 302));
  }
});
