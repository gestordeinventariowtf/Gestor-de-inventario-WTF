import http from "node:http";
import { URL } from "node:url";
import type { LocalStore } from "../core/local-store.js";
import { exportMovementsForIcg } from "../adapters/icg-export-adapter.js";
import type { CmsImportResult, IcgBackupSyncResult, ImportResult, MovementState, ServiceConfig } from "../core/types.js";

const ALLOWED_STATES = new Set<MovementState>([
  "pendiente",
  "pendiente_revision",
  "aprobado",
  "procesando",
  "sincronizado",
  "rechazado",
  "error",
  "esperando_conexion"
]);

export function startDashboard(
  store: LocalStore,
  config: ServiceConfig,
  onSyncNow: () => Promise<ImportResult[]>,
  onIngestPackage: (raw: string) => Promise<ImportResult>,
  onSyncLatestCms?: () => Promise<CmsImportResult>,
  onImportCmsFile?: (fileName: string, base64: string) => Promise<CmsImportResult>,
  onSyncIcgBackup?: () => Promise<IcgBackupSyncResult>
): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      applyCors(res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (url.pathname === "/api/health") {
        return json(res, { ok: true, service: "WTF Inventory Sync Service", mode: config.mode, branch: config.branch, sqlEnabled: config.sqlEnabled });
      }
      if (url.pathname === "/api/state") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const data = await store.read();
        return json(res, { ...data, stats: await store.stats(), config: publicConfig(config) });
      }
      if (url.pathname === "/api/sync-now" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const results = await onSyncNow();
        return json(res, { ok: true, results });
      }
      if (url.pathname === "/api/refresh-all" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const packages = await onSyncNow();
        const cms = onSyncLatestCms ? await onSyncLatestCms() : null;
        const backup = onSyncIcgBackup ? await onSyncIcgBackup() : null;
        return json(res, { ok: true, packages, cms, backup });
      }
      if (url.pathname === "/api/sync-latest-cms" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        if (!onSyncLatestCms) return json(res, { ok: false, error: "Importacion CMS no disponible" }, 400);
        const result = await onSyncLatestCms();
        return json(res, { ok: true, result });
      }
      if (url.pathname === "/api/import-cms-file" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        if (!onImportCmsFile) return json(res, { ok: false, error: "Importacion manual CMS no disponible" }, 400);
        const body = await readJson(req);
        const fileName = String(body.fileName || "").trim();
        const base64 = String(body.base64 || "");
        if (!fileName.toLowerCase().endsWith(".cms")) return json(res, { ok: false, error: "Selecciona un documento .cms valido" }, 400);
        if (!base64) return json(res, { ok: false, error: "El documento .cms esta vacio" }, 400);
        const result = await onImportCmsFile(fileName, base64);
        return json(res, { ok: true, result });
      }
      if (url.pathname === "/api/sync-icg-backup" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        if (!onSyncIcgBackup) return json(res, { ok: false, error: "Sincronizacion de backup ICG no disponible" }, 400);
        const result = await onSyncIcgBackup();
        return json(res, { ok: true, result });
      }
      if (url.pathname === "/api/ingest-package" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const raw = await readText(req);
        const result = await onIngestPackage(raw);
        return json(res, { ok: true, result });
      }
      if (url.pathname === "/api/movement-state" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const body = await readJson(req);
        const estado = String(body.estado || "") as MovementState;
        if (!ALLOWED_STATES.has(estado)) return json(res, { ok: false, error: "Estado no permitido" }, 400);
        await store.updateMovementState(String(body.id), estado, String(body.mensaje || ""));
        return json(res, { ok: true });
      }
      if (url.pathname === "/api/movement-state-batch" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const body = await readJson(req);
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        const estado = String(body.estado || "") as MovementState;
        if (!ids.length) return json(res, { ok: false, error: "No hay movimientos seleccionados" }, 400);
        if (!ALLOWED_STATES.has(estado)) return json(res, { ok: false, error: "Estado no permitido" }, 400);
        const updated = await store.updateMovementStates(ids, estado, String(body.mensaje || ""));
        return json(res, { ok: true, updated });
      }
      if (url.pathname === "/api/export-icg" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const data = await store.read();
        const filePath = await exportMovementsForIcg(config.icgImportDir, data.movements.filter((row) => row.estado === "aprobado"));
        await store.updateMovementStates(data.movements.filter((row) => row.estado === "aprobado" && row.destino === "ICG FrontRest").map((row) => row.id), "procesando", "Exportado para revision/importacion en ICG");
        return json(res, { ok: true, filePath });
      }
      html(res, renderDashboard());
    } catch (error) {
      json(res, { ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, 500);
    }
  });
  server.listen(config.port, "127.0.0.1");
  return server;
}

function authorize(req: http.IncomingMessage, config: ServiceConfig): boolean {
  if (!config.apiKey) return true;
  const provided = String(req.headers["x-wtf-api-key"] || "");
  return provided === config.apiKey;
}

function publicConfig(config: ServiceConfig): Record<string, unknown> {
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
    icgCmsDir: config.icgCmsDir,
    autoApplyIcgCms: config.autoApplyIcgCms,
    autoApplyIcgBackup: config.autoApplyIcgBackup,
    icgBackupPath: config.icgBackupPath,
    icgBackupPollSeconds: config.icgBackupPollSeconds,
    sqlServer: config.sqlServer,
    icgAuditDbName: config.icgAuditDbName,
    autoExportIcg: config.autoExportIcg,
    firebaseProjectId: config.firebaseProjectId,
    firebaseCollection: config.firebaseCollection,
    firebaseDocumentId: config.firebaseDocumentId,
    sqlEnabled: config.sqlEnabled,
    apiKeyConfigured: Boolean(config.apiKey)
  };
}

