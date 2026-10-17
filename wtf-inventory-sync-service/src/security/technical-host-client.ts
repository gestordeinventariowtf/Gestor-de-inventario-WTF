import crypto from "node:crypto";
import type { ServiceConfig } from "../core/types.js";
import { unprotectWindowsSecret } from "./windows-protected-secret.js";

let cachedCredential = "";

async function credential(config: ServiceConfig): Promise<string> {
  if (cachedCredential) return cachedCredential;
  const plain = String(process.env.WTF_TERMINAL_SECRET || "").trim();
  cachedCredential = plain || await unprotectWindowsSecret(config.terminalSecretProtected);
  if (!cachedCredential) throw new Error("El Host no tiene credencial tecnica enrolada.");
  return cachedCredential;
}

export function buildTechnicalSignature(secret: string, method: string, pathname: string, timestamp: string, nonce: string, body: string): string {
  const bodyHash = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  const canonical = [method.toUpperCase(), pathname, timestamp, nonce, bodyHash].join("\n");
  return crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

export async function technicalFirestoreFetch(config: ServiceConfig, resource: string, method: string, fields?: Record<string, unknown>, createOnly = false): Promise<Response> {
  const endpoint = String(config.hostSyncEndpoint || "").trim();
  const terminalId = String(config.terminalId || "").trim();
  if (!endpoint || !terminalId) throw new Error("El Host tecnico necesita WTF_HOST_SYNC_ENDPOINT y WTF_TERMINAL_ID.");
  const url = new URL(endpoint);
  const body = JSON.stringify({ resource, method, fields: fields || {}, createOnly });
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(18).toString("base64url");
  const secret = await credential(config);
  const headers = new Headers({ "Content-Type": "application/json", "X-WTF-Terminal-Id": terminalId, "X-WTF-Timestamp": timestamp, "X-WTF-Nonce": nonce, "X-WTF-Signature": buildTechnicalSignature(secret, "POST", "/", timestamp, nonce, body) });
  return fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(30000) });
}
