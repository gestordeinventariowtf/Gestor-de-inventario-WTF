"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDashboard = startDashboard;
const node_http_1 = __importDefault(require("node:http"));
const node_url_1 = require("node:url");
const icg_export_adapter_js_1 = require("../adapters/icg-export-adapter.js");
const ALLOWED_STATES = new Set([
    "pendiente",
    "pendiente_revision",
    "aprobado",
    "procesando",
    "sincronizado",
    "rechazado",
    "error",
    "esperando_conexion"
]);
function startDashboard(store, config, onSyncNow, onIngestPackage) {
    const server = node_http_1.default.createServer(async (req, res) => {
        try {
            const url = new node_url_1.URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
            if (url.pathname === "/api/health") {
                return json(res, { ok: true, service: "WTF Inventory Sync Service", mode: config.mode, branch: config.branch, sqlEnabled: config.sqlEnabled });
            }
            if (url.pathname === "/api/state") {
                if (!authorize(req, config))
                    return json(res, { ok: false, error: "No autorizado" }, 401);
                const data = await store.read();
                return json(res, { ...data, stats: await store.stats(), config: publicConfig(config) });
            }
            if (url.pathname === "/api/sync-now" && req.method === "POST") {
                if (!authorize(req, config))
                    return json(res, { ok: false, error: "No autorizado" }, 401);
                const results = await onSyncNow();
                return json(res, { ok: true, results });
            }
            if (url.pathname === "/api/ingest-package" && req.method === "POST") {
                if (!authorize(req, config))
                    return json(res, { ok: false, error: "No autorizado" }, 401);
                const raw = await readText(req);
                const result = await onIngestPackage(raw);
                return json(res, { ok: true, result });
            }
            if (url.pathname === "/api/movement-state" && req.method === "POST") {
                if (!authorize(req, config))
                    return json(res, { ok: false, error: "No autorizado" }, 401);
                const body = await readJson(req);
                const estado = String(body.estado || "");
                if (!ALLOWED_STATES.has(estado))
                    return json(res, { ok: false, error: "Estado no permitido" }, 400);
                await store.updateMovementState(String(body.id), estado, String(body.mensaje || ""));
                return json(res, { ok: true });
            }
            if (url.pathname === "/api/movement-state-batch" && req.method === "POST") {
                if (!authorize(req, config))
                    return json(res, { ok: false, error: "No autorizado" }, 401);
                const body = await readJson(req);
                const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
                const estado = String(body.estado || "");
                if (!ids.length)
                    return json(res, { ok: false, error: "No hay movimientos seleccionados" }, 400);
                if (!ALLOWED_STATES.has(estado))
                    return json(res, { ok: false, error: "Estado no permitido" }, 400);
                const updated = await store.updateMovementStates(ids, estado, String(body.mensaje || ""));
                return json(res, { ok: true, updated });
            }
            if (url.pathname === "/api/export-icg" && req.method === "POST") {
                if (!authorize(req, config))
                    return json(res, { ok: false, error: "No autorizado" }, 401);
                const data = await store.read();
                const filePath = await (0, icg_export_adapter_js_1.exportMovementsForIcg)(config.icgImportDir, data.movements.filter((row) => row.estado === "aprobado"));
                await store.updateMovementStates(data.movements.filter((row) => row.estado === "aprobado" && row.destino === "ICG FrontRest").map((row) => row.id), "procesando", "Exportado para revision/importacion en ICG");
                return json(res, { ok: true, filePath });
            }
            html(res, renderDashboard());
        }
        catch (error) {
            json(res, { ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, 500);
        }
    });
    server.listen(config.port, "127.0.0.1");
    return server;
}
function authorize(req, config) {
    if (!config.apiKey)
        return true;
    const provided = String(req.headers["x-wtf-api-key"] || "");
    return provided === config.apiKey;
}
function publicConfig(config) {
    return {
        port: config.port,
        webAppUrl: config.webAppUrl,
        branch: config.branch,
        defaultWarehouse: config.defaultWarehouse,
        mode: config.mode,
        pollSeconds: config.pollSeconds,
        icgExportDir: config.icgExportDir,
        icgImportDir: config.icgImportDir,
        processedDir: config.processedDir,
        quarantineDir: config.quarantineDir,
        sqlEnabled: config.sqlEnabled,
        apiKeyConfigured: Boolean(config.apiKey)
    };
}
function renderDashboard() {
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WTF Inventory Sync Service</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f3f4f6;color:#111827;margin:0}
    header{background:#0f766e;color:white;padding:18px 22px}
    main{padding:18px;display:grid;gap:14px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .card{background:white;border:1px solid #e5e7eb;border-radius:8px;padding:14px}
    .metric{font-size:26px;font-weight:800}
    button{border:1px solid #d1d5db;background:white;border-radius:7px;padding:8px 11px;cursor:pointer;font-weight:700}
    button.primary{background:#15803d;color:white;border-color:#15803d}
    table{width:100%;border-collapse:collapse;background:white}
    th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px}
    th{background:#f9fafb}
    .pill{border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800;background:#e5e7eb}
    .error{background:#fee2e2;color:#991b1b}.ok{background:#dcfce7;color:#166534}.warn{background:#ffedd5;color:#9a3412}
  </style>
</head>
<body>
  <header><h1>WTF Inventory Sync Service</h1><div>Panel local de sincronizacion ICG Host</div></header>
  <main>
    <section class="grid">
      <div class="card"><div>Movimientos</div><div id="total" class="metric">0</div></div>
      <div class="card"><div>Pendientes</div><div id="pending" class="metric">0</div></div>
      <div class="card"><div>Errores</div><div id="errors" class="metric">0</div></div>
      <div class="card"><div>Mapeos</div><div id="mappings" class="metric">0</div></div>
    </section>
    <section class="card">
      <button class="primary" onclick="syncNow()">Sincronizar ahora</button>
      <button onclick="exportIcg()">Exportar entradas para ICG</button>
      <span id="msg"></span>
    </section>
    <section class="card">
      <h2>Cola de movimientos</h2>
      <table><thead><tr><th>Fecha</th><th>Ruta</th><th>Producto</th><th>Cantidad</th><th>Estado</th><th>Accion</th></tr></thead><tbody id="rows"></tbody></table>
    </section>
  </main>
  <script>
    const apiHeaders={};
    async function load(){
      const res=await fetch('/api/state',{headers:apiHeaders}); const data=await res.json();
      if(!data.movements){msg.textContent=' '+(data.error||'No autorizado'); return;}
      const rows=data.movements||[];
      total.textContent=rows.length;
      pending.textContent=rows.filter(r=>r.estado==='pendiente_revision'||r.estado==='pendiente').length;
      errors.textContent=rows.filter(r=>r.estado==='error').length;
      mappings.textContent=(data.mappings||[]).length;
      document.getElementById('rows').innerHTML=rows.map(r=>'<tr><td>'+esc(r.fecha)+'</td><td>'+esc(r.origen)+' -> '+esc(r.destino)+'</td><td><strong>'+esc(r.nombreProducto)+'</strong><br><small>'+esc(r.codigoProducto)+'</small></td><td>'+esc(r.cantidad)+' '+esc(r.unidad)+'</td><td><span class="pill '+cls(r.estado)+'">'+esc(r.estado)+'</span></td><td><button onclick="state(\\''+r.id+'\\',\\'aprobado\\')">Aprobar</button> <button onclick="state(\\''+r.id+'\\',\\'rechazado\\')">Rechazar</button></td></tr>').join('') || '<tr><td colspan="6">Sin movimientos.</td></tr>';
    }
    function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
    function cls(s){return s==='error'?'error':s==='aprobado'||s==='sincronizado'?'ok':'warn'}
    async function syncNow(){await fetch('/api/sync-now',{method:'POST',headers:apiHeaders}); msg.textContent=' Sincronizado'; load();}
    async function exportIcg(){const r=await fetch('/api/export-icg',{method:'POST',headers:apiHeaders}); const j=await r.json(); msg.textContent=' Archivo: '+(j.filePath||j.error||''); load();}
    async function state(id,estado){await fetch('/api/movement-state',{method:'POST',headers:{...apiHeaders,'Content-Type':'application/json'},body:JSON.stringify({id,estado})}); load();}
    load(); setInterval(load,5000);
  </script>
</body></html>`;
}
function html(res, body) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
}
function json(res, body, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}
async function readJson(req) {
    const text = await readText(req);
    return JSON.parse(text || "{}");
}
async function readText(req) {
    const chunks = [];
    for await (const chunk of req)
        chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
}
