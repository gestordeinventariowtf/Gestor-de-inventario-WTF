import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { IcgBackupConsumptionRow, IcgBackupSyncResult, ServiceConfig, SyncMovement } from "../core/types.js";
import { decodeFirestoreAppState, encodeCompressedAppState, encodeFirestoreValue } from "../core/firestore-state.js";

type AnyRecord = Record<string, any>;

const execFileAsync = promisify(execFile);

const DATASET_COLUMNS: Record<string, string[]> = {
  TiquetsCab: ["FO", "SERIE", "NUMERO", "N", "NUMFACTURA", "FECHA", "HORAINI", "HORAFIN", "CAJA", "TOTALBRUTO", "TOTALNETO", "SUBTOTAL", "PROPINA", "FECHAANULACION"],
  TiquetsLin: ["FO", "SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "DESCRIPCION", "UNIDADES", "PRECIO", "PRECIOIVA", "TOTAL", "REFERENCIA", "HORA"],
  TiquetsConsumo: ["FO", "SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "CONSUMO", "CODALMACEN", "CODMACRO"],
  Articulos: ["CodArticulo", "Referencia", "Descripcion", "Dpto", "Seccion", "Unidades", "PCoste", "UnidadMedida", "SeCompra", "SeVende", "UsaStocks", "StockMinimo", "CosteMedio", "UltimoCoste", "Suspendido", "Descatalogado", "FechaModificado"],
  Referencias: ["REFERENCIA", "CODIGO", "TIPOREF", "CODPROVEEDOR"],
  Kits: ["CODARTICULO", "LINEAKIT", "CODARTKIT", "REFERENCIA", "DESCRIPCIOKIT", "REFERENCIAKIT", "UNIDADES", "PRECIOUNIDAD", "TOTALLINEA"],
  Moviments: ["ID", "CODALMACENORIGEN", "CODALMACENDESTINO", "NUMSERIE", "CODARTICULO", "FECHA", "HORA", "TIPO", "UNIDADES", "SERIEDOC", "NUMDOC"],
  Stocks: ["CODARTICULO", "CODALMACEN", "STOCK", "PEDIDO", "ASERVIR", "MINIMO", "FECHAMODIFICADO"],
  ComprasCab: ["SERIE", "NUMERO", "N", "FECHA", "CODPROVEEDOR", "CODALMACEN", "SUFACTURA", "TOTALBRUTO", "TOTALNETO"],
  ComprasLin: ["SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "REFERENCIA", "DESCRIPCION", "UDSTOTAL", "PRECIO", "TOTAL", "CODALMACEN"],
  PreciosVenta: ["CODARTICULO", "CODFORMATO", "IDTARIFAV", "VALOR"],
  Proveedores: ["CODPROVEEDOR", "NOMPROVEEDOR", "NOMCOMERCIAL", "ALIAS", "TELEFONO1", "TELEFONO2", "E_MAIL"],
  Clientes: ["CODCLIENTE", "NOMBRECOMERCIAL", "NOMBRECLIENTE", "ALIAS", "TELEFONO1", "TELEFONO2", "E_MAIL", "ESTADO", "NUMTARJETA"]
};

const CIERRES_DIARIOS_COLUMNS = ["Archivo", "FechaCierre", "Tickets", "Lineas", "VentaBruta", "VentaNeta", "Pagos", "Propina", "Estado", "Observacion"];

function normalizar(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const num = Number(String(value ?? "").replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function active(row: AnyRecord): boolean {
  const value = normalizar(row.Activo == null ? "si" : row.Activo);
  return value !== "false" && value !== "no" && value !== "0" && value !== "inactivo";
}

function quickHashText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function targetKey(value: unknown): string {
  const key = normalizar(value || "");
  if (key.includes("bar") && (key.includes("cuarto") || key.includes("frio"))) return "barCuartoFrioInventario";
  if (key.includes("bar") && key.includes("mise")) return "barMiseAnPlace";
  if (key.includes("bar")) return "barInventario";
  if (key.includes("cuarto") || key.includes("frio")) return "cuartoFrioInventario";
  if (key.includes("inventario") && key.includes("cocina")) return "inventario";
  if (key.includes("inventario")) return "inventario";
  return "miseAnPlace";
}

function targetLabel(key: string): string {
  return ({
    inventario: "Inventario Cocina",
    cuartoFrioInventario: "Cuarto Frio Cocina",
    miseAnPlace: "Mise an Place Cocina",
    barInventario: "Inventario Bar",
    barCuartoFrioInventario: "Cuarto Frio Bar",
    barMiseAnPlace: "Mise an Place Bar"
  } as Record<string, string>)[key] || key;
}

function targetProductName(row: AnyRecord, key: string): string {
  return key === "inventario" || key === "cuartoFrioInventario" || key === "barInventario" || key === "barCuartoFrioInventario"
    ? String(row.nombre || row.producto || "")
    : String(row.producto || row.nombre || "");
}

function targetExistence(row: AnyRecord, key: string): number {
  if (key === "inventario" || key === "cuartoFrioInventario" || key === "barInventario" || key === "barCuartoFrioInventario") {
    return parseNumber(row.entrada) - parseNumber(row.salida) - parseNumber(row.decomiso);
  }
  return parseNumber(row.existencia);
}

function applyTargetSalida(row: AnyRecord, key: string, cantidad: number): void {
  if (key === "inventario" || key === "cuartoFrioInventario" || key === "barInventario" || key === "barCuartoFrioInventario") {
    row.salida = Number((parseNumber(row.salida) + cantidad).toFixed(4));
    return;
  }
  row.existencia = Number((parseNumber(row.existencia) - cantidad).toFixed(4));
}

function rows(appState: AnyRecord, tableKey: string): AnyRecord[] {
  return appState?.icgFrontRestData?.datasets?.[tableKey]?.rows || [];
}

function ensureIcgData(appState: AnyRecord): AnyRecord {
  appState.icgFrontRestData = appState.icgFrontRestData || {};
  appState.icgFrontRestData.datasets = appState.icgFrontRestData.datasets || {};
  appState.icgFrontRestData.datasets.Articulos = appState.icgFrontRestData.datasets.Articulos || {
    key: "Articulos",
    label: "Articulos ICG",
    columns: DATASET_COLUMNS.Articulos,
    rows: []
  };
  appState.icgFrontRestData.datasets.ConsumoMiseVentas = appState.icgFrontRestData.datasets.ConsumoMiseVentas || {
    key: "ConsumoMiseVentas",
    label: "Consumo Mise ventas",
    columns: ["Fecha", "ModuloWTF", "ProductoWTF", "ProductoMise", "CodArticulo", "Referencia", "ProductoICG", "UnidadesVendidas", "CantidadDescontar", "Unidad", "Archivo", "ImportKey", "Estado"],
    rows: []
  };
  appState.icgFrontRestData.datasets.CierresDiarios = appState.icgFrontRestData.datasets.CierresDiarios || {
    key: "CierresDiarios",
    label: "Cierres diarios",
    columns: CIERRES_DIARIOS_COLUMNS,
    rows: []
  };
  appState.icgFrontRestData.appliedImports = Array.isArray(appState.icgFrontRestData.appliedImports) ? appState.icgFrontRestData.appliedImports : [];
  appState.icgFrontRestData.processedBackupDates = Array.isArray(appState.icgFrontRestData.processedBackupDates) ? appState.icgFrontRestData.processedBackupDates : [];
  return appState.icgFrontRestData;
}

function mergeBackupArticlesIntoIcgData(icg: AnyRecord, articles: AnyRecord[]): void {
  if (!Array.isArray(articles) || !articles.length) return;
  const current = icg.datasets.Articulos || { key: "Articulos", label: "Articulos ICG", columns: DATASET_COLUMNS.Articulos, rows: [] };
  const existingRows = Array.isArray(current.rows) ? current.rows : [];
  const byCode = new Map<string, AnyRecord>();
  existingRows.forEach((row: AnyRecord) => {
    const code = normalizar(row.CodArticulo || row.CODARTICULO || row.Codigo || "");
    if (code) byCode.set(code, row);
  });
  articles.forEach((row) => {
    const code = normalizar(row.CodArticulo || row.CODARTICULO || row.Codigo || "");
    if (!code) return;
    byCode.set(code, Object.assign({}, byCode.get(code) || {}, row, {
      _source: "Backup SQL ICG",
      _updatedAt: new Date().toISOString()
    }));
  });
  icg.datasets.Articulos = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.Articulos])),
    rows: Array.from(byCode.values()).sort((a, b) => String(b.CodArticulo || b.CODARTICULO || "").localeCompare(String(a.CodArticulo || a.CODARTICULO || ""), undefined, { numeric: true }))
  });
}

