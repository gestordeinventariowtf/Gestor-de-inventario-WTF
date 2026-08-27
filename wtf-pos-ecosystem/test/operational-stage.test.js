import test from "node:test";
import assert from "node:assert/strict";
import { buildOperationalStageReport, OPERATIONAL_STAGES } from "../src/domain/operational-stage.js";

test("etapas operativas avanzan en orden desde decision sombra aprobada", () => {
  let snapshot = {
    shadowShiftDecisions: [{ decision: "ready_for_real_hardware_lab" }],
    operationalStageReports: []
  };
  for (const stage of OPERATIONAL_STAGES) {
    const report = buildOperationalStageReport(snapshot, {
      stageId: stage.stageId,
      approvedBy: "Henry",
      evidence: [{ label: "Evidencia", status: "passed" }]
    });
    assert.equal(report.status, "approved");
    snapshot.operationalStageReports.push(report);
  }
  assert.equal(snapshot.operationalStageReports.at(-1).nextDecision, "implementation_ready_for_controlled_rollout");
});

test("etapa operativa bloquea si falta evidencia", () => {
  const report = buildOperationalStageReport({
    shadowShiftDecisions: [{ decision: "ready_for_real_hardware_lab" }]
  }, {
    stageId: "10D",
    approvedBy: "Henry",
    evidence: []
  });

  assert.equal(report.status, "blocked");
});
