import { makeEventId, makeIdempotencyKey } from "./ids.js";
import { buildProductionReadiness } from "./production-readiness.js";

export function buildPilotFinalReport(snapshot = {}, {
  deviceReports = [],
  generatedBy = "",
  notes = "",
  now = new Date()
} = {}) {
  const createdAt = now.toISOString();
  const readiness = buildProductionReadiness(snapshot);
  const latestPilot = (snapshot.pilotRuns || []).at(-1) || null;
  const latestReconciliation = (snapshot.pilotReconciliations || []).at(-1) || null;
  const latestCutover = (snapshot.cutoverPlans || []).at(-1) || null;
  const tablets = summarizeDeviceReports(deviceReports);
  const operations = summarizeOperations(snapshot);
  const decision = buildDecision({
    readiness,
    latestPilot,
    latestReconciliation,
    latestCutover,
    tablets
  });
  const finalReportId = makeEventId("pilot_final_report", `${createdAt}_${generatedBy || "system"}`);

  return {
    finalReportId,
    createdAt,
    generatedBy,
    notes,
    status: decision.status,
    decision,
    readiness,
    hardware: {
      currentDevice: snapshot.deviceProfile?.device || null,
      printer: snapshot.deviceProfile?.printer || null,
      payment: snapshot.deviceProfile?.payment || null,
      matrixSummary: snapshot.hardwareMatrix?.summary || {}
    },
    tablets,
    pilot: latestPilot,
    reconciliation: latestReconciliation,
    cutover: latestCutover,
    operations
  };
}

export function createPilotFinalReportEvent(report) {
  return {
    eventId: makeEventId("pos_pilot_final_report_recorded", report.finalReportId),
    type: "pos_pilot_final_report_recorded",
    aggregateId: report.finalReportId,
    idempotencyKey: makeIdempotencyKey(["pos_pilot_final_report_recorded", report.finalReportId]),
    createdAt: report.createdAt,
    status: "pending",
    attempts: 0,
    payload: report
  };
}

function summarizeDeviceReports(deviceReports) {
  const reports = Array.isArray(deviceReports) ? deviceReports : [];
  return {
    totalReports: reports.length,
    passed: reports.filter((row) => row.status === "passed").length,
    warning: reports.filter((row) => row.status === "warning").length,
    failed: reports.filter((row) => row.status === "failed").length,
    devices: reports.map((row) => ({
      deviceId: row.deviceId || "",
      role: row.role || "",
      name: row.name || "",
      station: row.station || "",
      status: row.status || "pending",
      notes: row.notes || "",
      createdAt: row.createdAt || ""
    }))
  };
}

function summarizeOperations(snapshot) {
  const paidSales = (snapshot.sales || []).filter((sale) => sale.status === "paid");
  const grossTotal = paidSales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0);
  return {
    salesCount: paidSales.length,
    grossTotal: round2(grossTotal),
    inventoryMovements: (snapshot.inventoryMovements || []).length,
    auditEvents: (snapshot.auditEvents || []).length,
    printJobs: (snapshot.printJobs || []).length,
    kdsCommands: (snapshot.kdsReceived || snapshot.kdsCommands || []).length,
    cdsSnapshots: (snapshot.cdsSnapshots || []).length || (snapshot.cds ? 1 : 0)
  };
}

function buildDecision({ readiness, latestPilot, latestReconciliation, latestCutover, tablets }) {
  const blockers = [];
  const pending = [];
  if (!readiness.readyForProduction) blockers.push(readiness.nextAction);
  if (!latestPilot) blockers.push("Falta ejecutar un piloto operativo.");
  if (!latestReconciliation) blockers.push("Falta conciliacion del piloto.");
  if (latestCutover?.status !== "approved_for_pilot_cutover") blockers.push("Falta plan de cutover aprobado.");
  if (tablets.failed) blockers.push("Hay tablet o dispositivo con validacion fallida.");
  if (!tablets.totalReports) pending.push("No hay reporte formal de tablets.");
  if (tablets.warning) pending.push("Hay advertencias de tablets por revisar.");

  const status = blockers.length ? "blocked" : pending.length ? "pending" : "ready_for_supervised_pilot";
  return {
    status,
    blockers,
    pending,
    nextAction: blockers[0] || pending[0] || "Ejecutar piloto interno supervisado con evidencia guardada."
  };
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