function documentUrl(config: ServiceConfig): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.firebaseProjectId)}/databases/(default)/documents/${encodeURIComponent(config.firebaseCollection)}/${encodeURIComponent(config.firebaseDocumentId)}`;
}

async function readAppState(config: ServiceConfig): Promise<AnyRecord> {
  const res = await fetch(documentUrl(config));
  if (!res.ok) throw new Error(`Firestore no permitio leer estado WTF (${res.status}).`);
  const doc = await res.json() as AnyRecord;
  return decodeFirestoreAppState(doc.fields);
}

async function writeAppState(config: ServiceConfig, appState: AnyRecord, result: IcgBackupSyncResult): Promise<void> {
  const packed = encodeCompressedAppState(appState);
  const payload = {
    fields: {
      appStateCompressed: encodeFirestoreValue(packed.compressed),
      appStateFormat: encodeFirestoreValue("pako-base64-json-v1"),
      appStateJsonBytes: encodeFirestoreValue(packed.jsonBytes),
      appStateCompressedBytes: encodeFirestoreValue(packed.compressedBytes),
      syncMeta: encodeFirestoreValue({
        clientId: "wtf-icg-host-backup",
        clientTime: Date.now(),
        signature: quickHashText(JSON.stringify(appState)),
        reason: "icg-backup-consumption-sync"
      }),
      updatedBy: encodeFirestoreValue("icg-backup-consumption-sync"),
      updatedAtHost: encodeFirestoreValue(new Date().toISOString()),
      lastIcgBackupSync: encodeFirestoreValue(result)
    }
  };
  const res = await fetch(documentUrl(config), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Firestore no permitio guardar estado WTF (${res.status}). ${text.slice(0, 300)}`);
  }
}

