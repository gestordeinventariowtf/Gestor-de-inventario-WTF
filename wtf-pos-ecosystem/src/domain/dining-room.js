import { makeEventId, makeIdempotencyKey } from "./ids.js";

export const DINING_OPTIONS = Object.freeze({
  DINE_IN: "dineIn",
  TAKE_OUT: "takeOut",
  DELIVERY: "delivery"
});

export class DiningRoom {
  constructor({ zones = [], tables = [] } = {}) {
    this.zones = zones.map((zone) => normalizeZone(zone));
    this.tables = tables.map((table) => normalizeTable(table));
  }

  availableTables(tickets = []) {
    const occupied = occupiedTableIds(tickets);
    return this.tables.map((table) => Object.assign({}, table, {
      status: occupied.has(table.tableId) ? "occupied" : "available"
    }));
  }

  tableById(tableId) {
    return this.tables.find((table) => table.tableId === tableId) || null;
  }

  assignTicket(ticket, tableId, { tickets = [], now = new Date() } = {}) {
    const table = this.requireTable(tableId);
    assertTableAvailable(table.tableId, tickets, ticket.ticketId);
    return updateTicketTable(ticket, table, now);
  }

  transferTicket(ticket, toTableId, { tickets = [], now = new Date() } = {}) {
    const table = this.requireTable(toTableId);
    assertTableAvailable(table.tableId, tickets, ticket.ticketId);
    const updated = updateTicketTable(ticket, table, now);
    return {
      ticket: updated,
      event: createDiningEvent("ticket_table_transferred", updated, {
        fromTableId: ticket.tableId || "",
        toTableId,
        toTableLabel: table.label
      }, now)
    };
  }

  changeDiningOption(ticket, diningOption, { now = new Date() } = {}) {
    if (!Object.values(DINING_OPTIONS).includes(diningOption)) throw new Error("Opcion de consumo invalida.");
    const updated = Object.assign({}, ticket, {
      diningOption,
      cart: Object.assign({}, ticket.cart, { diningOption }),
      updatedAt: now.toISOString()
    });
    if (diningOption !== DINING_OPTIONS.DINE_IN) {
      updated.tableId = "";
      updated.tableLabel = "";
      updated.zoneId = "";
      updated.zoneName = "";
    }
    return {
      ticket: updated,
      event: createDiningEvent("ticket_dining_option_changed", updated, { diningOption }, now)
    };
  }

  requireTable(tableId) {
    const table = this.tableById(tableId);
    if (!table || table.active === false) throw new Error("Mesa no disponible.");
    return table;
  }
}

function updateTicketTable(ticket, table, now) {
  if (!ticket || !ticket.ticketId) throw new Error("Ticket invalido para mesa.");
  return Object.assign({}, ticket, {
    tableId: table.tableId,
    tableLabel: table.label,
    zoneId: table.zoneId,
    zoneName: table.zoneName,
    diningOption: DINING_OPTIONS.DINE_IN,
    cart: Object.assign({}, ticket.cart, { diningOption: DINING_OPTIONS.DINE_IN }),
    updatedAt: now.toISOString()
  });
}

function occupiedTableIds(tickets) {
  return new Set((Array.isArray(tickets) ? tickets : [])
    .filter((ticket) => ["open", "held"].includes(ticket.status) && ticket.tableId)
    .map((ticket) => ticket.tableId));
}

function assertTableAvailable(tableId, tickets, currentTicketId) {
  const occupied = (Array.isArray(tickets) ? tickets : [])
    .find((ticket) => ["open", "held"].includes(ticket.status) && ticket.tableId === tableId && ticket.ticketId !== currentTicketId);
  if (occupied) throw new Error("La mesa ya tiene una orden abierta.");
}

function createDiningEvent(type, ticket, payload, now) {
  const createdAt = now.toISOString();
  return {
    eventId: makeEventId(type, `${ticket.ticketId}_${createdAt}`),
    type,
    aggregateId: ticket.ticketId,
    createdAt,
    sourceDeviceId: ticket.deviceId,
    idempotencyKey: makeIdempotencyKey([type, ticket.ticketId, createdAt]),
    schemaVersion: 1,
    payload: Object.assign({ ticketId: ticket.ticketId }, payload),
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}

function normalizeZone(zone) {
  if (!zone || !zone.zoneId) throw new Error("Zona invalida.");
  return Object.assign({ active: true }, zone);
}

function normalizeTable(table) {
  if (!table || !table.tableId) throw new Error("Mesa invalida.");
  return Object.assign({
    zoneId: "",
    zoneName: "",
    seats: 4,
    active: true
  }, table);
}
