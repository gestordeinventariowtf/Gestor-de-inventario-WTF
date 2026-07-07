import { createHash } from "node:crypto";

export function buildIdempotencyKey(parts: Array<string | number | undefined | null>): string {
  const raw = parts.map((part) => String(part ?? "").trim().toLowerCase()).join("|");
  return createHash("sha256").update(raw).digest("hex");
}

export function movementId(prefix: string, key: string): string {
  return `${prefix}-${key.slice(0, 16)}`;
}