async function runSql(config: ServiceConfig, database: string, sql: string): Promise<string> {
  const args = ["-S", config.sqlServer, "-E"];
  if (database) args.push("-d", database);
  args.push("-W", "-s", "\t", "-Q", `SET NOCOUNT ON; ${sql}`);
  const { stdout, stderr } = await execFileAsync("sqlcmd", args, { maxBuffer: 40 * 1024 * 1024, windowsHide: true });
  const text = `${stdout || ""}${stderr ? `\n${stderr}` : ""}`;
  if (/Sqlcmd: error|Msg \d+/i.test(text)) throw new Error(text.slice(0, 2000));
  return stdout || "";
}

function quoteSql(value: string): string {
  return value.replace(/'/g, "''");
}

function parseSqlRows(output: string): AnyRecord[] {
  const lines = output.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.trim() && !/^\(\d+ filas? afectadas\)$/i.test(line.trim()));
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map((h) => h.trim());
  const rowsOut: AnyRecord[] = [];
  for (const line of lines.slice(2)) {
    if (/^-+\t?/.test(line)) continue;
    const parts = line.split("\t");
    if (parts.length < headers.length) continue;
    const row: AnyRecord = {};
    headers.forEach((header, index) => {
      const value = (parts[index] || "").trim();
      row[header] = value === "NULL" ? "" : value;
    });
    rowsOut.push(row);
  }
  return rowsOut;
}

function normalizeIcgClosureRows(rows: AnyRecord[], sourceName: string): AnyRecord[] {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const fecha = String(row.FechaCierre || row.Fecha || "").slice(0, 10);
    return {
      _id: `sql-cierre-${fecha || quickHashText(JSON.stringify(row))}`,
      Archivo: sourceName,
      FechaCierre: fecha || String(row.FechaCierre || row.Fecha || ""),
      Tickets: Math.round(parseNumber(row.Tickets)),
      Lineas: Math.round(parseNumber(row.Lineas)),
      VentaBruta: Number(parseNumber(row.VentaBruta).toFixed(2)),
      VentaNeta: Number(parseNumber(row.VentaNeta).toFixed(2)),
      Pagos: Number(parseNumber(row.Pagos).toFixed(2)),
      Propina: Number(parseNumber(row.Propina).toFixed(2)),
      Estado: row.Estado || "Calculado desde Base de Datos ICG Local",
      Observacion: row.Observacion || "Generado desde TIQUETSCAB, TIQUETSLIN y pagos de la base local."
    };
  }).filter((row) => row.FechaCierre);
}

