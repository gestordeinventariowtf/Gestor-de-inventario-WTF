import { makeEventId, makeIdempotencyKey } from "./ids.js";

export const OPERATIONAL_STAGES = Object.freeze([
  {
    stageId: "10D",
    name: "Laboratorio real controlado de hardware/pagos",
    requiredPrevious: "ready_for_real_hardware_lab",
    nextDecision: "ready_for_limited_activation"
  },
  {
    stageId: "10E",
    name: "Criterios de activacion limitada",
    requiredPrevious: "ready_for_limited_activation",
    nextDecision: "ready_for_operational_monitoring"
  },
  {
    stageId: "10F",
    name: "Monitoreo operativo controlado",
    requiredPrevious: "ready_for_operational_monitoring",
    nextDecision: "ready_for_backup_restore_drill"
  },
  {
    stageId: "10G",
    name: "Ensayo backup/restore y rollback",
    requiredPrevious: "ready_for_backup_restore_drill",
    nextDecision: "ready_for_staff_training_signoff"
  },
  {
    stageId: "10H",
    name: "Firma de entrenamiento del equipo",
    requiredPrevious: "ready_for_staff_training_signoff",
    nextDecision: "ready_for_final_go_no_go"
  },
  {
    stageId: "10I",
    name: "Decision final Go/No-Go",
    requiredPrevious: "ready_for_final_go_no_go",
    nextDecision: "ready_for_production_handoff"
  },
  {
    stageId: "10J",
    name: "Paquete de entrega operativa",
    requiredPrevious: "ready_for_production_handoff",
    nextDecision: "implementation_ready_for_controlled_rollout"
  }
]);

export function buildOperationalStageReport(snapshot = {}, {
  stageId,
  approvedBy = "",
  evidence = [],
  notes = "",
  now = new Date()
} = {}) {
  const stage = OPERATIONAL_STAGES.find((row) => row.stageId === stageId);
  if (!stage) throw new Error("Etapa operativa invalida.");
  const createdAt = now.toISOString();
  const latestStage = (snapshot.operationalStageReports || []).at(-1) || null;
  const latestShadowDecision = (snapshot.shadowShiftDecisions || []).at(-1) || null;
  const previousDecision = latestStage?.nextDecision || latestShadowDecision?.decision || "";
  const blockers = [];
  if (previousDecision !== stage.requiredPrevious) {
    blockers.push(`Falta decision previa requerida: ${stage.requiredPrevious}.`);
  }
  if (!approvedBy) blockers.push("Falta aprobador responsable.");
  if (!Array.isArray(evidence) || evidence.length === 0) blockers.push("Falta evidencia de la etapa.");
  const operationalStageReportId = makeEventId("operational_stage", `${stage.stageId}_${createdAt}_${approvedBy || "pending"}`);
  return {
    operationalStageReportId,
    createdAt,
    stageId: stage.stageId,
    name: stage.name,
    approvedBy,
    notes,
    evidence: evidence.map((item, index) => ({
      evidenceId: item.evidenceId || `evidence_${index + 1}`,
      label: item.label || `Evidencia ${index + 1}`,
      status: item.status || "passed",
      detail: item.detail || ""
    })),
    status: blockers.length ? "blocked" : "approved",
    nextDecision: blockers.length ? previousDecision : stage.nextDecision,
    blockers,
    summary: {
      evidenceCount: Array.isArray(evidence) ? evidence.length : 0,
      blockers: blockers.length
    },
    affectsRealOperation: false
  };
}

export function createOperationalStageReportEvent(report) {
  return {
    eventId: makeEventId("pos_operational_stage_report_recorded", report.operationalStageReportId),
    type: "pos_operational_stage_report_recorded",
    aggregateId: report.operationalStageReportId,
    idempotencyKey: makeIdempotencyKey(["pos_operational_stage_report_recorded", report.operationalStageReportId]),
    createdAt: report.createdAt,
    status: "pending",
    attempts: 0,
    payload: report
  };
}
