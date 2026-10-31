import crypto from "node:crypto";
import type { ServiceConfig } from "../core/types.js";
import { unprotectWindowsSecret } from "./windows-protected-secret.js";
let cachedCredential = "";
const TECHNICAL_FETCH_ATTEMPTS = 3;
const TECHNICAL_FETCH_TIMEOUT_MS = 30000;
function wait(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
function networkErrorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error || "Error desconocido"); }
async function credential(config: ServiceConfig): Promise<string> {
  if (cachedCredential) return cachedCredential;
  const plain = String(process.env.WTF_TERMINAL_SECRET || "").trim();
  cachedCredential = plain || await unprotectWindowsSecret(config.terminalSecretProtected);
  if (!cachedCredential) throw new Error("El Host no tiene credencial tecnica enrolada.");
  return cachedCredential;
}
export function buildTechnicalSignature(secret: string, method: string, pathname: string, timestamp: string, nonce: string, body: string): string {
  const bodyHash = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  return crypto.createHmac("sha256", secret).update([method.toUpperCase(), pathname, timestamp, nonce, bodyHash].join("\n"), "utf8").digest("hex");
}
export async function technicalFirestoreFetch(config: ServiceConfig, resource: string, method: string, fields?: Record<string, unknown>, createOnly = false): Promise<Response> {
  const endpoint = String(config.hostSyncEndpoint || "").trim();
  const terminalId = String(config.terminalId || "").trim();
  if (!endpoint || !terminalId) throw new Error("El Host tecnico necesita WTF_HOST_SYNC_ENDPOINT y WTF_TERMINAL_ID.");
  const body = JSON.stringify({ resource, method, fields: fields || {}, createOnly });
  const secret = await credential(config);
  let lastError = "";
  for (let attempt = 1; attempt <= TECHNICAL_FETCH_ATTEMPTS; attempt++) {
    const timestamp = String(Date.now());
    const nonce = crypto.randomBytes(18).toString("base64url");
    const headers = new Headers({ "Content-Type": "application/json", "X-WTF-Terminal-Id": terminalId, "X-WTF-Timestamp": timestamp, "X-WTF-Nonce": nonce, "X-WTF-Signature": buildTechnicalSignature(secret, "POST", "/", timestamp, nonce, body) });
    try {
      const response = await fetch(endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(TECHNICAL_FETCH_TIMEOUT_MS) });
      if (response.status >= 500 && attempt < TECHNICAL_FETCH_ATTEMPTS) { await wait(attempt * 750); continue; }
      return response;
    } catch (error) { lastError = networkErrorMessage(error); if (attempt < TECHNICAL_FETCH_ATTEMPTS) { await wait(attempt * 750); continue; } }
  }
  throw new Error(`No se pudo comunicar con el gateway tecnico despues de ${TECHNICAL_FETCH_ATTEMPTS} intentos: ${lastError || "error de red"}`);
}
