import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { demoInventoryBridges, demoPosConfiguration, demoProducts, demoTables, demoZones } from "../src/ui/demo-data.js";
import { demoUsers } from "../src/ui/demo-users.js";
import { PosUiEngine } from "../src/ui/pos-ui-engine.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";

async function makeEngine() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-ui-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));
  const engine = new PosUiEngine({
    store,
    products: demoProducts,
    bridges: demoInventoryBridges,
    zones: demoZones,
    tables: demoTables,
    users: demoUsers,
    posConfiguration: demoPosConfiguration,
    pin: "1234"
  });
  await engine.init();
  return { engine, store };
}

test("UI engine agrega producto, actualiza CDS y cierra venta con impacto de inventario", async () => {
  const { engine, store } = await makeEngine();

  await engine.addProduct("pos_camarofongo", { qty: 1 });
  const kds = await engine.sendKds();
  const result = await engine.payCash(2000);
  const data = await store.read();

  assert.equal(kds.acked, 1);
  assert.equal(result.sale.status, "paid");
  assert.equal(result.impactPlan.movements.length, 2);
  assert.equal(data.inventoryMovements.length, 2);
  assert.equal(result.snapshot.backend.sales.length, 1);
  assert.equal(result.snapshot.backend.inventoryMovements.length, 2);
});

test("UI engine registra alerta visual cuando producto POS no tiene puente", async () => {
  const { engine } = await makeEngine();

  await engine.addProduct("pos_sin_mapa", { qty: 1 });
  const result = await engine.payCash(500);

  assert.equal(result.impactPlan.status, "needs_mapping");
  assert.equal(result.snapshot.inventoryAlerts.length, 1);
  assert.equal(result.snapshot.backend.inventoryAlerts.length, 1);
});

test("UI engine cierra turno y genera reporte Z virtual", async () => {
  const { engine } = await makeEngine();

  await engine.addProduct("pos_limonada", { qty: 1 });
  await engine.payCash(200);
  const result = await engine.closeShift(5153.6);

  assert.equal(result.report.salesCount, 1);
  assert.equal(result.report.status, "balanced");
  assert.equal(result.snapshot.shift.status, "closed");
  assert.equal(result.snapshot.backend.shiftCloseReports.length, 1);
});

test("UI engine bloquea cierre de turno si usuario no tiene permiso", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-ui-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));
  const engine = new PosUiEngine({
    store,
    products: demoProducts,
    bridges: demoInventoryBridges,
    zones: demoZones,
    tables: demoTables,
    users: demoUsers,
    posConfiguration: demoPosConfiguration,
    pin: "2222"
  });
  await engine.init();

  await assert.rejects(() => engine.closeShift(5000), /Permiso POS requerido/);
});

test("UI engine anula venta y revierte inventario con auditoria", async () => {
  const { engine } = await makeEngine();

  await engine.addProduct("pos_camarofongo", { qty: 1 });
  const paid = await engine.payCash(2000);
  const result = await engine.voidSale(paid.sale.saleId, "Prueba de anulacion");

  assert.equal(result.reversal.type, "void");
  assert.equal(result.snapshot.sales[0].status, "voided");
  assert.equal(result.snapshot.saleReversals.length, 1);
  assert.equal(result.snapshot.inventoryMovements.filter((row) => row.direction === "in").length, 2);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_sale_voided"), true);
});

test("UI engine bloquea anulacion si usuario no tiene permiso", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-ui-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));
  const engine = new PosUiEngine({
    store,
    products: demoProducts,
    bridges: demoInventoryBridges,
    zones: demoZones,
    tables: demoTables,
    users: demoUsers,
    posConfiguration: demoPosConfiguration,
    pin: "2222"
  });
  await engine.init();

  await assert.rejects(() => engine.voidSale("sale_1", "Sin permiso"), /Permiso POS requerido/);
});

test("UI engine transfiere mesa y cambia opcion de consumo", async () => {
  const { engine } = await makeEngine();

  await engine.transferCurrentTicket("mesa_2");
  let snapshot = await engine.snapshot();
  assert.equal(snapshot.ticket.tableId, "mesa_2");
  assert.equal(snapshot.ticket.tableLabel, "Mesa 2");

  await engine.changeDiningOption("takeOut");
  snapshot = await engine.snapshot();
  assert.equal(snapshot.ticket.diningOption, "takeOut");
  assert.equal(snapshot.ticket.tableId, "");
  assert.equal(snapshot.auditEvents.some((row) => row.type === "pos_audit_dining_option_changed"), true);
});

