const STORAGE_KEY = "wtf_kds_android_state_v1";
const HUB_URL_KEY = "wtf_kds_hub_url";
const DEVICE_KEY = "wtf_kds_device_config";

installNativeKeyboardGuard();

const demoOrders = [
  {
    tableLabel: "Mesa 1",
    lines: [
      { name: "Camarofongo", qty: 1, notes: "Sin picante" },
      { name: "Limonada", qty: 2, notes: "" }
    ]
  },
  {
    tableLabel: "Mesa 4",
    lines: [
      { name: "WTF Burger", qty: 2, notes: "Termino medio" },
      { name: "Mozzarella Sticks", qty: 1, notes: "" }
    ]
  },
  {
    tableLabel: "Para llevar",
    lines: [
      { name: "Chicharron Hervido", qty: 1, notes: "Extra limon" }
    ]
  }
];

const $ = (id) => document.getElementById(id);
let state = loadState();
let hubMonitor = { ok: false, lastOkAt: "", lastErrorAt: "" };
let wakeLock = null;

$("hub-url").value = localStorage.getItem(HUB_URL_KEY) || "";
const deviceConfig = loadDeviceConfig("KDS");
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
  const count = await syncHubCommands();
  saveAndRender(`${count} comandas sincronizadas desde hub.`);
});
$("save-device").addEventListener("click", async () => {
  const config = loadDeviceConfig("KDS");
  config.name = $("device-name").value.trim() || "KDS";
  config.station = $("device-station").value.trim() || "Cocina";
  saveDeviceConfig(config);
  const ok = await registerDevice(config);
  showToast(ok ? "Dispositivo KDS registrado." : "Guardado local; hub no disponible.");
  render();
});
$("kiosk-mode").addEventListener("click", async () => {
  const ok = await enableKioskMode();
  showToast(ok ? "Modo kiosco activado." : "No pude activar el modo kiosco en este equipo.");
});

$("add-demo").addEventListener("click", () => {
  const order = demoOrders[state.demoIndex % demoOrders.length];
  state.demoIndex += 1;
  const command = {
    commandId: id("kds"),
    tableLabel: order.tableLabel,
    lines: order.lines,
    status: "received",
    ackStatus: "acked",
    attempts: 1,
    createdAt: now(),
    updatedAt: now()
  };
  state.commands.push(command);
  audit("command_received", { commandId: command.commandId });
  saveAndRender("Comanda recibida con ACK.");
});

$("retry-pending").addEventListener("click", () => {
  let count = 0;
  for (const command of state.commands) {
    if (command.ackStatus === "retry") {
      command.ackStatus = "acked";
      command.attempts += 1;
      command.updatedAt = now();
      count += 1;
      audit("command_retry_acked", { commandId: command.commandId });
    }
  }
  saveAndRender(count ? `${count} comandas reintentadas.` : "No hay comandas pendientes.");
});

$("reset-demo").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  saveAndRender("KDS reiniciado.");
});

render();
setInterval(async () => {
  await heartbeatDevice();
  render();
}, 10000);
setInterval(async () => {
  if (!hubUrl()) return;
  const count = await syncHubCommands();
  if (count) saveAndRender();
}, 5000);

function render() {
  $("sync-state").textContent = hubMonitor.ok ? "Hub online" : hubUrl() ? "Hub sin conexion" : "ACK local";
  renderColumn("received", "received");
  renderColumn("preparing", "preparing");
  renderColumn("ready", "ready");
  const open = state.commands.filter((row) => row.status !== "delivered");
  $("summary").innerHTML = `
    <div class="mini-row"><span>Abiertas</span><strong>${open.length}</strong></div>
    <div class="mini-row"><span>Entregadas</span><strong>${state.commands.filter((row) => row.status === "delivered").length}</strong></div>
    <div class="mini-row"><span>Modo</span><strong>Operacion local</strong></div>
  `;
  const config = loadDeviceConfig("KDS");
  $("station-label").textContent = config.station || "Estacion principal";
  $("device-view").innerHTML = `
    <div class="mini-row"><span>Nombre</span><strong>${escapeHtml(config.name)}</strong></div>
    <div class="mini-row"><span>Rol</span><strong>${escapeHtml(config.role)}</strong></div>
    <div class="mini-row"><span>ID</span><strong>${escapeHtml(config.deviceId.slice(-8))}</strong></div>
  `;
  $("retry-view").innerHTML = `
    <div class="mini-row"><span>Hub</span><strong>${hubMonitor.ok ? "Online" : "Sin conexion"}</strong></div>
    <div class="mini-row"><span>Ultimo latido</span><strong>${escapeHtml(formatConnectionTime(hubMonitor.lastOkAt))}</strong></div>
    <div class="mini-row"><span>ACK</span><strong>${state.commands.filter((row) => row.ackStatus === "acked").length}</strong></div>
    <div class="mini-row"><span>Retry</span><strong>${state.commands.filter((row) => row.ackStatus === "retry").length}</strong></div>
  `;
  $("audit-view").innerHTML = renderRows(state.audit.slice(-8), (row) => `${row.type} · ${formatTime(row.createdAt)}`);
}

