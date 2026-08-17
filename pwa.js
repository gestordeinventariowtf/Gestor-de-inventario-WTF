(function () {
  const RESUME_SYNC_EVENT = "wtf:pwa-resume";
  const FOREGROUND_SYNC_EVENT = "wtf:pwa-foreground-sync";
  const SUBSCRIPTION_COLLECTION = "pwaPushSubscriptions";
  const FOREGROUND_SYNC_MS = 30000;
  const RESUME_AFTER_MS = 15000;
  let hiddenAt = 0;
  let serviceWorkerRegistration = null;

  function getFirebaseConfig() {
    return window.WTF_FIREBASE_CONFIG || {};
  }

  function dispatchSyncEvent(name, reason) {
    window.dispatchEvent(new CustomEvent(name, { detail: { reason: reason || "pwa" } }));
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function getDb() {
    const cfg = getFirebaseConfig();
    if (!cfg.enabled || !cfg.firebaseConfig || !window.firebase || !window.firebase.firestore) return null;
    const app = window.firebase.apps && window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg.firebaseConfig);
    return app.firestore();
  }

  async function savePushSubscription(subscription) {
    const db = await getDb();
    if (!db || !subscription) return false;
    const payload = subscription.toJSON ? subscription.toJSON() : subscription;
    const endpoint = String(payload.endpoint || "");
    if (!endpoint) return false;
    const activeModule = String(sessionStorage.getItem("wtf_modulo") || "").trim();
    const topic = activeModule || "general";
    const id = btoa(endpoint).replace(/[^a-zA-Z0-9]/g, "").slice(-120) || String(Date.now());
    await db.collection(SUBSCRIPTION_COLLECTION).doc(id).set({
      endpoint,
      subscription: payload,
      module: topic,
      modulo: topic,
      topics: ["general", topic].filter(Boolean),
      userAgent: navigator.userAgent,
      platform: navigator.platform || "",
      standalone: window.matchMedia && window.matchMedia("(display-mode: standalone)").matches,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  }

  async function enablePushNotifications() {
    const cfg = getFirebaseConfig();
    const vapidPublicKey = cfg.push && cfg.push.vapidPublicKey ? String(cfg.push.vapidPublicKey).trim() : "";
    if (!("Notification" in window) || !("PushManager" in window) || !serviceWorkerRegistration || !vapidPublicKey) {
      return { ok: false, reason: "push-not-configured" };
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "permission-denied" };
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    await savePushSubscription(subscription);
    return { ok: true };
  }

  async function refreshExistingPushSubscription() {
    if (!serviceWorkerRegistration || !("Notification" in window) || Notification.permission !== "granted") return;
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (subscription) await savePushSubscription(subscription);
  }

  function showPushButtonIfAvailable() {
    const cfg = getFirebaseConfig();
    const hasVapid = Boolean(cfg.push && String(cfg.push.vapidPublicKey || "").trim());
    if (!hasVapid || !("Notification" in window) || Notification.permission !== "default" || document.getElementById("wtf-push-enable")) return;
    const button = document.createElement("button");
    button.id = "wtf-push-enable";
    button.type = "button";
    button.textContent = "Activar notificaciones";
    button.style.cssText = [
      "position:fixed",
      "right:14px",
      "bottom:76px",
      "z-index:2147483646",
      "border:0",
      "border-radius:999px",
      "background:#0a9f28",
      "color:#fff",
      "font:800 12px Segoe UI,Arial,sans-serif",
      "padding:10px 14px",
      "box-shadow:0 12px 30px rgba(15,23,42,.24)",
      "cursor:pointer"
    ].join(";");
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Activando...";
      const result = await enablePushNotifications().catch(() => ({ ok: false }));
      if (result.ok) button.remove();
      else {
        button.textContent = "Notificaciones no activadas";
        window.setTimeout(() => button.remove(), 2500);
      }
    });
    document.body.appendChild(button);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    serviceWorkerRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    if (serviceWorkerRegistration.waiting) serviceWorkerRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    serviceWorkerRegistration.addEventListener("updatefound", () => {
      const worker = serviceWorkerRegistration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent("wtf:pwa-update-ready"));
        }
      });
    });
    navigator.serviceWorker.addEventListener("message", (event) => {
      const data = event.data || {};
      if (data.type === "WTF_PWA_SYNC_NOW") dispatchSyncEvent(RESUME_SYNC_EVENT, data.reason || "service-worker");
    });
    showPushButtonIfAvailable();
    refreshExistingPushSubscription().catch(() => null);
  }

  function setupResumeSync() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (!hiddenAt || Date.now() - hiddenAt >= RESUME_AFTER_MS) dispatchSyncEvent(RESUME_SYNC_EVENT, "visibility-resume");
      hiddenAt = 0;
    });
    window.addEventListener("focus", () => dispatchSyncEvent(RESUME_SYNC_EVENT, "window-focus"));
    window.addEventListener("pageshow", (event) => dispatchSyncEvent(RESUME_SYNC_EVENT, event.persisted ? "bfcache-pageshow" : "pageshow"));
    window.setInterval(() => {
      if (!document.hidden && navigator.onLine !== false) dispatchSyncEvent(FOREGROUND_SYNC_EVENT, "foreground-interval");
    }, FOREGROUND_SYNC_MS);
    window.addEventListener("online", () => dispatchSyncEvent(RESUME_SYNC_EVENT, "online"));
  }

  function start() {
    registerServiceWorker().catch((err) => console.warn("PWA service worker error", err));
    setupResumeSync();
    window.WTF_PWA = Object.assign({}, window.WTF_PWA || {}, {
      enablePushNotifications,
      refreshPushSubscription: refreshExistingPushSubscription,
      syncNow: (reason) => dispatchSyncEvent(RESUME_SYNC_EVENT, reason || "manual")
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
