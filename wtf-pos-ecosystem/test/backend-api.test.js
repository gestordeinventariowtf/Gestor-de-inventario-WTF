import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addProduct, createCart } from "../src/domain/cart.js";
import { closeCashSale } from "../src/domain/sales.js";
import { openShift } from "../src/domain/shift.js";
import { TransactionalPosApi } from "../src/backend/transactional-pos-api.js";
import { BackendSyncAdapter } from "../src/infrastructure/backend-sync-adapter.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";
import { OutboxQueue } from "../src/infrastructure/outbox-queue.js";

const product = {
  id: "prod_api",
  sku: "API-1",
  barcode: "9001",
  name: "Producto API",
  price: 100,
  active: true
};

function makeSaleEvent(now = new Date("2026-08-22T12:00:00.000Z")) {
  const shift = openShift({ employeeId: "emp_api", deviceId: "pos_api", now });
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  return closeCashSale({ cart, shift, cashReceived: 150, now });
}

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-api-"));
  return new LocalJsonStore(path.join(dir, "store.json"));
}

test("API transaccional aplica venta una sola vez aunque llegue duplicada", async () => {
  const api = new TransactionalPosApi();
  const { event } = makeSaleEvent();
  const response = await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(response.acknowledgements[0].status, "applied");
  assert.equal(response.acknowledgements[1].status, "duplicate");
  assert.equal(snapshot.sales.length, 1);
  assert.equal(snapshot.processedIdempotencyKeys.length, 1);
});

test("API transaccional no guarda nada si el lote contiene un evento invalido", async () => {
  const api = new TransactionalPosApi();
  const { event } = makeSaleEvent();

  await assert.rejects(() => api.receiveBatch([
    event,
    Object.assign({}, event, { eventId: "bad_event", idempotencyKey: "" })
  ]), /idempotencyKey/);

  const snapshot = api.snapshot();
  assert.equal(snapshot.sales.length, 0);
  assert.equal(snapshot.processedIdempotencyKeys.length, 0);
});

test("outbox sincroniza contra backend transaccional y marca eventos enviados", async () => {
  const store = await makeStore();
  const api = new TransactionalPosApi();
  const adapter = new BackendSyncAdapter(api);
  const { sale, event } = makeSaleEvent();

  await store.appendSaleWithEvent(sale, event);
  const result = await new OutboxQueue(store).drain(adapter);
  const local = await store.read();
  const remote = api.snapshot();

  assert.equal(result.sent, 1);
  assert.equal(local.outbox[0].status, "sent");
  assert.equal(remote.sales.length, 1);
  assert.equal(adapter.responses.length, 1);
});

test("backend conserva el snapshot CDS mas reciente", async () => {
  const api = new TransactionalPosApi();
  const older = {
    eventId: "evt_cds_old",
    type: "cds_snapshot_updated",
    aggregateId: "cds_ticket_1",
    createdAt: "2026-08-22T12:00:00.000Z",
    idempotencyKey: "cds|old",
    payload: {
      snapshotId: "cds_ticket_1",
      ticketId: "ticket_1",
      updatedAt: "2026-08-22T12:00:00.000Z",
      lines: [{ lineId: "line_1", name: "Viejo", qty: 1 }]
    }
  };
  const newer = {
    eventId: "evt_cds_new",
    type: "cds_snapshot_updated",
    aggregateId: "cds_ticket_1",
    createdAt: "2026-08-22T12:01:00.000Z",
    idempotencyKey: "cds|new",
    payload: {
      snapshotId: "cds_ticket_1",
      ticketId: "ticket_1",
      updatedAt: "2026-08-22T12:01:00.000Z",
      lines: [{ lineId: "line_1", name: "Nuevo", qty: 2 }]
    }
  };

  await api.receiveBatch([newer, older]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.cdsSnapshots.length, 1);
  assert.equal(snapshot.cdsSnapshots[0].lines[0].name, "Nuevo");
});

test("backend guarda impacto de inventario sin duplicar movimientos", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_inventory_1",
    type: "inventory_impact_planned",
    aggregateId: "sale_1",
    createdAt: "2026-08-22T12:00:00.000Z",
    idempotencyKey: "inventory|sale_1",
    payload: {
      saleId: "sale_1",
      movements: [{
        movementId: "mov_1",
        saleId: "sale_1",
        lineId: "line_1",
        wtfProductId: "wtf_1",
        qty: 2,
        unit: "Uni"
      }],
      missingLinks: [{
        saleId: "sale_1",
        lineId: "line_2",
        posProductId: "pos_missing",
        posProductName: "Sin mapa"
      }]
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.inventoryMovements.length, 1);
  assert.equal(snapshot.inventoryAlerts.length, 1);
});