test("UI engine separa una linea y la vuelve a unir a la cuenta actual", async () => {
  const { engine } = await makeEngine();

  let snapshot = await engine.addProduct("pos_limonada", { qty: 2 });
  const lineId = snapshot.ticket.cart.lines[0].lineId;
  snapshot = await engine.splitCurrentTicketLine(lineId, 1);
  const splitTicket = snapshot.openTickets.find((ticket) => ticket.ticketId !== snapshot.ticket.ticketId);

  assert.equal(snapshot.ticket.cart.lines[0].qty, 1);
  assert.equal(splitTicket.cart.lines[0].qty, 1);
  assert.equal(snapshot.auditEvents.some((row) => row.type === "pos_audit_ticket_line_moved"), true);

  snapshot = await engine.mergeTicketIntoCurrent(splitTicket.ticketId);

  assert.equal(snapshot.ticket.cart.lines.length, 2);
  assert.equal(snapshot.openTickets.length, 1);
  assert.equal(snapshot.auditEvents.some((row) => row.type === "pos_audit_ticket_merged"), true);
});

test("UI engine aplica promocion configurada respetando rol y auditoria", async () => {
  const { engine } = await makeEngine();

  let snapshot = await engine.addProduct("pos_limonada", { qty: 1 });
  const lineId = snapshot.ticket.cart.lines[0].lineId;
  snapshot = await engine.applyPromotionToLine(lineId, "promo_limonada_10", { reason: "Promo autorizada" });

  assert.equal(snapshot.cart.lines[0].discountAmount, 12);
  assert.equal(snapshot.cart.totals.total, 138.24);
  assert.equal(snapshot.auditEvents.some((row) => row.type === "pos_audit_discount_applied"), true);
});

test("UI engine bloquea descuento que excede limite del cajero", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-ui-"));
  const store = new LocalJsonStore(path.join(dir, "store.json"));
  const engine = new PosUiEngine({
    store,
    products: demoProducts,
    bridges: demoInventoryBridges,
    zones: demoZones,
    tables: demoTables,
    users: demoUsers,
    posConfiguration: {
      discounts: {
        enabled: true,
        roleLimits: {
          cashier: { maxPercent: 5, requiresReason: true }
        },
        promotions: [
          {
            promotionId: "promo_limonada_10",
            name: "10% Limonada",
            type: "percent",
            value: 10,
            productIds: ["pos_limonada"],
            active: true
          }
        ]
      }
    },
    pin: "2222"
  });
  await engine.init();

  const snapshot = await engine.addProduct("pos_limonada", { qty: 1 });
  await assert.rejects(
    () => engine.applyPromotionToLine(snapshot.ticket.cart.lines[0].lineId, "promo_limonada_10", { reason: "Fuera de limite" }),
    /Descuento excede limite/
  );
});

test("UI engine expone configuracion de dispositivo y hardware virtual", async () => {
  const { engine } = await makeEngine();

  const snapshot = await engine.snapshot();

  assert.equal(snapshot.deviceProfile.device.deviceId, "pos_demo");
  assert.equal(snapshot.deviceProfile.printer.mode, "virtual");
  assert.equal(snapshot.deviceProfile.payment.provider, "cash");
  assert.equal(snapshot.posConfiguration.discounts.promotions.length, 1);
});

test("UI engine ejecuta diagnostico de hardware y registra auditoria", async () => {
  const { engine } = await makeEngine();

  const result = await engine.runHardwareDiagnostics();

  assert.equal(result.printerDiagnostic.ok, true);
  assert.equal(result.paymentDiagnostic.ok, true);
  assert.equal(result.matrix.summary.profiles, 2);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_hardware_diagnostic"), true);
});

test("UI engine ejecuta piloto operativo completo y guarda bitacora", async () => {
  const { engine } = await makeEngine();

  const result = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });

  assert.equal(result.pilotRun.status, "passed");
  assert.equal(result.pilotRun.summary.blocked, 0);
  assert.equal(result.snapshot.pilotRuns.length, 1);
  assert.equal(result.snapshot.backend.pilotRuns.length, 1);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_pilot_run_recorded"), true);
});

test("UI engine registra conciliacion de piloto contra referencia externa", async () => {
  const { engine } = await makeEngine();
  const pilot = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });

  const result = await engine.reconcilePilot({
    salesCount: 1,
    grossTotal: pilot.pilotRun.saleTotal,
    itbis: pilot.snapshot.sales[0].totals.itbis,
    ley: pilot.snapshot.sales[0].totals.ley,
    inventoryMovements: pilot.snapshot.inventoryMovements.length
  });

  assert.equal(result.reconciliation.status, "matched");
  assert.equal(result.snapshot.pilotReconciliations.length, 1);
  assert.equal(result.snapshot.backend.pilotReconciliations.length, 1);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_pilot_reconciliation_recorded"), true);
});

