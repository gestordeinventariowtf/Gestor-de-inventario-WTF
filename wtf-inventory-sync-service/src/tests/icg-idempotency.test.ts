import assert from "node:assert/strict";
import {
  consumptionAuditKey,
  consumptionPhysicalKey,
  icgPhysicalLineKey,
  movementIcgIdFromLine
} from "../adapters/icg-backup-sync-adapter.js";
import type { IcgBackupConsumptionRow } from "../core/types.js";

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

const anotherTicketLine: IcgBackupConsumptionRow = {
  ...baseLine,
  numLinea: "5"
};

const guidLine: IcgBackupConsumptionRow = {
  ...baseLine,
  guidLinea: "E3A89F91-1CC8-4F4E-ABCD-000000001234"
};

const sameGuidDifferentClockAndLine: IcgBackupConsumptionRow = {
  ...guidLine,
  fechaHora: "2026-09-08 23:59:59",
  numLinea: "99",
  consumo: 3
};

assert.equal(
  movementIcgIdFromLine(baseLine, "2026-09-08"),
  movementIcgIdFromLine(samePhysicalLineDifferentClock, "2026-09-08"),
  "La misma linea fisica de ICG debe conservar el mismo MovimientoICGId aunque cambie la hora o cantidad agregada."
);

assert.equal(
  icgPhysicalLineKey(baseLine),
  icgPhysicalLineKey(samePhysicalLineDifferentClock),
  "La llave fisica de TICKETLIN no debe depender de la hora."
);

assert.notEqual(
  movementIcgIdFromLine(baseLine, "2026-09-08"),
  movementIcgIdFromLine(anotherTicketLine, "2026-09-08"),
  "Dos lineas distintas del mismo ticket deben mantener IDs independientes."
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

assert.equal(
  consumptionAuditKey(baseLine, "Inventario Bar", "Agua Tonica", "2026-09-08"),
  consumptionAuditKey(samePhysicalLineDifferentClock, "Inventario Bar", "Agua Tonica", "2026-09-08"),
  "La auditoria de consumo no debe duplicarse por cambios de hora."
);

assert.equal(
  movementIcgIdFromLine(guidLine, "2026-09-08"),
  movementIcgIdFromLine(sameGuidDifferentClockAndLine, "2026-09-08"),
  "GUIDLINEA debe ser la identidad prioritaria aunque cambie hora, cantidad o NUMLINEA."
);

assert.equal(
  consumptionPhysicalKey(guidLine, "Inventario Bar", "Agua Tonica"),
  consumptionPhysicalKey(sameGuidDifferentClockAndLine, "Inventario Bar", "Agua Tonica"),
  "La proteccion de descuento debe usar GUIDLINEA como llave fisica prioritaria."
);

console.log("ICG idempotency tests passed");
