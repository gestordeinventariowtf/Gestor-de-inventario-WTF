import { makeEventId, makeIdempotencyKey } from "./ids.js";

export const POS_OPERATION_MODES = Object.freeze({
  DEMO: "demo",
  PILOT: "pilot",
  PRODUCTION: "production"
});

export function buildProductionControl(snapshot = {}, {
  requestedMode = POS_OPERATION_MODES.PILOT,
  approvedBy = "",
  notes = "",
  icgFallbackReady = true,
  rollbackConfirmed = false,
  firstShiftOwner = "",
  supervisionWindow = "",
  now = new Date()
} = {}) {
  const createdAt = now.toISOString();
  const latestEvidence = (snapshot.pilotEvidencePackages || []).at(-1) || null;
  const latestFinalReport = (snapshot.pilotFinalReports || []).at(-1) || null;
  const latestCutover = (snapshot.cutoverPlans || []).at(-1) || null;
  const checklist = [
    {
      itemId: "mode_explicit",
      label: "Modo operativo definido",
      status: Object.values(POS_OPERATION_MODES).includes(requestedMode) ? "passed" : "blocked",
      detail: requestedMode || "Sin modo"
    },
    {
      itemId: "evidence_ready",
      label: "Paquete de evidencias listo",
      status: latestEvidence?.status === "ready_for_review" ? "passed" : "blocked",
      detail: latestEvidence?.status || "Sin paquete de evidencias"
    },
    {
      itemId: "final_report_ready",
      label: "Reporte final sin bloqueo",
      status: ["ready_for_supervised_pilot", "pending"].includes(latestFinalReport?.status) ? "passed" : "blocked",
      detail: latestFinalReport?.status || "Sin reporte final"
    },
    {
      itemId: "cutover_approved",
      label: "Cutover aprobado",
      status: latestCutover?.status === "approved_for_pilot_cutover" ? "passed" : "blocked",
      detail: latestCutover?.status || "Sin cutover"
    },
    {
      itemId: "rollback_confirmed",
      label: "Rollback confirmado",
      status: rollbackConfirmed ? "passed" : "blocked",
      detail: rollbackConfirmed ? "Reversa disponible" : "Falta confirmar reversa"
    },
    {
      itemId: "icg_fallback_ready",
      label: "ICG disponible como respaldo",
      status: icgFallbackReady ? "passed" : "blocked",
      detail: icgFallbackReady ? "ICG queda disponible" : "ICG no confirmado"
    },
    {
      itemId: "approval",
      label: "Aprobacion administrativa",
      status: approvedBy ? "passed" : "blocked",
      detail: approvedBy || "Falta aprobador"
    },
    {
      itemId: "first_shift_owner",
      label: "Responsable del primer turno real",
      status: firstShiftOwner ? "passed" : "blocked",
      detail: firstShiftOwner || "Falta responsable"
    },
    {
      itemId: "supervision_window",
      label: "Ventana de supervision definida",
      status: supervisionWindow ? "passed" : "blocked",
      detail: supervisionWindow || "Falta ventana"
    }
  ];
  const blocked = checklist.filter((item) => item.status === "blocked");
  const productionControlId = makeEventId("production_control", `${createdAt}_${requestedMode}_${approvedBy || "pending"}`);
  return {
    productionControlId,
    createdAt,
    requestedMode,
    approvedBy,
    notes,
    status: blocked.length ? "blocked" : requestedMode === POS_OPERATION_MODES.PRODUCTION ? "production_armed" : "pilot_ready",
    productionAllowed: requestedMode === POS_OPERATION_MODES.PRODUCTION && blocked.length === 0,
    activationRequiresExplicitDeploy: true,
    icgFallbackReady,
    rollbackConfirmed,
    firstShiftOwner,
    supervisionWindow,
    evidencePackageId: latestEvidence?.evidencePackageId || "",
    finalReportId: latestFinalReport?.finalReportId || "",
    cutoverPlanId: latestCutover?.cutoverPlanId || "",
    checklist,
    summary: {
      total: checklist.length,
      passed: checklist.filter((item) => item.status === "passed").length,
      blocked: blocked.length
    },
    nextAction: blocked[0]?.label || "Produccion controlada armada. Activar solo durante el turno supervisado."
  };
}

export function createProductionControlEvent(control) {
  return {
    eventId: makeEventId("pos_production_control_recorded", control.productionControlId),
    type: "pos_production_control_recorded",
    aggregateId: control.productionControlId,
    idempotencyKey: makeIdempotencyKey(["pos_production_control_recorded", control.productionControlId]),
    createdAt: control.createdAt,
    status: "pending",
    attempts: 0,
    payload: control
  };
}
