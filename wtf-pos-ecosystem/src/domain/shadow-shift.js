import { makeEventId, makeIdempotencyKey } from "./ids.js";

export function buildShadowShiftReport(snapshot = {}, {
  icgReference = {},
  incidents = [],
  supervisedBy = "",
  notes = "",
  now = new Date()
} = {}) {
  const createdAt = now.toISOString();
  const latestControl = (snapshot.productionControls || []).at(-1) || null;
  const paidSales = (snapshot.sales || []).filter((sale) => sale.status === "paid");
  const pos = {
    salesCount: paidSales.length,
    grossTotal: round2(paidSales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0)),
    inventoryMovements: (snapshot.inventoryMovements || []).length,
    kdsCommands: (snapshot.kdsReceived || []).length,
    printJobs: (snapshot.printJobs || []).length
  };
  const icg = {
    salesCount: Number(icgReference.salesCount || 0),
    grossTotal: round2(icgReference.grossTotal || 0),
    inventoryMovements: Number(icgReference.inventoryMovements || 0)
  };
  const checks = [
    compare("tickets", "Tickets POS vs ICG", pos.salesCount, icg.salesCount, 0),
    compare("gross_total", "Total POS vs ICG", pos.grossTotal, icg.grossTotal, Number(icgReference.tolerance || 1)),
    compare("inventory_movements", "Movimientos previstos", pos.inventoryMovements, icg.inventoryMovements, 0)
  ];
  const differences = checks.filter((check) => check.status === "difference");
  const openIncidents = incidents.filter((incident) => incident.status !== "closed");
  const blocked = [];
  if (!latestControl?.productionAllowed) blocked.push("Falta control de produccion armado.");
  if (!supervisedBy) blocked.push("Falta supervisor del turno sombra.");
  if (differences.length) blocked.push("Existen diferencias contra ICG.");
  if (openIncidents.length) blocked.push("Existen incidentes abiertos.");
  const shadowShiftId = makeEventId("shadow_shift", `${createdAt}_${supervisedBy || "pending"}`);
  return {
    shadowShiftId,
    createdAt,
    supervisedBy,
    notes,
    status: blocked.length ? "needs_review" : "matched",
    mode: "shadow",
    affectsRealOperation: false,
    productionControlId: latestControl?.productionControlId || "",
    pos,
    icg,
    checks,
    incidents: incidents.map(normalizeIncident),
    summary: {
      differences: differences.length,
      openIncidents: openIncidents.length,
      blocked: blocked.length
    },
    blockers: blocked,
    nextAction: blocked[0] || "Turno sombra validado. Mantener siguiente turno supervisado antes de activar hardware real."
  };
}

export function createShadowShiftReportEvent(report) {
  return {
    eventId: makeEventId("pos_shadow_shift_report_recorded", report.shadowShiftId),
    type: "pos_shadow_shift_report_recorded",
    aggregateId: report.shadowShiftId,
    idempotencyKey: makeIdempotencyKey(["pos_shadow_shift_report_recorded", report.shadowShiftId]),
    createdAt: report.createdAt,
    status: "pending",
    attempts: 0,
    payload: report
  };
}

function compare(checkId, label, posValue, icgValue, tolerance) {
  const difference = round2(Number(posValue || 0) - Number(icgValue || 0));
  return {
    checkId,
    label,
    posValue: round2(posValue),
    icgValue: round2(icgValue),
    difference,
    tolerance,
    status: Math.abs(difference) <= tolerance ? "matched" : "difference"
  };
}

function normalizeIncident(incident, index) {
  return {
    incidentId: incident.incidentId || `incident_${index + 1}`,
    severity: incident.severity || "medium",
    title: incident.title || "Incidente sin titulo",
    status: incident.status || "open",
    detail: incident.detail || ""
  };
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