test("backend guarda piloto operativo como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_pilot_1",
    type: "pos_pilot_run_recorded",
    aggregateId: "pilot_1",
    idempotencyKey: "pilot_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      pilotRunId: "pilot_1",
      status: "passed",
      saleTotal: 150,
      summary: { total: 8, passed: 8, pending: 0, blocked: 0 }
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.pilotRuns.length, 1);
  assert.equal(snapshot.pilotRuns[0].status, "passed");
});

test("backend guarda conciliacion de piloto como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_reconciliation_1",
    type: "pos_pilot_reconciliation_recorded",
    aggregateId: "recon_1",
    idempotencyKey: "recon_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      reconciliationId: "recon_1",
      status: "matched",
      checks: []
    }
  };

  await api.receiveBatch([event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.pilotReconciliations.length, 1);
  assert.equal(snapshot.pilotReconciliations[0].status, "matched");
});

test("backend guarda plan de cutover como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_cutover_1",
    type: "pos_cutover_plan_recorded",
    aggregateId: "cutover_1",
    idempotencyKey: "cutover_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      cutoverPlanId: "cutover_1",
      status: "approved_for_pilot_cutover",
      summary: { total: 6, passed: 6, pending: 0, blocked: 0 }
    }
  };

  await api.receiveBatch([event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.cutoverPlans.length, 1);
  assert.equal(snapshot.cutoverPlans[0].status, "approved_for_pilot_cutover");
});

test("backend guarda reporte final de piloto como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_final_report_1",
    type: "pos_pilot_final_report_recorded",
    aggregateId: "final_report_1",
    idempotencyKey: "final_report_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      finalReportId: "final_report_1",
      status: "ready_for_supervised_pilot",
      decision: { blockers: [], pending: [], nextAction: "Piloto supervisado" }
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.pilotFinalReports.length, 1);
  assert.equal(snapshot.pilotFinalReports[0].status, "ready_for_supervised_pilot");
});

test("backend guarda paquete de evidencias de piloto como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_evidence_1",
    type: "pos_pilot_evidence_package_recorded",
    aggregateId: "evidence_1",
    idempotencyKey: "evidence_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      evidencePackageId: "evidence_1",
      status: "ready_for_review",
      summary: { blockers: [], pending: [], nextAction: "Revisar" }
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.pilotEvidencePackages.length, 1);
  assert.equal(snapshot.pilotEvidencePackages[0].status, "ready_for_review");
});

test("backend guarda control de produccion como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_production_control_1",
    type: "pos_production_control_recorded",
    aggregateId: "production_control_1",
    idempotencyKey: "production_control_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      productionControlId: "production_control_1",
      requestedMode: "production",
      status: "production_armed",
      productionAllowed: true
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.productionControls.length, 1);
  assert.equal(snapshot.productionControls[0].productionAllowed, true);
});

test("backend guarda reporte de turno sombra como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_shadow_1",
    type: "pos_shadow_shift_report_recorded",
    aggregateId: "shadow_1",
    idempotencyKey: "shadow_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      shadowShiftId: "shadow_1",
      status: "matched",
      affectsRealOperation: false
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.shadowShiftReports.length, 1);
  assert.equal(snapshot.shadowShiftReports[0].affectsRealOperation, false);
});

test("backend guarda decision de turno sombra como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_shadow_decision_1",
    type: "pos_shadow_shift_decision_recorded",
    aggregateId: "shadow_decision_1",
    idempotencyKey: "shadow_decision_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      decisionId: "shadow_decision_1",
      status: "approved",
      decision: "ready_for_real_hardware_lab"
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.shadowShiftDecisions.length, 1);
  assert.equal(snapshot.shadowShiftDecisions[0].status, "approved");
});

test("backend guarda reporte de etapa operativa como coleccion consultable", async () => {
  const api = new TransactionalPosApi();
  const event = {
    eventId: "evt_stage_1",
    type: "pos_operational_stage_report_recorded",
    aggregateId: "stage_1",
    idempotencyKey: "stage_once",
    createdAt: "2026-08-22T12:00:00.000Z",
    payload: {
      operationalStageReportId: "stage_1",
      stageId: "10D",
      status: "approved"
    }
  };

  await api.receiveBatch([event, event]);
  const snapshot = api.snapshot();

  assert.equal(snapshot.operationalStageReports.length, 1);
  assert.equal(snapshot.operationalStageReports[0].stageId, "10D");
});
