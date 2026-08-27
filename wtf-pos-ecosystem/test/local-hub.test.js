import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalHubServer } from "../src/local-hub/server.js";

test("hub local comparte comandas KDS y snapshot CDS", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-hub-"));
  const { server } = await createLocalHubServer({ storePath: path.join(dir, "hub.json") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const command = {
    commandId: "kds_1",
    ticketId: "ticket_1",
    tableLabel: "Mesa 1",
    lines: [{ name: "Camarofongo", qty: 1 }]
  };
  let response = await postJson(`${baseUrl}/api/kds/commands`, command);
  assert.equal(response.ok, true);

  response = await fetch(`${baseUrl}/api/kds/commands`).then((row) => row.json());
  assert.equal(response.data.length, 1);
  assert.equal(response.data[0].ackStatus, "acked");

  response = await postJson(`${baseUrl}/api/kds/commands/kds_1/status`, { status: "ready" });
  assert.equal(response.data.status, "ready");

  response = await postJson(`${baseUrl}/api/cds/snapshot`, {
    ticketId: "ticket_1",
    tableLabel: "Mesa 1",
    lines: [{ name: "Camarofongo", qty: 1, total: 895 }],
    totals: { total: 1082.95 }
  });
  assert.equal(response.data.totals.total, 1082.95);

  response = await fetch(`${baseUrl}/api/cds/snapshot`).then((row) => row.json());
  assert.equal(response.data.ticketId, "ticket_1");

  await new Promise((resolve) => server.close(resolve));
});

test("hub local registra dispositivos y actualiza heartbeat", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-hub-"));
  const { server } = await createLocalHubServer({ storePath: path.join(dir, "hub.json") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await postJson(`${baseUrl}/api/devices/register`, {
    deviceId: "tablet-pos-1",
    name: "Caja principal",
    role: "POS",
    station: "Salon"
  });
  assert.equal(response.data.status, "online");

  response = await postJson(`${baseUrl}/api/devices/tablet-pos-1/heartbeat`, {
    name: "Caja principal",
    role: "POS",
    station: "Barra"
  });
  assert.equal(response.data.station, "Barra");

  response = await fetch(`${baseUrl}/api/devices`).then((row) => row.json());
  assert.equal(response.data.length, 1);
  assert.equal(response.data[0].deviceId, "tablet-pos-1");

  await new Promise((resolve) => server.close(resolve));
});

test("hub local publica pantalla QR y valida codigo de emparejamiento", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-hub-"));
  const { server } = await createLocalHubServer({ storePath: path.join(dir, "hub.json") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(baseUrl);
  const html = await response.text();
  assert.equal(response.ok, true);
  assert.match(html, /Emparejar equipo/);
  assert.match(html, /wtfpos:\/\/pair/);

  response = await fetch(`${baseUrl}/api/pairing`).then((row) => row.json());
  assert.equal(response.ok, true);
  assert.equal(response.data.code, "WTF2026");
  assert.match(response.data.qrText, /^wtfpos:\/\/pair/);

  response = await postJson(`${baseUrl}/api/pairing/resolve`, { code: "bad" });
  assert.equal(response.ok, false);

  response = await postJson(`${baseUrl}/api/pairing/resolve`, { code: "WTF2026" });
  assert.equal(response.ok, true);
  assert.equal(response.data.code, "WTF2026");

  await new Promise((resolve) => server.close(resolve));
});

test("hub local monitorea tablets sin heartbeat reciente", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-hub-"));
  const { server, store } = await createLocalHubServer({ storePath: path.join(dir, "hub.json") });
  await store.write({
    devices: [
      { deviceId: "pos_ok", role: "POS", name: "Caja", lastSeenAt: new Date().toISOString() },
      { deviceId: "kds_warn", role: "KDS", name: "Cocina", lastSeenAt: new Date(Date.now() - 45000).toISOString() },
      { deviceId: "cds_off", role: "CDS", name: "Cliente", lastSeenAt: new Date(Date.now() - 90000).toISOString() }
    ]
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/devices/monitor`).then((row) => row.json());
  assert.equal(response.ok, true);
  assert.equal(response.data.summary.online, 1);
  assert.equal(response.data.summary.warning, 1);
  assert.equal(response.data.summary.offline, 1);
  assert.equal(response.data.devices.find((device) => device.deviceId === "cds_off").connectionStatus, "offline");

  await new Promise((resolve) => server.close(resolve));
});

test("hub local registra validacion de piloto por tablet", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-hub-"));
  const { server } = await createLocalHubServer({ storePath: path.join(dir, "hub.json") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let response = await postJson(`${baseUrl}/api/pilot/device-reports`, {
    deviceId: "tablet-pos-1",
    role: "POS",
    name: "POS Caja principal",
    station: "Caja",
    status: "passed",
    notes: "Emparejo y completo venta demo."
  });
  assert.equal(response.ok, true);
  assert.equal(response.data.status, "passed");

  response = await fetch(`${baseUrl}/api/pilot/device-reports`).then((row) => row.json());
  assert.equal(response.data.length, 1);
  assert.equal(response.data[0].deviceId, "tablet-pos-1");

  const html = await fetch(baseUrl).then((row) => row.text());
  assert.match(html, /Piloto por tablet/);
  assert.match(html, /POS Caja principal/);

  await new Promise((resolve) => server.close(resolve));
});

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then((row) => row.json());
}
