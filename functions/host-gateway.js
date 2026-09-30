import crypto from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

const NONCE_WINDOW_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 900000;
const ALLOWED_DOCUMENTS = [
  /^wtfSistema\/estadoGeneral$/,
  /^wtfSistema\/estadoGeneral\/stateShards\/[A-Za-z0-9_-]{1,120}$/,
  /^wtfSistema\/icgControl$/,
  /^wtfSistema\/icgAppliedMovements\/[A-Za-z0-9_-]{1,180}$/
];

function text(value, max = 240) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function hmac(secret, value) {
  return crypto.createHmac("sha256", String(secret || "")).update(value, "utf8").digest("hex");
}

function timingSafeEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function canonical(method, pathname, timestamp, nonce, body) {
  const bodyHash = hash(body || "");
  return [String(method || "GET").toUpperCase(), pathname, timestamp, nonce, bodyHash].join("\n");
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return Boolean(value.booleanValue);
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
  if (Object.prototype.hasOwnProperty.call(value, "arrayValue")) return (value.arrayValue.values || []).map(decodeValue);
  if (Object.prototype.hasOwnProperty.call(value, "mapValue")) return decodeFields(value.mapValue.fields || {});
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Timestamp || value instanceof Date) {
    const date = value instanceof Timestamp ? value.toDate() : value;
    return { timestampValue: date.toISOString() };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)])) } };
  return { stringValue: String(value) };
}

function encodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, encodeValue(value)]));
}

function resourceAllowed(resource) {
  return ALLOWED_DOCUMENTS.some((pattern) => pattern.test(resource));
}

function responseDocument(snapshot) {
  return {
    name: snapshot.ref.path,
    fields: encodeFields(snapshot.data() || {}),
    createTime: snapshot.createTime || undefined,
    updateTime: snapshot.updateTime || undefined
  };
}

async function claimNonce(db, terminalId, nonce, timestamp) {
  const id = `${terminalId}_${hash(nonce).slice(0, 40)}`;
  const ref = db.collection("hostRequestNonces").doc(id);
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return false;
    transaction.create(ref, {
      terminalId,
      nonce,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Number(timestamp) + NONCE_WINDOW_MS)
    });
    return true;
  });
}

async function validateRequest(req, secret) {
  const terminalId = text(req.headers["x-wtf-terminal-id"], 140);
  const timestamp = text(req.headers["x-wtf-timestamp"], 32);
  const nonce = text(req.headers["x-wtf-nonce"], 180);
  const signature = text(req.headers["x-wtf-signature"], 160).toLowerCase();
  if (!terminalId || !timestamp || !nonce || !signature) throw Object.assign(new Error("Credenciales tecnicas incompletas"), { statusCode: 401 });
  const time = Number(timestamp);
  if (!Number.isFinite(time) || Math.abs(Date.now() - time) > NONCE_WINDOW_MS) throw Object.assign(new Error("Solicitud tecnica vencida"), { statusCode: 401 });
  const rawBody = req.rawBody && Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : JSON.stringify(req.body || {});
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) throw Object.assign(new Error("Solicitud tecnica demasiado grande"), { statusCode: 413 });
  const pathname = new URL(req.originalUrl || req.url || "/", "https://internal.local").pathname;
  const expected = hmac(deriveTerminalCredential(secret, terminalId), canonical(req.method, pathname, timestamp, nonce, rawBody));
  if (!timingSafeEqualHex(expected, signature)) throw Object.assign(new Error("Firma tecnica invalida"), { statusCode: 401 });
  const db = getFirestore();
  const terminal = await db.collection("authorizedTerminals").doc(terminalId).get();
  if (!terminal.exists || terminal.data()?.status !== "active") throw Object.assign(new Error("Terminal no autorizada o revocada"), { statusCode: 403 });
  if (!(await claimNonce(db, terminalId, nonce, timestamp))) throw Object.assign(new Error("Solicitud repetida"), { statusCode: 409 });
  await terminal.ref.set({ lastSeenAt: FieldValue.serverTimestamp(), lastTechnicalIp: String(req.ip || "") }, { merge: true });
  return { terminalId, rawBody };
}

