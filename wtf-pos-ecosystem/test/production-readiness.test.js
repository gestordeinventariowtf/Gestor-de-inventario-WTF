import test from "node:test";
import assert from "node:assert/strict";
import { buildProductionReadiness } from "../src/domain/production-readiness.js";

test("readiness bloquea produccion si hardware tiene bloqueos", () => {
  const readiness = buildProductionReadiness({
    hardwareMatrix: { summary: { blockers: 1 } },
    backend: {},
    auditEvents: []
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.readyForProduction, false);
});

test("readiness queda listo cuando piloto y conciliacion estan correctos", () => {
  const readiness = buildProductionReadiness({
    deviceProfile: {
      printer: { enabled: true },
      payment: { enabled: true }
    },
    pilotRuns: [{ status: "passed" }],
    pilotReconciliations: [{ status: "matched" }],
    backend: { sales: [{ saleId: "sale_1" }] },
    auditEvents: [{ eventId: "audit_1" }]
  });

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.readyForProduction, true);
});
