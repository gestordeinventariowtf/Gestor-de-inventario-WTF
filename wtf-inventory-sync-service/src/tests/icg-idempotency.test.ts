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
assert.ok(!/FROM\s+TIQUETSCONSUMO/i.test(catalogReaderBody), "Actualizar Articulos ICG no debe leer TIQUETSCONSUMO.");

console.log("ICG idempotency tests passed");
