import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  consumptionAuditKey,
  consumptionPhysicalKey,
  icgPhysicalConsumptionSourceKey,
  movementIcgIdFromLine
} from "../adapters/icg-backup-sync-adapter.js";
import type { IcgBackupConsumptionRow } from "../core/types.js";

const adapterSourcePath = fs.existsSync("src/adapters/icg-backup-sync-adapter.ts")
  ? "src/adapters/icg-backup-sync-adapter.ts"
  : path.resolve(__dirname, "../adapters/icg-backup-sync-adapter.js");
const adapterSource = fs.readFileSync(adapterSourcePath, "utf8");
const mainSourcePath = fs.existsSync("src/main.ts")
  ? "src/main.ts"
  : path.resolve(__dirname, "../main.js");
const mainSource = fs.readFileSync(mainSourcePath, "utf8");

const baseLine: IcgBackupConsumptionRow = {
  fecha: "2026-09-08",
  fechaHora: "2026-09-08 18:05:10",
  fo: "1",
  serie: "A001",
  numero: "169",
  n: "1",
  numLinea: "4",
  tipoMovimiento: "venta",
  codArticulo: "10043",
  referencia: "10042",
  descripcion: "Agua Tonica",
  codAlmacen: "BAR",
  consumo: 1,
  lineas: 1
};

const samePhysicalLineDifferentClock: IcgBackupConsumptionRow = {
  ...baseLine,
  fechaHora: "2026-09-08 23:59:59",
  consumo: 5,
  lineas: 5
};

const anotherConsumptionLine: IcgBackupConsumptionRow = {
  ...baseLine,
  numLinea: "5"
};

const anotherArticleSameLine: IcgBackupConsumptionRow = {
  ...baseLine,
  codArticulo: "10044",
  referencia: "10044",
  descripcion: "Agua Mineral"
};

const sameArticleDifferentTicket: IcgBackupConsumptionRow = {
  ...baseLine,
  numero: "170",
  consumo: 2
};

assert.equal(
  movementIcgIdFromLine(baseLine, "2026-09-08"),
  movementIcgIdFromLine(samePhysicalLineDifferentClock, "2026-09-08"),
  "La misma linea fisica de ICG debe conservar el mismo MovimientoICGId aunque cambie la hora o cantidad agregada."
);

assert.equal(
  icgPhysicalConsumptionSourceKey(baseLine),
  icgPhysicalConsumptionSourceKey(samePhysicalLineDifferentClock),
  "La llave fuente de TIQUETSLIN no debe depender de la hora ni de cambios de cantidad."
);

assert.notEqual(
  movementIcgIdFromLine(baseLine, "2026-09-08"),
  movementIcgIdFromLine(anotherConsumptionLine, "2026-09-08"),
  "Dos lineas distintas del mismo ticket deben mantener IDs independientes."
);

assert.notEqual(
  movementIcgIdFromLine(baseLine, "2026-09-08"),
  movementIcgIdFromLine(anotherArticleSameLine, "2026-09-08"),
  "Dos articulos ICG distintos no pueden compartir el mismo MovimientoICGId."
);

assert.notEqual(
  movementIcgIdFromLine(baseLine, "2026-09-08"),
  movementIcgIdFromLine(sameArticleDifferentTicket, "2026-09-08"),
  "El mismo articulo vendido en otra factura debe generar un MovimientoICGId independiente."
);

assert.equal(
  consumptionPhysicalKey(baseLine, "Inventario Bar", "Agua Tonica"),
  consumptionPhysicalKey(samePhysicalLineDifferentClock, "Inventario Bar", "Agua Tonica"),
  "La proteccion contra doble descuento debe sobrevivir a cambios de hora y cantidad."
);

assert.notEqual(
  consumptionPhysicalKey(baseLine, "Inventario Bar", "Agua Tonica"),
  consumptionPhysicalKey(baseLine, "Inventario Bar", "Presidente Light"),
  "Productos WTF distintos necesitan llaves fisicas distintas para no bloquear mapeos validos."
);

assert.notEqual(
  consumptionPhysicalKey(baseLine, "Inventario Bar", "Agua Tonica"),
  consumptionPhysicalKey(sameArticleDifferentTicket, "Inventario Bar", "Agua Tonica"),
  "La proteccion fisica debe separar facturas distintas aunque sea el mismo articulo."
);

assert.equal(
  consumptionAuditKey(baseLine, "Inventario Bar", "Agua Tonica", "2026-09-08"),
  consumptionAuditKey(samePhysicalLineDifferentClock, "Inventario Bar", "Agua Tonica", "2026-09-08"),
  "La auditoria de consumo no debe duplicarse por cambios de hora."
);

const catalogReaderBody = adapterSource.slice(
  adapterSource.indexOf("export async function readLatestBackupConsumption"),
  adapterSource.indexOf("function createBackupMovement")
);
const appStateWriterBody = adapterSource.slice(
  adapterSource.indexOf("async function writeAppState"),
  adapterSource.indexOf("async function runSql")
);
const recentConsumptionPreviewBody = adapterSource.slice(
  adapterSource.indexOf("async function readRecentIcgConsumptionPreview"),
  adapterSource.indexOf("function sourceDatabaseName")
);

