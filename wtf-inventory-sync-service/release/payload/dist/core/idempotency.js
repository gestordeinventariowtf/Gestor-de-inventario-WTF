"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIdempotencyKey = buildIdempotencyKey;
exports.movementId = movementId;
const node_crypto_1 = require("node:crypto");
function buildIdempotencyKey(parts) {
    const raw = parts.map((part) => String(part ?? "").trim().toLowerCase()).join("|");
    return (0, node_crypto_1.createHash)("sha256").update(raw).digest("hex");
}
function movementId(prefix, key) {
    return `${prefix}-${key.slice(0, 16)}`;
}
