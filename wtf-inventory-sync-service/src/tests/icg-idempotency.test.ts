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
  "La llave fuente de TIQUETSCONSUMO no debe depender de la hora ni de cambios de cantidad."
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

assert.ok(catalogReaderBody.includes("'ARTICULOS','REFERENCIAS','STOCKS','PRECIOSVENTA'"), "La lectura activa debe limitarse a catalogos, referencias, stocks y precios.");
assert.ok(catalogReaderBody.includes("readRecentIcgConsumptionPreview"), "Sincronizar debe cargar una vista previa de movimientos ICG recientes.");
assert.ok(/FROM\s+TIQUETSCONSUMO/i.test(adapterSource), "La vista previa debe leer TIQUETSCONSUMO para alimentar la cola del Host.");

const catalogSyncBody = adapterSource.slice(
  adapterSource.indexOf("async function syncIcgCatalogToFirestore"),
  adapterSource.indexOf("export async function syncIcgBackupConsumption")
);
assert.ok(!/applyBackupConsumptionToFirestore\s*\(/i.test(catalogSyncBody), "La sincronizacion de catalogos/vista previa no debe aplicar salidas automaticas.");
assert.ok(catalogSyncBody.includes("No aplica salida ni descuento de inventario"), "La cola del Host debe identificar que las lineas ICG son informativas.");

const applyBackupBody = adapterSource.slice(
  adapterSource.indexOf("export async function applyBackupConsumptionToFirestore"),
  adapterSource.indexOf("async function syncIcgCatalogToFirestore")
);
assert.ok(applyBackupBody.includes("queueMovementByIcg"), "La cola del Host debe consolidarse por articulo/movimiento ICG, no por cada producto WTF/Mise vinculado.");
assert.ok(!/result\.movements\?\.push\s*\(\s*createBackupMovement/i.test(applyBackupBody), "El desglose WTF/Mise no debe insertar multiples lineas en la cola visible del Host.");
assert.ok(/result\.movements\s*=\s*Array\.from\(queueMovementByIcg\.values\(\)\)/.test(applyBackupBody), "La cola visible debe publicarse una sola vez por MovimientoICGId.");

console.log("ICG idempotency tests passed");
