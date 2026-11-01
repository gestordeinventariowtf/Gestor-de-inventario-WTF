import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import type { LocalStore } from "../core/local-store.js";
import type { IcgBackupSyncResult, MovementState, ServiceConfig } from "../core/types.js";

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
  onSyncIcgBackup: () => Promise<IcgBackupSyncResult>
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
      if (url.pathname === "/api/refresh-all" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const backup = await onSyncIcgBackup();
        return json(res, { ok: true, backup });
      }
      // Mantener ambos nombres durante la transicion: versiones de la Web.App
      // llaman a /api/sync-icg-local y las versiones actuales a /api/sync-icg-backup.
      // Ambos ejecutan el mismo flujo seguro sobre la base ICG configurada.
      if ((url.pathname === "/api/sync-icg-local" || url.pathname === "/api/sync-icg-backup") && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const result = await onSyncIcgBackup();
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
      if (url.pathname === "/api/movement-cancel" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const body = await readJson(req);
        const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
        if (!ids.length) return json(res, { ok: false, error: "No hay movimientos seleccionados" }, 400);
        const cancelled = await store.cancelMovements(ids, String(body.reason || "Cancelado por el administrador"), String(body.cancelledBy || "Administrador local"));
        return json(res, { ok: true, cancelled });
      }
      if (url.pathname === "/api/restart-host" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        scheduleRestart();
        return json(res, { ok: true, message: "Reinicio programado. El servicio volvera a abrirse en segundos." });
      }
      if (url.pathname === "/api/apply-update" && req.method === "POST") {
        if (!authorize(req, config)) return json(res, { ok: false, error: "No autorizado" }, 401);
        const result = scheduleLocalUpdate(config);
        if (!result.ok) return json(res, result, 404);
        return json(res, result);
      }
      html(res, renderDashboard(config));
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
    dataDir: config.dataDir,
    processedDir: config.processedDir,
    quarantineDir: config.quarantineDir,
    autoApplyIcgBackup: config.autoApplyIcgBackup,
    icgBackupPath: config.icgBackupPath,
    icgSqlDataPath: config.icgSqlDataPath,
    icgBackupPollSeconds: config.icgBackupPollSeconds,
    icgConsumptionLookbackDays: config.icgConsumptionLookbackDays,
    sqlServer: config.sqlServer,
    icgLiveDatabaseName: config.icgLiveDatabaseName,
    icgAuditDbName: config.icgAuditDbName,
    firebaseProjectId: config.firebaseProjectId,
    firebaseCollection: config.firebaseCollection,
    firebaseDocumentId: config.firebaseDocumentId,
    sqlEnabled: config.sqlEnabled,
    apiKeyConfigured: Boolean(config.apiKey),
    hostIdentityMode: config.hostIdentityMode,
    hostSyncEndpoint: config.hostSyncEndpoint,
    terminalConfigured: Boolean(config.terminalId && config.terminalSecretProtected),
    sqlConnectionConfigured: Boolean(config.sqlConnectionString)
  };
}

