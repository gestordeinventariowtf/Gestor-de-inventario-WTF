const WTF_SW_VERSION = "2026-08-17-pwa-11";
const STATIC_CACHE = `wtf-static-${WTF_SW_VERSION}`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/app-version.js",
  "/pwa.js",
  "/firebase-config.js",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/version.json",
  "/sharp-limpieza/index.html",
  "/sharp-limpieza/script.js",
  "/sharp-limpieza/styles.css"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" }))).catch(() => null))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("wtf-static-") && key !== STATIC_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

function shouldBypassCache(url) {
  return url.pathname === "/version.json" || url.pathname === "/app-version.js" || url.pathname === "/pwa.js" || url.pathname === "/firebase-config.js" || url.pathname.startsWith("/__/") || url.hostname.includes("googleapis.com") || url.hostname.includes("gstatic.com");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || shouldBypassCache(url)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request)));
    return;
  }
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).then((response) => {
        const copy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put("/index.html", copy)).catch(() => null);
        return response;
      }).catch(() => caches.match("/index.html"))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, copy)).catch(() => null);
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "WTF_SYNC_NOW") {
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "WTF_PWA_SYNC_NOW", reason: data.reason || "manual" }));
    });
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "WTF Sistema";
  const options = {
    body: payload.body || "Hay novedades en el sistema.",
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    data: { url: payload.url || "/" },
    tag: payload.tag || "wtf-sistema",
    renotify: Boolean(payload.renotify)
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification && event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(targetUrl).catch(() => null);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
