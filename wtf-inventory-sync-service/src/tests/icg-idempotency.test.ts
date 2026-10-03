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
import { buildTechnicalSignature } from "../security/technical-host-client.js";

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
  n: "B",
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

const technicalBody = JSON.stringify({ resource: "wtfSistema/icgControl", method: "GET", fields: {} });
const technicalSignature = buildTechnicalSignature("test-credential", "POST", "/wtfHostFirestoreGateway", "1770000000000", "nonce-1", technicalBody);
assert.equal(
  technicalSignature,
  buildTechnicalSignature("test-credential", "POST", "/wtfHostFirestoreGateway", "1770000000000", "nonce-1", technicalBody),
  "Una solicitud tecnica identica debe producir una firma identica."
);
assert.notEqual(
  technicalSignature,
  buildTechnicalSignature("test-credential", "POST", "/wtfHostFirestoreGateway", "1770000000000", "nonce-1", technicalBody + " "),
  "Cambiar el cuerpo debe invalidar la firma tecnica."
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
const recentConsumptionPreviewBody = adapterSource.slice(
  adapterSource.indexOf("async function readRecentIcgConsumptionPreview"),
  adapterSource.indexOf("function sourceDatabaseName")
);
const dailyClosuresBody = adapterSource.slice(
  adapterSource.indexOf("async function readBackupDailyClosures"),
  adapterSource.indexOf("async function readRecentIcgConsumptionPreview")
);

assert.ok(catalogReaderBody.includes("'ARTICULOS','REFERENCIAS','STOCKS','PRECIOSVENTA'"), "La lectura activa debe limitarse a catalogos, referencias, stocks y precios.");
assert.ok(catalogReaderBody.includes("readRecentIcgConsumptionPreview"), "Sincronizar debe cargar una vista previa de movimientos ICG recientes.");
assert.ok(/FROM\s+TIQUETSLIN/i.test(recentConsumptionPreviewBody), "La cola visible del Host debe alimentarse exclusivamente desde TIQUETSLIN.");
const oldConsumptionTablePattern = new RegExp(["TIQUETS", "CONSUMO"].join("") + "|TICKETLIN|TIQUETLIN", "i");
assert.ok(!oldConsumptionTablePattern.test(recentConsumptionPreviewBody), "La cola del Host no debe usar fuentes antiguas de consumos ni tickets.");
assert.ok(/GROUP BY[\s\S]*tl\.NUMLINEA,\s*tl\.CODARTICULO/i.test(recentConsumptionPreviewBody), "TIQUETSLIN debe consolidarse por movimiento/articulo ICG para evitar filas duplicadas en la cola.");
assert.ok(/TRY_CONVERT\s*\(\s*datetime,\s*tl\.HORA/i.test(recentConsumptionPreviewBody), "La lectura de TIQUETSLIN debe alimentar la fecha desde HORA.");
assert.ok(/COALESCE\s*\(\s*NULLIF\s*\(\s*CAST\s*\(\s*tl\.SERIE/i.test(recentConsumptionPreviewBody), "La lectura de TIQUETSLIN debe alimentar SERIE con respaldo desde TIQUETSCAB.");
assert.ok(/COALESCE\s*\(\s*NULLIF\s*\(\s*CAST\s*\(\s*tl\.NUMERO/i.test(recentConsumptionPreviewBody), "La lectura de TIQUETSLIN debe alimentar NUMERO con respaldo desde TIQUETSCAB.");
assert.ok(/UPPER\s*\(\s*LTRIM\s*\(\s*RTRIM[\s\S]*=\s*'B'/i.test(recentConsumptionPreviewBody), "La lectura de TIQUETSLIN debe sincronizar solo tickets con N = B.");
assert.ok(/CONVERT\s*\(\s*date\s*,\s*c\.FECHA\s*\)\s*>=\s*'20260914'/i.test(recentConsumptionPreviewBody), "La lectura de TIQUETSLIN debe incluir ventas desde el cierre 14/09/2026 en adelante.");
assert.ok(!/@UltimaFechaCierre|MAX\s*\(\s*CONVERT\s*\(\s*date\s*,\s*c\.FECHA\s*\)\s*\)/i.test(recentConsumptionPreviewBody), "La lectura de TIQUETSLIN no debe limitarse solo al ultimo cierre.");
assert.ok(!/SELECT\s+TOP\s+(?!0\b)\d+/i.test(recentConsumptionPreviewBody), "La cola de movimientos no debe recortar lineas ICG con TOP; debe permitir historial amplio dentro del rango configurado.");
assert.ok(!/DATEADD\s*\(|GETDATE\s*\(\)\s*\)/i.test(recentConsumptionPreviewBody), "La cola de movimientos no debe filtrar ventas antiguas por fecha actual del servidor.");
assert.ok(/CONVERT\s*\(\s*date\s*,\s*c\.FECHA\s*\)\s*>=\s*'20260914'/i.test(dailyClosuresBody), "Cierres diarios debe incluir cierres desde el 14/09/2026 en adelante.");
assert.ok(!/SELECT\s+TOP\s+1/i.test(dailyClosuresBody), "Cierres diarios no debe limitarse al ultimo cierre.");

const catalogSyncBody = adapterSource.slice(
  adapterSource.indexOf("async function syncIcgCatalogToFirestore"),
  adapterSource.indexOf("export async function syncIcgBackupConsumption")
);
const createMovementBody = adapterSource.slice(
  adapterSource.indexOf("function createBackupMovement"),
  adapterSource.indexOf("export function icgPhysicalConsumptionSourceKey")
);
assert.ok(!/applyBackupConsumptionToFirestore\s*\(/i.test(catalogSyncBody), "La sincronizacion de catalogos/vista previa no debe aplicar salidas automaticas.");
assert.ok(catalogSyncBody.includes("La Web.App aplicara las salidas automaticas"), "La cola del Host debe indicar que la Web.App aplica las salidas.");
assert.ok(catalogSyncBody.includes("preserveLocalIcgQueue"), "Si falla la lectura de TIQUETSLIN, el Host debe conservar la cola local anterior.");
assert.ok(catalogSyncBody.includes("TIQUETSLIN leido correctamente, sin movimientos disponibles"), "Una lectura correcta sin filas debe informarse distinto a un error de lectura.");
assert.ok(catalogSyncBody.includes("No se pudo leer TIQUETSLIN"), "Un error de lectura debe quedar visible en el resultado de sincronizacion.");
assert.ok(mainSource.includes("replaceIcgPreviewMovements"), "Cada sincronizacion debe reemplazar la cola ICG visible para limpiar filas viejas de desglose.");
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
assert.ok(catalogReaderBody.includes("readBackupDailyClosures(config, databaseName)"), "Actualizar Articulos ICG debe leer cierres diarios desde la base local activa.");
assert.ok(catalogSyncBody.includes("const visibleClosures = filterIcgDeletedRows(icg, \"CierresDiarios\", data.closures)") && catalogSyncBody.includes("rows: visibleClosures"), "Actualizar Articulos ICG debe reemplazar CierresDiarios con los cierres leidos desde SQL respetando marcas de borrado.");
assert.ok(!/SELECT\s+TOP\s+1\s+\*/i.test(dailyClosuresBody), "CierresDiarios debe traer todos los cierres desde el 14/09/2026 en adelante.");
assert.ok(/ORDER\s+BY\s+FechaCierre\s+DESC/i.test(dailyClosuresBody), "Los cierres deben mantenerse ordenados por FechaCierre descendente.");

console.log("ICG idempotency tests passed");
