(function () {
  const VERSION_URL = "/version.json";
  const CHECK_INTERVAL_MS = 60000;
  const STORAGE_KEY = "wtf_app_loaded_version";
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

  function showUpdateBanner(latestVersion) {
    if (bannerShown || document.getElementById("wtf-update-banner")) return;
    bannerShown = true;
    pendingVersion = latestVersion || "";

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
      try {
        if (pendingVersion) window.localStorage.setItem(STORAGE_KEY, pendingVersion);
      } catch (_) {}
      window.location.reload();
    });

    banner.appendChild(text);
    banner.appendChild(button);
    document.body.appendChild(banner);
  }

  function checkForUpdates() {
    fetchVersion().then(function (latestVersion) {
      if (!latestVersion) return;
      if (!currentVersion) {
        currentVersion = latestVersion;
        try { window.localStorage.setItem(STORAGE_KEY, latestVersion); } catch (_) {}
        return;
      }
      if (latestVersion !== currentVersion) {
        showUpdateBanner(latestVersion);
      }
    }).catch(function () {});
  }

  function start() {
    checkForUpdates();
    window.setInterval(checkForUpdates, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkForUpdates();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
