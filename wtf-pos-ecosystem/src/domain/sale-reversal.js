import { createId, makeEventId, makeIdempotencyKey } from "./ids.js";
import { fromCents, toCents } from "./money.js";

export function voidSale(sale, { actor, reason = "", now = new Date() } = {}) {
  validateSaleForReversal(sale);
  if (!reason) throw new Error("Motivo requerido para anular venta.");
  const createdAt = now.toISOString();
  const reversal = {
    reversalId: createId("void"),
    saleId: sale.saleId,
    type: "void",
    reason,
    actorUserId: actor?.userId || "",
    actorName: actor?.name || "",
    createdAt,
    lines: sale.lines.map((line) => ({
      lineId: line.lineId,
      productId: line.productId,
      name: line.name,
      qty: line.qty,
      amount: line.totals.total
    })),
    totals: sale.totals,
    status: "applied"
  };

  return {
    reversal,
    sale: Object.assign({}, sale, {
      status: "voided",
      voidedAt: createdAt,
      voidReason: reason,
      voidedBy: actor?.userId || ""
    }),
    event: createReversalEvent("sale_voided", reversal, sale.deviceId)
  };
}

export function refundSaleLines(sale, refundLines, { actor, reason = "", now = new Date() } = {}) {
  validateSaleForReversal(sale);
  if (!reason) throw new Error("Motivo requerido para devolucion.");
  if (!Array.isArray(refundLines) || refundLines.length === 0) throw new Error("Lineas de devolucion requeridas.");

  const createdAt = now.toISOString();
  const normalizedLines = refundLines.map((refundLine) => {
    const saleLine = sale.lines.find((line) => line.lineId === refundLine.lineId);
    if (!saleLine) throw new Error(`Linea no encontrada para devolucion: ${refundLine.lineId}`);
    const qty = Number(refundLine.qty || 0);
    if (qty <= 0 || qty > Number(saleLine.qty || 0)) throw new Error("Cantidad de devolucion invalida.");
    const ratio = qty / Number(saleLine.qty || 1);
    return {
      lineId: saleLine.lineId,
      productId: saleLine.productId,
      name: saleLine.name,
      qty,
      amount: fromCents(toCents(saleLine.totals.total) * ratio)
    };
  });

  const refundTotal = fromCents(normalizedLines.reduce((acc, line) => acc + toCents(line.amount), 0));
  const reversal = {
    reversalId: createId("refund"),
    saleId: sale.saleId,
    type: "refund",
    reason,
    actorUserId: actor?.userId || "",
    actorName: actor?.name || "",
    createdAt,
    lines: normalizedLines,
    totals: { total: refundTotal },
    status: "applied"
  };

  return {
    reversal,
    sale: Object.assign({}, sale, {
      status: "partially_refunded",
      refundedAt: createdAt,
      refundReason: reason,
      refundedBy: actor?.userId || ""
    }),
    event: createReversalEvent("sale_refunded", reversal, sale.deviceId)
  };
}

function validateSaleForReversal(sale) {
  if (!sale || !sale.saleId) throw new Error("Venta invalida para reverso.");
  if (sale.status === "voided") throw new Error("La venta ya fue anulada.");
  if (!Array.isArray(sale.lines) || sale.lines.length === 0) throw new Error("Venta sin lineas para reverso.");
}

function createReversalEvent(type, reversal, sourceDeviceId) {
  return {
    eventId: makeEventId(type, reversal.reversalId),
    type,
    aggregateId: reversal.saleId,
    createdAt: reversal.createdAt,
    sourceDeviceId,
    idempotencyKey: makeIdempotencyKey([type, reversal.saleId, reversal.reversalId]),
    schemaVersion: 1,
    payload: reversal,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}