function mergeClosureRows(existingRows: AnyRecord[], newRows: AnyRecord[]): AnyRecord[] {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `${currentYear}-`;
  const map = new Map<string, AnyRecord>();
  (Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
    const key = String(row.FechaCierre || row.Fecha || row._id || "").trim();
    if (!key.startsWith(yearPrefix)) return;
    if (key) map.set(key, row);
  });
  (Array.isArray(newRows) ? newRows : []).forEach((row) => {
    const key = String(row.FechaCierre || row.Fecha || row._id || "").trim();
    if (!key) return;
    if (!key.startsWith(yearPrefix)) return;
    map.set(key, Object.assign({}, map.get(key) || {}, row));
  });
  return Array.from(map.values()).sort((a, b) => String(b.FechaCierre || "").localeCompare(String(a.FechaCierre || ""))).slice(0, 1200);
}

async function readBackupDailyClosures(config: ServiceConfig, databaseName: string): Promise<AnyRecord[]> {
  const currentYear = new Date().getFullYear();
  const paymentsExists = parseSqlRows(await runSql(config, databaseName, "SELECT CASE WHEN OBJECT_ID('TIQUETSPAG','U') IS NULL THEN 0 ELSE 1 END AS Existe;"))[0]?.Existe === "1";
  const paymentsJoin = paymentsExists
    ? "LEFT JOIN (SELECT FO,SERIE,NUMERO,N,SUM(IMPORTE) AS PAGOS FROM TIQUETSPAG GROUP BY FO,SERIE,NUMERO,N) p ON p.FO=c.FO AND p.SERIE=c.SERIE AND p.NUMERO=c.NUMERO AND p.N=c.N"
    : "LEFT JOIN (SELECT CAST(NULL AS varchar(20)) AS FO, CAST(NULL AS varchar(20)) AS SERIE, CAST(NULL AS int) AS NUMERO, CAST(NULL AS int) AS N, CAST(0 AS decimal(18,4)) AS PAGOS WHERE 1=0) p ON 1=0";
  const sql = `
WITH cab AS (
  SELECT
    CONVERT(date,c.FECHA) AS FechaCierre,
    c.FO,
    c.SERIE,
    c.NUMERO,
    c.N,
    ISNULL(c.TOTALBRUTO,0) AS TOTALBRUTO,
    ISNULL(c.TOTALNETO,0) AS TOTALNETO,
    ISNULL(c.PROPINA,0) AS PROPINA
  FROM TIQUETSCAB c
  WHERE (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101')
    AND CONVERT(date,c.FECHA) >= '${currentYear}-01-01'
    AND CONVERT(date,c.FECHA) < '${currentYear + 1}-01-01'
),
lineas AS (
  SELECT FO,SERIE,NUMERO,N,COUNT(NUMLINEA) AS Lineas
  FROM TIQUETSLIN
  GROUP BY FO,SERIE,NUMERO,N
)
SELECT
  CONVERT(varchar(10), c.FechaCierre, 120) AS FechaCierre,
  CAST(COUNT(*) AS int) AS Tickets,
  CAST(SUM(ISNULL(l.Lineas,0)) AS int) AS Lineas,
  CAST(SUM(ISNULL(c.TOTALBRUTO,0)) AS decimal(18,2)) AS VentaBruta,
  CAST(SUM(ISNULL(c.TOTALNETO,0)) AS decimal(18,2)) AS VentaNeta,
  CAST(SUM(ISNULL(p.PAGOS,0)) AS decimal(18,2)) AS Pagos,
  CAST(SUM(ISNULL(c.PROPINA,0)) AS decimal(18,2)) AS Propina,
  'Calculado desde Base de Datos ICG Local' AS Estado,
  'Generado desde SQL/base local ICG' AS Observacion
FROM cab c
LEFT JOIN lineas l ON l.FO=c.FO AND l.SERIE=c.SERIE AND l.NUMERO=c.NUMERO AND l.N=c.N
${paymentsJoin}
GROUP BY c.FechaCierre
ORDER BY FechaCierre DESC;`;
  return normalizeIcgClosureRows(parseSqlRows(await runSql(config, databaseName, sql)), path.basename(config.icgBackupPath || databaseName));
}

