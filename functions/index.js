import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
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
  return [
    "Eres el asistente IA del sistema WTF de inventario, cocina, bar, produccion, ICG y mermas.",
    "Trabaja como auditor operativo: claro, conservador y orientado a prevenir perdidas de dinero.",
    "No inventes existencias ni codigos. Si faltan datos, dilo.",
    "Nunca indiques que un ajuste fue aplicado si solo estas recomendando.",
    "Prioriza respuestas en espanol dominicano claro y accionable.",
    `Tarea solicitada: ${task || "analisis_general"}.`
  ].join("\n");
}

export const wtfAiAssistant = onRequest({ region: "us-central1", cors: false, timeoutSeconds: 120, memory: "512MiB", secrets: [OPENAI_API_KEY] }, async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo no permitido" });
    return;
  }
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) {
    res.status(503).json({ error: "OPENAI_API_KEY no configurada en Firebase Functions." });
    return;
  }
  try {
    const { task, model, payload } = req.body || {};
    const imageDataUrl = payload && typeof payload.imageDataUrl === "string" && payload.imageDataUrl.startsWith("data:image/") ? payload.imageDataUrl : "";
    const safePayload = JSON.stringify(payload || {}).slice(0, 120000);
    const content = [
      {
        type: "input_text",
        text: "Analiza estos datos del sistema y responde con recomendaciones concretas. Datos JSON:\n" + safePayload
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
        model: model || "gpt-5.5",
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
    if (!response.ok) {
      res.status(response.status).json({ error: data.error && data.error.message || "OpenAI no respondio correctamente." });
      return;
    }
    res.json({ respuesta: extractOutputText(data), rawId: data.id || "" });
  } catch (error) {
    res.status(500).json({ error: error && error.message || "Error interno IA" });
  }
});