function installNativeKeyboardGuard() {
  document.documentElement.style.background = "#f7f5ee";
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

function renderColumn(elementId, status) {
  const rows = state.commands.filter((command) => command.status === status);
  $(elementId).innerHTML = rows.length
    ? rows.map(renderCommand).join("")
    : `<div class="mini-row"><span>Sin comandas</span></div>`;
  document.querySelectorAll("[data-kds-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = state.commands.find((row) => row.commandId === button.dataset.commandId);
      if (!command) return;
      command.status = button.dataset.kdsAction;
      command.updatedAt = now();
      audit(`command_${command.status}`, { commandId: command.commandId });
      postHub(`/api/kds/commands/${encodeURIComponent(command.commandId)}/status`, { status: command.status });
      saveAndRender("Estado de comanda actualizado.");
    });
  });
}

function renderCommand(command) {
  const next = nextAction(command.status);
  const lines = command.lines.map((line) => `
    <div class="mini-row">
      <span>${escapeHtml(line.name)} x ${line.qty}${line.notes ? ` · ${escapeHtml(line.notes)}` : ""}</span>
    </div>
  `).join("");
  return `
    <article class="kds-command-card">
      <div class="panel-head">
        <div>
          <strong>${escapeHtml(command.tableLabel)}</strong>
          <div class="operator-label">${formatTime(command.createdAt)} · ${escapeHtml(command.ackStatus.toUpperCase())}</div>
        </div>
      </div>
      ${lines}
      ${next ? `<button class="btn primary close-btn" data-command-id="${escapeHtml(command.commandId)}" data-kds-action="${escapeHtml(next.status)}">${escapeHtml(next.label)}</button>` : ""}
    </article>
  `;
}

function nextAction(status) {
  if (status === "received") return { status: "preparing", label: "Preparar" };
  if (status === "preparing") return { status: "ready", label: "Marcar lista" };
  if (status === "ready") return { status: "delivered", label: "Entregar" };
  return null;
}

function renderRows(rows, mapper) {
  return rows.length
    ? rows.map((row) => `<div class="mini-row"><span>${escapeHtml(mapper(row))}</span></div>`).join("")
    : `<div class="mini-row"><span>Sin datos aun</span></div>`;
}

function createInitialState() {
  return {
    demoIndex: 0,
    commands: [],
    audit: []
  };
}

function audit(type, payload) {
  state.audit.push({
    eventId: id("audit"),
    type,
    payload,
    createdAt: now()
  });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.commands) return saved;
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

async function syncHubCommands() {
  const baseUrl = hubUrl();
  if (!baseUrl) return 0;
  try {
    const response = await fetch(`${baseUrl}/api/kds/commands`, { cache: "no-store" });
    hubMonitor = response.ok
      ? { ok: true, lastOkAt: now(), lastErrorAt: hubMonitor.lastErrorAt }
      : { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    if (!response.ok) return 0;
    const payload = await response.json();
    let count = 0;
    for (const command of payload.data || []) {
      const index = state.commands.findIndex((row) => row.commandId === command.commandId);
      if (index >= 0) {
        if (String(command.updatedAt || "").localeCompare(String(state.commands[index].updatedAt || "")) >= 0) {
          state.commands[index] = command;
          count += 1;
        }
      } else {
        state.commands.push(command);
        count += 1;
        audit("command_synced", { commandId: command.commandId });
      }
    }
    return count;
  } catch {
    hubMonitor = { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return 0;
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

function hubUrl() {
  return String(localStorage.getItem(HUB_URL_KEY) || "").replace(/\/+$/, "");
}

async function registerDevice(config = loadDeviceConfig("KDS")) {
  return postHub("/api/devices/register", config);
}

async function heartbeatDevice() {
  const config = loadDeviceConfig("KDS");
  await postHub(`/api/devices/${encodeURIComponent(config.deviceId)}/heartbeat`, config);
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
    station: "Cocina",
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