function sourceDatabaseName(config: ServiceConfig): string {
  return String(config.icgLiveDatabaseName || "").trim() || config.icgAuditDbName;
}

function auditBackupConfig(config: ServiceConfig): ServiceConfig {
  return Object.assign({}, config, { icgLiveDatabaseName: "" });
}

export async function restoreIcgBackupForAudit(config: ServiceConfig): Promise<void> {
  if (String(config.icgLiveDatabaseName || "").trim()) return;
  await fs.access(config.icgBackupPath);
  await fs.mkdir(config.icgSqlDataDir, { recursive: true });
  const mdf = path.join(config.icgSqlDataDir, `${config.icgAuditDbName}.mdf`);
  const ldf = path.join(config.icgSqlDataDir, `${config.icgAuditDbName}_log.ldf`);
  const sql = `
IF DB_ID(N'${quoteSql(config.icgAuditDbName)}') IS NOT NULL
BEGIN
  ALTER DATABASE [${config.icgAuditDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE [${config.icgAuditDbName}];
END
RESTORE DATABASE [${config.icgAuditDbName}]
FROM DISK = N'${quoteSql(config.icgBackupPath)}'
WITH MOVE N'FRS_WTFOODVZL' TO N'${quoteSql(mdf)}',
     MOVE N'FRS_WTFOODVZL_log' TO N'${quoteSql(ldf)}',
     REPLACE, RECOVERY, STATS = 20;
ALTER DATABASE [${config.icgAuditDbName}] SET READ_ONLY WITH ROLLBACK IMMEDIATE;`;
  await runSql(config, "master", sql);
}

export async function readLatestBackupConsumption(config: ServiceConfig): Promise<{
  fecha: string;
  rows: IcgBackupConsumptionRow[];
  tableCounts: Record<string, number>;
  articles: AnyRecord[];
  closures: AnyRecord[];
}> {
  const databaseName = sourceDatabaseName(config);
  const latest = parseSqlRows(await runSql(config, databaseName, "SELECT CONVERT(varchar(10), MAX(CONVERT(date,c.FECHA)), 120) AS Fecha FROM TIQUETSCONSUMO tc JOIN TIQUETSCAB c ON c.FO=tc.FO AND c.SERIE=tc.SERIE AND c.NUMERO=tc.NUMERO AND c.N=tc.N WHERE (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101');"))[0]?.Fecha;
  const closures = await readBackupDailyClosures(config, databaseName).catch(() => []);
  if (!latest) return { fecha: "", rows: [], tableCounts: {}, articles: [], closures };
  const dataSql = `
DECLARE @fecha date='${quoteSql(latest)}';
SELECT
  CONVERT(varchar(10), @fecha, 120) AS fecha,
  CAST(tc.CODARTICULO AS varchar(30)) AS codArticulo,
  ISNULL(a.REFERENCIA,'') AS referencia,
  ISNULL(a.DESCRIPCION,'') AS descripcion,
  ISNULL(tc.CODALMACEN,'') AS codAlmacen,
  CAST(SUM(tc.CONSUMO) AS decimal(18,4)) AS consumo,
  CAST(COUNT(*) AS int) AS lineas
FROM TIQUETSCONSUMO tc
JOIN TIQUETSCAB c ON c.FO=tc.FO AND c.SERIE=tc.SERIE AND c.NUMERO=tc.NUMERO AND c.N=tc.N
LEFT JOIN ARTICULOS a ON a.CODARTICULO=tc.CODARTICULO
WHERE CONVERT(date,c.FECHA)=@fecha AND (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101')
GROUP BY tc.CODARTICULO,a.REFERENCIA,a.DESCRIPCION,tc.CODALMACEN
ORDER BY tc.CODARTICULO,tc.CODALMACEN;`;
  const countSql = "SELECT t.name AS tableName, CAST(SUM(p.rows) AS int) AS rowsCount FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1) WHERE t.name IN ('TIQUETSCAB','TIQUETSLIN','TIQUETSCONSUMO','ARTICULOS','REFERENCIAS','KITS','STOCKS','MOVIMENTS') GROUP BY t.name;";
  const articlesSql = `
SELECT
  CAST(CODARTICULO AS varchar(30)) AS CodArticulo,
  ISNULL(REFERENCIA,'') AS Referencia,
  ISNULL(DESCRIPCION,'') AS Descripcion,
  ISNULL(CAST(DPTO AS varchar(30)),'') AS Dpto,
  ISNULL(CAST(SECCION AS varchar(30)),'') AS Seccion,
  ISNULL(CAST(UNIDADES AS varchar(30)),'') AS Unidades,
  '' AS PCoste,
  ISNULL(UNIDADMEDIDA,'') AS UnidadMedida,
  ISNULL(CAST(SECOMPRA AS varchar(10)),'') AS SeCompra,
  ISNULL(CAST(SEVENDE AS varchar(10)),'') AS SeVende,
  ISNULL(CAST(USASTOCKS AS varchar(10)),'') AS UsaStocks,
  ISNULL(CAST(STOCKMINIMO AS varchar(30)),'') AS StockMinimo,
  ISNULL(CAST(COSTEMEDIO AS varchar(30)),'') AS CosteMedio,
  ISNULL(CAST(ULTIMOCOSTE AS varchar(30)),'') AS UltimoCoste,
  ISNULL(CAST(SUSPENDIDO AS varchar(10)),'') AS Suspendido,
  ISNULL(CAST(DESCATALOGADO AS varchar(10)),'') AS Descatalogado,
  ISNULL(CONVERT(varchar(19),FECHAMODIFICADO,120),'') AS FechaModificado
FROM ARTICULOS
ORDER BY CODARTICULO;`;
  const sqlRows = parseSqlRows(await runSql(config, databaseName, dataSql));
  const countRows = parseSqlRows(await runSql(config, databaseName, countSql));
  const articles = parseSqlRows(await runSql(config, databaseName, articlesSql));
  return {
    fecha: latest,
    rows: sqlRows.map((row) => ({
      fecha: String(row.fecha || latest),
      codArticulo: String(row.codArticulo || ""),
      referencia: String(row.referencia || ""),
      descripcion: String(row.descripcion || ""),
      codAlmacen: String(row.codAlmacen || ""),
      consumo: parseNumber(row.consumo),
      lineas: Math.round(parseNumber(row.lineas))
    })).filter((row) => row.consumo > 0 && row.codArticulo),
    tableCounts: Object.fromEntries(countRows.map((row) => [String(row.tableName), Math.round(parseNumber(row.rowsCount))])),
    articles,
    closures
  };
}

