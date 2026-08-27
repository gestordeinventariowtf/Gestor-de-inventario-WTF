import { addProduct, createCart } from "./cart.js";
import { createId, makeEventId, makeIdempotencyKey } from "./ids.js";
import { assertOpenShift } from "./shift.js";

export function createOpenTicket({
  shift,
  diningOption = "dineIn",
  customerLabel = "",
  tableId = "",
  tableLabel = "",
  zoneId = "",
  zoneName = "",
  now = new Date()
}) {
  assertOpenShift(shift);
  return {
    ticketId: createId("ticket"),
    shiftId: shift.shiftId,
    employeeId: shift.employeeId,
    deviceId: shift.deviceId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    customerLabel,
    tableId,
    tableLabel,
    zoneId,
    zoneName,
    diningOption,
    cart: createCart({ diningOption }),
    status: "open"
  };
}

export function addProductToTicket(ticket, product, options = {}, { now = new Date() } = {}) {
  assertTicketOpen(ticket);
  return Object.assign({}, ticket, {
    cart: addProduct(ticket.cart, product, options),
    updatedAt: now.toISOString()
  });
}

export function holdTicket(ticket, { now = new Date() } = {}) {
  assertTicketOpen(ticket);
  const held = Object.assign({}, ticket, {
    status: "held",
    updatedAt: now.toISOString()
  });
  return {
    ticket: held,
    event: ticketEvent("ticket_held", held, now)
  };
}

export function reopenTicket(ticket, { now = new Date() } = {}) {
  if (!ticket || !["held", "open"].includes(ticket.status)) throw new Error("La orden no puede reabrirse.");
  return Object.assign({}, ticket, {
    status: "open",
    updatedAt: now.toISOString()
  });
}

export function markTicketPaid(ticket, sale, { now = new Date() } = {}) {
  if (!ticket || ticket.status === "paid") throw new Error("La orden ya fue cerrada.");
  return Object.assign({}, ticket, {
    saleId: sale.saleId,
    status: "paid",
    updatedAt: now.toISOString()
  });
}

export function moveLineBetweenTickets(fromTicket, toTicket, lineId, { qty, now = new Date() } = {}) {
  assertTicketOpen(fromTicket);
  assertTicketOpen(toTicket);
  if (fromTicket.ticketId === toTicket.ticketId) throw new Error("La cuenta origen y destino no pueden ser la misma.");

  const sourceLine = fromTicket.cart.lines.find((line) => line.lineId === lineId);
  if (!sourceLine) throw new Error("Producto no encontrado en la cuenta origen.");

  const moveQty = Number(qty || sourceLine.qty);
  if (!Number.isFinite(moveQty) || moveQty <= 0) throw new Error("Cantidad a mover invalida.");
  if (moveQty > sourceLine.qty) throw new Error("No se puede mover mas cantidad que la existente.");

  const isFullMove = moveQty === sourceLine.qty;
  const movedLine = isFullMove
    ? sourceLine
    : Object.assign({}, sourceLine, {
      lineId: createId("line"),
      qty: moveQty
    });
  const fromLines = fromTicket.cart.lines
    .map((line) => {
      if (line.lineId !== lineId) return line;
      if (isFullMove) return null;
      return Object.assign({}, line, { qty: line.qty - moveQty });
    })
    .filter(Boolean);
  const toLines = toTicket.cart.lines.concat([movedLine]);

  const updatedFrom = replaceTicketLines(fromTicket, fromLines, now);
  const updatedTo = replaceTicketLines(toTicket, toLines, now);
  return {
    fromTicket: updatedFrom,
    toTicket: updatedTo,
    movedLine,
    event: multiTicketEvent("ticket_line_moved", [updatedFrom, updatedTo], {
      fromTicketId: fromTicket.ticketId,
      toTicketId: toTicket.ticketId,
      lineId,
      movedLineId: movedLine.lineId,
      qty: moveQty
    }, now)
  };
}

export function mergeTickets(targetTicket, sourceTicket, { now = new Date() } = {}) {
  assertTicketOpen(targetTicket);
  assertMergeableSource(sourceTicket);
  if (targetTicket.ticketId === sourceTicket.ticketId) throw new Error("No se puede unir una cuenta consigo misma.");

  const updatedTarget = replaceTicketLines(targetTicket, targetTicket.cart.lines.concat(sourceTicket.cart.lines), now);
  const mergedSource = Object.assign({}, replaceTicketLines(sourceTicket, [], now), {
    status: "merged",
    mergedIntoTicketId: targetTicket.ticketId
  });

  return {
    targetTicket: updatedTarget,
    sourceTicket: mergedSource,
    event: multiTicketEvent("ticket_merged", [updatedTarget, mergedSource], {
      targetTicketId: targetTicket.ticketId,
      sourceTicketId: sourceTicket.ticketId,
      movedLines: sourceTicket.cart.lines.map((line) => ({
        lineId: line.lineId,
        productId: line.productId,
        qty: line.qty
      }))
    }, now)
  };
}

function assertTicketOpen(ticket) {
  if (!ticket || ticket.status !== "open") throw new Error("La orden no esta abierta.");
}

function assertMergeableSource(ticket) {
  if (!ticket || !["open", "held"].includes(ticket.status)) throw new Error("La cuenta origen no puede unirse.");
}

function replaceTicketLines(ticket, lines, now) {
  return Object.assign({}, ticket, {
    cart: Object.assign({}, ticket.cart, { lines }),
    updatedAt: now.toISOString()
  });
}

function ticketEvent(type, ticket, now) {
  return {
    eventId: makeEventId(type, ticket.ticketId),
    type,
    aggregateId: ticket.ticketId,
    createdAt: now.toISOString(),
    sourceDeviceId: ticket.deviceId,
    idempotencyKey: makeIdempotencyKey([type, ticket.ticketId, ticket.updatedAt]),
    schemaVersion: 1,
    payload: ticket,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}

function multiTicketEvent(type, tickets, detail, now) {
  const aggregateId = tickets.map((ticket) => ticket.ticketId).join("_");
  const newest = tickets
    .map((ticket) => ticket.updatedAt)
    .sort()
    .at(-1);
  return {
    eventId: makeEventId(type, aggregateId),
    type,
    aggregateId,
    createdAt: now.toISOString(),
    sourceDeviceId: tickets[0]?.deviceId || "",
    idempotencyKey: makeIdempotencyKey([type, aggregateId, newest]),
    schemaVersion: 1,
    payload: {
      tickets,
      detail
    },
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}
