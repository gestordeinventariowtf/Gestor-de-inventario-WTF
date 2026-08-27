const STORAGE_KEY = "wtf_pos_local_android_state_v1";
const HUB_URL_KEY = "wtf_pos_local_hub_url";
const DEVICE_KEY = "wtf_pos_local_device_config";
const ITBIS_RATE = 0.18;
const LEY_RATE = 0.1;

installNativeKeyboardGuard();

const products = [
  { id: "pos_camarofongo", name: "Camarofongo", sku: "ICG-1001", price: 895 },
  { id: "pos_wtf_burger", name: "WTF Burger", sku: "ICG-1002", price: 550 },
  { id: "pos_limonada", name: "Limonada", sku: "ICG-1003", price: 130 },
  { id: "pos_mozzarella", name: "Mozzarella Sticks", sku: "ICG-1004", price: 375 },
  { id: "pos_chicharron", name: "Chicharron Hervido", sku: "ICG-1005", price: 425 },
  { id: "pos_sazon_verde", name: "Sazon Verde", sku: "ICG-1006", price: 120 }
];

const tables = [
  { tableId: "mesa_1", label: "Mesa 1" },
  { tableId: "mesa_2", label: "Mesa 2" },
  { tableId: "mesa_3", label: "Mesa 3" },
  { tableId: "mesa_4", label: "Mesa 4" },
  { tableId: "mesa_5", label: "Mesa 5" },
  { tableId: "mesa_6", label: "Mesa 6" }
];

const $ = (id) => document.getElementById(id);

let state = loadState();
let hubMonitor = { ok: false, lastOkAt: "", lastErrorAt: "" };
let wakeLock = null;

$("hub-url").value = localStorage.getItem(HUB_URL_KEY) || "";
const deviceConfig = loadDeviceConfig("POS");
$("device-name").value = deviceConfig.name;
$("device-station").value = deviceConfig.station;
renderProducts("");
render();
setInterval(async () => {
  await heartbeatDevice();
  render();
}, 10000);

$("search").addEventListener("input", (event) => renderProducts(event.target.value));
$("hub-url").addEventListener("change", (event) => {
  localStorage.setItem(HUB_URL_KEY, event.target.value.trim());
  render();
});
$("test-hub").addEventListener("click", async () => {
  const ok = await testHub();
  showToast(ok ? "Hub local conectado." : "No se pudo conectar al hub local.");
  render();
});
$("apply-pairing").addEventListener("click", async () => {
  const ok = await applyPairingText($("pairing-data").value);
  showToast(ok ? "Equipo emparejado con el hub." : "No pude leer ese dato de emparejamiento.");
  render();
});
$("scan-pairing").addEventListener("click", () => {
  scanPairingQr().catch(() => showToast("No pude abrir la camara para leer el QR."));
});
$("save-device").addEventListener("click", async () => {
  const config = loadDeviceConfig("POS");
  config.name = $("device-name").value.trim() || "POS";
  config.station = $("device-station").value.trim() || "Caja";
  saveDeviceConfig(config);
  const ok = await registerDevice(config);
  showToast(ok ? "Dispositivo POS registrado." : "Guardado local; hub no disponible.");
  render();
});
$("kiosk-mode").addEventListener("click", async () => {
  const ok = await enableKioskMode();
  showToast(ok ? "Modo kiosco activado." : "No pude activar el modo kiosco en este equipo.");
});
$("dining-option").addEventListener("change", (event) => {
  state.currentTicket.diningOption = event.target.value;
  if (event.target.value !== "dineIn") {
    state.currentTicket.tableId = "";
    state.currentTicket.tableLabel = event.target.value === "takeOut" ? "Para llevar" : "Delivery";
  }
  touchTicket(state.currentTicket);
  audit("dining_option_changed", { diningOption: event.target.value });
  saveAndRender();
});