function createBackupMovement(
  line: IcgBackupConsumptionRow,
  fecha: string,
  importKey: string,
  estado: SyncMovement["estado"],
  mensaje: string,
  productoWtf = "",
  cantidad = line.consumo,
  unidad = "Uni"
): SyncMovement {
  return {
    id: `icg-local-${importKey}`,
    idempotencyKey: `icg-local-${importKey}`,
    fecha: `${fecha}T00:00:00.000Z`,
    origen: "ICG FrontRest",
    destino: "Sistema Web",
    tipo: "salida",
    codigoProducto: line.codArticulo,
    nombreProducto: productoWtf || line.descripcion || `ICG ${line.codArticulo}`,
    cantidad,
    unidad,
    almacen: line.codAlmacen || "ICG",
    estado,
    mensaje,
    intentos: 0,
    referencia: line.referencia,
    raw: {
      importKey,
      codAlmacen: line.codAlmacen,
      productoIcg: line.descripcion,
      consumo: line.consumo,
      lineas: line.lineas
    }
  };
}

export async function applyBackupConsumptionToFirestore(config: ServiceConfig, rowsToApply: IcgBackupConsumptionRow[], fecha: string, tableCounts: Record<string, number>, articles: AnyRecord[] = [], closures: AnyRecord[] = []): Promise<IcgBackupSyncResult> {
  const result: IcgBackupSyncResult = {
    ok: false,
    backupPath: config.icgBackupPath,
    databaseName: sourceDatabaseName(config),
    fecha,
    totalLines: rowsToApply.length,
    matched: 0,
    applied: 0,
    skipped: 0,
    pending: 0,
    errors: [],
    message: "",
    tableCounts,
    movements: []
  };
  const appState = await readAppState(config);
  const icg = ensureIcgData(appState);
  mergeBackupArticlesIntoIcgData(icg, articles);
  const currentClosures = icg.datasets.CierresDiarios || { key: "CierresDiarios", label: "Cierres diarios", columns: CIERRES_DIARIOS_COLUMNS, rows: [] };
  if (closures.length) {
    icg.datasets.CierresDiarios = Object.assign({}, currentClosures, {
      columns: Array.from(new Set([...(currentClosures.columns || []), ...CIERRES_DIARIOS_COLUMNS])),
      rows: mergeClosureRows(currentClosures.rows || [], closures)
    });
  }
  const links = rows(appState, "VinculosMiseICG").filter(active);
  const appliedKeys = new Set((icg.appliedImports || []).map(String));
  const consumoRows: AnyRecord[] = icg.datasets.ConsumoMiseVentas.rows || [];
  const existingConsumptionKeys = new Set(consumoRows.map((row) => String(row.ImportKey || "")));
  const now = new Date().toISOString();
  const newConsumption: AnyRecord[] = [];

  for (const line of rowsToApply) {
    const link = links.find((row) => {
      const linkCode = normalizar(row.CodArticulo || row.Codigo || "");
      const linkRef = normalizar(row.Referencia || "");
      return linkCode && normalizar(line.codArticulo) === linkCode || linkRef && normalizar(line.referencia) === linkRef;
    });
    const importKey = quickHashText(["icg-bak", fecha, line.codArticulo, line.referencia, line.codAlmacen].join("|"));
    if (appliedKeys.has(importKey)) {
      result.skipped += 1;
      result.movements?.push(createBackupMovement(line, fecha, importKey, "sincronizado", "Consumo ICG ya procesado anteriormente."));
      continue;
    }
    if (!link) {
      result.pending += 1;
      result.movements?.push(createBackupMovement(line, fecha, importKey, "pendiente_revision", "Sin vinculo WTF; requiere mapear ProductoMise/ProductoWTF."));
      const pendingRow = {
        Fecha: fecha,
        ModuloWTF: "",
        ProductoWTF: "",
        ProductoMise: "",
        CodArticulo: line.codArticulo,
        Referencia: line.referencia,
        ProductoICG: line.descripcion,
        UnidadesVendidas: line.consumo,
        CantidadDescontar: line.consumo,
        Unidad: "Uni",
        Archivo: path.basename(config.icgBackupPath),
        ImportKey: importKey,
        Estado: "Sin vinculo",
        CodAlmacen: line.codAlmacen
      };
      if (!existingConsumptionKeys.has(importKey)) newConsumption.push(pendingRow);
      continue;
    }
    const target = targetKey(link.ModuloWTF || link.DestinoWTF || link.Modulo || "Mise an Place Cocina");
    const producto = String(link.ProductoWTF || link.ProductoMise || "").trim();
    if (!producto) {
      const message = `Vinculo sin ProductoWTF para CodArticulo ${line.codArticulo}.`;
      result.errors.push(message);
      result.movements?.push(createBackupMovement(line, fecha, importKey, "error", message));
      continue;
    }
    const qtyFactor = parseNumber(link.CantidadPorVenta) || 1;
    const cantidad = Number((line.consumo * qtyFactor).toFixed(4));
    const list: AnyRecord[] = Array.isArray(appState[target]) ? appState[target] : [];
    const item = list.find((row) => normalizar(targetProductName(row, target)) === normalizar(producto));
    const consumoRow: AnyRecord = {
      Fecha: fecha,
      ModuloWTF: targetLabel(target),
      targetKey: target,
      ProductoWTF: producto,
      ProductoMise: String(link.ProductoMise || producto),
      CodArticulo: line.codArticulo,
      Referencia: line.referencia,
      ProductoICG: line.descripcion,
      UnidadesVendidas: line.consumo,
      CantidadDescontar: cantidad,
      Unidad: link.Unidad || link.Medida || "Uni",
      Archivo: path.basename(config.icgBackupPath),
      ImportKey: importKey,
      Estado: "Pendiente",
      CodAlmacen: line.codAlmacen
    };
    result.matched += 1;
    if (!item) {
      consumoRow.Estado = "Producto WTF no encontrado";
      const message = `${producto} no existe en ${targetLabel(target)}.`;
      result.errors.push(message);
      result.movements?.push(createBackupMovement(line, fecha, importKey, "error", message, producto, cantidad, consumoRow.Unidad));
      if (!existingConsumptionKeys.has(importKey)) newConsumption.push(consumoRow);
      continue;
    }
    const existenciaAnterior = targetExistence(item, target);
    applyTargetSalida(item, target, cantidad);
    const existenciaNueva = targetExistence(item, target);
    consumoRow.Estado = "Aplicado";
    consumoRow.ExistenciaActual = existenciaAnterior;
    consumoRow.ExistenciaNueva = existenciaNueva;
    appliedKeys.add(importKey);
    result.applied += 1;
    result.movements?.push(createBackupMovement(line, fecha, importKey, "sincronizado", "Descuento aplicado en WTF Web desde Base de Datos ICG Local.", targetProductName(item, target), cantidad, consumoRow.Unidad));
    if (!existingConsumptionKeys.has(importKey)) newConsumption.push(consumoRow);

    const historyKey = target === "barMiseAnPlace" ? "barHistSalidaRapida" : target === "miseAnPlace" ? "histSalidaRapida" : target.includes("bar") ? "barRegSalidas" : "regSalidas";
    appState[historyKey] = Array.isArray(appState[historyKey]) ? appState[historyKey] : [];
    appState[historyKey].push({
      id: `icg-bak-${importKey}`,
      fecha: now,
      producto: targetProductName(item, target),
      medida: item.medida || consumoRow.Unidad || "Uni",
      cantidad,
      existenciaAnterior,
      existenciaNueva,
      usuario: "ICG FrontRest Backup",
      origen: "ICG FrontRest Backup",
      archivo: path.basename(config.icgBackupPath),
      codArticulo: line.codArticulo,
      codAlmacen: line.codAlmacen,
      importKey
    });
  }

  icg.datasets.ConsumoMiseVentas.rows = newConsumption.concat(consumoRows).slice(0, 8000);
  icg.appliedImports = Array.from(appliedKeys).slice(-10000);
  icg.processedBackupDates.unshift({ fecha, backupPath: config.icgBackupPath, processedAt: now, applied: result.applied, matched: result.matched, pending: result.pending, errors: result.errors });
  icg.processedBackupDates = icg.processedBackupDates.slice(0, 300);
  icg.sourceName = path.basename(config.icgBackupPath);
  icg.updatedAt = now;
  result.ok = result.errors.length === 0 || result.applied > 0 || result.pending > 0;
  result.message = result.applied
    ? `Backup ICG aplicado: ${result.applied} descuentos. Pendientes sin vinculo: ${result.pending}.`
    : `Backup ICG leido sin descuentos aplicados. Pendientes sin vinculo: ${result.pending}.`;
  await writeAppState(config, appState, result);
  return result;
}

