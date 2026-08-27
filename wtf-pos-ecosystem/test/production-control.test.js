import test from "node:test";
import assert from "node:assert/strict";
import { buildProductionControl } from "../src/domain/production-control.js";

function readySnapshot() {
  return {
    pilotEvidencePackages: [{ evidencePackageId: "evidence_1", status: "ready_for_review" }],
    pilotFinalReports: [{ finalReportId: "final_1", status: "ready_for_supervised_pilot" }],
    cutoverPlans: [{ cutoverPlanId: "cutover_1", status: "approved_for_pilot_cutover" }]
  };
}

test("control de produccion queda bloqueado si falta rollback confirmado", () => {
  const control = buildProductionControl(readySnapshot(), {
    requestedMode: "production",
    approvedBy: "Henry",
    rollbackConfirmed: false,
    firstShiftOwner: "Henry",
    supervisionWindow: "Primer turno"
  });

  assert.equal(control.status, "blocked");
  assert.equal(control.productionAllowed, false);
  assert.equal(control.checklist.find((row) => row.itemId === "rollback_confirmed").status, "blocked");
});

test("control de produccion arma produccion solo con checklist completo", () => {
  const control = buildProductionControl(readySnapshot(), {
    requestedMode: "production",
    approvedBy: "Henry",
    rollbackConfirmed: true,
    icgFallbackReady: true,
    firstShiftOwner: "Henry",
    supervisionWindow: "Primer turno"
  });

  assert.equal(control.status, "production_armed");
  assert.equal(control.productionAllowed, true);
  assert.equal(control.summary.blocked, 0);
});

test("control de produccion bloquea si falta paquete de evidencias", () => {
  const snapshot = readySnapshot();
  snapshot.pilotEvidencePackages = [];

  const control = buildProductionControl(snapshot, {
    requestedMode: "production",
    approvedBy: "Henry",
    rollbackConfirmed: true,
    firstShiftOwner: "Henry",
    supervisionWindow: "Primer turno"
  });

  assert.equal(control.status, "blocked");
  assert.equal(control.productionAllowed, false);
  assert.equal(control.checklist.find((row) => row.itemId === "evidence_ready").status, "blocked");
});
