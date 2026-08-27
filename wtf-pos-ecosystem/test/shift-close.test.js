import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addProduct, createCart } from "../src/domain/cart.js";
import { closeCashSale } from "../src/domain/sales.js";
import { buildShiftCloseReport, openShift } from "../src/domain/shift.js";
import { BackendSyncAdapter } from "../src/infrastructure/backend-sync-adapter.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";
import { OutboxQueue } from "../src/infrastructure/outbox-queue.js";
import { TransactionalPosApi } from "../src/backend/transactional-pos-api.js";

const product = { id: "prod_close", name: "Producto cierre", price: 100, active: true };

function makeSale(shift) {
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  return closeCashSale({ cart, shift, cashReceived: 150 }).sale;
}

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-close-"));
  return new LocalJsonStore(path.join(dir, "store.json"));
}

test("genera reporte Z balanceado para turno", () => {
  const shift = openShift({ employeeId: "emp_close", deviceId: "pos_close", openingCash: 5000 });
  const sale = makeSale(shift);
  const { report, closedShift, event } = buildShiftCloseReport({
    shift,
    sales: [sale],
    countedCash: 5118,
    now: new Date("2026-08-22T23:59:00.000Z")
  });

  assert.equal(report.salesCount, 1);
  assert.equal(report.cashExpected, 5118);
  assert.equal(report.difference, 0);
  assert.equal(report.status, "balanced");
  assert.equal(closedShift.status, "closed");
  assert.equal(event.type, "shift_closed");
});

test("reporte Z detecta diferencia de caja", () => {
  const shift = openShift({ employeeId: "emp_close", deviceId: "pos_close", openingCash: 5000 });
  const sale = makeSale(shift);
  const { report } = buildShiftCloseReport({
    shift,
    sales: [sale],
    countedCash: 5100
  });

  assert.equal(report.cashExpected, 5118);
  assert.equal(report.difference, -18);
  assert.equal(report.status, "difference");
});

test("guarda cierre local y lo sincroniza al backend virtual", async () => {
  const store = await makeStore();
  const api = new TransactionalPosApi();
  const shift = openShift({ employeeId: "emp_close", deviceId: "pos_close", openingCash: 5000 });
  const sale = makeSale(shift);
  const { report, closedShift, event } = buildShiftCloseReport({ shift, sales: [sale], countedCash: 5118 });

  await store.appendShift(shift);
  await store.appendSaleWithEvent(sale, { eventId: "sale_event", type: "sale_paid", payload: sale, idempotencyKey: "sale_event" });
  await store.closeShiftWithReport(closedShift, report, event);
  await new OutboxQueue(store).drain(new BackendSyncAdapter(api));
  const remote = api.snapshot();

  assert.equal(remote.shiftCloseReports.length, 1);
  assert.equal(remote.shiftCloseReports[0].status, "balanced");
});
