import { createId } from "../domain/ids.js";

export class TransactionalPosApi {
  constructor(initialState = {}) {
    this.state = Object.assign({
      sales: [],
      saleReversals: [],
      shiftCloseReports: [],
      tickets: [],
      kdsCommands: [],
      cdsSnapshots: [],
      printJobs: [],
      pilotRuns: [],
      pilotReconciliations: [],
      cutoverPlans: [],
      pilotFinalReports: [],
      pilotEvidencePackages: [],
      productionControls: [],
      shadowShiftReports: [],
      shadowShiftDecisions: [],
      operationalStageReports: [],
      auditEvents: [],
      inventoryMovements: [],
      inventoryAlerts: [],
      events: [],
      processedIdempotencyKeys: []
    }, initialState);
  }

  async receiveBatch(events, { now = new Date() } = {}) {
    if (!Array.isArray(events)) throw new Error("El lote de sincronizacion no es valido.");
    const nextState = cloneState(this.state);
    const acknowledgements = [];

    for (const event of events) {
      validateEvent(event);
      const duplicate = nextState.processedIdempotencyKeys.includes(event.idempotencyKey);
      if (!duplicate) {
        applyEvent(nextState, event);
        nextState.processedIdempotencyKeys.push(event.idempotencyKey);
      }
      acknowledgements.push({
        eventId: event.eventId,
        idempotencyKey: event.idempotencyKey,
        status: duplicate ? "duplicate" : "applied"
      });
    }

    this.state = nextState;
    return {
      ok: true,
      batchId: createId("batch"),
      receivedAt: now.toISOString(),
      count: events.length,
      acknowledgements
    };
  }

  snapshot() {
    return cloneState(this.state);
  }
}

function validateEvent(event) {
  if (!event || typeof event !== "object") throw new Error("Evento invalido.");
  if (!event.eventId) throw new Error("Evento sin eventId.");
  if (!event.idempotencyKey) throw new Error(`Evento ${event.eventId} sin idempotencyKey.`);
  if (!event.type) throw new Error(`Evento ${event.eventId} sin tipo.`);
  if (!event.payload || typeof event.payload !== "object") throw new Error(`Evento ${event.eventId} sin payload.`);
}

function applyEvent(state, event) {
  if (event.type === "sale_paid") {
    upsertById(state.sales, event.payload, "saleId");
  } else if (event.type === "sale_voided" || event.type === "sale_refunded") {
    upsertById(state.saleReversals, event.payload, "reversalId");
    const sale = state.sales.find((row) => row.saleId === event.payload.saleId);
    if (sale) {
      sale.status = event.type === "sale_voided" ? "voided" : "partially_refunded";
    }
  } else if (event.type === "shift_closed") {
    upsertById(state.shiftCloseReports, event.payload, "closeReportId");
  } else if (event.type === "ticket_held") {
    upsertById(state.tickets, event.payload, "ticketId");
  } else if (event.type === "ticket_line_moved" || event.type === "ticket_merged") {
    for (const ticket of event.payload.tickets || []) {
      upsertById(state.tickets, ticket, "ticketId");
    }
  } else if (event.type.startsWith("kds_command_")) {
    upsertById(state.kdsCommands, event.payload, "commandId");
  } else if (event.type.startsWith("cds_snapshot_")) {
    upsertByFreshness(state.cdsSnapshots, event.payload, "snapshotId", "updatedAt");
  } else if (event.type.startsWith("print_job_")) {
    upsertByFreshness(state.printJobs, event.payload, "printJobId", "updatedAt");
  } else if (event.type === "pos_pilot_run_recorded") {
    upsertById(state.pilotRuns, event.payload, "pilotRunId");
  } else if (event.type === "pos_pilot_reconciliation_recorded") {
    upsertById(state.pilotReconciliations, event.payload, "reconciliationId");
  } else if (event.type === "pos_cutover_plan_recorded") {
    upsertById(state.cutoverPlans, event.payload, "cutoverPlanId");
  } else if (event.type === "pos_pilot_final_report_recorded") {
    upsertById(state.pilotFinalReports, event.payload, "finalReportId");
  } else if (event.type === "pos_pilot_evidence_package_recorded") {
    upsertById(state.pilotEvidencePackages, event.payload, "evidencePackageId");
  } else if (event.type === "pos_production_control_recorded") {
    upsertById(state.productionControls, event.payload, "productionControlId");
  } else if (event.type === "pos_shadow_shift_report_recorded") {
    upsertById(state.shadowShiftReports, event.payload, "shadowShiftId");
  } else if (event.type === "pos_shadow_shift_decision_recorded") {
    upsertById(state.shadowShiftDecisions, event.payload, "decisionId");
  } else if (event.type === "pos_operational_stage_report_recorded") {
    upsertById(state.operationalStageReports, event.payload, "operationalStageReportId");
  } else if (event.type.startsWith("pos_audit_")) {
    upsertById(state.auditEvents, event, "eventId");
  } else if (event.type === "inventory_impact_planned") {
    for (const movement of event.payload.movements || []) {
      upsertById(state.inventoryMovements, movement, "movementId");
    }
    for (const missing of event.payload.missingLinks || []) {
      upsertById(state.inventoryAlerts, Object.assign({
        alertId: `missing_${missing.saleId}_${missing.lineId}`,
        type: "missing_inventory_bridge",
        status: "open"
      }, missing), "alertId");
    }
  } else {
    state.events.push({
      eventId: event.eventId,
      type: event.type,
      aggregateId: event.aggregateId || "",
      payload: event.payload
    });
  }
}

function upsertById(collection, entity, idField) {
  if (!entity[idField]) throw new Error(`Payload sin ${idField}.`);
  const index = collection.findIndex((row) => row[idField] === entity[idField]);
  if (index >= 0) collection[index] = entity;
  else collection.push(entity);
}

function upsertByFreshness(collection, entity, idField, dateField) {
  if (!entity[idField]) throw new Error(`Payload sin ${idField}.`);
  const index = collection.findIndex((row) => row[idField] === entity[idField]);
  if (index < 0) {
    collection.push(entity);
    return;
  }

  const current = collection[index];
  if (String(entity[dateField] || "").localeCompare(String(current[dateField] || "")) >= 0) {
    collection[index] = entity;
  }
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