function renderDashboard(): string {
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
    input[type=file]{border:1px solid #d1d5db;border-radius:7px;padding:7px;background:white;max-width:100%}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .manual-import{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb}
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
      <div class="card"><div>CMS procesados</div><div id="cmsProcessed" class="metric">0</div></div>
    </section>
    <section class="card">
      <div class="actions">
        <button class="primary" onclick="refreshAll()">Actualizar y buscar novedades</button>
        <button onclick="syncNow()">Sincronizar paquetes</button>
        <button onclick="syncCms()">Leer ultimo CMS ICG</button>
        <button onclick="syncBackup()">Procesar Base de Datos ICG Local</button>
        <button onclick="exportIcg()">Exportar entradas para ICG</button>
      </div>
      <div class="manual-import">
        <input id="manualCmsFile" type="file" accept=".cms" />
        <button onclick="importCmsFile()">Importar CMS manual</button>
      </div>
      <span id="msg"></span>
    </section>
    <section class="card">
      <h2>Cola de movimientos</h2>
      <table><thead><tr><th>Fecha</th><th>Ruta</th><th>Producto</th><th>Cantidad</th><th>Estado</th><th>Mensaje</th><th>Accion</th></tr></thead><tbody id="rows"></tbody></table>
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
      cmsProcessed.textContent=((data.processedCmsFiles||[]).length);
      document.getElementById('rows').innerHTML=rows.map(r=>'<tr><td>'+esc(r.fecha)+'</td><td>'+esc(r.origen)+' -> '+esc(r.destino)+'<br><small>'+esc(r.almacen||'')+'</small></td><td><strong>'+esc(r.nombreProducto)+'</strong><br><small>'+esc(r.codigoProducto)+' '+esc(r.referencia||'')+'</small></td><td>'+esc(r.cantidad)+' '+esc(r.unidad)+'</td><td><span class="pill '+cls(r.estado)+'">'+esc(r.estado)+'</span></td><td>'+esc(r.mensaje||'')+'</td><td><button onclick="state(\\''+r.id+'\\',\\'aprobado\\')">Aprobar</button> <button onclick="state(\\''+r.id+'\\',\\'rechazado\\')">Rechazar</button></td></tr>').join('') || '<tr><td colspan="7">Sin movimientos.</td></tr>';
    }
    function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
    function cls(s){return s==='error'?'error':s==='aprobado'||s==='sincronizado'?'ok':'warn'}
    async function refreshAll(){
      msg.textContent=' Buscando novedades en paquetes, CMS y Base de Datos ICG Local...';
      const r=await fetch('/api/refresh-all',{method:'POST',headers:apiHeaders});
      const j=await r.json();
      const backupMsg=j.backup&&j.backup.message?j.backup.message:'';
      const cmsMsg=j.cms&&j.cms.message?j.cms.message:'';
      msg.textContent=' '+(j.error||backupMsg||cmsMsg||'Busqueda completada');
      load();
    }
    async function syncNow(){await fetch('/api/sync-now',{method:'POST',headers:apiHeaders}); msg.textContent=' Sincronizado'; load();}
    async function syncCms(){const r=await fetch('/api/sync-latest-cms',{method:'POST',headers:apiHeaders}); const j=await r.json(); msg.textContent=' '+((j.result&&j.result.message)||j.error||'CMS procesado'); load();}
    async function syncBackup(){const r=await fetch('/api/sync-icg-backup',{method:'POST',headers:apiHeaders}); const j=await r.json(); msg.textContent=' '+((j.result&&j.result.message)||j.error||'Base de Datos ICG Local procesada'); load();}
    async function exportIcg(){const r=await fetch('/api/export-icg',{method:'POST',headers:apiHeaders}); const j=await r.json(); msg.textContent=' Archivo: '+(j.filePath||j.error||''); load();}
    function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const value=String(reader.result||'');resolve(value.includes(',')?value.split(',')[1]:value)};reader.onerror=()=>reject(reader.error||new Error('No se pudo leer el archivo'));reader.readAsDataURL(file);})}
    async function importCmsFile(){
      const input=document.getElementById('manualCmsFile');
      const file=input.files&&input.files[0];
      if(!file){msg.textContent=' Selecciona un documento .cms';return;}
      if(!file.name.toLowerCase().endsWith('.cms')){msg.textContent=' Solo se permite importar documentos .cms';return;}
      msg.textContent=' Importando CMS manual...';
      try{
        const base64=await fileToBase64(file);
        const r=await fetch('/api/import-cms-file',{method:'POST',headers:{...apiHeaders,'Content-Type':'application/json'},body:JSON.stringify({fileName:file.name,base64})});
        const j=await r.json();
        msg.textContent=' '+((j.result&&j.result.message)||j.error||'CMS importado');
        if(j.ok) input.value='';
      }catch(error){msg.textContent=' '+(error&&error.message?error.message:'No se pudo importar el CMS');}
      load();
    }
    async function state(id,estado){await fetch('/api/movement-state',{method:'POST',headers:{...apiHeaders,'Content-Type':'application/json'},body:JSON.stringify({id,estado})}); load();}
    load(); setInterval(load,5000);
  </script>
</body></html>`;
}

function html(res: http.ServerResponse, body: string): void {
  applyCors(res);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

function json(res: http.ServerResponse, body: unknown, status = 200): void {
  applyCors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function applyCors(res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-WTF-API-Key");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const text = await readText(req);
  return JSON.parse(text || "{}");
}

async function readText(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
