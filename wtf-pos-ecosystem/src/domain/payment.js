import { createId, makeIdempotencyKey } from "./ids.js";
import { fromCents, toCents } from "./money.js";

export function authorizeVirtualPayment({
  saleId,
  method = "card",
  amount,
  received,
  approved = true,
  reason = "",
  now = new Date()
}) {
  const amountCents = toCents(amount);
  const receivedCents = toCents(received ?? amount);
  if (amountCents <= 0) throw new Error("Monto de pago invalido.");
  if (receivedCents < amountCents) throw new Error("Monto recibido menor al total.");

  const paymentAttemptId = createId("pay");
  const status = approved ? "approved" : "declined";
  return {
    paymentAttemptId,
    saleId,
    method,
    amount: fromCents(amountCents),
    received: fromCents(receivedCents),
    change: method === "cash" ? fromCents(receivedCents - amountCents) : 0,
    status,
    reason,
    approvedAt: approved ? now.toISOString() : null,
    declinedAt: approved ? null : now.toISOString(),
    idempotencyKey: makeIdempotencyKey(["payment", saleId || "pending", method, amountCents, paymentAttemptId])
  };
}

export function assertPaymentApproved(paymentAttempt) {
  if (!paymentAttempt || paymentAttempt.status !== "approved") {
    throw new Error("El pago no fue aprobado.");
  }
}
