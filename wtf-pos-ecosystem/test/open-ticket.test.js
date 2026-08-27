import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeCashSale } from "../src/domain/sales.js";
import { openShift } from "../src/domain/shift.js";
import {
  addProductToTicket,
  createOpenTicket,
  holdTicket,
  markTicketPaid,
  mergeTickets,
  moveLineBetweenTickets,
  reopenTicket
} from "../src/domain/open-ticket.js";
import { TransactionalPosApi } from "../src/backend/transactional-pos-api.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";

const product = { id: "prod_1", name: "WTF Burger", sku: "WTF-1", barcode: "1001", price: 450, active: true };

function shift() {
  return openShift({ employeeId: "emp_1", deviceId: "device_1", openingCash: 500 });
}

test("crea orden abierta, agrega producto y la pone en hold", () => {
  let ticket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 1", diningOption: "dineIn" });
  ticket = addProductToTicket(ticket, product, { qty: 2 });
  const held = holdTicket(ticket);

  assert.equal(held.ticket.status, "held");
  assert.equal(held.ticket.cart.lines.length, 1);
  assert.equal(held.event.type, "ticket_held");
});

test("reabre orden en hold y la cobra", () => {
  let ticket = createOpenTicket({ shift: shift(), customerLabel: "Cliente prueba", diningOption: "takeOut" });
  ticket = addProductToTicket(ticket, product, { qty: 1 });
  ticket = holdTicket(ticket).ticket;
  ticket = reopenTicket(ticket);

  const { sale } = closeCashSale({ cart: ticket.cart, shift: shift(), cashReceived: 600 });
  const paid = markTicketPaid(ticket, sale);

  assert.equal(paid.status, "paid");
  assert.equal(paid.saleId, sale.saleId);
});

test("persiste orden sin duplicarla", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));
  let ticket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 2" });
  ticket = addProductToTicket(ticket, product, { qty: 1 });
  const held = holdTicket(ticket);

  await store.upsertTicketWithEvent(held.ticket, held.event);
  const data = await store.upsertTicketWithEvent(held.ticket, held.event);

  assert.equal(data.tickets.length, 1);
  assert.equal(data.outbox.length, 1);
});

test("mueve una linea completa a otra cuenta conservando precio e impuestos", () => {
  let fromTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 3" });
  const toTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 3 - Cuenta 2" });
  fromTicket = addProductToTicket(fromTicket, product, { qty: 1 });

  const { fromTicket: updatedFrom, toTicket: updatedTo, event } = moveLineBetweenTickets(
    fromTicket,
    toTicket,
    fromTicket.cart.lines[0].lineId
  );

  assert.equal(updatedFrom.cart.lines.length, 0);
  assert.equal(updatedTo.cart.lines.length, 1);
  assert.equal(updatedTo.cart.lines[0].unitPrice, 450);
  assert.equal(event.type, "ticket_line_moved");
});

test("divide una cantidad parcial entre dos cuentas", () => {
  let fromTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 4" });
  const toTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 4 - Cuenta 2" });
  fromTicket = addProductToTicket(fromTicket, product, { qty: 3 });

  const { fromTicket: updatedFrom, toTicket: updatedTo } = moveLineBetweenTickets(
    fromTicket,
    toTicket,
    fromTicket.cart.lines[0].lineId,
    { qty: 1 }
  );

  assert.equal(updatedFrom.cart.lines[0].qty, 2);
  assert.equal(updatedTo.cart.lines[0].qty, 1);
  assert.notEqual(updatedFrom.cart.lines[0].lineId, updatedTo.cart.lines[0].lineId);
});

test("une dos cuentas y marca la origen como unida", () => {
  let targetTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 5" });
  let sourceTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 6" });
  targetTicket = addProductToTicket(targetTicket, product, { qty: 1 });
  sourceTicket = addProductToTicket(sourceTicket, Object.assign({}, product, { id: "prod_2", name: "Papas" }), { qty: 2 });

  const { targetTicket: mergedTarget, sourceTicket: mergedSource, event } = mergeTickets(targetTicket, sourceTicket);

  assert.equal(mergedTarget.cart.lines.length, 2);
  assert.equal(mergedSource.status, "merged");
  assert.equal(mergedSource.mergedIntoTicketId, targetTicket.ticketId);
  assert.equal(event.type, "ticket_merged");
});

test("backend virtual aplica eventos de cuentas divididas y unidas", async () => {
  let targetTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 7" });
  const sourceTicket = createOpenTicket({ shift: shift(), tableLabel: "Mesa 7 - Cuenta 2" });
  targetTicket = addProductToTicket(targetTicket, product, { qty: 1 });
  const moved = moveLineBetweenTickets(targetTicket, sourceTicket, targetTicket.cart.lines[0].lineId);
  const merged = mergeTickets(moved.fromTicket, moved.toTicket);
  const backend = new TransactionalPosApi();

  await backend.receiveBatch([moved.event, merged.event]);

  assert.equal(backend.snapshot().tickets.length, 2);
  assert.equal(backend.snapshot().tickets.find((ticket) => ticket.ticketId === moved.toTicket.ticketId).status, "merged");
});
