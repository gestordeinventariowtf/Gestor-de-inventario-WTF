import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import crypto from "node:crypto";
import webpush from "web-push";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OLLAMA_CHAT_URL = "https://ollama.com/api/chat";
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const OLLAMA_API_KEY = defineSecret("OLLAMA_API_KEY");
const VAPID_PUBLIC_KEY = defineSecret("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = defineSecret("VAPID_PRIVATE_KEY");
const PUSH_ADMIN_KEY = defineSecret("PUSH_ADMIN_KEY");
const PUSH_SUBSCRIPTIONS_COLLECTION = "pwaPushSubscriptions";
const PUSH_MESSAGES_COLLECTION = "pwaPushMessages";
const AUTHORIZED_TERMINALS_COLLECTION = "authorizedTerminals";
const TERMINAL_AUDIT_COLLECTION = "terminalAuditLogs";
const VAPID_SUBJECT = "mailto:admin@wtfsistema.local";
const PUSH_SERVICE_ACCOUNT = "gestor-de-inventario-wtf-29056@appspot.gserviceaccount.com";
const DEFAULT_BRANCHES = {
  "wtf-av-venezuela": {
    branchId: "wtf-av-venezuela",
    nombre: "WTF Av. Venezuela",
    latitude: 18.488178,
    longitude: -69.87001,
    allowedRadius: 200
  }
};

if (!getApps().length) initializeApp();
const ALLOWED_ORIGINS = new Set([
  "https://gestor-de-inventario-wtf-prod-2026.web.app",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
]);

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Push-Admin-Key");
}

function observedIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.ip || req.socket?.remoteAddress || "").trim();
}

function sanitizeTerminalText(value, max = 160) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function isAdminCaller(body) {
  const user = body && body.user && typeof body.user === "object" ? body.user : {};
  return String(user.role || "").toLowerCase() === "admin";
}

function hashTerminalSecret(secret) {
  return crypto.createHash("sha256").update(String(secret || ""), "utf8").digest("hex");
}

function makeTerminalId() {
  return `term_${crypto.randomBytes(18).toString("base64url")}`;
}

async function writeTerminalAudit(type, terminalId, payload = {}, req = null) {
  const db = getFirestore();
  await db.collection(TERMINAL_AUDIT_COLLECTION).add({
    type,
    terminalId: sanitizeTerminalText(terminalId, 120),
    branchId: sanitizeTerminalText(payload.branchId || "", 80),
    actor: sanitizeTerminalText(payload.actor || payload.userName || "", 160),
    actorEmail: sanitizeTerminalText(payload.actorEmail || "", 160),
    detail: sanitizeTerminalText(payload.detail || "", 500),
    observedIp: req ? observedIp(req) : sanitizeTerminalText(payload.observedIp || "", 120),
    userAgent: req ? sanitizeTerminalText(req.headers["user-agent"] || "", 500) : sanitizeTerminalText(payload.userAgent || "", 500),
    createdAt: FieldValue.serverTimestamp()
  });
}

function publicTerminalData(doc) {
  const data = doc.data ? doc.data() || {} : doc || {};
  const terminalId = doc.id || data.terminalId || "";
  return {
    terminalId,
    name: data.name || "",
    branchId: data.branchId || "wtf-av-venezuela",
    branchName: data.branchName || DEFAULT_BRANCHES[data.branchId || "wtf-av-venezuela"]?.nombre || "WTF Av. Venezuela",
    status: data.status || "pending",
    requestedBy: data.requestedBy || "",
    requestedByEmail: data.requestedByEmail || "",
    authorizedBy: data.authorizedBy || "",
    authorizedByEmail: data.authorizedByEmail || "",
    createdAt: data.createdAt || null,
    authorizedAt: data.authorizedAt || null,
    lastSeenAt: data.lastSeenAt || null,
    lastObservedIp: data.lastObservedIp || "",
    lastUserAgent: data.lastUserAgent || "",
    deviceInfo: data.deviceInfo || {},
    credentialVersion: data.credentialVersion || 1,
    lastAttendance: data.lastAttendance || null
  };
}

