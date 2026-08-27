import test from "node:test";
import assert from "node:assert/strict";
import { createCart, addProduct } from "../src/domain/cart.js";
import { buildDashboardSnapshot } from "../src/domain/dashboard.js";
import { holdTicket, createOpenTicket, addProductToTicket } from "../src/domain/open-ticket.js";
import { closeCashSale } from "../src/domain/sales.js";
import { openShift } from "../src/domain/shift.js";

const product = { id: "prod_1", name: "Producto", price: 100, active: true };

test("genera snapshot de ventas, tickets y outbox", () => {
  const shift = openShift({ employeeId: "emp_1", deviceId: "device_1" });
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  const { sale, event } = closeCashSale({ cart, shift, cashReceived: 150 });

  let ticket = createOpenTicket({ shift, tableLabel: "Mesa 1" });
  ticket = addProductToTicket(ticket, product, { qty: 1 });
  const held = holdTicket(ticket);

  const snapshot = buildDashboardSnapshot({
    sales: [sale],
    tickets: [held.ticket],
    outbox: [event, held.event]
  });

  assert.equal(snapshot.salesCount, 1);
  assert.equal(snapshot.grossTotal, 118);
  assert.equal(snapshot.itbis, 18);
  assert.equal(snapshot.openTickets, 1);
  assert.equal(snapshot.outboxPending, 2);
  assert.equal(snapshot.paymentMethods.cash, 118);
});
