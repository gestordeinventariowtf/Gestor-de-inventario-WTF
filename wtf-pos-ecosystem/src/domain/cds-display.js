import { calculateCart } from "./cart.js";
import { makeEventId, makeIdempotencyKey } from "./ids.js";

export function createCustomerDisplaySnapshot(ticket, { now = new Date(), message = "" } = {}) {
  if (!ticket || !ticket.ticketId) throw new Error("Orden invalida para CDS.");
  if (!ticket.cart) throw new Error("La orden no tiene carrito para CDS.");

  const calculated = calculateCart(ticket.cart);
  const updatedAt = (ticket.updatedAt || now.toISOString());
  const snapshot = {
    snapshotId: `cds_${ticket.ticketId}`,
    ticketId: ticket.ticketId,
    updatedAt,
    status: normalizeDisplayStatus(ticket.status),
    customerLabel: ticket.customerLabel || "",
    tableLabel: ticket.tableLabel || "",
    diningOption: ticket.cart.diningOption,
    message,
    lines: calculated.lines.map((line) => ({
      lineId: line.lineId,
      name: line.name,
      qty: line.qty,
      unitPrice: line.unitPrice,
      subtotal: line.totals.subtotal,
      total: line.totals.total
    })),
    totals: calculated.totals
  };

  return {
    snapshot,
    event: createCdsEvent("cds_snapshot_updated", snapshot, updatedAt)
  };
}

export function clearCustomerDisplay(ticket, { now = new Date(), message = "Gracias por su visita." } = {}) {
  if (!ticket || !ticket.ticketId) throw new Error("Orden invalida para limpiar CDS.");
  const updatedAt = now.toISOString();
  const snapshot = {
    snapshotId: `cds_${ticket.ticketId}`,
    ticketId: ticket.ticketId,
    updatedAt,
    status: "cleared",
    customerLabel: ticket.customerLabel || "",
    tableLabel: ticket.tableLabel || "",
    diningOption: ticket.cart?.diningOption || "",
    message,
    lines: [],
    totals: {
      subtotal: 0,
      itbis: 0,
      ley: 0,
      total: 0
    }
  };

  return {
    snapshot,
    event: createCdsEvent("cds_snapshot_cleared", snapshot, updatedAt)
  };
}

export function mergeCustomerDisplaySnapshot(current, incoming) {
  if (!incoming || !incoming.snapshotId) throw new Error("Snapshot CDS invalido.");
  if (!current) return incoming;
  return String(incoming.updatedAt || "").localeCompare(String(current.updatedAt || "")) >= 0
    ? incoming
    : current;
}

function normalizeDisplayStatus(status) {
  if (status === "paid") return "paid";
  if (status === "held") return "held";
  return "active";
}

function createCdsEvent(type, snapshot, createdAt) {
  return {
    eventId: makeEventId(type, `${snapshot.snapshotId}_${snapshot.updatedAt}`),
    type,
    aggregateId: snapshot.snapshotId,
    createdAt,
    sourceDeviceId: "cds-virtual",
    idempotencyKey: makeIdempotencyKey([type, snapshot.snapshotId, snapshot.updatedAt]),
    schemaVersion: 1,
    payload: snapshot,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}