$("send-kds").addEventListener("click", async () => {
  if (!state.currentTicket.cart.lines.length) {
    showToast("Agrega productos antes de enviar a cocina.");
    return;
  }
  const command = {
    commandId: id("kds"),
    ticketId: state.currentTicket.ticketId,
    tableLabel: state.currentTicket.tableLabel || "Orden",
    lines: state.currentTicket.cart.lines.map((line) => ({ name: line.name, qty: line.qty, notes: line.notes || "" })),
    status: "received",
    ackStatus: "local",
    createdAt: now(),
    updatedAt: now()
  };
  const hubOk = await postHub("/api/kds/commands", command);
  command.ackStatus = hubOk ? "acked" : "retry";
  state.kds.push(command);
  audit("kds_sent", { ticketId: state.currentTicket.ticketId });
  saveAndRender(hubOk ? "Comanda enviada al KDS por hub local." : "Comanda guardada local; hub no disponible.");
});

$("pay").addEventListener("click", async () => {
  const total = calculateCart(state.currentTicket.cart).totals.total;
  const cashReceived = Number($("cash").value || 0);
  if (!state.currentTicket.cart.lines.length) {
    showToast("No hay productos para cobrar.");
    return;
  }
  if (cashReceived < total) {
    showToast("El efectivo recibido es menor que el total.");
    return;
  }
  const sale = {
    saleId: id("sale"),
    ticketId: state.currentTicket.ticketId,
    createdAt: now(),
    status: "paid",
    lines: state.currentTicket.cart.lines,
    totals: calculateCart(state.currentTicket.cart).totals,
    payment: { method: "cash", received: round4(cashReceived), change: round4(cashReceived - total) }
  };
  state.sales.push(sale);
  state.currentTicket.status = "paid";
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("sale_paid", { saleId: sale.saleId, total: sale.totals.total });
  state.currentTicket = createTicket({ tableId: "mesa_1", tableLabel: "Mesa 1" });
  upsertTicket(state.currentTicket);
  await postHub("/api/cds/clear", {});
  saveAndRender(`Venta cerrada. Total: ${money(total)}`);
});

$("close-shift").addEventListener("click", () => {
  const countedCash = Number($("counted-cash").value || 0);
  const paidSales = state.sales.filter((sale) => sale.status === "paid");
  const cashExpected = round4(state.shift.openingCash + paidSales.reduce((sum, sale) => sum + sale.totals.total, 0));
  const report = {
    reportId: id("z"),
    createdAt: now(),
    salesCount: paidSales.length,
    grossTotal: round4(paidSales.reduce((sum, sale) => sum + sale.totals.total, 0)),
    cashExpected,
    countedCash: round4(countedCash),
    difference: round4(countedCash - cashExpected)
  };
  state.shiftCloseReports.push(report);
  audit("shift_closed", report);
  saveAndRender(`Cierre Z creado. Diferencia: ${money(report.difference)}`);
});

$("split-last-line").addEventListener("click", () => {
  const line = state.currentTicket.cart.lines.at(-1);
  if (!line) {
    showToast("Agrega un producto antes de separar la cuenta.");
    return;
  }
  const splitTicket = createTicket({
    diningOption: state.currentTicket.diningOption,
    tableLabel: `${state.currentTicket.tableLabel || "Orden"} - Cuenta separada`
  });
  moveLine(state.currentTicket, splitTicket, line.lineId, 1);
  upsertTicket(state.currentTicket);
  upsertTicket(splitTicket);
  audit("ticket_line_moved", {
    fromTicketId: state.currentTicket.ticketId,
    toTicketId: splitTicket.ticketId,
    lineId: line.lineId
  });
  saveAndRender("Producto movido a una cuenta separada.");
});

$("merge-split-ticket").addEventListener("click", () => {
  const source = state.tickets.filter((ticket) => ticket.status === "open" && ticket.ticketId !== state.currentTicket.ticketId).at(-1);
  if (!source) {
    showToast("No hay cuenta separada disponible para unir.");
    return;
  }
  state.currentTicket.cart.lines.push(...source.cart.lines);
  touchTicket(state.currentTicket);
  source.cart.lines = [];
  source.status = "merged";
  source.mergedIntoTicketId = state.currentTicket.ticketId;
  touchTicket(source);
  upsertTicket(state.currentTicket);
  upsertTicket(source);
  audit("ticket_merged", { sourceTicketId: source.ticketId, targetTicketId: state.currentTicket.ticketId });
  saveAndRender("Cuenta separada unida a la cuenta actual.");
});