function scheduleRestart(delaySeconds = 3): void {
  const cwd = process.cwd();
  const exe = process.execPath;
  const args = process.argv.slice(1);
  const escapedArgs = args.map((arg) => `'${arg.replace(/'/g, "''")}'`).join(", ");
  const script = `
Start-Sleep -Seconds ${delaySeconds}
Start-Process -FilePath '${exe.replace(/'/g, "''")}' -ArgumentList @(${escapedArgs}) -WorkingDirectory '${cwd.replace(/'/g, "''")}' -WindowStyle Hidden
`;
  const scriptPath = path.join(os.tmpdir(), `wtf-icg-host-restart-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, script, "utf8");
  spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", scriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  }).unref();
  setTimeout(() => process.exit(0), 500);
}

function scheduleLocalUpdate(config: ServiceConfig): { ok: boolean; message: string; packagePath?: string; updateDir?: string } {
  const installDir = process.cwd();
  const updateDirs = [
    path.join(installDir, "updates"),
    path.join(config.dataDir, "..", "updates"),
    path.join(process.env.ProgramData || "C:\\ProgramData", "WTF ICG Host", "updates")
  ].map((dir) => path.resolve(dir));
  const packagePath = findUpdatePackage(updateDirs);
  if (!packagePath) {
    scheduleRestart();
    return {
      ok: true,
      message: "No se encontro paquete nuevo. Se realizara un reinicio rapido para recargar el Host.",
      updateDir: updateDirs[0]
    };
  }

  const script = `
$ErrorActionPreference = "Stop"
Start-Sleep -Seconds 3
$packagePath = '${packagePath.replace(/'/g, "''")}'
$installDir = '${installDir.replace(/'/g, "''")}'
$work = Join-Path $env:TEMP ('WTF-ICG-Host-Update-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $work | Out-Null
Expand-Archive -LiteralPath $packagePath -DestinationPath $work -Force
$installer = Join-Path $work 'scripts\\install-desktop-app.ps1'
if (!(Test-Path $installer)) { throw 'El paquete de actualizacion no contiene scripts\\install-desktop-app.ps1.' }
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$installer,'-InstallDir',$installDir,'-StartNow') -Verb RunAs -Wait
`;
  const scriptPath = path.join(os.tmpdir(), `wtf-icg-host-update-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, script, "utf8");
  spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", scriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  }).unref();
  setTimeout(() => process.exit(0), 500);
  return { ok: true, message: "Actualizacion programada. El Host se cerrara, aplicara el paquete y volvera a iniciar.", packagePath };
}

function findUpdatePackage(updateDirs: string[]): string {
  for (const dir of updateDirs) {
    const candidate = path.join(dir, "WTF-ICG-Host-Setup.zip");
    if (fs.existsSync(candidate)) return candidate;
  }
  return "";
}

