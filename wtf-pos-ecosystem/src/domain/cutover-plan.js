import { makeEventId, makeIdempotencyKey } from "./ids.js";
import { buildProductionReadiness } from "./production-readiness.js";

export function buildCutoverPlan(snapshot = {}, {
  windowStart = "",
  windowEnd = "",
  authorizedBy = "",
  rollbackOwner = "",
  notes = "",
  now = new Date()
} = {}) {
  const createdAt = now.toISOString();
  const readiness = buildProductionReadiness(snapshot);
  const checklist = [
    {
      itemId: "readiness_ready",
      label: "Readiness sin pendientes",
      status: readiness.readyForProduction ? "passed" : "blocked",
      detail: readiness.nextAction
    },
    {
      itemId: "window_defined",
      label: "Ventana horaria definida",
      status: windowStart && windowEnd ? "passed" : "blocked",
      detail: windowStart && windowEnd ? `${windowStart} -> ${windowEnd}` : "Falta ventana de cambio."
    },
    {
      itemId: "authorized",
      label: "Responsable autorizo el cambio",
      status: authorizedBy ? "passed" : "blocked",
      detail: authorizedBy || "Falta responsable autorizador."
    },
    {
      itemId: "rollback_owner",
      label: "Responsable de rollback asignado",
      status: rollbackOwner ? "passed" : "blocked",
      detail: rollbackOwner || "Falta responsable de reversa."
    },
    {
      itemId: "local_backup",
      label: "Respaldo local verificado",
      status: (snapshot.sales || []).length || (snapshot.pilotRuns || []).length ? "passed" : "pending",
      detail: `${(snapshot.sales || []).length} venta(s), ${(snapshot.pilotRuns || []).length} piloto(s)`
    },
    {
      itemId: "icg_standby",
      label: "ICG queda disponible como retorno",
      status: "passed",
      detail: "No se reemplaza ICG hasta validar operacion real."
    }
  ];
  const blocked = checklist.filter((item) => item.status === "blocked");
  const pending = checklist.filter((item) => item.status === "pending");
  const cutoverPlanId = makeEventId("cutover_plan", `${createdAt}_${authorizedBy || "pending"}`);
  return {
    cutoverPlanId,
    createdAt,
    windowStart,
    windowEnd,
    authorizedBy,
    rollbackOwner,
    notes,
    status: blocked.length ? "blocked" : pending.length ? "pending" : "approved_for_pilot_cutover",
    readiness,
    checklist,
    rollbackPlan: buildRollbackPlan({ rollbackOwner, createdAt }),
    summary: {
      total: checklist.length,
      passed: checklist.filter((item) => item.status === "passed").length,
      pending: pending.length,
      blocked: blocked.length
    }
  };
}

export function createCutoverPlanEvent(plan) {
  return {
    eventId: makeEventId("pos_cutover_plan_recorded", plan.cutoverPlanId),
    type: "pos_cutover_plan_recorded",
    aggregateId: plan.cutoverPlanId,
    idempotencyKey: makeIdempotencyKey(["pos_cutover_plan_recorded", plan.cutoverPlanId]),
    createdAt: plan.createdAt,
    status: "pending",
    attempts: 0,
    payload: plan
  };
}

function buildRollbackPlan({ rollbackOwner, createdAt }) {
  return {
    rollbackOwner,
    createdAt,
    triggerCriteria: [
      "Diferencia de caja no explicada.",
      "Impresora real sin respuesta.",
      "Pago no confirmado.",
      "KDS/CDS sin sincronizacion.",
      "Conciliacion con diferencia no autorizada."
    ],
    steps: [
      "Detener uso del POS piloto.",
      "Volver a registrar ventas en ICG FrontRest.",
      "Guardar copia del estado local POS.",
      "Exportar auditoria y conciliacion del piloto.",
      "Revisar inventario antes de reintentar."
    ]
  };
}
