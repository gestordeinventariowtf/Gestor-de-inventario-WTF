import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { PosUiEngine } from "./pos-ui-engine.js";
import { demoInventoryBridges, demoPosConfiguration, demoProducts, demoTables, demoZones } from "./demo-data.js";
import { demoUsers } from "./demo-users.js";
import { LocalJsonStore } from "../infrastructure/local-store.js";

const root = fileURLToPath(new URL("../../public", import.meta.url));
const store = new LocalJsonStore(fileURLToPath(new URL("../../data/ui-store.json", import.meta.url)));
const engine = new PosUiEngine({
  store,
  products: demoProducts,
  bridges: demoInventoryBridges,
  zones: demoZones,
  tables: demoTables,
  users: demoUsers,
  posConfiguration: demoPosConfiguration,
  pin: "1234"
});
await engine.init();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      await handleApi(url, request, response);
      return;
    }
    await serveStatic(url, response);
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
});

const port = Number(process.env.PORT || 8788);
server.listen(port, "127.0.0.1", () => {
  console.log(`WTF POS UI local: http://127.0.0.1:${port}`);
});

async function handleApi(url, request, response) {
  if (request.method === "GET" && url.pathname === "/api/state") {
    sendJson(response, 200, { ok: true, data: await engine.snapshot() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/products") {
    sendJson(response, 200, { ok: true, data: engine.searchProducts(url.searchParams.get("q") || "") });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/readiness") {
    sendJson(response, 200, { ok: true, data: await engine.productionReadiness() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cart/add") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.addProduct(body.productId, { qty: body.qty || 1, notes: body.notes || "" }) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cart/promotion") {
    const body = await readJson(request);
    sendJson(response, 200, {
      ok: true,
      data: await engine.applyPromotionToLine(body.lineId, body.promotionId, { reason: body.reason || "Promocion demo" })
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ticket/transfer-table") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.transferCurrentTicket(body.tableId) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ticket/dining-option") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.changeDiningOption(body.diningOption) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ticket/split-line") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.splitCurrentTicketLine(body.lineId, body.qty || 1) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ticket/merge") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.mergeTicketIntoCurrent(body.sourceTicketId) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/kds/send") {
    sendJson(response, 200, { ok: true, data: await engine.sendKds() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pay/cash") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.payCash(body.cashReceived) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/shift/close") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.closeShift(body.countedCash) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/sale/void") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.voidSale(body.saleId, body.reason || "Anulacion demo") });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/sale/refund") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.refundSale(body.saleId, body.lines || [], body.reason || "Devolucion demo") });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hardware/diagnostics") {
    sendJson(response, 200, { ok: true, data: await engine.runHardwareDiagnostics() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pilot/run") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.runOperationalPilot(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pilot/reconcile") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.reconcilePilot(body.reference || body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cutover/plan") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.createCutoverPlan(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pilot/final-report") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.createPilotFinalReport(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pilot/evidence-package") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.createPilotEvidencePackage(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/production/control") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.createProductionControl(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/shadow-shift/report") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.createShadowShiftReport(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/shadow-shift/decision") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.createShadowShiftDecision(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/operational-stage/report") {
    const body = await readJson(request);
    sendJson(response, 200, { ok: true, data: await engine.createOperationalStageReport(body) });
    return;
  }

  sendJson(response, 404, { ok: false, error: "Ruta no encontrada." });
}

async function serveStatic(url, response) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  const content = await fs.readFile(filePath);
  response.writeHead(200, { "Content-Type": contentType(filePath) });
  response.end(content);
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}
