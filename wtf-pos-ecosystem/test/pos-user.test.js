import test from "node:test";
import assert from "node:assert/strict";
import { createAuditEvent, createPosUser, POS_PERMISSIONS, PosUserDirectory, requirePermission } from "../src/domain/pos-user.js";

test("autentica usuario POS con PIN y no expone PIN plano", () => {
  const user = createPosUser({
    name: "Caja",
    pin: "1234",
    permissions: [POS_PERMISSIONS.SELL]
  });
  const directory = new PosUserDirectory([user]);
  const session = directory.authenticatePin("1234");

  assert.equal(user.pin, undefined);
  assert.equal(typeof user.pinHash, "string");
  assert.equal(session.name, "Caja");
  assert.equal(session.permissions.includes(POS_PERMISSIONS.SELL), true);
});

test("rechaza PIN incorrecto o usuario sin permiso", () => {
  const user = createPosUser({
    name: "Caja",
    pin: "1234",
    permissions: [POS_PERMISSIONS.SELL]
  });
  const directory = new PosUserDirectory([user]);

  assert.throws(() => directory.authenticatePin("9999"), /PIN invalido/);
  assert.throws(() => requirePermission(directory.authenticatePin("1234"), POS_PERMISSIONS.CLOSE_SHIFT), /Permiso POS requerido/);
});

test("crea auditoria con actor responsable", () => {
  const user = createPosUser({
    name: "Admin",
    pin: "1234",
    permissions: Object.values(POS_PERMISSIONS)
  });
  const session = new PosUserDirectory([user]).authenticatePin("1234");
  const event = createAuditEvent({
    type: "pos_audit_sale_paid",
    actor: session,
    aggregateId: "sale_1",
    payload: { total: 118 },
    now: new Date("2026-08-22T12:00:00.000Z")
  });

  assert.equal(event.actorUserId, session.userId);
  assert.equal(event.actorName, "Admin");
  assert.equal(event.payload.total, 118);
});
