import { createHash } from "node:crypto";
import { createId, makeEventId, makeIdempotencyKey } from "./ids.js";

export const POS_PERMISSIONS = Object.freeze({
  OPEN_SHIFT: "pos.shift.open",
  CLOSE_SHIFT: "pos.shift.close",
  SELL: "pos.sale.create",
  VOID_SALE: "pos.sale.void",
  REFUND_SALE: "pos.sale.refund",
  SEND_KDS: "pos.kds.send",
  PRINT_RECEIPT: "pos.receipt.print",
  MANAGE_SETTINGS: "pos.settings.manage"
});

export function createPosUser({ userId = createId("user"), name, role = "cashier", pin, permissions = [], active = true }) {
  if (!name) throw new Error("Nombre de usuario requerido.");
  if (!pin || String(pin).length < 4) throw new Error("PIN debe tener al menos 4 digitos.");
  return {
    userId,
    name,
    role,
    pinHash: hashPin(pin),
    permissions: Array.from(new Set(permissions)),
    active
  };
}

export class PosUserDirectory {
  constructor(users = []) {
    this.users = users.map((user) => normalizeUser(user));
  }

  authenticatePin(pin) {
    const pinHash = hashPin(pin);
    const user = this.users.find((row) => row.active !== false && row.pinHash === pinHash);
    if (!user) throw new Error("PIN invalido o usuario inactivo.");
    return createPosSession(user);
  }

  getById(userId) {
    return this.users.find((user) => user.userId === userId) || null;
  }
}

export function createPosSession(user, { now = new Date() } = {}) {
  const normalized = normalizeUser(user);
  return {
    sessionId: createId("session"),
    userId: normalized.userId,
    name: normalized.name,
    role: normalized.role,
    permissions: normalized.permissions,
    startedAt: now.toISOString()
  };
}

export function requirePermission(session, permission) {
  if (!session || !session.userId) throw new Error("Sesion POS requerida.");
  if (!Array.isArray(session.permissions) || !session.permissions.includes(permission)) {
    throw new Error(`Permiso POS requerido: ${permission}`);
  }
}

export function createAuditEvent({ type, actor, aggregateId = "", payload = {}, now = new Date() }) {
  if (!type) throw new Error("Tipo de auditoria requerido.");
  if (!actor || !actor.userId) throw new Error("Actor requerido para auditoria.");
  const createdAt = now.toISOString();
  return {
    eventId: makeEventId(type, `${actor.userId}_${aggregateId}_${createdAt}`),
    type,
    aggregateId,
    createdAt,
    actorUserId: actor.userId,
    actorName: actor.name,
    idempotencyKey: makeIdempotencyKey([type, actor.userId, aggregateId, createdAt]),
    schemaVersion: 1,
    payload,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}

export function hashPin(pin) {
  return createHash("sha256").update(String(pin)).digest("hex");
}

function normalizeUser(user) {
  if (!user || !user.userId) throw new Error("Usuario POS invalido.");
  return Object.assign({
    role: "cashier",
    permissions: [],
    active: true
  }, user, {
    permissions: Array.from(new Set(user.permissions || []))
  });
}