function renderDashboard(config: ServiceConfig): string {
  const embeddedApiKey = JSON.stringify(config.apiKey || "");
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WTF Inventory Sync Service</title>
  <style>
    :root{--bg:#f3f4f6;--card:#fff;--text:#111827;--muted:#6b7280;--line:#e5e7eb;--brand:#0f766e;--brand2:#15803d}
    body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);margin:0}
    body.dark{--bg:#111827;--card:#1f2937;--text:#f9fafb;--muted:#cbd5e1;--line:#374151;--brand:#0f766e;--brand2:#22c55e}
    header{background:#0f766e;color:white;padding:18px 22px}
    main{padding:18px;display:grid;gap:14px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px}
    .metric{font-size:26px;font-weight:800}
    button{border:1px solid #d1d5db;background:white;border-radius:7px;padding:8px 11px;cursor:pointer;font-weight:700}
    button.primary{background:#15803d;color:white;border-color:#15803d}
    button.danger{background:#991b1b;color:white;border-color:#991b1b}
    input[type=file]{border:1px solid #d1d5db;border-radius:7px;padding:7px;background:white;max-width:100%}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .manual-import{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb}
    .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
    .tab{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:7px 12px;font-weight:800;cursor:pointer}
    .tab.active{background:#0f766e;color:#fff;border-color:#0f766e}
    .panel-section{display:none}
    .panel-section.active{display:grid;gap:14px}
    .config-sub{display:none}
    .config-sub.active{display:grid;gap:12px}
    .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
    .info-box{border:1px solid var(--line);border-radius:8px;padding:12px;background:var(--card);display:grid;gap:5px}
    .info-box span{font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase}
    .info-box strong{font-size:13px;word-break:break-word}
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;background:var(--card)}
    th,td{border-bottom:1px solid var(--line);padding:8px;text-align:left;font-size:13px}
    th{background:rgba(15,118,110,.08)}
    .pill{border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800;background:#e5e7eb}
    .error{background:#fee2e2;color:#991b1b}.ok{background:#dcfce7;color:#166534}.warn{background:#ffedd5;color:#9a3412}
    .muted{color:var(--muted);font-size:12px}
  </style>
</head>
<body>
  <header><h1>WTF Inventory Sync Service</h1><div>Panel local de sincronizacion ICG Host</div></header>
  <main>
    <section class="card">
      <div class="tabs">
        <button id="tabMovimientos" class="tab active" onclick="showMainTab('movimientos')">Movimientos</button>
        <button id="tabConfiguracion" class="tab" onclick="showMainTab('configuracion')">Configuracion</button>
      </div>
      <span id="msg"></span>
    </section>
    <section id="sectionMovimientos" class="panel-section active">
      <section class="grid">
        <div class="card"><div>Movimientos</div><div id="total" class="metric">0</div></div>
        <div class="card"><div>Pendientes</div><div id="pending" class="metric">0</div></div>
        <div class="card"><div>Errores</div><div id="errors" class="metric">0</div></div>
        <div class="card"><div>Mapeos</div><div id="mappings" class="metric">0</div></div>
      </section>
      <section class="card">
        <div class="actions">
          <button id="btnSync" class="primary" onclick="refreshAll()">Sincronizar</button>
          <button id="btnManualSync" onclick="refreshAll()" style="display:none">Enviar movimientos a Web.App</button>
          <button id="btnCancelSelected" onclick="cancelSelected()" class="danger">Cancelar seleccionados</button>
        </div>
        <p id="syncHelp" class="muted">Sincronizar revisa la Base de Datos ICG Local, busca cierres o ventas nuevas y alimenta la cola de movimientos para la web.</p>
      </section>
      <section class="card">
        <h2>Cola de movimientos</h2>
        <div class="table-wrap"><table><thead><tr><th><input id="selectAll" type="checkbox" onchange="toggleAll(this.checked)" title="Seleccionar todos"></th><th>Cierre / fecha</th><th>Ruta</th><th>Articulo ICG</th><th>Cantidad</th><th>Estado</th><th>Mensaje</th></tr></thead><tbody id="rows"></tbody></table></div>
      </section>
    </section>
    <section id="sectionConfiguracion" class="panel-section">
      <section class="card">
        <div class="tabs">
          <button id="subApariencia" class="tab active" onclick="showConfigTab('apariencia')">Apariencia</button>
          <button id="subActualizacion" class="tab" onclick="showConfigTab('actualizacion')">Actualizacion</button>
          <button id="subConexion" class="tab" onclick="showConfigTab('conexion')">Conexion</button>
          <button id="subSistema" class="tab" onclick="showConfigTab('sistema')">Sistema</button>
        </div>
        <div id="configApariencia" class="config-sub active">
          <div class="info-grid">
            <div class="info-box"><span>Tema visual</span><strong id="themeName">Claro</strong><div class="actions"><button onclick="setTheme('light')">Claro</button><button onclick="setTheme('dark')">Oscuro</button></div></div>
            <div class="info-box"><span>Lectura de tabla</span><strong>Scroll horizontal limpio para colas largas</strong></div>
          </div>
        </div>
        <div id="configActualizacion" class="config-sub">
          <div class="info-grid">
            <div class="info-box"><span>Actualizar Host</span><strong>Busca un paquete nuevo y reinicia el servicio automaticamente.</strong><div class="actions"><button class="primary" onclick="applyUpdate()">Actualizar</button><button onclick="restartHost()">Reiniciar Host</button></div><div id="countdown" class="muted"></div></div>
            <div class="info-box"><span>Carpeta de actualizaciones</span><strong id="updatePath">Cargando...</strong><div class="muted">Coloca aqui el archivo WTF-ICG-Host-Setup.zip cuando quieras actualizar sin desinstalar.</div></div>
          </div>
        </div>
        <div id="configConexion" class="config-sub">
          <div class="info-grid">
            <div class="info-box"><span>Web App</span><strong id="cfgWebApp"></strong></div>
            <div class="info-box"><span>Firebase</span><strong id="cfgFirebase"></strong></div>
            <div class="info-box"><span>Base ICG</span><strong id="cfgIcgDb"></strong></div>
            <div class="info-box"><span>Revision automatica</span><strong id="cfgPoll"></strong></div>
          </div>
        </div>
        <div id="configSistema" class="config-sub">
          <div class="info-grid">
            <div class="info-box"><span>Modo</span><strong id="cfgMode"></strong></div>
            <div class="info-box"><span>Puerto local</span><strong id="cfgPort"></strong></div>
            <div class="info-box"><span>Datos locales</span><strong id="cfgProcessed"></strong></div>
            <div class="info-box"><span>Seguridad local</span><strong id="cfgApiKey"></strong></div>
          </div>
        </div>
      </section>
    </section>
  </main>
  <script>
    const embeddedApiKey=${embeddedApiKey};
    let apiHeaders={};
    let currentConfig={};
    applySavedTheme();
    function refreshApiHeaders(){
      const key=localStorage.getItem('wtfHostApiKey')||embeddedApiKey||'';
      if(embeddedApiKey && localStorage.getItem('wtfHostApiKey')!==embeddedApiKey) localStorage.setItem('wtfHostApiKey',embeddedApiKey);
      apiHeaders=key?{'x-wtf-api-key':key}:{};
    }
    function requestApiKey(){
      const key=prompt('Introduce la clave local del Host para autorizar la sincronizacion:');
      if(key&&key.trim()){
        localStorage.setItem('wtfHostApiKey',key.trim());
        refreshApiHeaders();
        return true;
      }
      return false;
    }
    async function fetchWithTimeout(url,options={}){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),90000);
      try{
        return await fetch(url,Object.assign({},options,{signal:controller.signal}));
      }catch(error){
        if(error&&error.name==='AbortError') throw new Error('El Host tardo demasiado respondiendo. Reinicia el Host y vuelve a sincronizar.');
        throw error;
      }finally{
        clearTimeout(timer);
      }
    }
    async function authorizedFetch(url,options={}){
      refreshApiHeaders();
      const next=Object.assign({},options,{headers:Object.assign({},apiHeaders,options.headers||{})});
      let res=await fetchWithTimeout(url,next);
      if(res.status===401){
        if(!requestApiKey()) return res;
        const retry=Object.assign({},options,{headers:Object.assign({},apiHeaders,options.headers||{})});
        res=await fetchWithTimeout(url,retry);
      }
      return res;
    }
    async function load(){
      try{
        const res=await authorizedFetch('/api/state');
        const data=await res.json();
        if(!res.ok||!data.movements){msg.textContent=' '+(data.error||'No autorizado'); return;}
        const rows=data.movements||[];
        currentConfig=data.config||{};
        total.textContent=rows.length;
        pending.textContent=rows.filter(r=>r.estado==='pendiente_revision'||r.estado==='pendiente').length;
        errors.textContent=rows.filter(r=>r.estado==='error').length;
        mappings.textContent=(data.mappings||[]).length;
        document.getElementById('rows').innerHTML=rows.map(renderQueueRow).join('') || '<tr><td colspan="7">Sin movimientos.</td></tr>';
        renderConfig(currentConfig);
      }catch(error){
        msg.textContent=' No se pudo cargar el estado del Host: '+(error&&error.message?error.message:error);
      }
    }
    function renderQueueRow(r){const raw=r.raw||{}; const icgName=raw.productoIcg||raw.ProductoICG||raw.DESCRIPCION||r.productoIcg||r.ProductoICG||r.nombreProducto||''; const ticket=[raw.fo||raw.FO,raw.serie||raw.SERIE,raw.numero||raw.NUMERO,raw.n||raw.N,raw.numLinea||raw.NUMLINEA].filter(Boolean).join('-'); return '<tr><td><input class="movement-check" type="checkbox" value="'+esc(r.id)+'"></td><td>'+formatMovementDate(r)+'</td><td>'+esc(r.origen)+' -> '+esc(r.destino)+'<br><small>'+esc(r.almacen||'')+'</small></td><td><strong>'+esc(icgName)+'</strong><br><small>Cod: '+esc(r.codigoProducto)+' / Ref: '+esc(r.referencia||'')+(ticket?' / Ticket: '+esc(ticket):'')+'</small></td><td>'+esc(raw.consumo??r.cantidad)+' '+esc(r.unidad)+'</td><td><span class="pill '+cls(r.estado)+'">'+esc(r.estado)+'</span></td><td>'+esc(r.mensaje||'')+'</td></tr>'}
    function toggleAll(checked){document.querySelectorAll('.movement-check').forEach((box)=>box.checked=checked)}
    function selectedMovementIds(){return Array.from(document.querySelectorAll('.movement-check:checked')).map((box)=>box.value).filter(Boolean)}
    async function cancelSelected(){const ids=selectedMovementIds(); if(!ids.length){msg.textContent=' Selecciona al menos un movimiento.'; return;} if(!confirm('Se marcaran '+ids.length+' movimiento(s) como cancelado(s) y no volveran a entrar en la cola ni a subir en futuras sincronizaciones. Los datos de SQL Server no se borraran. ¿Continuar?')) return; const reason=prompt('Motivo de cancelacion:', 'Movimiento cancelado por el administrador')||'Movimiento cancelado por el administrador'; try{const res=await authorizedFetch('/api/movement-cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,reason,cancelledBy:'Administrador local'})}); const data=await res.json(); if(!res.ok||!data.ok) throw new Error(data.error||'No se pudo cancelar'); msg.textContent=' '+data.cancelled+' movimiento(s) cancelado(s).'; await load();}catch(error){msg.textContent=' Error al cancelar: '+(error&&error.message?error.message:error)}}
    function formatMovementDate(r){
      const raw=String((r&&r.fecha)||'').trim();
      if(!raw) return '';
      const datePart=(raw.match(/^(\d{4})-(\d{2})-(\d{2})/)||[]).slice(1,4);
      if(datePart.length===3 && String(r.origen||'').includes('ICG FrontRest')){
        return '<strong>Cierre Z</strong><br><small>'+datePart[2]+'/'+datePart[1]+'/'+datePart[0]+'</small>';
      }
      const d=new Date(raw);
      if(!Number.isNaN(d.getTime())){
        return esc(d.toLocaleString('es-DO',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}));
      }
      return esc(raw.replace('T',' ').replace('.000Z',''));
    }
    function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
    function cls(s){return s==='error'?'error':s==='aprobado'||s==='sincronizado'?'ok':'warn'}
    async function refreshAll(){
      if(window.btnSync) btnSync.disabled=true;
      msg.textContent=' Actualizando catalogos, referencias, stocks y precios desde ICG Local...';
      try{
        const r=await authorizedFetch('/api/refresh-all',{method:'POST'});
        let j={};
        try{j=await r.json();}catch(parseError){throw new Error('El Host no devolvio una respuesta valida.');}
        if(!r.ok||j.ok===false) throw new Error(j.error||'No se pudo sincronizar.');
        const backupMsg=j.backup&&j.backup.message?j.backup.message:'';
        msg.textContent=' '+(backupMsg||'Busqueda completada');
        await load();
      }catch(error){
        msg.textContent=' Error al sincronizar: '+(error&&error.message?error.message:error);
      }finally{
        if(window.btnSync) btnSync.disabled=false;
      }
    }
    async function state(id,estado){await authorizedFetch('/api/movement-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,estado})}); load();}
    function showMainTab(tab){
      tabMovimientos.className='tab '+(tab==='movimientos'?'active':'');
      tabConfiguracion.className='tab '+(tab==='configuracion'?'active':'');
      sectionMovimientos.className='panel-section '+(tab==='movimientos'?'active':'');
      sectionConfiguracion.className='panel-section '+(tab==='configuracion'?'active':'');
    }
    function showConfigTab(tab){
      ['Apariencia','Actualizacion','Conexion','Sistema'].forEach(name=>{
        const key=name.toLowerCase();
        document.getElementById('sub'+name).className='tab '+(key===tab?'active':'');
        document.getElementById('config'+name).className='config-sub '+(key===tab?'active':'');
      });
    }
    function renderConfig(cfg){
      cfgWebApp.textContent=cfg.webAppUrl||'';
      cfgFirebase.textContent=((cfg.firebaseProjectId||'')+' / '+(cfg.firebaseCollection||'')+' / '+(cfg.firebaseDocumentId||'')).trim();
      const liveDbName=cfg.icgLiveDatabaseName||'FRS_WTFOODVZL';
      const liveSqlPath=cfg.icgSqlDataPath||'C:\\\\ICG\\\\Microsoft SQL Server\\\\MSSQL12.MSSQLSERVER\\\\MSSQL\\\\DATA';
      cfgIcgDb.textContent=liveDbName+' - SQL Server local - '+liveSqlPath;
      cfgPoll.textContent='Cada '+(cfg.icgBackupPollSeconds||0)+' segundos';
      cfgMode.textContent=cfg.mode||'';
      btnManualSync.style.display=cfg.mode==='manual'?'inline-block':'none';
      syncHelp.textContent=cfg.mode==='manual'?'Modo manual: usa "Enviar movimientos a Web.App" cuando quieras enviar la cola y revisar TIQUETSLIN.':'Modo automático: el Host revisa la base local según el intervalo configurado.';
      cfgPort.textContent='http://127.0.0.1:'+(cfg.port||8787);
      cfgProcessed.textContent=cfg.processedDir||'';
      cfgApiKey.textContent=cfg.apiKeyConfigured?'Clave local configurada':'Sin clave local';
      updatePath.textContent=(cfg.dataDir?cfg.dataDir.replace(/\\\\?data$/,'')+'\\\\updates':'C:\\\\ProgramData\\\\WTF ICG Host\\\\updates');
    }
    function setTheme(theme){localStorage.setItem('wtfHostTheme',theme); applySavedTheme();}
    function applySavedTheme(){const theme=localStorage.getItem('wtfHostTheme')||'light'; document.body.className=theme==='dark'?'dark':''; setTimeout(()=>{if(window.themeName) themeName.textContent=theme==='dark'?'Oscuro':'Claro';},0);}
    async function applyUpdate(){
      msg.textContent=' Preparando actualizacion...';
      const r=await authorizedFetch('/api/apply-update',{method:'POST'});
      const j=await r.json();
      msg.textContent=' '+(j.message||j.error||'Actualizacion programada');
      startCountdown(30);
    }
    async function restartHost(){
      msg.textContent=' Reinicio programado...';
      const r=await authorizedFetch('/api/restart-host',{method:'POST'});
      const j=await r.json();
      msg.textContent=' '+(j.message||j.error||'Reinicio programado');
      startCountdown(30);
    }
    function startCountdown(seconds){
      let left=seconds;
      countdown.textContent='Reinicio rapido en '+left+' segundos. Al volver, el Host revisara ventas y cambios pendientes.';
      const timer=setInterval(()=>{
        left-=1;
        countdown.textContent=left>0?'Reinicio rapido en '+left+' segundos.':'Reiniciando...';
        if(left<=0) clearInterval(timer);
      },1000);
    }
    refreshApiHeaders(); load(); setInterval(load,30000);
  </script>
</body></html>`;
}

function html(res: http.ServerResponse, body: string): void {
  applyCors(res);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0"
  });
  res.end(body);
}

function json(res: http.ServerResponse, body: unknown, status = 200): void {
  applyCors(res);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0"
  });
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