async function requestTerminalAuthorization(body, req) {
  const db = getFirestore();
  const secret = sanitizeTerminalText(body.secret, 500);
  if (secret.length < 24) throw new Error("Credencial de terminal invalida");
  const terminalId = sanitizeTerminalText(body.terminalId, 140) || makeTerminalId();
  const branchId = sanitizeTerminalText(body.branchId || "wtf-av-venezuela", 80);
  const branch = DEFAULT_BRANCHES[branchId] || DEFAULT_BRANCHES["wtf-av-venezuela"];
  const user = body.user && typeof body.user === "object" ? body.user : {};
  const ref = db.collection(AUTHORIZED_TERMINALS_COLLECTION).doc(terminalId);
  const snapshot = await ref.get();
  const now = FieldValue.serverTimestamp();
  const base = {
    terminalId,
    name: sanitizeTerminalText(body.name || "Terminal pendiente WTF", 120),
    branchId: branch.branchId,
    branchName: branch.nombre,
    status: snapshot.exists && snapshot.data()?.status === "active" ? "active" : "pending",
    secretHash: hashTerminalSecret(secret),
    credentialVersion: Number(snapshot.data()?.credentialVersion || 0) + 1,
    requestedBy: sanitizeTerminalText(user.nombre || user.name || "", 160),
    requestedByEmail: sanitizeTerminalText(user.email || "", 160),
    deviceInfo: body.deviceInfo && typeof body.deviceInfo === "object" ? body.deviceInfo : {},
    lastObservedIp: observedIp(req),
    lastUserAgent: sanitizeTerminalText(req.headers["user-agent"] || "", 500),
    updatedAt: now
  };
  if (!snapshot.exists) base.createdAt = now;
  await ref.set(base, { merge: true });
  await writeTerminalAudit("REQUESTED", terminalId, { branchId: branch.branchId, actor: base.requestedBy, actorEmail: base.requestedByEmail, detail: "Solicitud de autorizacion de terminal" }, req);
  return { ok: true, terminal: publicTerminalData(Object.assign({ id: terminalId }, base)), terminalId, status: base.status };
}

