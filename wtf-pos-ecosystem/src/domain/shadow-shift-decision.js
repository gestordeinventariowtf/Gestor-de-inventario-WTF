import { makeEventId, makeIdempotencyKey } from "./ids.js";

export function buildShadowShiftDecision(snapshot = {}, {
  decidedBy = "",
  notes = "",
  now = new Date()
} = {}) {
  const createdAt = now.toISOString();
  const latestShadow = (snapshot.shadowShiftReports || []).at(-1) || null;
  const blockers = [];
  if (!latestShadow) blockers.push("Falta turno sombra.");
  if (latestShadow?.status !== "matched") blockers.push("El turno sombra no cuadrologicamente.");
  if ((latestShadow?.summary?.differences || 0) > 0) blockers.push("Hay diferencias contra ICG.");
  if ((latestShadow?.summary?.openIncidents || 0) > 0) blockers.push("Hay incidentes abiertos.");
  if (!decidedBy) blockers.push("Falta responsable de decision.");
  const decisionId = makeEventId("shadow_shift_decision", `${createdAt}_${decidedBy || "pending"}`);
  const decision = blockers.length ? "repeat_shadow_or_block" : "ready_for_real_hardware_lab";
  return {
    decisionId,
    createdAt,
    decidedBy,
    notes,
    shadowShiftId: latestShadow?.shadowShiftId || "",
    decision,
    status: blockers.length ? "blocked" : "approved",
    blockers,
    nextAction: blockers[0] || "Pasar a laboratorio controlado de impresora/pagos reales sin reemplazar ICG."
  };
}

export function createShadowShiftDecisionEvent(decision) {
  return {
    eventId: makeEventId("pos_shadow_shift_decision_recorded", decision.decisionId),
    type: "pos_shadow_shift_decision_recorded",
    aggregateId: decision.decisionId,
    idempotencyKey: makeIdempotencyKey(["pos_shadow_shift_decision_recorded", decision.decisionId]),
    createdAt: decision.createdAt,
    status: "pending",
    attempts: 0,
    payload: decision
  };
}
