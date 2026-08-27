import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addProductToTicket, createOpenTicket, holdTicket } from "../src/domain/open-ticket.js";
import { createCustomerDisplaySnapshot } from "../src/domain/cds-display.js";
import { openShift } from "../src/domain/shift.js";
import { CdsSyncService } from "../src/infrastructure/cds-sync-service.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";
import { VirtualCdsAdapter } from "../src/infrastructure/virtual-cds-adapter.js";

const product = { id: "prod_cds_1", name: "WTF Burger", sku: "WTF-1", barcode: "1001", price: 450, active: true };
const drink = { id: "prod_cds_2", name: "Limonada", sku: "BEB-1", barcode: "2001", price: 120, active: true };

function makeTicket(now = new Date("2026-08-22T12:00:00.000Z")) {
  const shift = openShift({ employeeId: "emp_cds", deviceId: "pos_1", now });
  let ticket = createOpenTicket({ shift, tableLabel: "Mesa 8", customerLabel: "Cliente", diningOption: "dineIn", now });
  ticket = addProductToTicket(ticket, product, { qty: 2 }, { now: new Date("2026-08-22T12:01:00.000Z") });
  return ticket;
}

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-cds-"));
  return new LocalJsonStore(path.join(dir, "store.json"));
}

test("crea snapshot CDS sin exponer datos administrativos", () => {
  const { snapshot, event } = createCustomerDisplaySnapshot(makeTicket());

  assert.equal(snapshot.status, "active");
  assert.equal(snapshot.tableLabel, "Mesa 8");
  assert.equal(snapshot.lines.length, 1);
  assert.equal(snapshot.lines[0].name, "WTF Burger");
  assert.equal(snapshot.totals.total, 1152);
  assert.equal(event.type, "cds_snapshot_updated");
  assert.equal(Object.hasOwn(snapshot, "employeeId"), false);
  assert.equal(Object.hasOwn(snapshot, "deviceId"), false);
  assert.equal(Object.hasOwn(snapshot.lines[0], "taxPolicySnapshot"), false);
});

test("sincroniza CDS virtual y actualiza carrito/totales", async () => {
  const store = await makeStore();
  const service = new CdsSyncService(store);
  const adapter = new VirtualCdsAdapter();
  let ticket = makeTicket();

  await service.publishTicket(ticket, adapter);
  ticket = addProductToTicket(ticket, drink, { qty: 1 }, { now: new Date("2026-08-22T12:02:00.000Z") });
  const snapshot = await service.publishTicket(ticket, adapter);
  const data = await store.read();
  const visible = adapter.currentSnapshot(ticket.ticketId);

  assert.equal(snapshot.lines.length, 2);
  assert.equal(visible.lines.length, 2);
  assert.equal(data.cdsSnapshots.length, 1);
  assert.equal(data.outbox.filter((row) => row.type === "cds_snapshot_updated").length, 2);
});

test("CDS virtual ignora snapshots viejos para no pisar lo mas reciente", async () => {
  const adapter = new VirtualCdsAdapter();
  const ticket = makeTicket();
  const newer = createCustomerDisplaySnapshot(
    addProductToTicket(ticket, drink, { qty: 1 }, { now: new Date("2026-08-22T12:03:00.000Z") })
  ).snapshot;
  const older = createCustomerDisplaySnapshot(ticket).snapshot;

  await adapter.showSnapshot(newer);
  const result = await adapter.showSnapshot(older);
  const visible = adapter.currentSnapshot(ticket.ticketId);

  assert.equal(result.ignoredStale, true);
  assert.equal(visible.lines.length, 2);
});

test("limpia pantalla del cliente cuando se cierra la orden", async () => {
  const store = await makeStore();
  const service = new CdsSyncService(store);
  const adapter = new VirtualCdsAdapter();
  const ticket = makeTicket();

  await service.publishTicket(ticket, adapter);
  const cleared = await service.clearTicket(ticket, adapter, { now: new Date("2026-08-22T12:10:00.000Z") });
  const visible = adapter.currentSnapshot(ticket.ticketId);

  assert.equal(cleared.status, "cleared");
  assert.equal(visible.lines.length, 0);
  assert.equal(visible.message, "Gracias por su visita.");
});

test("marca orden en hold para pantalla del cliente", () => {
  const ticket = makeTicket();
  const { ticket: held } = holdTicket(ticket, { now: new Date("2026-08-22T12:04:00.000Z") });
  const { snapshot } = createCustomerDisplaySnapshot(held);

  assert.equal(snapshot.status, "held");
  assert.equal(snapshot.lines.length, 1);
});