async function validateAuthorizedTerminal(body, req) {
  const terminalId = sanitizeTerminalText(body.terminalId, 140);
  const secret = sanitizeTerminalText(body.secret, 500);
  const branchId = sanitizeTerminalText(body.branchId || "wtf-av-venezuela", 80);
  if (!terminalId || !secret) return { ok: false, allowed: false, reason: "missing-credential" };
  const db = getFirestore();
  const ref = db.collection(AUTHORIZED_TERMINALS_COLLECTION).doc(terminalId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { ok: true, allowed: false, reason: "not-found" };
  const data = snapshot.data() || {};
  const secretOk = data.secretHash && data.secretHash === hashTerminalSecret(secret);
  if (!secretOk) {
    await writeTerminalAudit("REJECTED_BAD_SECRET", terminalId, { branchId, detail: "Credencial local no coincide" }, req);
    return { ok: true, allowed: false, reason: "invalid-credential", terminal: publicTerminalData(snapshot) };
  }
  if (data.status === "blocked" || data.status === "revoked") {
    await writeTerminalAudit("REJECTED_STATUS", terminalId, { branchId, detail: `Terminal ${data.status}` }, req);
    return { ok: true, allowed: false, reason: data.status, terminal: publicTerminalData(snapshot) };
  }
  if (data.status !== "active") return { ok: true, allowed: false, reason: "pending", terminal: publicTerminalData(snapshot) };
  if (String(data.branchId || "") !== branchId) {
    await writeTerminalAudit("REJECTED_BRANCH", terminalId, { branchId, detail: `Terminal autorizada para ${data.branchId || "otra sucursal"}` }, req);
    return { ok: true, allowed: false, reason: "wrong-branch", terminal: publicTerminalData(snapshot) };
  }
  const user = body.user && typeof body.user === "object" ? body.user : {};
  await ref.set({
    lastSeenAt: FieldValue.serverTimestamp(),
    lastObservedIp: observedIp(req),
    lastUserAgent: sanitizeTerminalText(req.headers["user-agent"] || "", 500),
    lastUserName: sanitizeTerminalText(user.nombre || user.name || "", 160),
    lastUserEmail: sanitizeTerminalText(user.email || "", 160),
    lastAttendance: body.attendance ? {
      type: sanitizeTerminalText(body.attendance.type || "", 40),
      employee: sanitizeTerminalText(body.attendance.employee || "", 160),
      at: FieldValue.serverTimestamp()
    } : data.lastAttendance || null
  }, { merge: true });
  await writeTerminalAudit("VALIDATED", terminalId, { branchId, actor: user.nombre || user.name, actorEmail: user.email, detail: "Terminal autorizada validada" }, req);
  return {
    ok: true,
    allowed: true,
    validationMethod: "AUTHORIZED_TERMINAL",
    terminal: publicTerminalData(Object.assign({ id: terminalId }, Object.assign({}, data, { terminalId }))),
    serverTime: new Date().toISOString()
  };
}

async function listAuthorizedTerminals(body) {
  if (!isAdminCaller(body)) throw new Error("Solo administradores pueden consultar terminales");
  const db = getFirestore();
  const snapshot = await db.collection(AUTHORIZED_TERMINALS_COLLECTION).limit(200).get();
  const auditSnapshot = await db.collection(TERMINAL_AUDIT_COLLECTION).orderBy("createdAt", "desc").limit(120).get();
  return {
    ok: true,
    branches: Object.values(DEFAULT_BRANCHES),
    terminals: snapshot.docs.map(publicTerminalData).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    auditLogs: auditSnapshot.docs.map((doc) => Object.assign({ id: doc.id }, doc.data() || {}))
  };
}

async function updateAuthorizedTerminal(body, req) {
  if (!isAdminCaller(body)) throw new Error("Solo administradores pueden administrar terminales");
  const terminalId = sanitizeTerminalText(body.terminalId, 140);
  if (!terminalId) throw new Error("Terminal invalida");
  const db = getFirestore();
  const ref = db.collection(AUTHORIZED_TERMINALS_COLLECTION).doc(terminalId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("Terminal no encontrada");
  const action = sanitizeTerminalText(body.terminalAction || body.operation || "", 60);
  const user = body.user && typeof body.user === "object" ? body.user : {};
  const patch = { updatedAt: FieldValue.serverTimestamp(), updatedBy: sanitizeTerminalText(user.nombre || user.name || "", 160), updatedByEmail: sanitizeTerminalText(user.email || "", 160) };
  if (body.name != null) patch.name = sanitizeTerminalText(body.name, 120);
  if (body.branchId != null) {
    const branch = DEFAULT_BRANCHES[sanitizeTerminalText(body.branchId, 80)] || DEFAULT_BRANCHES["wtf-av-venezuela"];
    patch.branchId = branch.branchId;
    patch.branchName = branch.nombre;
  }
  if (action === "authorize") {
    patch.status = "active";
    patch.authorizedAt = FieldValue.serverTimestamp();
    patch.authorizedBy = patch.updatedBy;
    patch.authorizedByEmail = patch.updatedByEmail;
  } else if (action === "block") {
    patch.status = "blocked";
  } else if (action === "revoke") {
    patch.status = "revoked";
    patch.revokedAt = FieldValue.serverTimestamp();
  } else if (action === "reactivate") {
    patch.status = "active";
  } else if (action === "reject") {
    patch.status = "rejected";
  }
  await ref.set(patch, { merge: true });
  await writeTerminalAudit(action.toUpperCase() || "UPDATED", terminalId, { branchId: patch.branchId || snapshot.data()?.branchId, actor: patch.updatedBy, actorEmail: patch.updatedByEmail, detail: `Terminal actualizada: ${action || "datos"}` }, req);
  const updated = await ref.get();
  return { ok: true, terminal: publicTerminalData(updated) };
}

function extractOutputText(data) {
  if (!data) return "";
  if (typeof data.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function buildInstructions(task) {
  if (String(task || "").includes("recuento_lectura_foto_conteo")) {
    return [
      "Eres un lector experto de hojas de conteo manual de inventario para WTF Sistema.",
      "Debes leer la foto como una tabla de productos y conteos escritos a mano.",
      "La hoja puede tener dos columnas. Lee izquierda completa y derecha completa.",
      "Extrae solo filas reales de productos con cantidad visible.",
      "Ignora encabezados, fecha, hora, modulo, responsable, area, pagina y textos decorativos.",
      "No inventes productos ni cantidades. Si una cantidad no se ve, omite esa fila.",
      "Devuelve exclusivamente JSON valido, sin markdown, sin explicaciones.",
      "Formato obligatorio: {\"lineas\":[{\"productoDetectado\":\"Nombre exacto visible\",\"cantidadContada\":0,\"codArticulo\":\"\",\"productoWtf\":\"\"}]}",
      "cantidadContada debe ser numero. Conserva el nombre visible del producto lo mas exacto posible.",
      `Tarea solicitada: ${task || "recuento_lectura_foto_conteo"}.`
    ].join("\n");
  }
  return [
    "Eres el asistente operativo por voz y texto del sistema WTF de inventario, cocina, bar, produccion, ICG y mermas.",
    "Responde como ayudante practico. No hagas auditorias ni analisis largos a menos que el usuario lo pida expresamente.",
    "Si el usuario pide una accion, prioriza ayudar a preparar esa accion con una respuesta breve.",
    "Si el usuario solo pide abrir, entrar, buscar o navegar a un modulo, responde de forma directa y ejecuta la accion permitida sin agregar observaciones criticas.",
    "Da sugerencias o consejos solo cuando el usuario los pida, cuando pregunte como resolver algo, o cuando falte un dato necesario para continuar.",
    "No inventes existencias ni codigos. Si faltan datos, dilo.",
    "Si no encuentras un producto, no termines la conversacion: sugiere crearlo y pide los datos necesarios uno por uno.",
    "Para consultas de existencia, usa todo el contexto de productos y respeta aclaraciones de modulo como Bar, Cocina, Inventario, Cuarto Frio o Mise.",
    "Nunca indiques que un ajuste fue aplicado si solo estas recomendando.",
    "Si el usuario pide abrir, buscar o ir a un producto, puedes sugerir una accion controlada.",
    "Acciones permitidas: buscar_producto, abrir_dashboard, abrir_inventario, abrir_cuarto_frio, abrir_mise, abrir_produccion, abrir_recuento, abrir_entradas, abrir_salidas, abrir_decomiso, preparar_movimiento.",
    "preparar_movimiento solo abre el modulo correcto y llena producto/cantidad/ubicacion; el usuario siempre debe confirmar manualmente.",
    "Si un producto tiene varias coincidencias o ubicaciones posibles, pregunta cual desea usar antes de preparar el movimiento.",
    "Si la solicitud no requiere accionar pantalla, responde conversacionalmente en texto normal.",
    "Cuando uses acciones, responde solo JSON valido con esta forma: {\"respuesta\":\"texto breve\",\"acciones\":[{\"tipo\":\"buscar_producto\",\"producto\":\"limon\",\"modulo\":\"bar\",\"destino\":\"inventario\"}]}.",
    "Para entradas, salidas o decomisos ya confirmados por el usuario, usa: {\"respuesta\":\"Te deje la entrada preparada para confirmar.\",\"acciones\":[{\"tipo\":\"preparar_movimiento\",\"movimiento\":\"entrada\",\"producto\":\"Mozzarella Sticks\",\"cantidad\":7,\"modulo\":\"cocina\",\"destino\":\"cuarto_frio\"}]}",
    "Para entradas, salidas o decomisos masivos, usa items: {\"respuesta\":\"Te deje la lista preparada para revisar.\",\"acciones\":[{\"tipo\":\"preparar_movimiento\",\"movimiento\":\"entrada\",\"items\":[{\"producto\":\"Mozzarella Sticks\",\"cantidad\":7},{\"producto\":\"Agua\",\"cantidad\":12}]}]}",
    "No ejecutes ajustes de inventario, salidas, entradas, decomisos ni borrados automaticamente.",
    "Prioriza respuestas en espanol dominicano claro y accionable.",
    `Tarea solicitada: ${task || "analisis_general"}.`
  ].join("\n");
}

function extractOllamaText(data) {
  if (!data) return "";
  if (data.message && typeof data.message.content === "string") return data.message.content;
  if (typeof data.response === "string") return data.response;
  if (typeof data.content === "string") return data.content;
  return "";
}

function getImageBase64(imageDataUrl) {
  const text = String(imageDataUrl || "");
  const comma = text.indexOf(",");
  return comma >= 0 ? text.slice(comma + 1) : text;
}

async function callOllamaCloud({ apiKey, task, model, payload, safePayload, imageDataUrl }) {
  if (!apiKey) throw new Error("OLLAMA_API_KEY no configurada en Firebase Functions.");
  const instructions = buildInstructions(task);
  const isJsonTask = String(task || "").includes("recuento_lectura_foto_conteo") || String(task || "").includes("chat_flotante");
  const isFloatingChat = String(task || "").includes("chat_flotante");
  const content = (String(task || "").includes("recuento_lectura_foto_conteo") ? "Lee la foto adjunta y devuelve solo el JSON solicitado. Datos de apoyo JSON:\n" : isFloatingChat ? "Responde exactamente a la solicitud del usuario. Si pide una accion, devuelve JSON de accion; si pregunta algo, responde normal y breve. Datos del sistema para contexto:\n" : "Analiza estos datos del sistema y responde con recomendaciones concretas. Datos JSON:\n") + safePayload;
  const message = { role: "user", content };
  if (imageDataUrl) message.images = [getImageBase64(imageDataUrl)];
  const body = {
    model: model || payload?.ollamaModel || "gemma4:31b-cloud",
    messages: [
      { role: "system", content: instructions },
      message
    ],
    stream: false
  };
  if (isJsonTask) body.format = "json";
  const response = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || "Ollama no respondio correctamente.");
  return { respuesta: extractOllamaText(data), rawId: data.id || "", provider: "ollama" };
}

async function callOpenAi({ apiKey, task, model, safePayload, imageDataUrl }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada en Firebase Functions.");
  const isRecountPhotoTask = String(task || "").includes("recuento_lectura_foto_conteo");
  const isFloatingChat = String(task || "").includes("chat_flotante");
  const content = [
    {
      type: "input_text",
      text: (isRecountPhotoTask ? "Lee la foto adjunta y devuelve solo el JSON solicitado. Datos de apoyo JSON:\n" : isFloatingChat ? "Responde exactamente a la solicitud del usuario. Si pide una accion, devuelve JSON de accion; si pregunta algo, responde normal y breve. Datos del sistema para contexto:\n" : "Analiza estos datos del sistema y responde con recomendaciones concretas. Datos JSON:\n") + safePayload
    }
  ];
  if (imageDataUrl) {
    content.push({
      type: "input_image",
      image_url: imageDataUrl
    });
  }
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model || "gpt-5.6",
      instructions: buildInstructions(task),
      input: [
        {
          role: "user",
          content
        }
      ]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error && data.error.message || "OpenAI no respondio correctamente.");
  return { respuesta: extractOutputText(data), rawId: data.id || "", provider: "openai" };
}

export const wtfAiAssistant = onRequest({ region: "us-central1", cors: false, timeoutSeconds: 120, memory: "512MiB", secrets: [OPENAI_API_KEY, OLLAMA_API_KEY], invoker: "public" }, async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo no permitido" });
    return;
  }
  try {
    const { task, model, provider, ollamaModel, fallbackProvider, payload } = req.body || {};
    const imageDataUrl = payload && typeof payload.imageDataUrl === "string" && payload.imageDataUrl.startsWith("data:image/") ? payload.imageDataUrl : "";
    const safePayloadObject = Object.assign({}, payload || {});
    delete safePayloadObject.imageDataUrl;
    const safePayload = JSON.stringify(safePayloadObject).slice(0, 120000);
    const selectedProvider = String(provider || "ollama").toLowerCase();
    const openAiKey = OPENAI_API_KEY.value();
    const ollamaKey = OLLAMA_API_KEY.value();
    const ollamaRequest = { apiKey: ollamaKey, task, model: ollamaModel || (selectedProvider === "ollama" ? model : ""), payload, safePayload, imageDataUrl };
    const openAiRequest = { apiKey: openAiKey, task, model, safePayload, imageDataUrl };
    let result;
    if (selectedProvider === "openai") {
      result = await callOpenAi(openAiRequest);
    } else {
      try {
        result = await callOllamaCloud(ollamaRequest);
      } catch (ollamaError) {
        if (String(fallbackProvider || "openai").toLowerCase() !== "openai") throw ollamaError;
        result = await callOpenAi(openAiRequest);
        result.fallbackFrom = "ollama";
        result.ollamaError = ollamaError && ollamaError.message || "";
      }
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error && error.message || "Error interno IA" });
  }
});

