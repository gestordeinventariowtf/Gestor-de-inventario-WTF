import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OLLAMA_CHAT_URL = "https://ollama.com/api/chat";
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const OLLAMA_API_KEY = defineSecret("OLLAMA_API_KEY");
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
  res.set("Access-Control-Allow-Headers", "Content-Type");
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
    "Eres el asistente IA del sistema WTF de inventario, cocina, bar, produccion, ICG y mermas.",
    "Trabaja como auditor operativo: claro, conservador y orientado a prevenir perdidas de dinero.",
    "No inventes existencias ni codigos. Si faltan datos, dilo.",
    "Nunca indiques que un ajuste fue aplicado si solo estas recomendando.",
    "Si el usuario pide abrir, buscar o ir a un producto, puedes sugerir una accion controlada.",
    "Acciones permitidas: buscar_producto, abrir_inventario, abrir_cuarto_frio, abrir_mise, abrir_produccion, abrir_recuento, preparar_movimiento.",
    "preparar_movimiento solo abre el modulo correcto y llena producto/cantidad/ubicacion; el usuario siempre debe confirmar manualmente.",
    "Si un producto tiene varias coincidencias o ubicaciones posibles, pregunta cual desea usar antes de preparar el movimiento.",
    "Cuando uses acciones, responde JSON valido con esta forma: {\"respuesta\":\"texto breve\",\"acciones\":[{\"tipo\":\"buscar_producto\",\"producto\":\"limon\",\"modulo\":\"bar\",\"destino\":\"inventario\"}]}.",
    "Para entradas, salidas o decomisos ya confirmados por el usuario, usa: {\"respuesta\":\"Te deje la entrada preparada para confirmar.\",\"acciones\":[{\"tipo\":\"preparar_movimiento\",\"movimiento\":\"entrada\",\"producto\":\"Mozzarella Sticks\",\"cantidad\":7,\"modulo\":\"cocina\",\"destino\":\"cuarto_frio\"}]}",
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
  const content = (String(task || "").includes("recuento_lectura_foto_conteo") ? "Lee la foto adjunta y devuelve solo el JSON solicitado. Datos de apoyo JSON:\n" : "Analiza estos datos del sistema y responde con recomendaciones concretas. Datos JSON:\n") + safePayload;
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
  const content = [
    {
      type: "input_text",
      text: (isRecountPhotoTask ? "Lee la foto adjunta y devuelve solo el JSON solicitado. Datos de apoyo JSON:\n" : "Analiza estos datos del sistema y responde con recomendaciones concretas. Datos JSON:\n") + safePayload
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
