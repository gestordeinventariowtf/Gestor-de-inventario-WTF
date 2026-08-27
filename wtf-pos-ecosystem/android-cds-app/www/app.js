const STORAGE_KEY = "wtf_cds_android_state_v1";
const HUB_URL_KEY = "wtf_cds_hub_url";
const DEVICE_KEY = "wtf_cds_device_config";
const ITBIS_RATE = 0.18;
const LEY_RATE = 0.1;

installNativeKeyboardGuard();

const demoProducts = [
  { name: "Camarofongo", qty: 1, price: 895 },
  { name: "Limonada", qty: 2, price: 130 },
  { name: "Mozzarella Sticks", qty: 1, price: 375 }
];

const $ = (id) => document.getElementById(id);
let state = loadState();
let hubMonitor = { ok: false, lastOkAt: "", lastErrorAt: "" };
let wakeLock = null;

$("hub-url").value = localStorage.getItem(HUB_URL_KEY) || "";
const deviceConfig = loadDeviceConfig("CDS");
$("device-name").value = deviceConfig.name;
$("device-station").value = deviceConfig.station;
$("hub-url").addEventListener("change", (event) => {
  localStorage.setItem(HUB_URL_KEY, event.target.value.trim());
  render();
});
$("test-hub").addEventListener("click", async () => {
  const ok = await testHub();
  showToast(ok ? "Hub local conectado." : "No se pudo conectar al hub local.");
});
$("apply-pairing").addEventListener("click", async () => {
  const ok = await applyPairingText($("pairing-data").value);
  showToast(ok ? "Equipo emparejado con el hub." : "No pude leer ese dato de emparejamiento.");
  render();
});
$("scan-pairing").addEventListener("click", () => {
  scanPairingQr().catch(() => showToast("No pude abrir la camara para leer el QR."));
});
$("sync-hub").addEventListener("click", async () => {
  const ok = await syncHubSnapshot();
  saveAndRender(ok ? "Pantalla actualizada desde hub." : "No hay snapshot disponible en hub.");
});
$("save-device").addEventListener("click", async () => {
  const config = loadDeviceConfig("CDS");
  config.name = $("device-name").value.trim() || "CDS";
  config.station = $("device-station").value.trim() || "Cliente";
  saveDeviceConfig(config);
  const ok = await registerDevice(config);
  showToast(ok ? "Dispositivo CDS registrado." : "Guardado local; hub no disponible.");
  render();
});
$("kiosk-mode").addEventListener("click", async () => {
  const ok = await enableKioskMode();
  showToast(ok ? "Modo kiosco activado." : "No pude activar el modo kiosco en este equipo.");
});

$("load-demo").addEventListener("click", () => {
  state.ticket = {
    ticketId: id("ticket"),
    tableLabel: "Mesa 1",
    status: "open",
    lines: demoProducts.slice(0, 2),
    updatedAt: now()
  };
  audit("snapshot_loaded", { ticketId: state.ticket.ticketId });
  saveAndRender("Orden de prueba cargada.");
});

$("add-line").addEventListener("click", () => {
  if (!state.ticket) {
    showToast("Carga una orden primero.");
    return;
  }
  state.ticket.lines.push(demoProducts[state.ticket.lines.length % demoProducts.length]);
  state.ticket.updatedAt = now();
  audit("snapshot_updated", { ticketId: state.ticket.ticketId });
  saveAndRender("Producto agregado al CDS.");
});

$("close-sale").addEventListener("click", () => {
  if (!state.ticket) {
    showToast("No hay orden abierta.");
    return;
  }
  state.ticket.status = "paid";
  state.ticket.updatedAt = now();
  audit("ticket_paid", { ticketId: state.ticket.ticketId });
  saveAndRender("Venta cerrada en pantalla del cliente.");
});

$("clear-screen").addEventListener("click", () => {
  state.ticket = null;
  audit("screen_cleared", {});
  saveAndRender("Pantalla limpia.");
});

render();
setInterval(async () => {
  await heartbeatDevice();
  render();
}, 10000);
setInterval(async () => {
  if (!hubUrl()) return;
  const ok = await syncHubSnapshot();
  if (ok) saveAndRender();
}, 3000);

