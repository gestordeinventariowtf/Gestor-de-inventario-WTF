import test from "node:test";
import assert from "node:assert/strict";
import { buildPilotEvidencePackage } from "../src/domain/pilot-evidence-package.js";

function readySnapshot() {
  return {
    deviceProfile: {
      device: { deviceId: "pos_demo", name: "Caja demo" },
      printer: { enabled: true, mode: "virtual" },
      payment: { enabled: true, mode: "virtual" }
    },
    backend: { sales: [{ saleId: "sale_1" }] },
    pilotRuns: [{ pilotRunId: "pilot_1", status: "passed" }],
    pilotReconciliations: [{ reconciliationId: "rec_1", status: "matched" }],
    cutoverPlans: [{ cutoverPlanId: "cutover_1", status: "approved_for_pilot_cutover" }],
    pilotFinalReports: [{
      finalReportId: "final_1",
      status: "ready_for_supervised_pilot",
      decision: { blockers: [], pending: [], nextAction: "Ejecutar piloto" },
      readiness: { readyForProduction: true, status: "ready", nextAction: "Listo" },
      tablets: { totalReports: 1, passed: 1, warning: 0, failed: 0, devices: [] },
      operations: { salesCount: 1, grossTotal: 150, inventoryMovements: 1, auditEvents: 1, printJobs: 1, kdsCommands: 1, cdsSnapshots: 1 }
    }],
    auditEvents: [{ eventId: "audit_1", type: "pos_audit_sale_paid", createdAt: "2026-08-22T12:00:00.000Z", actorName: "Henry" }]
  };
}

test("paquete de evidencias queda listo cuando existe reporte final aprobado", () => {
  const evidencePackage = buildPilotEvidencePackage(readySnapshot(), {
    generatedBy: "Henry",
    now: new Date("2026-08-22T13:00:00.000Z")
  });

  assert.equal(evidencePackage.status, "ready_for_review");
  assert.equal(evidencePackage.summary.blockers.length, 0);
  assert.match(evidencePackage.exportFiles.jsonFileName, /pilot_evidence_package/);
  assert.match(evidencePackage.exportFiles.html, /WTF POS - Paquete de evidencias/);
});

test("paquete de evidencias bloquea si falta reporte final", () => {
  const snapshot = readySnapshot();
  snapshot.pilotFinalReports = [];

  const evidencePackage = buildPilotEvidencePackage(snapshot, {
    generatedBy: "Henry",
    now: new Date("2026-08-22T13:00:00.000Z")
  });

  assert.equal(evidencePackage.status, "blocked");
  assert.equal(evidencePackage.summary.blockers.includes("Falta generar reporte final de piloto."), true);
});
