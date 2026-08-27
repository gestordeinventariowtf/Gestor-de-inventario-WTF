export function buildProductionReadiness(snapshot = {}) {
  const latestPilot = (snapshot.pilotRuns || []).at(-1) || null;
  const latestReconciliation = (snapshot.pilotReconciliations || []).at(-1) || null;
  const hasDeviceProfile = Boolean(snapshot.deviceProfile);
  const printerReady = hasDeviceProfile && snapshot.deviceProfile?.printer?.enabled !== false;
  const paymentReady = hasDeviceProfile && snapshot.deviceProfile?.payment?.enabled !== false;
  const checks = [
    {
      checkId: "hardware",
      label: "Hardware del dispositivo sin bloqueos",
      status: printerReady && paymentReady ? "ready" : "blocked",
      detail: `Impresora ${printerReady ? "lista" : "bloqueada"} · Pago ${paymentReady ? "listo" : "bloqueado"}`
    },
    {
      checkId: "pilot",
      label: "Piloto operativo completado",
      status: latestPilot?.status === "passed" ? "ready" : "pending",
      detail: latestPilot ? `Ultimo piloto: ${latestPilot.status}` : "Sin piloto registrado"
    },
    {
      checkId: "reconciliation",
      label: "Conciliacion sin diferencias",
      status: latestReconciliation?.status === "matched" ? "ready" : "pending",
      detail: latestReconciliation ? `Ultima conciliacion: ${latestReconciliation.status}` : "Sin conciliacion"
    },
    {
      checkId: "audit",
      label: "Auditoria activa",
      status: (snapshot.auditEvents || []).length ? "ready" : "pending",
      detail: `${(snapshot.auditEvents || []).length} evento(s) auditado(s)`
    },
    {
      checkId: "backend",
      label: "Backend virtual sincronizado",
      status: snapshot.backend ? "ready" : "blocked",
      detail: snapshot.backend ? `${snapshot.backend.sales?.length || 0} venta(s) sincronizada(s)` : "Sin backend"
    }
  ];
  const blocked = checks.filter((check) => check.status === "blocked");
  const pending = checks.filter((check) => check.status === "pending");
  return {
    status: blocked.length ? "blocked" : pending.length ? "pending" : "ready",
    readyForProduction: blocked.length === 0 && pending.length === 0,
    checks,
    summary: {
      total: checks.length,
      ready: checks.filter((check) => check.status === "ready").length,
      pending: pending.length,
      blocked: blocked.length
    },
    nextAction: nextReadinessAction({ blocked, pending })
  };
}

function nextReadinessAction({ blocked, pending }) {
  if (blocked.length) return `Resolver bloqueo: ${blocked[0].label}.`;
  if (pending.length) return `Completar pendiente: ${pending[0].label}.`;
  return "Listo para piloto interno controlado con supervision.";
}