$("reset-demo").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  saveAndRender("Datos locales reiniciados.");
});

function renderProducts(query) {
  const needle = normalize(query);
  const visible = products.filter((product) => !needle || normalize(`${product.name} ${product.sku}`).includes(needle));
  $("products").innerHTML = visible.map((product) => `
    <button class="product-card" data-product-id="${escapeHtml(product.id)}">
      <strong>${escapeHtml(product.name)}</strong>
      <span>${escapeHtml(product.sku)} · ${money(product.price)}</span>
    </button>
  `).join("");
  document.querySelectorAll("[data-product-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((row) => row.id === button.dataset.productId);
      addProduct(product);
      saveAndRender(`${product.name} agregado.`);
    });
  });
}

function render() {
  $("sync-state").textContent = hubMonitor.ok ? "Hub online" : hubUrl() ? "Hub sin conexion" : "Local";
  $("operator-label").textContent = `Operador: ${state.operator.name} · ${state.operator.role}`;
  $("ticket-label").textContent = state.currentTicket.tableLabel || "Orden";
  $("dining-option").value = state.currentTicket.diningOption || "dineIn";
  renderTables();
  const cart = calculateCart(state.currentTicket.cart);
  $("cart-lines").innerHTML = cart.lines.length
    ? cart.lines.map((line) => `
      <div class="cart-line">
        <span>${escapeHtml(line.name)} x ${line.qty}</span>
        <strong>${money(line.totals.total)}</strong>
      </div>
    `).join("")
    : `<div class="mini-row"><span>Carrito vacio</span><strong>0.00</strong></div>`;
  $("subtotal").textContent = money(cart.totals.subtotal);
  $("itbis").textContent = money(cart.totals.itbis);
  $("ley").textContent = money(cart.totals.ley);
  $("total").textContent = money(cart.totals.total);
  $("cds-view").innerHTML = renderCds(cart);
  $("kds-view").innerHTML = renderRows(state.kds.slice(-5), (command) => `${command.tableLabel} · ${command.lines.length} productos · ACK`);
  $("backend-view").innerHTML = `
    <div class="mini-row"><span>Ventas locales</span><strong>${state.sales.length}</strong></div>
    <div class="mini-row"><span>Tickets abiertos</span><strong>${openTickets().length}</strong></div>
    <div class="mini-row"><span>Modo</span><strong>Operacion local</strong></div>
  `;
  $("hub-view").innerHTML = `
    <div class="mini-row"><span>Hub configurado</span><strong>${hubUrl() ? "Si" : "No"}</strong></div>
    <div class="mini-row"><span>Conexion</span><strong>${hubMonitor.ok ? "Online" : "Sin conexion"}</strong></div>
    <div class="mini-row"><span>Ultimo latido</span><strong>${escapeHtml(formatConnectionTime(hubMonitor.lastOkAt))}</strong></div>
    <div class="mini-row"><span>KDS enviados</span><strong>${state.kds.length}</strong></div>
    <div class="mini-row"><span>Pendientes retry</span><strong>${state.kds.filter((row) => row.ackStatus === "retry").length}</strong></div>
  `;
  const config = loadDeviceConfig("POS");
  $("device-view").innerHTML = `
    <div class="mini-row"><span>Rol</span><strong>${escapeHtml(config.role)}</strong></div>
    <div class="mini-row"><span>ID</span><strong>${escapeHtml(config.deviceId.slice(-8))}</strong></div>
    <div class="mini-row"><span>Estacion</span><strong>${escapeHtml(config.station || "Sin definir")}</strong></div>
  `;
  const close = state.shiftCloseReports.at(-1);
  $("shift-close-view").innerHTML = close ? `
    <div class="mini-row"><span>Ventas</span><strong>${close.salesCount}</strong></div>
    <div class="mini-row"><span>Total</span><strong>${money(close.grossTotal)}</strong></div>
    <div class="mini-row"><span>Diferencia</span><strong>${money(close.difference)}</strong></div>
  ` : `<div class="mini-row"><span>Turno abierto</span><strong>${escapeHtml(state.shift.status)}</strong></div>`;
  const separate = openTickets().filter((ticket) => ticket.ticketId !== state.currentTicket.ticketId);
  $("ticket-tools-view").innerHTML = `
    <div class="mini-row"><span>Cuenta actual</span><strong>${cart.lines.length} productos</strong></div>
    <div class="mini-row"><span>Cuentas abiertas</span><strong>${openTickets().length}</strong></div>
    <div class="mini-row"><span>Separadas</span><strong>${separate.length}</strong></div>
  `;
  $("audit-view").innerHTML = renderRows(state.audit.slice(-6), (row) => `${row.actor}: ${row.type}`);
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

function renderTables() {
  $("tables").innerHTML = tables.map((table) => {
    const active = table.tableId === state.currentTicket.tableId;
    const occupied = state.tickets.some((ticket) => ticket.status === "open" && ticket.tableId === table.tableId && ticket.ticketId !== state.currentTicket.ticketId);
    const className = ["table-btn", active ? "active" : "", occupied ? "occupied" : ""].filter(Boolean).join(" ");
    return `<button class="${className}" data-table-id="${escapeHtml(table.tableId)}">${escapeHtml(table.label)}</button>`;
  }).join("");
  document.querySelectorAll("[data-table-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const table = tables.find((row) => row.tableId === button.dataset.tableId);
      const occupied = state.tickets.some((ticket) => ticket.status === "open" && ticket.tableId === table.tableId && ticket.ticketId !== state.currentTicket.ticketId);
      if (occupied) {
        showToast("Mesa ocupada por otra cuenta abierta.");
        return;
      }
      state.currentTicket.diningOption = "dineIn";
      state.currentTicket.tableId = table.tableId;
      state.currentTicket.tableLabel = table.label;
      touchTicket(state.currentTicket);
      upsertTicket(state.currentTicket);
      audit("table_transferred", { tableId: table.tableId });
      saveAndRender(`Orden movida a ${table.label}.`);
    });
  });
}

