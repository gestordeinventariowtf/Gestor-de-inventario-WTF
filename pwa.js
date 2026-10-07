(function () {
  const RESUME_SYNC_EVENT = "wtf:pwa-resume";
  const FOREGROUND_SYNC_EVENT = "wtf:pwa-foreground-sync";
  const SUBSCRIPTION_COLLECTION = "pwaPushSubscriptions";
  const FOREGROUND_SYNC_MS = 10000;
  const RESUME_AFTER_MS = 2000;
  let hiddenAt = 0;
  let serviceWorkerRegistration = null;
  let lastForegroundSyncAt = 0;
  let lastResumeSyncAt = 0;

  function getFirebaseConfig() {
    return window.WTF_FIREBASE_CONFIG || {};
  }

  function dispatchSyncEvent(name, reason) {
    const now = Date.now();
    if (name === FOREGROUND_SYNC_EVENT && now - lastForegroundSyncAt < FOREGROUND_SYNC_MS - 1000) return;
    if (name === RESUME_SYNC_EVENT && now - lastResumeSyncAt < 5000 && reason !== "manual-sync") return;
    if (name === FOREGROUND_SYNC_EVENT) lastForegroundSyncAt = now;
    if (name === RESUME_SYNC_EVENT) lastResumeSyncAt = now;
    window.dispatchEvent(new CustomEvent(name, { detail: { reason: reason || "pwa" } }));
  }

  async function clearLegacyAppShellCaches() {
    if (!("caches" in window)) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.indexOf("wtf-static-") === 0).map((key) => caches.delete(key)));
    } catch (_) {}
  }

  function withTimeout(promise, ms, reason) {
    return Promise.race([
      promise,
      new Promise((resolve) => window.setTimeout(() => resolve({ ok: false, reason: reason || "timeout" }), ms))
    ]);
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function isIosDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandaloneMode() {
    return Boolean(window.navigator.standalone === true || window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  }

  function getSubscriptionDocId(endpoint) {
    return btoa(String(endpoint || "")).replace(/[^a-zA-Z0-9]/g, "").slice(-120) || String(Date.now());
  }

  function getFirebaseAuthUser() {
    try {
      if (!window.firebase || !window.firebase.auth) return null;
      const app = window.firebase.apps && window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(getFirebaseConfig().firebaseConfig);
      return app.auth().currentUser || null;
    } catch (_) {
      return null;
    }
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
    const activeUserEmail = String(localStorage.getItem("wtf_auth_user") || "").trim().toLowerCase();
    const userTopic = activeUserEmail ? `user:${activeUserEmail}` : "";
    const id = getSubscriptionDocId(endpoint);
    await db.collection(SUBSCRIPTION_COLLECTION).doc(id).set({
      endpoint,
      subscription: payload,
      active: true,
      module: topic,
      modulo: topic,
      topics: ["general", topic, userTopic].filter(Boolean),
      userTopic,
      userEmail: activeUserEmail,
      userAgent: navigator.userAgent,
      platform: navigator.platform || "",
      standalone: isStandaloneMode(),
      ios: isIosDevice(),
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
    if (!getFirebaseAuthUser()) return { ok: false, reason: "auth-required" };
    if (isIosDevice() && !isStandaloneMode()) {
      return { ok: false, reason: "ios-home-screen-required" };
    }
    const registration = await navigator.serviceWorker.ready.catch(() => serviceWorkerRegistration);
    const permission = await withTimeout(Notification.requestPermission(), 20000, "permission-timeout");
    if (permission && permission.ok === false) return permission;
    if (permission !== "granted") return { ok: false, reason: "permission-denied" };
    const currentSubscription = await withTimeout(registration.pushManager.getSubscription(), 15000, "subscription-timeout");
    if (currentSubscription && currentSubscription.ok === false) return currentSubscription;
    if (currentSubscription) await currentSubscription.unsubscribe().catch(() => false);
    const subscription = await withTimeout(registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    }), 25000, "subscription-timeout");
    if (subscription && subscription.ok === false) return subscription;
    await savePushSubscription(subscription);
    await showLocalNotification("WTF Sistema", "Notificaciones activadas en este dispositivo.").catch(() => null);
    return { ok: true };
  }

  async function showLocalNotification(title, body) {
    if (!serviceWorkerRegistration || !("Notification" in window)) return { ok: false, reason: "push-not-configured" };
    const registration = await navigator.serviceWorker.ready.catch(() => serviceWorkerRegistration);
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "permission-denied" };
    await registration.showNotification(title || "WTF Sistema", {
      body: body || "Prueba de notificacion local.",
      icon: "/pwa-icon.svg",
      badge: "/pwa-icon.svg",
      tag: "wtf-local-test",
      renotify: true,
      data: { url: "/" }
    });
    return { ok: true };
  }

  async function disablePushNotifications() {
    if (!serviceWorkerRegistration || !("PushManager" in window)) return { ok: false, reason: "push-not-configured" };
    if (!getFirebaseAuthUser()) return { ok: false, reason: "auth-required" };
    const registration = await navigator.serviceWorker.ready.catch(() => serviceWorkerRegistration);
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true, reason: "no-subscription" };
    const payload = subscription.toJSON ? subscription.toJSON() : subscription;
    const endpoint = String(payload.endpoint || "");
    await subscription.unsubscribe().catch(() => false);
    const db = await getDb();
    if (db && endpoint) {
      await db.collection(SUBSCRIPTION_COLLECTION).doc(getSubscriptionDocId(endpoint)).set({
        endpoint,
        subscription: payload,
        active: false,
        disabledAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    return { ok: true };
  }

  async function refreshExistingPushSubscription() {
    if (!serviceWorkerRegistration || !("Notification" in window) || Notification.permission !== "granted") return;
    if (!getFirebaseAuthUser()) return;
    const registration = await navigator.serviceWorker.ready.catch(() => serviceWorkerRegistration);
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await savePushSubscription(subscription);
  }

  function showPushButtonIfAvailable() {
    const cfg = getFirebaseConfig();
    const hasVapid = Boolean(cfg.push && String(cfg.push.vapidPublicKey || "").trim());
    if (!hasVapid || !("Notification" in window) || Notification.permission !== "default" || document.getElementById("wtf-push-enable")) return;
    if (!getFirebaseAuthUser()) return;
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
      const result = await withTimeout(enablePushNotifications(), 35000, "activation-timeout").catch(() => ({ ok: false }));
      if (result.ok) button.remove();
      else {
        button.disabled = false;
        button.textContent = result.reason === "ios-home-screen-required" ? "Abrir desde inicio" : result.reason === "permission-denied" ? "Permiso bloqueado" : "Reintentar notificaciones";
        window.setTimeout(() => {
          if (button && button.parentNode && Notification.permission !== "default") button.remove();
        }, 4500);
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
    try {
      if (window.firebase && window.firebase.auth) {
        const app = window.firebase.apps && window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(getFirebaseConfig().firebaseConfig);
        app.auth().onAuthStateChanged(function (user) {
          if (user) showPushButtonIfAvailable();
        });
      }
    } catch (_) {}
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
    clearLegacyAppShellCaches().catch(() => null);
    registerServiceWorker().catch((err) => console.warn("PWA service worker error", err));
    setupResumeSync();
    window.WTF_PWA = Object.assign({}, window.WTF_PWA || {}, {
      enablePushNotifications,
      disablePushNotifications,
      showLocalNotification,
      refreshPushSubscription: refreshExistingPushSubscription,
      syncNow: (reason) => dispatchSyncEvent(RESUME_SYNC_EVENT, reason || "manual")
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
