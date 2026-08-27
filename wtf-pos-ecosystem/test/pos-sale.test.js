import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCart, addProduct, calculateCart } from "../src/domain/cart.js";
import { openShift } from "../src/domain/shift.js";
import { closeCashSale } from "../src/domain/sales.js";
import { renderReceipt } from "../src/domain/receipt.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";
import { OutboxQueue } from "../src/infrastructure/outbox-queue.js";
import { VirtualSyncAdapter } from "../src/infrastructure/virtual-sync-adapter.js";

const product = {
  id: "prod_test",
  sku: "SKU-1",
  barcode: "123456",
  name: "Producto prueba",
  price: 100,
  active: true
};

function demoShift() {
  return openShift({
    employeeId: "emp_1",
    deviceId: "device_1",
    openingCash: 1000,
    now: new Date("2026-08-22T12:00:00.000Z")
  });
}

test("abre turno para empleado y dispositivo", () => {
  const shift = demoShift();
  assert.equal(shift.employeeId, "emp_1");
  assert.equal(shift.deviceId, "device_1");
  assert.equal(shift.status, "open");
});

test("calcula impuestos para consumo en local", () => {
  let cart = createCart({ diningOption: "dineIn" });
  cart = addProduct(cart, product, { qty: 2 });
  const result = calculateCart(cart);
  assert.equal(result.totals.subtotal, 200);
  assert.equal(result.totals.itbis, 36);
  assert.equal(result.totals.ley, 20);
  assert.equal(result.totals.total, 256);
});

test("cierra venta en efectivo y calcula cambio", () => {
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  const { sale, event } = closeCashSale({
    cart,
    shift: demoShift(),
    cashReceived: 150,
    now: new Date("2026-08-22T12:00:00.000Z")
  });
  assert.equal(sale.status, "paid");
  assert.equal(sale.totals.total, 118);
  assert.equal(sale.payments[0].change, 32);
  assert.equal(event.type, "sale_paid");
  assert.match(renderReceipt(sale), /Gracias por su compra WTFLover/);
});

test("rechaza efectivo menor que el total", () => {
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  assert.throws(() => closeCashSale({
    cart,
    shift: demoShift(),
    cashReceived: 50
  }), /menor que el total/);
});

test("persistencia local evita duplicar sale y outbox event", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  const { sale, event } = closeCashSale({
    cart,
    shift: demoShift(),
    cashReceived: 150
  });
  await store.appendSaleWithEvent(sale, event);
  const data = await store.appendSaleWithEvent(sale, event);
  assert.equal(data.sales.length, 1);
  assert.equal(data.outbox.length, 1);
});

test("outbox sincroniza por lotes sin perder eventos", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));

  for (let index = 0; index < 3; index += 1) {
    let cart = createCart({ diningOption: "takeOut" });
    cart = addProduct(cart, product, { qty: 1 });
    const { sale, event } = closeCashSale({
      cart,
      shift: demoShift(),
      cashReceived: 150,
      now: new Date(`2026-08-22T12:00:0${index}.000Z`)
    });
    await store.appendSaleWithEvent(sale, event);
  }

  const queue = new OutboxQueue(store, { batchSize: 2 });
  const adapter = new VirtualSyncAdapter();
  assert.deepEqual(await queue.drain(adapter), { sent: 2, failed: 0 });
  assert.deepEqual(await queue.drain(adapter), { sent: 1, failed: 0 });

  const data = await store.read();
  assert.equal(data.outbox.filter((event) => event.status === "sent").length, 3);
  assert.equal(adapter.batches.length, 2);
});

test("outbox marca retry cuando el destino remoto falla", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  const { sale, event } = closeCashSale({
    cart,
    shift: demoShift(),
    cashReceived: 150
  });
  await store.appendSaleWithEvent(sale, event);

  const queue = new OutboxQueue(store, { batchSize: 10 });
  const result = await queue.drain(new VirtualSyncAdapter({ shouldFail: true }));
  assert.equal(result.failed, 1);

  const data = await store.read();
  assert.equal(data.outbox[0].status, "retry");
  assert.equal(data.outbox[0].attempts, 1);
});