assert.ok(catalogReaderBody.includes("'ARTICULOS','REFERENCIAS','STOCKS','PRECIOSVENTA'"), "La lectura activa debe limitarse a catalogos, referencias, stocks y precios.");
assert.ok(catalogReaderBody.includes("readRecentIcgConsumptionPreview"), "Sincronizar debe cargar una vista previa de movimientos ICG recientes.");
assert.ok(appStateWriterBody.includes("HOST_READ_ONLY_SHARD_KEYS"), "El Host no debe reenviar shards grandes de módulos ajenos a ICG.");
assert.ok(appStateWriterBody.includes("appStateShardKeys: encodeFirestoreValue(splitState.shards.map"), "El índice debe conservar los shards que el Host no reescribe.");
assert.ok(/FROM\s+TIQUETSLIN/i.test(recentConsumptionPreviewBody), "La cola visible del Host debe alimentarse exclusivamente desde TIQUETSLIN.");
const oldConsumptionTablePattern = new RegExp(["TIQUETS", "CONSUMO"].join("") + "|TICKETLIN|TIQUETLIN", "i");
assert.ok(!oldConsumptionTablePattern.test(recentConsumptionPreviewBody), "La cola del Host no debe usar fuentes antiguas de consumos ni tickets.");
assert.ok(!/GROUP BY/i.test(recentConsumptionPreviewBody), "TIQUETSLIN no debe agrupar filas fisicas antes de sincronizarlas.");
assert.ok(catalogReaderBody.includes("readSqlTableColumns") && catalogReaderBody.includes("TIQUETSLIN"), "La lectura de TIQUETSLIN debe detectar las columnas reales de la base activa antes de construir la consulta.");
assert.ok(recentConsumptionPreviewBody.includes("LINEID"), "Cada linea debe conservar una identidad fisica cuando la tabla la proporcione.");
assert.ok(recentConsumptionPreviewBody.includes("icgConsumptionFromDate"), "La lectura debe admitir una fecha minima configurable para recuperar ventas desde un dia concreto.");
assert.ok(recentConsumptionPreviewBody.includes("Date.parse(`${fromDate}T00:00:00`"), "El filtro de fecha debe aplicarse después de leer las filas y no descartar silenciosamente la venta.");
assert.ok(/TRY_CONVERT\s*\(\s*datetime/i.test(recentConsumptionPreviewBody), "La lectura de TIQUETSLIN debe convertir fechas solo desde columnas existentes.");
assert.ok(!/FROM\s+TIQUETSCAB/i.test(recentConsumptionPreviewBody), "La cola visible debe alimentarse directamente desde TIQUETSLIN.");
assert.ok(!/SELECT\s+TOP\s+(?!0\b)\d+/i.test(recentConsumptionPreviewBody), "La cola de movimientos no debe recortar lineas ICG con TOP; debe permitir historial amplio dentro del rango configurado.");
assert.ok(!/DATEADD\s*\(|GETDATE\s*\(\)\s*\)/i.test(recentConsumptionPreviewBody), "La cola de movimientos no debe filtrar ventas antiguas por fecha actual del servidor.");
assert.ok(recentConsumptionPreviewBody.includes("ticketTypeFilter"), "La cola debe conservar el filtro de ventas de FrontRest cuando la columna N exista.");
assert.ok(recentConsumptionPreviewBody.includes("sqlDateFilter"), "La fecha minima debe aplicarse como limite inferior para incluir fechas futuras.");

const catalogSyncBody = adapterSource.slice(
  adapterSource.indexOf("async function syncIcgCatalogToFirestore"),
  adapterSource.indexOf("export async function syncIcgBackupConsumption")
);
assert.ok(catalogSyncBody.includes("preserveRemoteIcgSales"), "Una lectura TIQUETSLIN vacia no debe borrar ventas ICG remotas.");
const createMovementBody = adapterSource.slice(
  adapterSource.indexOf("function createBackupMovement"),
  adapterSource.indexOf("export function icgPhysicalConsumptionSourceKey")
);
assert.ok(!/applyBackupConsumptionToFirestore\s*\(/i.test(catalogSyncBody), "La sincronizacion de catalogos/vista previa no debe aplicar salidas automaticas.");
assert.ok(catalogSyncBody.includes("No aplica salida ni descuento de inventario"), "La cola del Host debe identificar que las lineas ICG son informativas.");
assert.ok(catalogSyncBody.includes("preserveLocalIcgQueue"), "Si falla la lectura de TIQUETSLIN, el Host debe conservar la cola local anterior.");
assert.ok(catalogSyncBody.includes("TIQUETSLIN leido correctamente, sin movimientos disponibles"), "Una lectura correcta sin filas debe informarse distinto a un error de lectura.");
assert.ok(catalogSyncBody.includes("No se pudo leer TIQUETSLIN"), "Un error de lectura debe quedar visible en el resultado de sincronizacion.");
assert.ok(catalogReaderBody.includes("readBackupDailyClosures") && catalogReaderBody.includes("closures = await"), "La sincronizacion debe reconstruir Cierres Diarios desde TIQUETSLIN cuando sea posible.");
assert.ok(adapterSource.includes('"icgFrontRestData"') && adapterSource.includes("effectiveShardKeys"), "El Host debe leer el shard ICG aunque appStateShardKeys este incompleto.");
assert.ok(catalogSyncBody.includes("data.closures.length") && catalogSyncBody.includes("mergeClosureRows"), "La sincronizacion normal debe guardar Cierres Diarios calculados desde TIQUETSLIN.");
assert.ok(catalogSyncBody.includes("cierre(s) calculado(s) desde TIQUETSLIN"), "El resultado del Host debe informar los cierres calculados desde TIQUETSLIN.");
assert.ok(mainSource.includes("replaceIcgPreviewMovements"), "Cada sincronizacion debe consolidar la cola ICG visible.");
const localStoreSource = fs.readFileSync(
  fs.existsSync("src/core/local-store.ts") ? "src/core/local-store.ts" : path.resolve(__dirname, "../core/local-store.js"),
  "utf8"
);
assert.ok(localStoreSource.includes("icg_preview_movements_merged"), "La cola ICG debe fusionar respuestas parciales sin borrar lineas previamente conservadas.");
assert.ok(localStoreSource.includes("const previewRows = data.movements.filter(isIcgPreview)"), "La cola ICG debe conservar las lineas anteriores antes de incorporar nuevas respuestas.");
assert.ok(mainSource.includes("result.movements.length > 0"), "Una lectura TIQUETSLIN vacia no debe borrar la cola visible existente.");
assert.ok(mainSource.includes("!result.preserveLocalIcgQueue"), "La cola local no debe limpiarse cuando la vista previa de TIQUETSLIN falla.");
assert.ok(catalogReaderBody.includes("attachSalePricesToConsumptionRows(previewConsumptionRows, salePrices)"), "La cola informativa del Host debe cargar Precio Restaurante y Precio APPS Delivery internamente.");
assert.ok(createMovementBody.includes("PrecioRestaurante") && createMovementBody.includes("PrecioAppsDelivery"), "Las filas exportadas hacia Web.App deben conservar los precios de venta sin mostrarlos en la cola visible del Host.");

const applyBackupBody = adapterSource.slice(
  adapterSource.indexOf("export async function applyBackupConsumptionToFirestore"),
  adapterSource.indexOf("async function syncIcgCatalogToFirestore")
);
assert.ok(applyBackupBody.includes("queueMovementByIcg"), "La cola del Host debe consolidarse por articulo/movimiento ICG, no por cada producto WTF/Mise vinculado.");
assert.ok(!/result\.movements\?\.push\s*\(\s*createBackupMovement/i.test(applyBackupBody), "El desglose WTF/Mise no debe insertar multiples lineas en la cola visible del Host.");
assert.ok(/result\.movements\s*=\s*Array\.from\(queueMovementByIcg\.values\(\)\)/.test(applyBackupBody), "La cola visible debe publicarse una sola vez por MovimientoICGId.");
assert.ok(applyBackupBody.includes("const icgConsumptionDate = line.fecha"), "Ventas ICG debe conservar la fecha original de cada fila TIQUETSLIN.");
assert.ok(applyBackupBody.includes("Fecha: icgConsumptionDate"), "ConsumoMiseVentas no debe usar la fecha global del proceso como fecha de venta.");
assert.ok(applyBackupBody.includes("const ticketDisplay = icgTicketDisplayFromLine(line)"), "Ventas ICG debe guardar Ticket visible como SERIE-NUMERO.");
assert.ok(applyBackupBody.includes("const pausedMovementDate = line.fecha"), "La cola pausada debe conservar la fecha original de TIQUETSLIN.");
assert.ok(applyBackupBody.includes("const queueMovementDate = line.fecha"), "La cola consolidada debe conservar la fecha original de TIQUETSLIN.");
assert.ok(catalogSyncBody.includes("const movementDate = line.fecha"), "La cola informativa debe usar la fecha propia de TIQUETSLIN por movimiento.");
assert.ok(applyBackupBody.includes("const pricedRowsToApply = attachSalePricesToConsumptionRows(rowsToApply, salePrices)"), "Los descuentos aplicados deben heredar Precio Restaurante y Precio APPS Delivery desde PRECIOSVENTA.");
assert.ok(applyBackupBody.includes("PrecioRestaurante: line.precioRestaurante") && applyBackupBody.includes("PrecioAppsDelivery: line.precioAppsDelivery"), "ConsumoMiseVentas debe guardar los precios de venta en cada movimiento exportado.");

console.log("ICG idempotency tests passed");