test("UI engine calcula readiness despues de piloto y conciliacion", async () => {
  const { engine } = await makeEngine();
  const pilot = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });
  await engine.reconcilePilot({
    salesCount: 1,
    grossTotal: pilot.pilotRun.saleTotal,
    itbis: pilot.snapshot.sales[0].totals.itbis,
    ley: pilot.snapshot.sales[0].totals.ley,
    inventoryMovements: pilot.snapshot.inventoryMovements.length
  });

  const readiness = await engine.productionReadiness();

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.readyForProduction, true);
});

test("UI engine crea plan de cutover con rollback y auditoria", async () => {
  const { engine } = await makeEngine();
  const pilot = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });
  await engine.reconcilePilot({
    salesCount: 1,
    grossTotal: pilot.pilotRun.saleTotal,
    itbis: pilot.snapshot.sales[0].totals.itbis,
    ley: pilot.snapshot.sales[0].totals.ley,
    inventoryMovements: pilot.snapshot.inventoryMovements.length
  });

  const result = await engine.createCutoverPlan({
    windowStart: "22:00",
    windowEnd: "23:00",
    authorizedBy: "Henry",
    rollbackOwner: "Henry"
  });

  assert.equal(result.plan.status, "approved_for_pilot_cutover");
  assert.equal(result.snapshot.cutoverPlans.length, 1);
  assert.equal(result.snapshot.backend.cutoverPlans.length, 1);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_cutover_plan_recorded"), true);
});

test("UI engine genera reporte final de piloto y lo sincroniza", async () => {
  const { engine } = await makeEngine();
  const pilot = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });
  await engine.reconcilePilot({
    salesCount: 1,
    grossTotal: pilot.pilotRun.saleTotal,
    itbis: pilot.snapshot.sales[0].totals.itbis,
    ley: pilot.snapshot.sales[0].totals.ley,
    inventoryMovements: pilot.snapshot.inventoryMovements.length
  });
  await engine.createCutoverPlan({
    windowStart: "22:00",
    windowEnd: "23:00",
    authorizedBy: "Henry",
    rollbackOwner: "Henry"
  });

  const result = await engine.createPilotFinalReport({
    generatedBy: "Henry",
    deviceReports: [{ deviceId: "tablet_pos", role: "POS", status: "passed" }]
  });

  assert.equal(result.report.status, "ready_for_supervised_pilot");
  assert.equal(result.snapshot.pilotFinalReports.length, 1);
  assert.equal(result.snapshot.backend.pilotFinalReports.length, 1);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_pilot_final_report_recorded"), true);
});

test("UI engine genera paquete de evidencias exportable y lo sincroniza", async () => {
  const { engine } = await makeEngine();
  const pilot = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });
  await engine.reconcilePilot({
    salesCount: 1,
    grossTotal: pilot.pilotRun.saleTotal,
    itbis: pilot.snapshot.sales[0].totals.itbis,
    ley: pilot.snapshot.sales[0].totals.ley,
    inventoryMovements: pilot.snapshot.inventoryMovements.length
  });
  await engine.createCutoverPlan({
    windowStart: "22:00",
    windowEnd: "23:00",
    authorizedBy: "Henry",
    rollbackOwner: "Henry"
  });
  await engine.createPilotFinalReport({
    generatedBy: "Henry",
    deviceReports: [{ deviceId: "tablet_pos", role: "POS", status: "passed" }]
  });

  const result = await engine.createPilotEvidencePackage({ generatedBy: "Henry" });

  assert.equal(result.evidencePackage.status, "ready_for_review");
  assert.equal(result.evidencePackage.exportFiles.htmlFileName.endsWith(".html"), true);
  assert.equal(result.snapshot.pilotEvidencePackages.length, 1);
  assert.equal(result.snapshot.backend.pilotEvidencePackages.length, 1);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_pilot_evidence_package_recorded"), true);
});

