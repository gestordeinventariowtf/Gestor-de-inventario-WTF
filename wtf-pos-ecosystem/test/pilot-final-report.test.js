import test from "node:test";
import assert from "node:assert/strict";
import { buildCutoverPlan } from "../src/domain/cutover-plan.js";
import { buildPilotFinalReport } from "../src/domain/pilot-final-report.js";

function readySnapshot() {
  const base = {
    deviceProfile: {
      device: { deviceId: "pos_demo", name: "Caja demo" },
      printer: { enabled: true, mode: "virtual", printerId: "printer_demo" },
      payment: { enabled: true, mode: "virtual", providerId: "cash_demo" }
    },
    hardwareMatrix: { summary: { profiles: 1, blockers: 0, printersReady: 1, paymentsReady: 1 } },
    pilotRuns: [{ pilotRunId: "pilot_1", status: "passed" }],
    pilotReconciliations: [{ reconciliationId: "rec_1", status: "matched" }],
    auditEvents: [{ eventId: "audit_1" }],
    backend: { sales: [{ saleId: "sale_1" }] },
    sales: [{ saleId: "sale_1", status: "paid", totals: { total: 150 } }],
    inventoryMovements: [{ movementId: "mov_1" }],
    printJobs: [{ printJobId: "print_1", status: "printed" }],
    kdsReceived: [{ commandId: "kds_1" }],
    cds: { snapshotId: "cds_1" }
  };
  return Object.assign({}, base, {
    cutoverPlans: [
      buildCutoverPlan(base, {
        windowStart: "22:00",
        windowEnd: "23:00",
        authorizedBy: "Henry",
        rollbackOwner: "Henry",
        now: new Date("2026-08-22T12:10:00.000Z")
      })
    ]
  });
}

test("reporte final aprueba piloto supervisado cuando todo esta listo", () => {
  const report = buildPilotFinalReport(readySnapshot(), {
    deviceReports: [{ deviceId: "tablet_pos", role: "POS", status: "passed" }],
    generatedBy: "Henry",
    now: new Date("2026-08-22T13:00:00.000Z")
  });

  assert.equal(report.status, "ready_for_supervised_pilot");
  assert.equal(report.decision.blockers.length, 0);
  assert.equal(report.tablets.passed, 1);
  assert.equal(report.operations.salesCount, 1);
});

test("reporte final bloquea cuando una tablet falla", () => {
  const report = buildPilotFinalReport(readySnapshot(), {
    deviceReports: [{ deviceId: "tablet_kds", role: "KDS", status: "failed" }],
    generatedBy: "Henry",
    now: new Date("2026-08-22T13:00:00.000Z")
  });

  assert.equal(report.status, "blocked");
  assert.equal(report.decision.blockers.includes("Hay tablet o dispositivo con validacion fallida."), true);
});
