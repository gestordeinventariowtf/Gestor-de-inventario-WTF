import { makeEventId, makeIdempotencyKey } from "./ids.js";

export function buildPilotReconciliation({
  sales = [],
  inventoryMovements = [],
  reference = {},
  tolerance = 0.01,
  now = new Date()
} = {}) {
  const paidSales = sales.filter((sale) => sale.status === "paid");
  const pos = {
    salesCount: paidSales.length,
    grossTotal: round2(paidSales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0)),
    itbis: round2(paidSales.reduce((sum, sale) => sum + Number(sale.totals?.itbis || 0), 0)),
    ley: round2(paidSales.reduce((sum, sale) => sum + Number(sale.totals?.ley || 0), 0)),
    inventoryMovements: inventoryMovements.length
  };
  const expected = {
    salesCount: Number(reference.salesCount ?? pos.salesCount),
    grossTotal: round2(reference.grossTotal ?? pos.grossTotal),
    itbis: round2(reference.itbis ?? pos.itbis),
    ley: round2(reference.ley ?? pos.ley),
    inventoryMovements: Number(reference.inventoryMovements ?? pos.inventoryMovements)
  };
  const checks = [
    compareNumber("salesCount", "Cantidad de tickets", pos.salesCount, expected.salesCount, 0),
    compareMoney("grossTotal", "Total ventas", pos.grossTotal, expected.grossTotal, tolerance),
    compareMoney("itbis", "ITBIS", pos.itbis, expected.itbis, tolerance),
    compareMoney("ley", "Ley servicio", pos.ley, expected.ley, tolerance),
    compareNumber("inventoryMovements", "Movimientos inventario", pos.inventoryMovements, expected.inventoryMovements, 0)
  ];
  const createdAt = now.toISOString();
  const reconciliationId = makeEventId("pilot_reconciliation", createdAt);
  return {
    reconciliationId,
    createdAt,
    status: checks.every((check) => check.status === "matched") ? "matched" : "difference",
    tolerance,
    pos,
    reference: expected,
    checks
  };
}

export function createPilotReconciliationEvent(reconciliation) {
  return {
    eventId: makeEventId("pos_pilot_reconciliation_recorded", reconciliation.reconciliationId),
    type: "pos_pilot_reconciliation_recorded",
    aggregateId: reconciliation.reconciliationId,
    idempotencyKey: makeIdempotencyKey(["pos_pilot_reconciliation_recorded", reconciliation.reconciliationId]),
    createdAt: reconciliation.createdAt,
    status: "pending",
    attempts: 0,
    payload: reconciliation
  };
}

function compareMoney(field, label, actual, expected, tolerance) {
  const difference = round2(actual - expected);
  return {
    field,
    label,
    actual,
    expected,
    difference,
    status: Math.abs(difference) <= tolerance ? "matched" : "difference"
  };
}

function compareNumber(field, label, actual, expected, tolerance) {
  const difference = Number(actual || 0) - Number(expected || 0);
  return {
    field,
    label,
    actual,
    expected,
    difference,
    status: Math.abs(difference) <= tolerance ? "matched" : "difference"
  };
}

function round2(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}
