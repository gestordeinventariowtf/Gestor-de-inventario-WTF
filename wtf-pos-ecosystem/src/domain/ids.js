import { randomUUID } from "node:crypto";

export function createId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

export function makeIdempotencyKey(parts) {
  return parts.map((part) => String(part ?? "")).join("|");
}

export function makeEventId(type, aggregateId) {
  return `${type}_${aggregateId}`;
}
