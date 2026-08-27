import { createId, makeEventId, makeIdempotencyKey } from "./ids.js";
import { renderReceipt } from "./receipt.js";

export function createReceiptPrintJob(sale, { printerId = "receipt-main", station = "Caja", commandSet = "escpos", now = new Date() } = {}) {
  if (!sale || !sale.saleId) throw new Error("Venta invalida para imprimir.");
  const createdAt = now.toISOString();
  const job = {
    printJobId: createId("print"),
    saleId: sale.saleId,
    printerId,
    station,
    type: "receipt",
    commandSet,
    content: renderReceipt(sale),
    status: "queued",
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
    idempotencyKey: makeIdempotencyKey(["print_receipt", sale.saleId, printerId])
  };

  return {
    job,
    event: createPrintEvent("print_job_created", job, createdAt)
  };
}

export function markPrintJobPrinted(job, { printedAt = new Date().toISOString() } = {}) {
  return Object.assign({}, job, {
    status: "printed",
    printedAt,
    updatedAt: printedAt
  });
}

export function markPrintJobRetry(job, reason, { now = new Date() } = {}) {
  const updatedAt = now.toISOString();
  return Object.assign({}, job, {
    status: "retry",
    attempts: Number(job.attempts || 0) + 1,
    lastError: String(reason || "PRINT_FAILED"),
    nextRetryAt: new Date(now.getTime() + 15000).toISOString(),
    updatedAt
  });
}

export function createPrintEvent(type, job, createdAt = new Date().toISOString()) {
  return {
    eventId: makeEventId(type, `${job.printJobId}_${job.updatedAt}`),
    type,
    aggregateId: job.printJobId,
    createdAt,
    sourceDeviceId: job.printerId,
    idempotencyKey: makeIdempotencyKey([type, job.printJobId, job.updatedAt]),
    schemaVersion: 1,
    payload: job,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}