function render() {
  if (!state.ticket) {
    $("ticket-label").textContent = "Sin orden";
    $("customer-lines").innerHTML = `<div class="cds-empty">Esperando orden...</div>`;
    $("customer-total").textContent = money(0);
    $("customer-message").textContent = "Cuando el POS envie una cuenta, el cliente vera sus productos aqui.";
  } else {
    const totals = calculateTotals(state.ticket.lines);
    $("ticket-label").textContent = state.ticket.tableLabel || "Orden";
    $("customer-lines").innerHTML = state.ticket.lines.map((line) => `
      <div class="cds-line">
        <span>${escapeHtml(line.name)} x ${line.qty}</span>
        <strong>${money(line.qty * line.price)}</strong>
      </div>
    `).join("");
    $("customer-total").textContent = money(totals.total);
    $("customer-message").textContent = state.ticket.status === "paid"
      ? "Gracias por su compra."
      : "Revise su orden antes del pago.";
  }
  $("audit-view").innerHTML = state.audit.slice(-5).map((row) => `
    <div class="mini-row"><span>${escapeHtml(row.type)} · ${formatTime(row.createdAt)}</span></div>
  `).join("") || `<div class="mini-row"><span>Sin eventos aun</span></div>`;
  const config = loadDeviceConfig("CDS");
  $("device-view").innerHTML = `
    <div class="mini-row"><span>Nombre</span><strong>${escapeHtml(config.name)}</strong></div>
    <div class="mini-row"><span>Rol</span><strong>${escapeHtml(config.role)}</strong></div>
    <div class="mini-row"><span>ID</span><strong>${escapeHtml(config.deviceId.slice(-8))}</strong></div>
    <div class="mini-row"><span>Hub</span><strong>${hubMonitor.ok ? "Online" : "Sin conexion"}</strong></div>
    <div class="mini-row"><span>Ultimo latido</span><strong>${escapeHtml(formatConnectionTime(hubMonitor.lastOkAt))}</strong></div>
  `;
}

function installNativeKeyboardGuard() {
  document.documentElement.style.background = "#15120d";
  document.body?.classList?.remove("keyboard-open");
  const keyboard = window.Capacitor?.Plugins?.Keyboard;
  if (!keyboard?.addListener) return;
  keyboard.addListener("keyboardWillShow", (info) => {
    const height = Number(info?.keyboardHeight || 0);
    document.documentElement.classList.add("keyboard-open");
    document.body.classList.add("keyboard-open");
    document.documentElement.style.setProperty("--keyboard-height", `${height}px`);
  });
  keyboard.addListener("keyboardWillHide", () => {
    document.documentElement.classList.remove("keyboard-open");
    document.body.classList.remove("keyboard-open");
    document.documentElement.style.setProperty("--keyboard-height", "0px");
  });
}

function calculateTotals(lines) {
  const subtotal = round4(lines.reduce((sum, line) => sum + line.qty * line.price, 0));
  const itbis = round4(subtotal * ITBIS_RATE);
  const ley = round4(subtotal * LEY_RATE);
  return { subtotal, itbis, ley, total: round4(subtotal + itbis + ley) };
}

function createInitialState() {
  return { ticket: null, audit: [] };
}

function audit(type, payload) {
  state.audit.push({ eventId: id("audit"), type, payload, createdAt: now() });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.audit)) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createInitialState();
}

function saveAndRender(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  if (message) showToast(message);
}