function getPushAdminKey(req) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(req.headers["x-push-admin-key"] || req.body?.adminKey || "").trim();
}

function buildPushPayload(body) {
  const title = String(body?.title || "WTF Sistema").trim().slice(0, 120) || "WTF Sistema";
  const message = String(body?.body || body?.message || "Tienes una nueva notificacion del sistema.").trim().slice(0, 500);
  const defaultTag = body?.messageId || body?.id || `wtf-sistema-${Date.now()}`;
  return {
    title,
    body: message,
    icon: body?.icon || "/pwa-icon.svg",
    badge: body?.badge || "/pwa-icon.svg",
    tag: String(body?.tag || defaultTag).trim().slice(0, 80) || defaultTag,
    url: String(body?.url || "/").trim() || "/",
    data: body?.data && typeof body.data === "object" ? body.data : {}
  };
}

function normalizePushSubscription(doc) {
  const data = doc.data() || {};
  const subscription = data.subscription && typeof data.subscription === "object" ? data.subscription : data;
  if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) return null;
  return subscription;
}

function matchesPushTopic(data, topic) {
  if (!topic) return true;
  const topics = Array.isArray(data.topics) ? data.topics.map((item) => String(item).toLowerCase()) : [];
  const moduleName = String(data.module || data.modulo || "").toLowerCase();
  const requestedTopic = String(topic).toLowerCase();
  return topics.includes(requestedTopic) || moduleName === requestedTopic;
}

