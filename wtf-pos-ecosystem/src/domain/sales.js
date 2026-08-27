import { createId, makeEventId, makeIdempotencyKey } from "./ids.js";
import { calculateCart } from "./cart.js";
import { fromCents, toCents } from "./money.js";
import { assertPaymentApproved } from "./payment.js";
import { assertOpenShift } from "./shift.js";

export function closeCashSale({ cart, shift, cashReceived, now = new Date() }) {
  assertOpenShift(shift);
  if (!cart || !Array.isArray(cart.lines) || cart.lines.length === 0) throw new Error("El carrito esta vacio.");

  const calculated = calculateCart(cart);
  const totalCents = toCents(calculated.totals.total);
  const receivedCents = toCents(cashReceived);
  if (receivedCents < totalCents) throw new Error("El efectivo recibido es menor que el total.");

  const saleId = createId("sale");
  const paymentId = createId("pay");
  const createdAt = now.toISOString();
  const sale = {
    saleId,
    shiftId: shift.shiftId,
    employeeId: shift.employeeId,
    deviceId: shift.deviceId,
    createdAt,
    diningOption: cart.diningOption,
    lines: calculated.lines,
    totals: calculated.totals,
    payments: [{
      paymentId,
      method: "cash",
      amount: fromCents(totalCents),
      received: fromCents(receivedCents),
      change: fromCents(receivedCents - totalCents),
      status: "approved",
      idempotencyKey: makeIdempotencyKey(["cash", saleId, paymentId, totalCents])
    }],
    status: "paid"
  };

  const event = {
    eventId: makeEventId("sale_paid", saleId),
    type: "sale_paid",
    aggregateId: saleId,
    createdAt,
    sourceDeviceId: shift.deviceId,
    idempotencyKey: makeIdempotencyKey(["sale_paid", saleId]),
    schemaVersion: 1,
    payload: sale,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };

  return { sale, event };
}

export function closeSaleWithApprovedPayment({ cart, shift, paymentAttempt, now = new Date() }) {
  assertOpenShift(shift);
  assertPaymentApproved(paymentAttempt);
  if (!cart || !Array.isArray(cart.lines) || cart.lines.length === 0) throw new Error("El carrito esta vacio.");

  const calculated = calculateCart(cart);
  const totalCents = toCents(calculated.totals.total);
  if (toCents(paymentAttempt.amount) !== totalCents) throw new Error("El pago aprobado no coincide con el total.");

  const saleId = paymentAttempt.saleId || createId("sale");
  const createdAt = now.toISOString();
  const sale = {
    saleId,
    shiftId: shift.shiftId,
    employeeId: shift.employeeId,
    deviceId: shift.deviceId,
    createdAt,
    diningOption: cart.diningOption,
    lines: calculated.lines,
    totals: calculated.totals,
    payments: [Object.assign({}, paymentAttempt, { saleId })],
    status: "paid"
  };

  return {
    sale,
    event: createSalePaidEvent(sale, shift.deviceId, createdAt)
  };
}

function createSalePaidEvent(sale, sourceDeviceId, createdAt) {
  return {
    eventId: makeEventId("sale_paid", sale.saleId),
    type: "sale_paid",
    aggregateId: sale.saleId,
    createdAt,
    sourceDeviceId,
    idempotencyKey: makeIdempotencyKey(["sale_paid", sale.saleId]),
    schemaVersion: 1,
    payload: sale,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}
