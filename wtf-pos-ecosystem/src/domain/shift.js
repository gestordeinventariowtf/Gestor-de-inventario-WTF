import { createId, makeEventId, makeIdempotencyKey } from "./ids.js";
import { fromCents, toCents } from "./money.js";

export function openShift({ employeeId, deviceId, openingCash = 0, now = new Date() }) {
  if (!employeeId) throw new Error("Empleado requerido.");
  if (!deviceId) throw new Error("Dispositivo requerido.");
  return {
    shiftId: createId("shift"),
    employeeId,
    deviceId,
    openedAt: now.toISOString(),
    openingCash: Number(openingCash || 0),
    cashMovements: [],
    status: "open"
  };
}

export function assertOpenShift(shift) {
  if (!shift || shift.status !== "open") throw new Error("No hay turno abierto.");
}

export function buildShiftCloseReport({ shift, sales = [], countedCash = 0, now = new Date() }) {
  assertOpenShift(shift);
  const shiftSales = sales.filter((sale) => sale.shiftId === shift.shiftId && sale.status === "paid");
  const paymentTotals = {};
  let grossCents = 0;
  let subtotalCents = 0;
  let itbisCents = 0;
  let leyCents = 0;

  for (const sale of shiftSales) {
    grossCents += toCents(sale.totals?.total);
    subtotalCents += toCents(sale.totals?.subtotal);
    itbisCents += toCents(sale.totals?.itbis);
    leyCents += toCents(sale.totals?.ley);
    for (const payment of sale.payments || []) {
      paymentTotals[payment.method] = fromCents(toCents(paymentTotals[payment.method]) + toCents(payment.amount));
    }
  }

  const cashExpected = fromCents(toCents(shift.openingCash) + toCents(paymentTotals.cash || 0) + cashMovementTotal(shift.cashMovements));
  const difference = fromCents(toCents(countedCash) - toCents(cashExpected));
  const closedAt = now.toISOString();
  const report = {
    closeReportId: `z_${shift.shiftId}`,
    shiftId: shift.shiftId,
    employeeId: shift.employeeId,
    deviceId: shift.deviceId,
    openedAt: shift.openedAt,
    closedAt,
    salesCount: shiftSales.length,
    subtotal: fromCents(subtotalCents),
    itbis: fromCents(itbisCents),
    ley: fromCents(leyCents),
    grossTotal: fromCents(grossCents),
    paymentTotals,
    openingCash: Number(shift.openingCash || 0),
    cashExpected,
    countedCash: Number(countedCash || 0),
    difference,
    status: difference === 0 ? "balanced" : "difference"
  };

  return {
    report,
    closedShift: Object.assign({}, shift, {
      closedAt,
      closingCash: Number(countedCash || 0),
      closeReportId: report.closeReportId,
      status: "closed"
    }),
    event: createShiftCloseEvent(report, shift.deviceId)
  };
}

function cashMovementTotal(cashMovements = []) {
  return (Array.isArray(cashMovements) ? cashMovements : []).reduce((acc, movement) => {
    const direction = movement.direction === "out" ? -1 : 1;
    return acc + direction * toCents(movement.amount);
  }, 0);
}

function createShiftCloseEvent(report, sourceDeviceId) {
  return {
    eventId: makeEventId("shift_closed", report.shiftId),
    type: "shift_closed",
    aggregateId: report.shiftId,
    createdAt: report.closedAt,
    sourceDeviceId,
    idempotencyKey: makeIdempotencyKey(["shift_closed", report.shiftId, report.closedAt]),
    schemaVersion: 1,
    payload: report,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}