function renderCds(cart) {
  const lines = cart.lines.map((line) => `<div class="mini-row"><span>${escapeHtml(line.name)} x ${line.qty}</span><strong>${money(line.totals.total)}</strong></div>`).join("");
  return `
    ${lines || "<div>Esperando orden...</div>"}
    <div class="mini-row"><span>Total</span><strong>${money(cart.totals.total)}</strong></div>
  `;
}

function renderRows(rows, mapper) {
  return rows.length
    ? rows.map((row) => `<div class="mini-row"><span>${escapeHtml(mapper(row))}</span></div>`).join("")
    : `<div class="mini-row"><span>Sin datos aun</span></div>`;
}

function addProduct(product) {
  const existing = state.currentTicket.cart.lines.find((line) => line.productId === product.id);
  if (existing) {
    existing.qty = round4(existing.qty + 1);
  } else {
    state.currentTicket.cart.lines.push({
      lineId: id("line"),
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: 1,
      unitPrice: product.price,
      notes: ""
    });
  }
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
}

function moveLine(fromTicket, toTicket, lineId, qty) {
  const line = fromTicket.cart.lines.find((row) => row.lineId === lineId);
  if (!line) throw new Error("Linea no encontrada.");
  const moveQty = Math.min(Number(qty || line.qty), line.qty);
  const fullMove = moveQty === line.qty;
  const movedLine = fullMove ? line : Object.assign({}, line, { lineId: id("line"), qty: moveQty });
  fromTicket.cart.lines = fromTicket.cart.lines
    .map((row) => {
      if (row.lineId !== lineId) return row;
      if (fullMove) return null;
      return Object.assign({}, row, { qty: round4(row.qty - moveQty) });
    })
    .filter(Boolean);
  toTicket.cart.lines.push(movedLine);
  touchTicket(fromTicket);
  touchTicket(toTicket);
}