export function deriveTerminalCredential(masterSecret, terminalId) {
  return hmac(masterSecret, `terminal:${terminalId}`);
}

export async function handleHostFirestoreGateway(req, res, masterSecret) {
  try {
    const { rawBody } = await validateRequest(req, masterSecret.value());
    const body = req.body && typeof req.body === "object" ? req.body : JSON.parse(rawBody || "{}");
    const resource = text(body.resource, 420);
    const method = text(body.method || "GET", 12).toUpperCase();
    if (!resourceAllowed(resource)) throw Object.assign(new Error("Documento no permitido para el Host"), { statusCode: 403 });
    const db = getFirestore();
    const ref = db.doc(resource);
    if (method === "GET") {
      const snapshot = await ref.get();
      if (!snapshot.exists) return res.status(404).json({ error: { status: "NOT_FOUND", message: "Documento no encontrado" } });
      return res.json(responseDocument(snapshot));
    }
    if (method === "PATCH" || method === "POST") {
      const fields = body.fields && typeof body.fields === "object" ? body.fields : {};
      const values = decodeFields(fields);
      if (body.createOnly) {
        const exists = await ref.get();
        if (exists.exists) return res.status(409).json({ error: { status: "ALREADY_EXISTS", message: "Documento ya existe" } });
      }
      await ref.set(values, { merge: true });
      const saved = await ref.get();
      return res.json(responseDocument(saved));
    }
    return res.status(405).json({ error: { status: "METHOD_NOT_ALLOWED", message: "Metodo no permitido" } });
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    return res.status(status).json({ error: { status: status === 500 ? "INTERNAL" : "REJECTED", message: error?.message || "Error de gateway tecnico" } });
  }
}

export async function enrollHostTerminal(req, res, masterSecret, rotate = false) {
  try {
    const authorization = String(req.headers.authorization || "");
    if (!authorization.startsWith("Bearer ")) return res.status(401).json({ ok: false, error: "Se requiere Firebase Auth para enrolar el Host" });
    const token = await getAuth().verifyIdToken(authorization.slice(7));
    const admins = new Set(["henryortiz1704@gmail.com", "wtfoodrdav.venezuela@gmail.com"]);
    if (!admins.has(String(token.email || "").toLowerCase())) return res.status(403).json({ ok: false, error: "Solo el administrador principal puede enrolar el Host" });
    const body = req.body || {};
    const terminalId = text(body.terminalId, 140);
    if (!terminalId || !/^term_[A-Za-z0-9_-]{8,140}$/.test(terminalId)) return res.status(400).json({ ok: false, error: "terminalId invalido" });
    const db = getFirestore();
    const ref = db.collection("authorizedTerminals").doc(terminalId);
    const current = await ref.get();
    if (current.exists && !rotate && current.data()?.status === "active") return res.status(409).json({ ok: false, error: "La terminal ya esta activa; usa rotacion" });
    const credential = deriveTerminalCredential(masterSecret.value(), terminalId);
    await ref.set({ terminalId, name: text(body.name || "WTF ICG Host", 120), branchId: text(body.branchId || "wtf-av-venezuela", 80), status: "active", technicalCredentialHash: hash(credential), credentialVersion: Number(current.data()?.credentialVersion || 0) + 1, authorizedByEmail: token.email, authorizedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await db.collection("terminalAuditLogs").add({ type: rotate ? "TECHNICAL_CREDENTIAL_ROTATED" : "TECHNICAL_TERMINAL_ENROLLED", terminalId, actorEmail: token.email, createdAt: FieldValue.serverTimestamp() });
    return res.json({ ok: true, terminalId, credential, credentialVersion: Number(current.data()?.credentialVersion || 0) + 1, warning: "Guarda esta credencial una sola vez; no se vuelve a mostrar." });
  } catch (error) {
    return res.status(Number(error?.code === "auth/id-token-expired" ? 401 : 500)).json({ ok: false, error: error?.message || "No se pudo enrolar la terminal" });
  }
}
