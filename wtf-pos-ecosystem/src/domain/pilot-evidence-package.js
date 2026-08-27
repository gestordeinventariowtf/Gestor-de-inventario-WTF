import { makeEventId, makeIdempotencyKey } from "./ids.js";
import { buildProductionReadiness } from "./production-readiness.js";

export function buildPilotEvidencePackage(snapshot = {}, {
  generatedBy = "",
  notes = "",
  now = new Date()
} = {}) {
  const createdAt = now.toISOString();
  const latestFinalReport = (snapshot.pilotFinalReports || []).at(-1) || null;
  const readiness = latestFinalReport?.readiness || buildProductionReadiness(snapshot);
  const latestPilot = latestFinalReport?.pilot || (snapshot.pilotRuns || []).at(-1) || null;
  const latestReconciliation = latestFinalReport?.reconciliation || (snapshot.pilotReconciliations || []).at(-1) || null;
  const latestCutover = latestFinalReport?.cutover || (snapshot.cutoverPlans || []).at(-1) || null;
  const evidencePackageId = makeEventId("pilot_evidence_package", `${createdAt}_${generatedBy || "system"}`);
  const summary = buildSummary({
    finalReport: latestFinalReport,
    readiness,
    pilot: latestPilot,
    reconciliation: latestReconciliation,
    cutover: latestCutover
  });
  const packageData = {
    evidencePackageId,
    createdAt,
    generatedBy,
    notes,
    status: summary.status,
    summary,
    finalReport: latestFinalReport,
    readiness,
    pilot: latestPilot,
    reconciliation: latestReconciliation,
    cutover: latestCutover,
    tablets: latestFinalReport?.tablets || { totalReports: 0, passed: 0, warning: 0, failed: 0, devices: [] },
    hardware: latestFinalReport?.hardware || {
      currentDevice: snapshot.deviceProfile?.device || null,
      printer: snapshot.deviceProfile?.printer || null,
      payment: snapshot.deviceProfile?.payment || null,
      matrixSummary: snapshot.hardwareMatrix?.summary || {}
    },
    operations: latestFinalReport?.operations || {
      salesCount: (snapshot.sales || []).filter((sale) => sale.status === "paid").length,
      grossTotal: round2((snapshot.sales || []).reduce((sum, sale) => {
        return sale.status === "paid" ? sum + Number(sale.totals?.total || 0) : sum;
      }, 0)),
      inventoryMovements: (snapshot.inventoryMovements || []).length,
      auditEvents: (snapshot.auditEvents || []).length,
      printJobs: (snapshot.printJobs || []).length,
      kdsCommands: (snapshot.kdsReceived || []).length,
      cdsSnapshots: snapshot.cds ? 1 : 0
    },
    auditTrail: (snapshot.auditEvents || []).slice(-25).map((event) => ({
      eventId: event.eventId,
      type: event.type,
      createdAt: event.createdAt,
      actorName: event.actorName,
      aggregateId: event.aggregateId
    }))
  };
  return Object.assign({}, packageData, {
    exportFiles: {
      jsonFileName: `${evidencePackageId}.json`,
      htmlFileName: `${evidencePackageId}.html`,
      html: renderEvidenceHtml(packageData)
    }
  });
}

export function createPilotEvidencePackageEvent(evidencePackage) {
  return {
    eventId: makeEventId("pos_pilot_evidence_package_recorded", evidencePackage.evidencePackageId),
    type: "pos_pilot_evidence_package_recorded",
    aggregateId: evidencePackage.evidencePackageId,
    idempotencyKey: makeIdempotencyKey(["pos_pilot_evidence_package_recorded", evidencePackage.evidencePackageId]),
    createdAt: evidencePackage.createdAt,
    status: "pending",
    attempts: 0,
    payload: evidencePackage
  };
}

function buildSummary({ finalReport, readiness, pilot, reconciliation, cutover }) {
  const blockers = [];
  const pending = [];
  if (!finalReport) blockers.push("Falta generar reporte final de piloto.");
  if (!readiness?.readyForProduction) blockers.push(readiness?.nextAction || "Readiness no esta listo.");
  if (!pilot) blockers.push("Falta piloto operativo.");
  if (!reconciliation) blockers.push("Falta conciliacion.");
  if (cutover?.status !== "approved_for_pilot_cutover") blockers.push("Falta cutover aprobado.");
  if (finalReport?.decision?.pending?.length) pending.push(...finalReport.decision.pending);
  const status = blockers.length ? "blocked" : pending.length ? "pending" : "ready_for_review";
  return {
    status,
    blockers,
    pending,
    nextAction: blockers[0] || pending[0] || "Revisar paquete y aprobar siguiente etapa controlada."
  };
}

function renderEvidenceHtml(evidencePackage) {
  const rows = [
    ["Estado", evidencePackage.status],
    ["Generado por", evidencePackage.generatedBy || "Sistema"],
    ["Fecha", evidencePackage.createdAt],
    ["Ventas piloto", evidencePackage.operations.salesCount],
    ["Total piloto", money(evidencePackage.operations.grossTotal)],
    ["Movimientos inventario", evidencePackage.operations.inventoryMovements],
    ["Tablets validadas", `${evidencePackage.tablets.passed}/${evidencePackage.tablets.totalReports}`],
    ["Bloqueos", evidencePackage.summary.blockers.length],
    ["Siguiente accion", evidencePackage.summary.nextAction]
  ];
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>WTF POS - Evidencia de piloto</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    h2 { margin-top: 24px; font-size: 16px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
    .status { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #ecfdf5; color: #047857; font-weight: 700; }
    .blocked { background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>
  <h1>WTF POS - Paquete de evidencias de piloto</h1>
  <div class="status ${evidencePackage.status === "blocked" ? "blocked" : ""}">${escapeHtml(evidencePackage.status)}</div>
  <p>${escapeHtml(evidencePackage.notes || "Resumen generado para revision interna.")}</p>
  <h2>Resumen</h2>
  <table><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
  <h2>Bloqueos</h2>
  <table><tbody>${renderListRows(evidencePackage.summary.blockers)}</tbody></table>
  <h2>Auditoria reciente</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Actor</th><th>Evento</th><th>Referencia</th></tr></thead>
    <tbody>${evidencePackage.auditTrail.map((event) => `<tr><td>${escapeHtml(event.createdAt || "")}</td><td>${escapeHtml(event.actorName || "")}</td><td>${escapeHtml(event.type || "")}</td><td>${escapeHtml(event.aggregateId || "")}</td></tr>`).join("")}</tbody>
  </table>
</body>
</html>`;
}

function renderListRows(items) {
  return items.length
    ? items.map((item) => `<tr><td>${escapeHtml(item)}</td></tr>`).join("")
    : "<tr><td>Sin bloqueos registrados.</td></tr>";
}

function money(value) {
  return Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