async function syncHubSnapshot() {
  const baseUrl = hubUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}/api/cds/snapshot`, { cache: "no-store" });
    hubMonitor = response.ok
      ? { ok: true, lastOkAt: now(), lastErrorAt: hubMonitor.lastErrorAt }
      : { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    if (!response.ok) return false;
    const payload = await response.json();
    const snapshot = payload.data || null;
    if (!snapshot) {
      state.ticket = null;
      return true;
    }
    if (!state.ticket || String(snapshot.updatedAt || "").localeCompare(String(state.ticket.updatedAt || "")) >= 0) {
      state.ticket = {
        ticketId: snapshot.ticketId,
        tableLabel: snapshot.tableLabel,
        status: snapshot.status,
        lines: (snapshot.lines || []).map((line) => ({
          name: line.name,
          qty: line.qty,
          price: Number(line.total || 0) / Number(line.qty || 1)
        })),
        updatedAt: snapshot.updatedAt
      };
      audit("snapshot_synced", { ticketId: snapshot.ticketId });
      return true;
    }
    return false;
  } catch {
    hubMonitor = { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return false;
  }
}

async function testHub() {
  const baseUrl = hubUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
    hubMonitor = response.ok
      ? { ok: true, lastOkAt: now(), lastErrorAt: hubMonitor.lastErrorAt }
      : { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return response.ok;
  } catch {
    hubMonitor = { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return false;
  }
}

async function applyPairingText(rawValue) {
  const parsed = parsePairingText(rawValue);
  if (!parsed.hubUrl) return false;
  localStorage.setItem(HUB_URL_KEY, parsed.hubUrl.replace(/\/+$/, ""));
  $("hub-url").value = parsed.hubUrl.replace(/\/+$/, "");
  const ok = await testHub();
  if (ok) await registerDevice();
  return ok;
}

function parsePairingText(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) return { hubUrl: "" };
  if (/^https?:\/\//i.test(text)) return { hubUrl: text };
  try {
    const parsed = JSON.parse(text);
    if (parsed?.hubUrl) return { hubUrl: String(parsed.hubUrl) };
  } catch {}
  try {
    const url = new URL(text);
    const hubUrl = url.searchParams.get("hub") || url.searchParams.get("hubUrl");
    if (hubUrl) return { hubUrl };
  } catch {}
  return { hubUrl: "" };
}

async function scanPairingQr() {
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    showToast("Este Android no permite leer QR aqui. Pega el dato del QR manualmente.");
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  const overlay = document.createElement("div");
  overlay.className = "qr-scan-overlay";
  overlay.innerHTML = `
    <div class="qr-scan-card">
      <video autoplay playsinline></video>
      <button class="btn secondary close-btn" type="button">Cerrar lector</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const video = overlay.querySelector("video");
  const close = overlay.querySelector("button");
  video.srcObject = stream;
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  let active = true;
  const stop = () => {
    active = false;
    stream.getTracks().forEach((track) => track.stop());
    overlay.remove();
  };
  close.addEventListener("click", stop);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const tick = async () => {
    if (!active) return;
    if (video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const results = await detector.detect(canvas);
      const value = results[0]?.rawValue;
      if (value) {
        $("pairing-data").value = value;
        stop();
        const ok = await applyPairingText(value);
        showToast(ok ? "QR conectado al hub." : "QR leido, pero no pude conectar al hub.");
        render();
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function hubUrl() {
  return String(localStorage.getItem(HUB_URL_KEY) || "").replace(/\/+$/, "");
}

async function registerDevice(config = loadDeviceConfig("CDS")) {
  return postHub("/api/devices/register", config);
}

async function heartbeatDevice() {
  const config = loadDeviceConfig("CDS");
  await postHub(`/api/devices/${encodeURIComponent(config.deviceId)}/heartbeat`, config);
}

async function postHub(path, body) {
  const baseUrl = hubUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    hubMonitor = response.ok
      ? { ok: true, lastOkAt: now(), lastErrorAt: hubMonitor.lastErrorAt }
      : { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return response.ok;
  } catch {
    hubMonitor = { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return false;
  }
}

async function enableKioskMode() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }
    return Boolean(document.fullscreenElement || wakeLock);
  } catch {
    return false;
  }
}

function loadDeviceConfig(role) {
  try {
    const saved = JSON.parse(localStorage.getItem(DEVICE_KEY) || "null");
    if (saved?.deviceId) return Object.assign({ role }, saved, { role });
  } catch {
    localStorage.removeItem(DEVICE_KEY);
  }
  const config = {
    deviceId: id(`device_${role.toLowerCase()}`),
    name: role,
    role,
    station: "Cliente",
    appVersion: "0.1.0",
    registeredAt: now()
  };
  saveDeviceConfig(config);
  return config;
}

function saveDeviceConfig(config) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(config));
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  setTimeout(() => {
    $("toast").hidden = true;
  }, 3000);
}

function money(value) {
  return Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function round4(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
}

function formatConnectionTime(value) {
  if (!value) return "Sin registro";
  return new Date(value).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
