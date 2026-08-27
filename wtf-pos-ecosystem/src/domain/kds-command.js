import { createId, makeEventId, makeIdempotencyKey } from "./ids.js";

export function createKdsCommandFromTicket(ticket, { stationId = "kitchen-main", now = new Date() } = {}) {
  if (!ticket || !ticket.ticketId) throw new Error("Orden invalida para KDS.");
  if (!ticket.cart || !Array.isArray(ticket.cart.lines) || ticket.cart.lines.length === 0) {
    throw new Error("La orden no tiene productos para cocina.");
  }

  const createdAt = now.toISOString();
  const command = {
    commandId: createId("kds"),
    ticketId: ticket.ticketId,
    shiftId: ticket.shiftId,
    employeeId: ticket.employeeId,
    deviceId: ticket.deviceId,
    stationId,
    tableLabel: ticket.tableLabel || "",
    customerLabel: ticket.customerLabel || "",
    diningOption: ticket.cart.diningOption,
    createdAt,
    updatedAt: createdAt,
    status: "queued",
    ackStatus: "pending",
    attempts: 0,
    lines: ticket.cart.lines.map((line) => ({
      lineId: line.lineId,
      productId: line.productId,
      name: line.name,
      qty: line.qty,
      notes: line.notes || ""
    }))
  };

  return {
    command,
    event: createKdsEvent("kds_command_created", command, createdAt)
  };
}

export function markCommandAcked(command, { ackedAt = new Date().toISOString() } = {}) {
  if (!command || !command.commandId) throw new Error("Comanda invalida.");
  return Object.assign({}, command, {
    status: "sent",
    ackStatus: "acked",
    ackedAt,
    updatedAt: ackedAt
  });
}

export function markCommandRetry(command, reason, { now = new Date() } = {}) {
  if (!command || !command.commandId) throw new Error("Comanda invalida.");
  const timestamp = now.toISOString();
  return Object.assign({}, command, {
    status: "retry",
    ackStatus: "pending",
    attempts: Number(command.attempts || 0) + 1,
    lastError: String(reason || "ACK_TIMEOUT"),
    nextRetryAt: new Date(now.getTime() + 15000).toISOString(),
    updatedAt: timestamp
  });
}

export function dispatchCommandEvent(command, { now = new Date() } = {}) {
  return createKdsEvent("kds_command_dispatch", command, now.toISOString());
}

function createKdsEvent(type, command, createdAt) {
  return {
    eventId: makeEventId(type, command.commandId),
    type,
    aggregateId: command.commandId,
    createdAt,
    sourceDeviceId: command.deviceId,
    idempotencyKey: makeIdempotencyKey([type, command.commandId]),
    schemaVersion: 1,
    payload: command,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}