export async function syncIcgBackupConsumption(config: ServiceConfig): Promise<IcgBackupSyncResult> {
  if (!config.autoApplyIcgBackup) {
    return {
      ok: true,
      backupPath: config.icgBackupPath,
      databaseName: sourceDatabaseName(config),
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      pending: 0,
      errors: [],
      message: "Sincronizacion de backup ICG desactivada."
    };
  }
  let activeConfig = config;
  let data: Awaited<ReturnType<typeof readLatestBackupConsumption>>;
  try {
    await restoreIcgBackupForAudit(activeConfig);
    data = await readLatestBackupConsumption(activeConfig);
  } catch (error) {
    if (!String(config.icgLiveDatabaseName || "").trim()) throw error;
    activeConfig = auditBackupConfig(config);
    await restoreIcgBackupForAudit(activeConfig);
    data = await readLatestBackupConsumption(activeConfig);
  }
  if (!data.fecha || !data.rows.length) {
    if (data.closures.length) {
      const fecha = data.fecha || String(data.closures[0]?.FechaCierre || "").slice(0, 10);
      const result = await applyBackupConsumptionToFirestore(activeConfig, [], fecha, data.tableCounts, data.articles, data.closures);
      result.message = "Cierres diarios ICG actualizados desde Base de Datos Local. No se encontraron consumos para aplicar.";
      return result;
    }
    return {
      ok: true,
      backupPath: activeConfig.icgBackupPath,
      databaseName: sourceDatabaseName(activeConfig),
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      pending: 0,
      errors: [],
      message: "Backup ICG restaurado, pero no contiene consumos para aplicar.",
      tableCounts: data.tableCounts
    };
  }
  return applyBackupConsumptionToFirestore(activeConfig, data.rows, data.fecha, data.tableCounts, data.articles, data.closures);
}