async function dispatchPushMessage(messageData) {
  const topic = String(messageData?.topic || "").trim();
  const dryRun = Boolean(messageData?.dryRun);
  const payload = buildPushPayload(messageData || {});
  const db = getFirestore();
  const snapshot = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).get();

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY.value(), VAPID_PRIVATE_KEY.value());

  let sent = 0;
  let skipped = 0;
  let deleted = 0;
  const failures = [];

  await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data() || {};
    if (data.active === false) {
      skipped += 1;
      return;
    }
    if (!matchesPushTopic(data, topic)) {
      skipped += 1;
      return;
    }
    const subscription = normalizePushSubscription(doc);
    if (!subscription) {
      await doc.ref.delete();
      deleted += 1;
      return;
    }
    if (dryRun) {
      sent += 1;
      return;
    }
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60, timeout: 10000 });
      sent += 1;
      } catch (error) {
        const statusCode = Number(error?.statusCode || error?.status || 0);
        const errorBody = String(error?.body || error?.message || "");
        if (statusCode === 404 || statusCode === 410 || (statusCode === 403 && /BadJwtToken/i.test(errorBody))) {
          await doc.ref.delete();
          deleted += 1;
          return;
        }
        failures.push({
          subscriptionId: doc.id,
          statusCode,
          message: String(errorBody || "Error enviando push").slice(0, 300)
        });
      }
  }));

  return {
    ok: failures.length === 0,
    totalSubscriptions: snapshot.size,
    topic: topic || "todos",
    dryRun,
    sent,
    skipped,
    deleted,
    failed: failures.length,
    failures: failures.slice(0, 20)
  };
}

