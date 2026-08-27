import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addProductToTicket, createOpenTicket } from "../src/domain/open-ticket.js";
import { openShift } from "../src/domain/shift.js";
import { createKdsCommandFromTicket } from "../src/domain/kds-command.js";
import { KdsCommandQueue } from "../src/infrastructure/kds-command-queue.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";
import { VirtualKdsAdapter } from "../src/infrastructure/virtual-kds-adapter.js";

const product = { id: "prod_1", name: "WTF Burger", sku: "WTF-1", barcode: "1001", price: 450, active: true };

function makeTicket() {
  const shift = openShift({ employeeId: "emp_kds", deviceId: "pos_1" });
  let ticket = createOpenTicket({ shift, tableLabel: "Mesa 4", diningOption: "dineIn" });
  ticket = addProductToTicket(ticket, product, { qty: 2, notes: "Sin cebolla" });
  return ticket;
}

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-kds-"));
  return new LocalJsonStore(path.join(dir, "store.json"));
}

test("crea comanda KDS desde una orden abierta", () => {
  const { command, event } = createKdsCommandFromTicket(makeTicket(), { stationId: "plancha" });

  assert.equal(command.stationId, "plancha");
  assert.equal(command.status, "queued");
  assert.equal(command.ackStatus, "pending");
  assert.equal(command.lines.length, 1);
  assert.equal(command.lines[0].notes, "Sin cebolla");
  assert.equal(event.type, "kds_command_created");
});

test("envia comanda a KDS virtual y marca ACK", async () => {
  const store = await makeStore();
  const queue = new KdsCommandQueue(store);
  const { command, event } = createKdsCommandFromTicket(makeTicket());

  await queue.enqueue(command, event);
  const result = await queue.dispatchNext(new VirtualKdsAdapter({ ack: true }));
  const data = await store.read();

  assert.equal(result.acked, 1);
  assert.equal(data.kdsCommands[0].status, "sent");
  assert.equal(data.kdsCommands[0].ackStatus, "acked");
});

test("si no hay ACK deja comanda en retry sin perderla", async () => {
  const store = await makeStore();
  const queue = new KdsCommandQueue(store);
  const { command, event } = createKdsCommandFromTicket(makeTicket());

  await queue.enqueue(command, event);
  const result = await queue.dispatchNext(new VirtualKdsAdapter({ ack: false }), {
    now: new Date("2026-08-22T12:00:00.000Z")
  });
  const data = await store.read();

  assert.equal(result.failed, 1);
  assert.equal(data.kdsCommands[0].status, "retry");
  assert.equal(data.kdsCommands[0].attempts, 1);
  assert.match(data.kdsCommands[0].lastError, /ACK_TIMEOUT/);
});

test("KDS virtual responde ACK duplicado sin duplicar recibido", async () => {
  const adapter = new VirtualKdsAdapter({ ack: true });
  const { command } = createKdsCommandFromTicket(makeTicket());

  const first = await adapter.sendCommand(command);
  const second = await adapter.sendCommand(command);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(adapter.received.length, 1);
});

test("cola despacha multiples comandas pendientes", async () => {
  const store = await makeStore();
  const queue = new KdsCommandQueue(store);

  for (let index = 0; index < 3; index += 1) {
    const { command, event } = createKdsCommandFromTicket(makeTicket());
    await queue.enqueue(command, event);
  }

  const result = await queue.dispatchAll(new VirtualKdsAdapter({ ack: true }));
  const data = await store.read();

  assert.equal(result.acked, 3);
  assert.equal(data.kdsCommands.filter((command) => command.status === "sent").length, 3);
});