function calculateCart(cart) {
  const lines = cart.lines.map((line) => {
    const subtotal = round4(line.qty * line.unitPrice);
    const itbis = round4(subtotal * ITBIS_RATE);
    const ley = cart.diningOption === "dineIn" ? round4(subtotal * LEY_RATE) : 0;
    return Object.assign({}, line, {
      totals: { subtotal, itbis, ley, total: round4(subtotal + itbis + ley) }
    });
  });
  return {
    lines,
    totals: {
      subtotal: round4(lines.reduce((sum, line) => sum + line.totals.subtotal, 0)),
      itbis: round4(lines.reduce((sum, line) => sum + line.totals.itbis, 0)),
      ley: round4(lines.reduce((sum, line) => sum + line.totals.ley, 0)),
      total: round4(lines.reduce((sum, line) => sum + line.totals.total, 0))
    }
  };
}

function createInitialState() {
  const currentTicket = createTicket({ tableId: "mesa_1", tableLabel: "Mesa 1" });
  return {
    operator: { userId: "pos_admin", name: "Administrador", role: "Admin" },
    shift: { shiftId: id("shift"), openingCash: 5000, status: "open", openedAt: now() },
    currentTicket,
    tickets: [currentTicket],
    sales: [],
    kds: [],
    shiftCloseReports: [],
    audit: []
  };
}

function createTicket({ diningOption = "dineIn", tableId = "", tableLabel = "" } = {}) {
  return {
    ticketId: id("ticket"),
    createdAt: now(),
    updatedAt: now(),
    status: "open",
    diningOption,
    tableId,
    tableLabel,
    cart: { diningOption, lines: [] }
  };
}

function touchTicket(ticket) {
  ticket.updatedAt = now();
  ticket.cart.diningOption = ticket.diningOption;
}

function upsertTicket(ticket) {
  const index = state.tickets.findIndex((row) => row.ticketId === ticket.ticketId);
  if (index >= 0) state.tickets[index] = JSON.parse(JSON.stringify(ticket));
  else state.tickets.push(JSON.parse(JSON.stringify(ticket)));
}

function openTickets() {
  return state.tickets.filter((ticket) => ticket.status === "open");
}

function audit(type, payload) {
  state.audit.push({
    eventId: id("audit"),
    type,
    actor: state.operator.name,
    payload,
    createdAt: now()
  });
}

function saveAndRender(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  publishCdsSnapshot();
  render();
  if (message) showToast(message);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.currentTicket?.ticketId) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createInitialState();
}

async function publishCdsSnapshot() {
  if (!state.currentTicket?.cart?.lines?.length) return;
  const cart = calculateCart(state.currentTicket.cart);
  await postHub("/api/cds/snapshot", {
    ticketId: state.currentTicket.ticketId,
    tableLabel: state.currentTicket.tableLabel || "Orden",
    status: state.currentTicket.status,
    lines: cart.lines.map((line) => ({
      name: line.name,
      qty: line.qty,
      total: line.totals.total
    })),
    totals: { total: cart.totals.total },
    message: "Revise su orden antes del pago.",
    updatedAt: now()
  });
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

async function registerDevice(config = loadDeviceConfig("POS")) {
  return postHub("/api/devices/register", config);
}

async function heartbeatDevice() {
  const config = loadDeviceConfig("POS");
  await postHub(`/api/devices/${encodeURIComponent(config.deviceId)}/heartbeat`, config);
}

function hubUrl() {
  return String(localStorage.getItem(HUB_URL_KEY) || "").replace(/\/+$/, "");
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
    station: role === "POS" ? "Caja" : "",
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

function formatConnectionTime(value) {
  if (!value) return "Sin registro";
  return new Date(value).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