function isStaleProcessingMessage(messageData) {
  if (!messageData || messageData.status !== "processing") return false;
  const processingAt = messageData.processingAt ? new Date(messageData.processingAt).getTime() : 0;
  return !Number.isFinite(processingAt) || !processingAt || Date.now() - processingAt > 3 * 60 * 1000;
}

function isDueScheduledMessage(messageData) {
  if (!messageData || messageData.status !== "scheduled") return false;
  const rawDate = messageData.scheduledFor || messageData.sendAt || "";
  const dateValue = rawDate && typeof rawDate.toDate === "function" ? rawDate.toDate() : new Date(rawDate);
  const dueAt = dateValue && Number.isFinite(dateValue.getTime()) ? dateValue.getTime() : 0;
  return !!dueAt && dueAt <= Date.now();
}

async function claimPendingPushMessage(docRef) {
  const db = getFirestore();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) return null;
    const messageData = snapshot.data() || {};
    if (messageData.status === "scheduled" && !isDueScheduledMessage(messageData)) return null;
    if (messageData.status && messageData.status !== "pending" && messageData.status !== "scheduled" && !isStaleProcessingMessage(messageData)) return null;
    transaction.set(docRef, { status: "processing", processingAt: new Date().toISOString() }, { merge: true });
    return messageData;
  });
}