test("UI engine prepara produccion controlada solo despues de evidencias", async () => {
  const { engine } = await makeEngine();
  const pilot = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });
  await engine.reconcilePilot({
    salesCount: 1,
    grossTotal: pilot.pilotRun.saleTotal,
    itbis: pilot.snapshot.sales[0].totals.itbis,
    ley: pilot.snapshot.sales[0].totals.ley,
    inventoryMovements: pilot.snapshot.inventoryMovements.length
  });
  await engine.createCutoverPlan({
    windowStart: "22:00",
    windowEnd: "23:00",
    authorizedBy: "Henry",
    rollbackOwner: "Henry"
  });
  await engine.createPilotFinalReport({
    generatedBy: "Henry",
    deviceReports: [{ deviceId: "tablet_pos", role: "POS", status: "passed" }]
  });
  await engine.createPilotEvidencePackage({ generatedBy: "Henry" });

  const result = await engine.createProductionControl({
    requestedMode: "production",
    approvedBy: "Henry",
    rollbackConfirmed: true,
    icgFallbackReady: true,
    firstShiftOwner: "Henry",
    supervisionWindow: "Primer turno real supervisado"
  });

  assert.equal(result.control.status, "production_armed");
  assert.equal(result.control.productionAllowed, true);
  assert.equal(result.snapshot.productionControls.length, 1);
  assert.equal(result.snapshot.backend.productionControls.length, 1);
  assert.equal(result.snapshot.auditEvents.some((row) => row.type === "pos_audit_production_control_recorded"), true);
});

test("UI engine registra turno sombra sin afectar operacion real", async () => {
  const { engine } = await makeEngine();
  const pilot = await engine.runOperationalPilot({
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6
  });
  await engine.reconcilePilot({
    salesCount: 1,
    grossTotal: pilot.pilotRun.saleTotal,
    itbis: pilot.snapshot.sales[0].totals.itbis,
    ley: pilot.snapshot.sales[0].totals.ley,
    inventoryMovements: pilot.snapshot.inventoryMovements.length
  });
  await engine.createCutoverPlan({ windowStart: "22:00", windowEnd: "23:00", authorizedBy: "Henry", rollbackOwner: "Henry" });
  await engine.createPilotFinalReport({ generatedBy: "Henry", deviceReports: [{ deviceId: "tablet_pos", role: "POS", status: "passed" }] });
  await engine.createPilotEvidencePackage({ generatedBy: "Henry" });
  await engine.createProductionControl({
    requestedMode: "production",
    approvedBy: "Henry",
    rollbackConfirmed: true,
    firstShiftOwner: "Henry",
    supervisionWindow: "Primer turno"
  });
  const snapshot = await engine.snapshot();
  const paidSales = snapshot.sales.filter((sale) => sale.status === "paid");

  const result = await engine.createShadowShiftReport({
    supervisedBy: "Henry",
    icgReference: {
      salesCount: paidSales.length,
      grossTotal: paidSales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0),
      inventoryMovements: snapshot.inventoryMovements.length
    }
  });

  assert.equal(result.report.status, "matched");
  assert.equal(result.report.affectsRealOperation, false);
  assert.equal(result.snapshot.shadowShiftReports.length, 1);
  assert.equal(result.snapshot.backend.shadowShiftReports.length, 1);
});

test("UI engine registra decision post turno sombra", async () => {
  const { engine } = await makeEngine();
  await engine.createShadowShiftReport({
    supervisedBy: "Henry",
    icgReference: { salesCount: 0, grossTotal: 0, inventoryMovements: 0 }
  });

  const result = await engine.createShadowShiftDecision({ decidedBy: "Henry" });

  assert.equal(result.decision.status, "blocked");
  assert.equal(result.snapshot.shadowShiftDecisions.length, 1);
  assert.equal(result.snapshot.backend.shadowShiftDecisions.length, 1);
});

test("UI engine avanza las siete etapas operativas en orden", async () => {
  const { engine } = await makeEngine();
  await engine.createShadowShiftReport({
    supervisedBy: "Henry",
    icgReference: { salesCount: 0, grossTotal: 0, inventoryMovements: 0 }
  });
  await engine.createShadowShiftDecision({ decidedBy: "Henry" });
  let snapshot = await engine.snapshot();
  snapshot.shadowShiftDecisions[0] = Object.assign({}, snapshot.shadowShiftDecisions[0], {
    status: "approved",
    decision: "ready_for_real_hardware_lab",
    blockers: []
  });
  await engine.store.write(Object.assign(await engine.store.read(), {
    shadowShiftDecisions: snapshot.shadowShiftDecisions
  }));

  let result;
  for (let i = 0; i < 7; i += 1) {
    result = await engine.createOperationalStageReport({
      approvedBy: "Henry",
      evidence: [{ label: "Evidencia local", status: "passed" }]
    });
    assert.equal(result.report.status, "approved");
  }

  assert.equal(result.snapshot.operationalStageReports.length, 7);
  assert.equal(result.snapshot.backend.operationalStageReports.length, 7);
  assert.equal(result.snapshot.operationalStageReports.at(-1).nextDecision, "implementation_ready_for_controlled_rollout");
});
