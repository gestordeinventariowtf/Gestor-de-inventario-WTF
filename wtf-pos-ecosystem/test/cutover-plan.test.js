import test from "node:test";
import assert from "node:assert/strict";
import { buildCutoverPlan } from "../src/domain/cutover-plan.js";

test("cutover queda bloqueado si readiness no esta listo", () => {
  const plan = buildCutoverPlan({
    deviceProfile: { printer: { enabled: true }, payment: { enabled: true } },
    backend: {},
    auditEvents: []
  }, {
    windowStart: "22:00",
    windowEnd: "23:00",
    authorizedBy: "Henry",
    rollbackOwner: "Henry"
  });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.checklist.some((item) => item.itemId === "readiness_ready" && item.status === "blocked"));
});

test("cutover queda aprobado para piloto cuando todos los criterios pasan", () => {
  const plan = buildCutoverPlan({
    deviceProfile: { printer: { enabled: true }, payment: { enabled: true } },
    pilotRuns: [{ status: "passed" }],
    pilotReconciliations: [{ status: "matched" }],
    backend: { sales: [{ saleId: "sale_1" }] },
    auditEvents: [{ eventId: "audit_1" }],
    sales: [{ saleId: "sale_1" }]
  }, {
    windowStart: "22:00",
    windowEnd: "23:00",
    authorizedBy: "Henry",
    rollbackOwner: "Henry"
  });

  assert.equal(plan.status, "approved_for_pilot_cutover");
  assert.equal(plan.summary.blocked, 0);
  assert.equal(plan.rollbackPlan.steps.length > 0, true);
});