async function processPushMessageDocument(docRef) {
  const messageData = await claimPendingPushMessage(docRef);
  if (!messageData) return { status: "skipped" };
  try {
    const result = await dispatchPushMessage(messageData);
    await docRef.set({ status: result.ok ? "sent" : "partial_error", result, completedAt: new Date().toISOString() }, { merge: true });
    return { status: result.ok ? "sent" : "partial_error", result };
  } catch (error) {
    await docRef.set({ status: "error", error: error && error.message || "Error enviando push", completedAt: new Date().toISOString() }, { merge: true });
    return { status: "error", error: error && error.message || "Error enviando push" };
  }
}

async function createAndSendPushMessage(body = {}) {
  const title = String(body.title || "WTF Sistema").trim().slice(0, 120) || "WTF Sistema";
  const message = String(body.body || body.message || "").trim().slice(0, 500);
  if (!message) throw new Error("Mensaje de notificacion vacio");
  const db = getFirestore();
  const docRef = db.collection(PUSH_MESSAGES_COLLECTION).doc();
  const now = new Date().toISOString();
  const messageData = {
    title,
    body: message,
    topic: String(body.topic || "").trim(),
    url: String(body.url || "/").trim() || "/",
    tag: `wtf-notification-${docRef.id}`,
    createdBy: String(body.createdBy || "").trim().slice(0, 160),
    createdByEmail: String(body.createdByEmail || "").trim().slice(0, 160),
    status: "processing",
    processingAt: now,
    createdAt: FieldValue.serverTimestamp()
  };
  await docRef.set(messageData);
  try {
    const result = await dispatchPushMessage(Object.assign({}, messageData, { messageId: docRef.id }));
    await docRef.set({
      status: result.ok ? "sent" : "partial_error",
      result,
      completedAt: new Date().toISOString()
    }, { merge: true });
    return { ok: result.ok, id: docRef.id, status: result.ok ? "sent" : "partial_error", result };
  } catch (error) {
    await docRef.set({
      status: "error",
      error: error && error.message || "Error enviando push",
      completedAt: new Date().toISOString()
    }, { merge: true });
    throw error;
  }
}

async function processPendingPushMessages(limit = 25) {
  const db = getFirestore();
  const safeLimit = Math.max(1, Math.min(Number(limit || 25), 100));
  const pendingSnapshot = await db.collection(PUSH_MESSAGES_COLLECTION).where("status", "==", "pending").limit(safeLimit).get();
  const scheduledSnapshot = await db.collection(PUSH_MESSAGES_COLLECTION).where("status", "==", "scheduled").limit(safeLimit).get();
  const processingSnapshot = await db.collection(PUSH_MESSAGES_COLLECTION).where("status", "==", "processing").limit(safeLimit).get();
  const docsById = new Map();
  pendingSnapshot.docs.forEach((doc) => docsById.set(doc.id, doc));
  scheduledSnapshot.docs.forEach((doc) => {
    if (isDueScheduledMessage(doc.data() || {})) docsById.set(doc.id, doc);
  });
  processingSnapshot.docs.forEach((doc) => {
    if (isStaleProcessingMessage(doc.data() || {})) docsById.set(doc.id, doc);
  });
  const processed = [];
  for (const doc of Array.from(docsById.values()).slice(0, safeLimit)) {
    const result = await processPushMessageDocument(doc.ref);
    processed.push({ id: doc.id, ...result });
  }
  return { ok: true, total: docsById.size, processed };
}

async function deletePushMessage(messageId) {
  const cleanId = String(messageId || "").trim();
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(cleanId)) {
    throw new Error("ID de notificacion invalido");
  }
  const db = getFirestore();
  await db.collection(PUSH_MESSAGES_COLLECTION).doc(cleanId).delete();
  return { ok: true, deleted: cleanId };
}

