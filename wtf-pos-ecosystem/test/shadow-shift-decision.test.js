import test from "node:test";
import assert from "node:assert/strict";
import { buildShadowShiftDecision } from "../src/domain/shadow-shift-decision.js";

test("decision post sombra aprueba laboratorio real si el turno cuadra", () => {
  const decision = buildShadowShiftDecision({
    shadowShiftReports: [{ shadowShiftId: "shadow_1", status: "matched", summary: { differences: 0, openIncidents: 0 } }]
  }, { decidedBy: "Henry" });

  assert.equal(decision.status, "approved");
  assert.equal(decision.decision, "ready_for_real_hardware_lab");
});

test("decision post sombra bloquea avance con incidentes abiertos", () => {
  const decision = buildShadowShiftDecision({
    shadowShiftReports: [{ shadowShiftId: "shadow_1", status: "needs_review", summary: { differences: 0, openIncidents: 1 } }]
  }, { decidedBy: "Henry" });

  assert.equal(decision.status, "blocked");
  assert.equal(decision.decision, "repeat_shadow_or_block");
});
