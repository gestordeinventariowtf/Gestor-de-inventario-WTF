(function () {
  const VERSION_URL = "/version.json";
  const CHECK_INTERVAL_MS = 60000;
  const STORAGE_KEY = "wtf_app_loaded_version";
  const ACK_KEY = "wtf_app_acknowledged_version";
  const RELOAD_FLAG = "wtf_app_update_reload_started";
  let currentVersion = "";
  let bannerShown = false;
  let pendingVersion = "";

  function readBuildId(payload) {
    if (!payload || typeof payload !== "object") return "";
    return String(payload.buildId || payload.version || payload.updatedAt || "").trim();
  }

  function fetchVersion() {
    return fetch(VERSION_URL + "?t=" + Date.now(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    }).then(function (response) {
      if (!response.ok) throw new Error("No se pudo leer la version publicada");
      return response.json();
    }).then(readBuildId);
  }

  function getStoredVersion() {
    return getLocalValue(STORAGE_KEY);
  }

  function getAcknowledgedVersion() {
    return getLocalValue(ACK_KEY);
  }

  function getLocalValue(key) {
    try {
      return String(window.localStorage.getItem(key) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function setStoredVersion(version) {
    if (!version) return;
    currentVersion = version;
    try {
      window.localStorage.setItem(STORAGE_KEY, version);
    } catch (_) {}
  }

  function acknowledgeVersion(version) {
    if (!version) return;
    setStoredVersion(version);
    try {
      window.localStorage.setItem(ACK_KEY, version);
    } catch (_) {}
  }

  function isAcceptedVersion(version) {
    const cleanVersion = String(version || "").trim();
    return Boolean(cleanVersion && (cleanVersion === currentVersion || cleanVersion === getStoredVersion() || cleanVersion === getAcknowledgedVersion()));
  }

  function removeUpdateBanner() {
    bannerShown = false;
    const banner = document.getElementById("wtf-update-banner");
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
  }

  function reloadWithVersion(version) {
    const targetVersion = version || String(Date.now());
    const url = new URL(window.location.href);
    url.searchParams.set("wtf_v", targetVersion);
    window.location.replace(url.toString());
  }

  function refreshToLatestVersion(button) {
    const targetVersion = pendingVersion || currentVersion || String(Date.now());
    acknowledgeVersion(targetVersion);
    try {
      window.sessionStorage.setItem(RELOAD_FLAG, targetVersion);
    } catch (_) {}
    if (button) {
      button.disabled = true;
      button.textContent = "Actualizando...";
    }
    const clearCaches = "caches" in window ? caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("wtf-static-") === 0;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).catch(function () {}) : Promise.resolve();
    clearCaches.then(function () {
      if (!navigator.serviceWorker) {
        reloadWithVersion(targetVersion);
        return;
      }
      let reloaded = false;
      function reloadOnce() {
        if (reloaded) return;
        reloaded = true;
        removeUpdateBanner();
        window.setTimeout(function () {
          reloadWithVersion(targetVersion);
        }, 150);
      }
      navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, { once: true });
      navigator.serviceWorker.getRegistration().then(function (registration) {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          window.setTimeout(reloadOnce, 900);
          return;
        }
        window.setTimeout(reloadOnce, 250);
      }).catch(function () {
        reloadOnce();
      });
    });
  }

  function showUpdateBanner(latestVersion) {
    const cleanLatest = String(latestVersion || "").trim();
    if (isAcceptedVersion(cleanLatest)) {
      removeUpdateBanner();
      return;
    }
    if (bannerShown || document.getElementById("wtf-update-banner")) return;
    bannerShown = true;
    pendingVersion = cleanLatest || "";

    const banner = document.createElement("div");
    banner.id = "wtf-update-banner";
    banner.setAttribute("role", "status");
    banner.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:18px",
      "transform:translateX(-50%)",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "gap:12px",
      "max-width:min(560px,calc(100vw - 24px))",
      "background:#111827",
      "color:#fff",
      "border:1px solid rgba(255,255,255,.14)",
      "border-radius:12px",
      "box-shadow:0 18px 45px rgba(15,23,42,.35)",
      "padding:12px 14px",
      "font-family:Segoe UI,Arial,sans-serif",
      "font-size:14px",
      "line-height:1.35"
    ].join(";");

    const text = document.createElement("div");
    text.style.cssText = "font-weight:700;min-width:0;flex:1";
    text.textContent = "Hay una nueva version del sistema. Actualiza la pagina para cargar los cambios.";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Actualizar";
    button.style.cssText = [
      "border:0",
      "border-radius:9px",
      "background:#0a9f28",
      "color:#fff",
      "font-weight:800",
      "padding:9px 12px",
      "cursor:pointer",
      "white-space:nowrap"
    ].join(";");
    button.addEventListener("click", function () {
      refreshToLatestVersion(button);
    });

    banner.appendChild(text);
    banner.appendChild(button);
    document.body.appendChild(banner);
  }

  function checkForUpdates() {
    fetchVersion().then(function (latestVersion) {
      if (!latestVersion) return;
      if (latestVersion === getAcknowledgedVersion()) {
        setStoredVersion(latestVersion);
        removeUpdateBanner();
        return;
      }
      if (!currentVersion) {
        setStoredVersion(latestVersion);
        return;
      }
      if (latestVersion !== currentVersion) {
        showUpdateBanner(latestVersion);
      }
    }).catch(function () {});
  }

  function start() {
    currentVersion = getStoredVersion();
    try { window.sessionStorage.removeItem(RELOAD_FLAG); } catch (_) {}
    checkForUpdates();
    window.setInterval(checkForUpdates, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkForUpdates();
    });
    window.addEventListener("wtf:pwa-update-ready", function () {
      fetchVersion().then(function (latestVersion) {
        if (latestVersion && !isAcceptedVersion(latestVersion)) showUpdateBanner(latestVersion);
      }).catch(function () {});
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