async function diagnosePushSubscriptions(topic = "") {
  const requestedTopic = String(topic || "").trim();
  const db = getFirestore();
  const snapshot = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).get();
  let active = 0;
  let inactive = 0;
  let valid = 0;
  let invalid = 0;
  let matching = 0;
  let ios = 0;
  let standalone = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    if (data.active === false) inactive += 1;
    else active += 1;
    if (normalizePushSubscription(doc)) valid += 1;
    else invalid += 1;
    if (matchesPushTopic(data, requestedTopic) && data.active !== false && normalizePushSubscription(doc)) matching += 1;
    if (data.ios === true) ios += 1;
    if (data.standalone === true) standalone += 1;
  });
  return {
    ok: true,
    topic: requestedTopic || "todos",
    totalSubscriptions: snapshot.size,
    active,
    inactive,
    valid,
    invalid,
    matching,
    ios,
    standalone
  };
}

export const wtfSendPushNotification = onRequest({ region: "us-central1", cors: false, timeoutSeconds: 60, memory: "256MiB", secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_ADMIN_KEY], invoker: "public", serviceAccount: PUSH_SERVICE_ACCOUNT }, async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Metodo no permitido" });
    return;
  }
  try {
    const expectedKey = PUSH_ADMIN_KEY.value();
    if (!expectedKey || getPushAdminKey(req) !== expectedKey) {
      res.status(401).json({ ok: false, error: "No autorizado" });
      return;
    }

    if (req.body && req.body.processPending === true) {
      res.json(await processPendingPushMessages(req.body.limit || 25));
      return;
    }
    res.json(await dispatchPushMessage(req.body || {}));
  } catch (error) {
    res.status(500).json({ ok: false, error: error && error.message || "Error interno enviando push" });
  }
});

export const wtfProcessPendingPushMessages = onRequest({ region: "us-central1", cors: false, timeoutSeconds: 60, memory: "256MiB", secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY], invoker: "public", serviceAccount: PUSH_SERVICE_ACCOUNT }, async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Metodo no permitido" });
    return;
  }
  try {
    if (req.body && req.body.action === "deleteMessage") {
      res.json(await deletePushMessage(req.body.messageId));
      return;
    }
    if (req.body && req.body.action === "diagnoseSubscriptions") {
      res.json(await diagnosePushSubscriptions(req.body.topic || ""));
      return;
    }
    if (req.body && req.body.action === "createAndSend") {
      res.json(await createAndSendPushMessage(req.body));
      return;
    }
    res.json(await processPendingPushMessages(req.body?.limit || 25));
  } catch (error) {
    res.status(500).json({ ok: false, error: error && error.message || "Error procesando notificaciones pendientes" });
  }
});

export const wtfProcessScheduledPushMessages = onSchedule({ region: "us-central1", schedule: "every 5 minutes", timeZone: "America/Santo_Domingo", timeoutSeconds: 60, memory: "256MiB", secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY], serviceAccount: PUSH_SERVICE_ACCOUNT }, async () => {
  await processPendingPushMessages(100);
});

export const wtfAuthorizedTerminal = onRequest({ region: "us-central1", cors: false, timeoutSeconds: 60, memory: "256MiB", invoker: "public", serviceAccount: PUSH_SERVICE_ACCOUNT }, async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Metodo no permitido" });
    return;
  }
  try {
    const action = sanitizeTerminalText(req.body?.action || "", 80);
    if (action === "request") {
      res.json(await requestTerminalAuthorization(req.body || {}, req));
      return;
    }
    if (action === "validate") {
      res.json(await validateAuthorizedTerminal(req.body || {}, req));
      return;
    }
    if (action === "list") {
      res.json(await listAuthorizedTerminals(req.body || {}));
      return;
    }
    if (action === "update") {
      res.json(await updateAuthorizedTerminal(req.body || {}, req));
      return;
    }
    res.status(400).json({ ok: false, error: "Accion de terminal invalida" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error && error.message || "Error procesando terminal autorizada" });
  }
});

export const wtfDispatchPushMessage = onDocumentCreated({ document: `${PUSH_MESSAGES_COLLECTION}/{messageId}`, region: "us-central1", timeoutSeconds: 60, memory: "256MiB", secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY] }, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const result = await processPushMessageDocument(snapshot.ref);
  console.log("Push message processed", snapshot.id, result.status);
});
