import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const defaultStorePath = fileURLToPath(new URL("../../data/local-hub.json", import.meta.url));
const PAIRING_CODE = String(process.env.WTF_POS_PAIRING_CODE || "WTF2026").trim();
const HEARTBEAT_WARN_MS = 30000;
const HEARTBEAT_OFFLINE_MS = 60000;

export async function createLocalHubServer({ storePath = defaultStorePath } = {}) {
  const store = new HubStore(storePath);
  const server = http.createServer(async (request, response) => {
    try {
      await route(request, response, store);
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error.message });
    }
  });
  return { server, store };
}

async function route(request, response, store) {
  applyCors(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/") {
    sendHtml(response, 200, await renderPairingPage(request, store));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "wtf-pos-local-hub",
      time: new Date().toISOString(),
      pairing: buildPairingPayload(request)
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/pairing") {
    sendJson(response, 200, { ok: true, data: buildPairingPayload(request) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pairing/resolve") {
    const body = await readJson(request);
    if (String(body.code || "").trim().toUpperCase() !== PAIRING_CODE.toUpperCase()) {
      sendJson(response, 403, { ok: false, error: "Codigo de emparejamiento invalido." });
      return;
    }
    sendJson(response, 200, { ok: true, data: buildPairingPayload(request) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/state") {
    sendJson(response, 200, { ok: true, data: await store.read() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/devices") {
    const data = await store.read();
    sendJson(response, 200, { ok: true, data: monitorDevices(data.devices) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/devices/monitor") {
    const data = await store.read();
    const devices = monitorDevices(data.devices);
    sendJson(response, 200, {
      ok: true,
      data: {
        devices,
        summary: summarizeDevices(devices),
        checkedAt: new Date().toISOString()
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/pilot/device-reports") {
    const data = await store.read();
    sendJson(response, 200, { ok: true, data: data.devicePilotReports });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pilot/device-reports") {
    const body = await readJson(request);
    const report = await store.upsertDevicePilotReport(normalizeDevicePilotReport(body));
    sendJson(response, 200, { ok: true, data: report });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/devices/register") {
    const body = await readJson(request);
    const device = await store.upsertDevice(normalizeDevice(body));
    sendJson(response, 200, { ok: true, data: device });
    return;
  }

  const heartbeatMatch = url.pathname.match(/^\/api\/devices\/([^/]+)\/heartbeat$/);
  if (request.method === "POST" && heartbeatMatch) {
    const body = await readJson(request);
    const device = await store.heartbeatDevice(decodeURIComponent(heartbeatMatch[1]), body);
    sendJson(response, 200, { ok: true, data: device });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/kds/commands") {
    const data = await store.read();
    sendJson(response, 200, { ok: true, data: data.commands.filter((command) => command.status !== "delivered") });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/kds/commands") {
    const body = await readJson(request);
    const command = normalizeCommand(body);
    const data = await store.upsertCommand(command);
    sendJson(response, 200, { ok: true, data });
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/kds\/commands\/([^/]+)\/status$/);
  if (request.method === "POST" && statusMatch) {
    const body = await readJson(request);
    const command = await store.updateCommandStatus(decodeURIComponent(statusMatch[1]), body.status);
    sendJson(response, 200, { ok: true, data: command });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/cds/snapshot") {
    const data = await store.read();
    sendJson(response, 200, { ok: true, data: data.cdsSnapshot });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cds/snapshot") {
    const body = await readJson(request);
    const snapshot = await store.updateCdsSnapshot(normalizeSnapshot(body));
    sendJson(response, 200, { ok: true, data: snapshot });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cds/clear") {
    const snapshot = await store.updateCdsSnapshot(null);
    sendJson(response, 200, { ok: true, data: snapshot });
    return;
  }

  sendJson(response, 404, { ok: false, error: "Ruta no encontrada." });
}

class HubStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read() {
    try {
      return normalizeState(JSON.parse(await fs.readFile(this.filePath, "utf8")));
    } catch (error) {
      if (error.code === "ENOENT") return normalizeState({});
      throw error;
    }
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(normalizeState(data), null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  async upsertCommand(command) {
    const data = await this.read();
    const index = data.commands.findIndex((row) => row.commandId === command.commandId);
    if (index >= 0) {
      if (String(command.updatedAt).localeCompare(String(data.commands[index].updatedAt || "")) >= 0) {
        data.commands[index] = Object.assign({}, data.commands[index], command);
      }
    } else {
      data.commands.push(command);
    }
    data.audit.push(auditEvent("command_upserted", { commandId: command.commandId }));
    await this.write(data);
    return data.commands.find((row) => row.commandId === command.commandId);
  }

  async updateCommandStatus(commandId, status) {
    if (!["received", "preparing", "ready", "delivered"].includes(status)) {
      throw new Error("Estado KDS invalido.");
    }
    const data = await this.read();
    const command = data.commands.find((row) => row.commandId === commandId);
    if (!command) throw new Error("Comanda no encontrada.");
    command.status = status;
    command.ackStatus = "acked";
    command.updatedAt = new Date().toISOString();
    data.audit.push(auditEvent("command_status_updated", { commandId, status }));
    await this.write(data);
    return command;
  }

  async updateCdsSnapshot(snapshot) {
    const data = await this.read();
    data.cdsSnapshot = snapshot;
    data.audit.push(auditEvent(snapshot ? "cds_snapshot_updated" : "cds_snapshot_cleared", {
      ticketId: snapshot?.ticketId || ""
    }));
    await this.write(data);
    return data.cdsSnapshot;
  }

  async upsertDevice(device) {
    const data = await this.read();
    const index = data.devices.findIndex((row) => row.deviceId === device.deviceId);
    const registered = Object.assign({}, index >= 0 ? data.devices[index] : {}, device, {
      status: "online",
      lastSeenAt: new Date().toISOString()
    });
    if (index >= 0) data.devices[index] = registered;
    else data.devices.push(registered);
    data.audit.push(auditEvent("device_registered", {
      deviceId: registered.deviceId,
      role: registered.role
    }));
    await this.write(data);
    return registered;
  }

  async heartbeatDevice(deviceId, patch = {}) {
    const data = await this.read();
    const index = data.devices.findIndex((row) => row.deviceId === deviceId);
    const current = index >= 0 ? data.devices[index] : normalizeDevice({ deviceId });
    const device = Object.assign({}, current, {
      role: patch.role || current.role,
      name: patch.name || current.name,
      station: patch.station || current.station,
      status: "online",
      lastSeenAt: new Date().toISOString()
    });
    if (index >= 0) data.devices[index] = device;
    else data.devices.push(device);
    await this.write(data);
    return device;
  }

  async upsertDevicePilotReport(report) {
    const data = await this.read();
    const index = data.devicePilotReports.findIndex((row) => row.reportId === report.reportId);
    if (index >= 0) data.devicePilotReports[index] = report;
    else data.devicePilotReports.push(report);
    data.audit.push(auditEvent("device_pilot_report_recorded", {
      reportId: report.reportId,
      deviceId: report.deviceId,
      status: report.status
    }));
    await this.write(data);
    return report;
  }
}

function normalizeState(data) {
  return {
    commands: Array.isArray(data.commands) ? data.commands : [],
    cdsSnapshot: data.cdsSnapshot || null,
    devices: Array.isArray(data.devices) ? data.devices : [],
    devicePilotReports: Array.isArray(data.devicePilotReports) ? data.devicePilotReports : [],
    audit: Array.isArray(data.audit) ? data.audit : []
  };
}

function normalizeDevice(body) {
  if (!body || !body.deviceId) throw new Error("Dispositivo sin deviceId.");
  const role = String(body.role || "POS").toUpperCase();
  if (!["POS", "KDS", "CDS"].includes(role)) throw new Error("Rol de dispositivo invalido.");
  return {
    deviceId: String(body.deviceId),
    name: String(body.name || role),
    role,
    station: String(body.station || ""),
    appVersion: String(body.appVersion || "0.1.0"),
    registeredAt: body.registeredAt || new Date().toISOString()
  };
}

function normalizeDevicePilotReport(body) {
  if (!body || !body.deviceId) throw new Error("Reporte sin deviceId.");
  const role = String(body.role || "POS").toUpperCase();
  if (!["POS", "KDS", "CDS"].includes(role)) throw new Error("Rol de reporte invalido.");
  const status = String(body.status || "passed").toLowerCase();
  if (!["passed", "warning", "failed"].includes(status)) throw new Error("Estado de reporte invalido.");
  const createdAt = body.createdAt || new Date().toISOString();
  return {
    reportId: String(body.reportId || `device_report_${body.deviceId}_${createdAt}`),
    deviceId: String(body.deviceId),
    role,
    name: String(body.name || role),
    station: String(body.station || ""),
    status,
    checks: Array.isArray(body.checks) ? body.checks.map((check) => ({
      label: String(check.label || ""),
      status: String(check.status || "passed").toLowerCase(),
      detail: String(check.detail || "")
    })) : [],
    notes: String(body.notes || ""),
    createdAt
  };
}

function normalizeCommand(body) {
  if (!body || !body.commandId) throw new Error("Comanda sin commandId.");
  if (!Array.isArray(body.lines)) throw new Error("Comanda sin productos.");
  return {
    commandId: String(body.commandId),
    ticketId: String(body.ticketId || ""),
    tableLabel: String(body.tableLabel || "Orden"),
    lines: body.lines.map((line) => ({
      name: String(line.name || ""),
      qty: Number(line.qty || 0),
      notes: String(line.notes || "")
    })),
    status: body.status || "received",
    ackStatus: "acked",
    attempts: Number(body.attempts || 1),
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: body.updatedAt || new Date().toISOString()
  };
}

function normalizeSnapshot(body) {
  if (!body || !body.ticketId) throw new Error("Snapshot CDS sin ticketId.");
  return {
    ticketId: String(body.ticketId),
    tableLabel: String(body.tableLabel || "Orden"),
    status: String(body.status || "open"),
    lines: Array.isArray(body.lines) ? body.lines.map((line) => ({
      name: String(line.name || ""),
      qty: Number(line.qty || 0),
      total: Number(line.total || 0)
    })) : [],
    totals: {
      total: Number(body.totals?.total || 0)
    },
    message: String(body.message || ""),
    updatedAt: body.updatedAt || new Date().toISOString()
  };
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function auditEvent(type, payload) {
  return {
    eventId: `hub_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    createdAt: new Date().toISOString()
  };
}

function applyCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function buildPairingPayload(request) {
  const host = String(request.headers.host || `127.0.0.1:${process.env.PORT || 8790}`);
  const hubUrl = `http://${host}`;
  const port = Number(host.split(":").at(-1) || process.env.PORT || 8790);
  const lanUrls = getLanUrls(port);
  const qrText = `wtfpos://pair?hub=${encodeURIComponent(hubUrl)}&code=${encodeURIComponent(PAIRING_CODE)}`;
  return {
    code: PAIRING_CODE,
    hubUrl,
    lanUrls,
    qrText
  };
}

function getLanUrls(port) {
  const urls = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.push(`http://${entry.address}:${port}`);
      }
    }
  }
  return [...new Set(urls)];
}

async function renderPairingPage(request, store) {
  const data = await store.read();
  const pairing = buildPairingPayload(request);
  const qrImage = await QRCode.toDataURL(pairing.qrText, { margin: 1, width: 280 });
  const devices = monitorDevices(data.devices).sort((a, b) => String(b.lastSeenAt || "").localeCompare(String(a.lastSeenAt || "")));
  const summary = summarizeDevices(devices);
  const reports = [...(data.devicePilotReports || [])].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 8);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta http-equiv="refresh" content="15">
    <title>WTF POS Local Hub</title>
    <style>
      :root { color-scheme: light; font-family: Inter, Segoe UI, Arial, sans-serif; background: #eef2f7; color: #111827; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      main { width: min(1040px, 100%); display: grid; grid-template-columns: 320px 1fr; gap: 18px; }
      .card { background: #fff; border: 1px solid #dbe3ef; border-radius: 16px; padding: 18px; box-shadow: 0 18px 45px rgba(15, 23, 42, .08); }
      .qr { display: grid; place-items: center; gap: 14px; text-align: center; }
      .qr img { width: 260px; height: 260px; border: 1px solid #e5e7eb; border-radius: 14px; padding: 10px; background: #fff; }
      .kicker { display: inline-flex; font-size: 11px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: #166534; }
      h1, h2 { margin: 6px 0 8px; }
      .code { font-size: 28px; font-weight: 950; letter-spacing: .08em; color: #15803d; }
      .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #eef2f7; }
      .row:last-child { border-bottom: 0; }
      .status { border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 950; text-transform: uppercase; }
      .online { background: #dcfce7; color: #166534; }
      .warning { background: #fef3c7; color: #92400e; }
      .offline { background: #fee2e2; color: #991b1b; }
      .passed { background: #dcfce7; color: #166534; }
      .failed { background: #fee2e2; color: #991b1b; }
      .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
      .summary div { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; background: #f8fafc; }
      .summary span { display: block; color: #64748b; font-size: 11px; font-weight: 900; }
      .summary strong { font-size: 22px; }
      code { word-break: break-all; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; }
      ul { margin: 8px 0 0; padding-left: 20px; }
      @media (max-width: 760px) { main { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <section class="card qr">
        <div>
          <span class="kicker">WTF POS Local Hub</span>
          <h1>Emparejar equipo</h1>
        </div>
        <img src="${qrImage}" alt="QR de emparejamiento">
        <div>
          <div class="kicker">Codigo corto</div>
          <div class="code">${escapeHtml(pairing.code)}</div>
        </div>
      </section>
      <section class="card">
        <span class="kicker">Conexion local</span>
        <h2>Usa este dato en POS, KDS o CDS</h2>
        <div class="row"><span>URL actual</span><code>${escapeHtml(pairing.hubUrl)}</code></div>
        <div class="row"><span>Dato QR</span><code>${escapeHtml(pairing.qrText)}</code></div>
        <h2>URLs detectadas</h2>
        <ul>${pairing.lanUrls.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join("") || "<li>No se detecto red local.</li>"}</ul>
        <h2>Equipos conectados</h2>
        <div class="summary">
          <div><span>Online</span><strong>${summary.online}</strong></div>
          <div><span>Alerta</span><strong>${summary.warning}</strong></div>
          <div><span>Offline</span><strong>${summary.offline}</strong></div>
        </div>
        ${devices.length ? devices.map((device) => `
          <div class="row">
            <span>${escapeHtml(device.name)} · ${escapeHtml(device.role)} · ${escapeHtml(device.station || "Sin area")} · ${escapeHtml(formatSeconds(device.secondsSinceLastSeen))} sin latido</span>
            <strong class="status ${escapeHtml(device.connectionStatus)}">${escapeHtml(device.connectionStatus)}</strong>
          </div>
        `).join("") : `<div class="row"><span>Aun no hay equipos registrados.</span><strong>0</strong></div>`}
      </section>
      <section class="card" style="grid-column: 1 / -1;">
        <span class="kicker">Piloto por tablet</span>
        <h2>Ultimas validaciones</h2>
        ${reports.length ? reports.map((report) => `
          <div class="row">
            <span>${escapeHtml(report.name)} · ${escapeHtml(report.role)} · ${escapeHtml(report.station || "Sin area")} · ${escapeHtml(report.notes || "Sin notas")}</span>
            <strong class="status ${escapeHtml(report.status)}">${escapeHtml(report.status)}</strong>
          </div>
        `).join("") : `<div class="row"><span>Sin validaciones registradas.</span><strong class="status warning">pendiente</strong></div>`}
      </section>
    </main>
  </body>
</html>`;
}

function monitorDevices(devices) {
  const nowMs = Date.now();
  return (devices || []).map((device) => {
    const lastSeenMs = Date.parse(device.lastSeenAt || device.registeredAt || "");
    const ageMs = Number.isFinite(lastSeenMs) ? Math.max(0, nowMs - lastSeenMs) : Infinity;
    const connectionStatus = ageMs > HEARTBEAT_OFFLINE_MS
      ? "offline"
      : ageMs > HEARTBEAT_WARN_MS ? "warning" : "online";
    return Object.assign({}, device, {
      connectionStatus,
      secondsSinceLastSeen: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null
    });
  });
}

function summarizeDevices(devices) {
  return {
    online: devices.filter((device) => device.connectionStatus === "online").length,
    warning: devices.filter((device) => device.connectionStatus === "warning").length,
    offline: devices.filter((device) => device.connectionStatus === "offline").length
  };
}

function formatSeconds(seconds) {
  if (seconds === null) return "sin registro";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, status, html) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server } = await createLocalHubServer();
  const port = Number(process.env.PORT || 8790);
  server.listen(port, "0.0.0.0", () => {
    console.log(`WTF POS Local Hub: http://0.0.0.0:${port}`);
  });
}
