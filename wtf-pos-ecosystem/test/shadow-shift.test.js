import test from "node:test";
import assert from "node:assert/strict";
import { buildShadowShiftReport } from "../src/domain/shadow-shift.js";

function snapshot() {
  return {
    productionControls: [{ productionControlId: "pc_1", productionAllowed: true }],
    sales: [{ saleId: "sale_1", status: "paid", totals: { total: 150 } }],
    inventoryMovements: [{ movementId: "mov_1" }],
    kdsReceived: [{ commandId: "kds_1" }],
    printJobs: [{ printJobId: "print_1" }]
  };
}

test("turno sombra queda matched si POS e ICG cuadran sin incidentes", () => {
  const report = buildShadowShiftReport(snapshot(), {
    supervisedBy: "Henry",
    icgReference: { salesCount: 1, grossTotal: 150, inventoryMovements: 1 }
  });

  assert.equal(report.status, "matched");
  assert.equal(report.affectsRealOperation, false);
  assert.equal(report.summary.differences, 0);
});

test("turno sombra requiere revision si hay diferencias", () => {
  const report = buildShadowShiftReport(snapshot(), {
    supervisedBy: "Henry",
    icgReference: { salesCount: 2, grossTotal: 200, inventoryMovements: 1 }
  });

  assert.equal(report.status, "needs_review");
  assert.equal(report.summary.differences, 2);
});

test("turno sombra bloquea si produccion controlada no esta armada", () => {
  const data = snapshot();
  data.productionControls = [];
  const report = buildShadowShiftReport(data, {
    supervisedBy: "Henry",
    icgReference: { salesCount: 1, grossTotal: 150, inventoryMovements: 1 }
  });

  assert.equal(report.status, "needs_review");
  assert.equal(report.blockers.includes("Falta control de produccion armado."), true);
});
