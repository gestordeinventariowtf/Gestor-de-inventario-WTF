import test from "node:test";
import assert from "node:assert/strict";
import { buildPilotReconciliation } from "../src/domain/pilot-reconciliation.js";

test("conciliacion de piloto marca matched cuando referencia cuadra", () => {
  const reconciliation = buildPilotReconciliation({
    sales: [
      { saleId: "sale_1", status: "paid", totals: { total: 118, itbis: 18, ley: 10 } }
    ],
    inventoryMovements: [{ movementId: "mov_1" }],
    reference: {
      salesCount: 1,
      grossTotal: 118,
      itbis: 18,
      ley: 10,
      inventoryMovements: 1
    }
  });

  assert.equal(reconciliation.status, "matched");
  assert.equal(reconciliation.checks.every((check) => check.status === "matched"), true);
});

test("conciliacion de piloto detecta diferencia de venta", () => {
  const reconciliation = buildPilotReconciliation({
    sales: [
      { saleId: "sale_1", status: "paid", totals: { total: 118, itbis: 18, ley: 10 } }
    ],
    reference: {
      salesCount: 1,
      grossTotal: 120,
      itbis: 18,
      ley: 10,
      inventoryMovements: 0
    }
  });

  assert.equal(reconciliation.status, "difference");
  assert.equal(reconciliation.checks.find((check) => check.field === "grossTotal").difference, -2);
});
