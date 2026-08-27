import { makeEventId, makeIdempotencyKey } from "./ids.js";

export function createPilotChecklist(snapshot = {}) {
  const cartLines = snapshot.cart?.lines || [];
  const printerReady = snapshot.deviceProfile?.printer?.enabled !== false;
  const paymentReady = snapshot.deviceProfile?.payment?.enabled !== false;
  return [
    {
      stepId: "device_ready",
      label: "Dispositivo POS registrado",
      status: snapshot.deviceProfile?.device?.deviceId ? "passed" : "blocked",
      detail: snapshot.deviceProfile?.device?.name || "Sin dispositivo"
    },
    {
      stepId: "hardware_ready",
      label: "Hardware del dispositivo listo",
      status: printerReady && paymentReady ? "passed" : "blocked",
      detail: `Impresora ${printerReady ? "lista" : "bloqueada"} · Pago ${paymentReady ? "listo" : "bloqueado"}`
    },
    {
      stepId: "cart_ready",
      label: "Carrito con productos",
      status: cartLines.length ? "passed" : "pending",
      detail: `${cartLines.length} producto(s)`
    },
    {
      stepId: "kds_ready",
      label: "KDS recibio comanda",
      status: (snapshot.kdsReceived || []).length ? "passed" : "pending",
      detail: `${(snapshot.kdsReceived || []).length} comanda(s)`
    },
    {
      stepId: "cds_ready",
      label: "CDS sincronizado",
      status: snapshot.cds ? "passed" : "pending",
      detail: snapshot.cds ? "Pantalla cliente activa" : "Sin snapshot cliente"
    },
    {
      stepId: "sale_closed",
      label: "Venta cerrada",
      status: (snapshot.sales || []).some((sale) => sale.status === "paid") ? "passed" : "pending",
      detail: `${(snapshot.sales || []).filter((sale) => sale.status === "paid").length} venta(s)`
    },
    {
      stepId: "receipt_printed",
      label: "Recibo generado",
      status: (snapshot.printJobs || []).some((job) => job.status === "printed") ? "passed" : "pending",
      detail: `${(snapshot.printJobs || []).filter((job) => job.status === "printed").length} impreso(s)`
    },
    {
      stepId: "shift_close_ready",
      label: "Cierre Z disponible",
      status: (snapshot.shiftCloseReports || []).length ? "passed" : "pending",
      detail: `${(snapshot.shiftCloseReports || []).length} cierre(s)`
    }
  ];
}

export function summarizePilotChecklist(checklist) {
  return {
    total: checklist.length,
    passed: checklist.filter((item) => item.status === "passed").length,
    pending: checklist.filter((item) => item.status === "pending").length,
    blocked: checklist.filter((item) => item.status === "blocked").length,
    readyForRealHardware: checklist.every((item) => ["passed"].includes(item.status))
  };
}

export function createPilotRun({
  deviceId,
  operator,
  checklist,
  sale,
  closeReport,
  hardwareMatrix,
  notes = "",
  now = new Date()
}) {
  const createdAt = now.toISOString();
  const summary = summarizePilotChecklist(checklist);
  const pilotRunId = makeEventId("pilot_run", `${deviceId}_${createdAt}`);
  return {
    pilotRunId,
    createdAt,
    deviceId,
    operatorUserId: operator?.userId || "",
    operatorName: operator?.name || "",
    status: summary.blocked ? "blocked" : summary.pending ? "incomplete" : "passed",
    notes,
    saleId: sale?.saleId || "",
    saleTotal: sale?.totals?.total || 0,
    closeReportId: closeReport?.closeReportId || "",
    closeDifference: closeReport?.difference ?? null,
    hardwareSummary: hardwareMatrix?.summary || {},
    checklist,
    summary
  };
}

export function createPilotRunEvent(pilotRun) {
  return {
    eventId: makeEventId("pos_pilot_run_recorded", pilotRun.pilotRunId),
    type: "pos_pilot_run_recorded",
    aggregateId: pilotRun.pilotRunId,
    idempotencyKey: makeIdempotencyKey(["pos_pilot_run_recorded", pilotRun.pilotRunId]),
    createdAt: pilotRun.createdAt,
    status: "pending",
    attempts: 0,
    payload: pilotRun
  };
}
