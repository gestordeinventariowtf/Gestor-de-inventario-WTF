const state = {
  products: [],
  lastSnapshot: null
};

const $ = (id) => document.getElementById(id);

await loadState();
await loadProducts("");

$("search").addEventListener("input", async (event) => {
  await loadProducts(event.target.value);
});

$("send-kds").addEventListener("click", async () => {
  const response = await postJson("/api/kds/send", {});
  showToast(response.ok ? "Comanda enviada al KDS virtual." : response.error);
  await loadState();
});

$("pay").addEventListener("click", async () => {
  const cashReceived = Number($("cash").value || 0);
  const response = await postJson("/api/pay/cash", { cashReceived });
  if (!response.ok) {
    showToast(response.error || "No se pudo cobrar.");
    return;
  }
  showToast(`Venta cerrada. Total: ${money(response.data.sale.totals.total)}`);
  await loadState();
});

$("close-shift").addEventListener("click", async () => {
  const countedCash = Number($("counted-cash").value || 0);
  const response = await postJson("/api/shift/close", { countedCash });
  if (!response.ok) {
    showToast(response.error || "No se pudo cerrar el turno.");
    return;
  }
  showToast(`Turno cerrado. Diferencia: ${money(response.data.report.difference)}`);
  await loadState();
});

$("dining-option").addEventListener("change", async (event) => {
  const response = await postJson("/api/ticket/dining-option", { diningOption: event.target.value });
  if (!response.ok) showToast(response.error || "No se pudo cambiar consumo.");
  await loadState();
});

$("void-last-sale").addEventListener("click", async () => {
  const sale = state.lastSnapshot?.sales?.filter((row) => row.status === "paid").at(-1);
  if (!sale) {
    showToast("No hay venta pagada disponible para anular.");
    return;
  }
  const response = await postJson("/api/sale/void", {
    saleId: sale.saleId,
    reason: "Anulacion demo desde UI local"
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo anular.");
    return;
  }
  showToast("Venta anulada y reverso registrado.");
  await loadState();
});

$("split-last-line").addEventListener("click", async () => {
  const line = state.lastSnapshot?.cart?.lines?.at(-1);
  if (!line) {
    showToast("Agrega un producto antes de separar la cuenta.");
    return;
  }
  const response = await postJson("/api/ticket/split-line", { lineId: line.lineId, qty: 1 });
  if (!response.ok) {
    showToast(response.error || "No se pudo separar.");
    return;
  }
  showToast("Producto movido a una cuenta separada.");
  await loadState();
});

$("merge-split-ticket").addEventListener("click", async () => {
  const sourceTicket = state.lastSnapshot?.openTickets
    ?.filter((ticket) => ticket.ticketId !== state.lastSnapshot.ticket.ticketId)
    .at(-1);
  if (!sourceTicket) {
    showToast("No hay cuenta separada disponible para unir.");
    return;
  }
  const response = await postJson("/api/ticket/merge", { sourceTicketId: sourceTicket.ticketId });
  if (!response.ok) {
    showToast(response.error || "No se pudo unir.");
    return;
  }
  showToast("Cuenta separada unida a la cuenta actual.");
  await loadState();
});

$("apply-demo-promo").addEventListener("click", async () => {
  const promotion = state.lastSnapshot?.posConfiguration?.discounts?.promotions?.[0];
  const line = state.lastSnapshot?.cart?.lines?.find((row) => promotion?.productIds?.includes(row.productId))
    || state.lastSnapshot?.cart?.lines?.at(-1);
  if (!promotion || !line) {
    showToast("Agrega un producto compatible con una promo primero.");
    return;
  }
  const response = await postJson("/api/cart/promotion", {
    lineId: line.lineId,
    promotionId: promotion.promotionId,
    reason: "Promo demo aplicada"
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo aplicar promo.");
    return;
  }
  showToast("Promocion aplicada y auditada.");
  await loadState();
});

$("run-hardware-diagnostics").addEventListener("click", async () => {
  const response = await postJson("/api/hardware/diagnostics", {});
  if (!response.ok) {
    showToast(response.error || "No se pudo probar hardware.");
    return;
  }
  showToast("Diagnostico de perifericos completado.");
  await loadState();
});

$("run-operational-pilot").addEventListener("click", async () => {
  const response = await postJson("/api/pilot/run", {
    productId: "pos_limonada",
    qty: 1,
    cashReceived: 1000,
    countedCash: 5153.6,
    notes: "Piloto local completo POS-KDS-CDS"
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo ejecutar piloto.");
    return;
  }
  showToast(`Piloto ${response.data.pilotRun.status}. Venta: ${money(response.data.pilotRun.saleTotal)}`);
  await loadState();
});

$("run-pilot-reconciliation").addEventListener("click", async () => {
  const snapshot = state.lastSnapshot;
  const paidSales = snapshot.sales.filter((sale) => sale.status === "paid");
  const reference = {
    salesCount: paidSales.length,
    grossTotal: paidSales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0),
    itbis: paidSales.reduce((sum, sale) => sum + Number(sale.totals?.itbis || 0), 0),
    ley: paidSales.reduce((sum, sale) => sum + Number(sale.totals?.ley || 0), 0),
    inventoryMovements: snapshot.inventoryMovements.length
  };
  const response = await postJson("/api/pilot/reconcile", { reference });
  if (!response.ok) {
    showToast(response.error || "No se pudo conciliar.");
    return;
  }
  showToast(`Conciliacion: ${response.data.reconciliation.status}`);
  await loadState();
});

$("create-cutover-plan").addEventListener("click", async () => {
  const response = await postJson("/api/cutover/plan", {
    windowStart: "22:00",
    windowEnd: "23:00",
    authorizedBy: state.lastSnapshot.session.name,
    rollbackOwner: state.lastSnapshot.session.name,
    notes: "Plan demo local, no activa produccion real."
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo crear plan.");
    return;
  }
  showToast(`Plan cutover: ${response.data.plan.status}`);
  await loadState();
});

$("create-final-pilot-report").addEventListener("click", async () => {
  const response = await postJson("/api/pilot/final-report", {
    generatedBy: state.lastSnapshot.session.name,
    notes: "Reporte final local con piloto, conciliacion, hardware, tablets y cutover."
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo generar reporte final.");
    return;
  }
  showToast(`Reporte final: ${response.data.report.status}`);
  await loadState();
});

$("create-evidence-package").addEventListener("click", async () => {
  const response = await postJson("/api/pilot/evidence-package", {
    generatedBy: state.lastSnapshot.session.name,
    notes: "Paquete exportable para revision del piloto interno."
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo crear paquete.");
    return;
  }
  downloadEvidence(response.data.evidencePackage, "json");
  downloadEvidence(response.data.evidencePackage, "html");
  showToast(`Paquete creado: ${response.data.evidencePackage.status}`);
  await loadState();
});

$("prepare-production-control").addEventListener("click", async () => {
  const response = await postJson("/api/production/control", {
    requestedMode: "production",
    approvedBy: state.lastSnapshot.session.name,
    rollbackConfirmed: true,
    icgFallbackReady: true,
    firstShiftOwner: state.lastSnapshot.session.name,
    supervisionWindow: "Primer turno real supervisado",
    notes: "Preparacion controlada. No activa hardware real ni produccion sin aprobacion operativa."
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo preparar produccion.");
    return;
  }
  showToast(`Control produccion: ${response.data.control.status}`);
  await loadState();
});

$("create-shadow-shift-report").addEventListener("click", async () => {
  const snapshot = state.lastSnapshot;
  const paidSales = snapshot.sales.filter((sale) => sale.status === "paid");
  const response = await postJson("/api/shadow-shift/report", {
    supervisedBy: snapshot.session.name,
    notes: "Turno sombra paralelo. No reemplaza ICG.",
    icgReference: {
      salesCount: paidSales.length,
      grossTotal: paidSales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0),
      inventoryMovements: snapshot.inventoryMovements.length,
      tolerance: 1
    },
    incidents: []
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo registrar turno sombra.");
    return;
  }
  showToast(`Turno sombra: ${response.data.report.status}`);
  await loadState();
});

$("create-shadow-shift-decision").addEventListener("click", async () => {
  const response = await postJson("/api/shadow-shift/decision", {
    decidedBy: state.lastSnapshot.session.name,
    notes: "Decision posterior al turno sombra."
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo evaluar avance.");
    return;
  }
  showToast(`Decision: ${response.data.decision.status}`);
  await loadState();
});

$("create-operational-stage").addEventListener("click", async () => {
  const response = await postJson("/api/operational-stage/report", {
    approvedBy: state.lastSnapshot.session.name,
    evidence: [{ label: "Validacion local documentada", status: "passed" }],
    notes: "Avance controlado sin afectar produccion real."
  });
  if (!response.ok) {
    showToast(response.error || "No se pudo avanzar etapa.");
    return;
  }
  showToast(`Etapa ${response.data.report.stageId}: ${response.data.report.status}`);
  await loadState();
});

async function loadProducts(query) {
  const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`).then((row) => row.json());
  state.products = response.data || [];
  renderProducts();
}

async function loadState() {
  const response = await fetch("/api/state").then((row) => row.json());
  state.lastSnapshot = response.data;
  render();
}

function renderProducts() {
  $("products").innerHTML = state.products.map((product) => `
    <button class="product-card" data-product-id="${escapeHtml(product.id)}">
      <strong>${escapeHtml(product.name)}</strong>
      <span>${escapeHtml(product.sku)} · ${money(product.price)}</span>
    </button>
  `).join("");

  document.querySelectorAll("[data-product-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const response = await postJson("/api/cart/add", { productId: button.dataset.productId, qty: 1 });
      if (!response.ok) showToast(response.error || "No se pudo agregar.");
      await loadState();
    });
  });
}

function render() {
  const snapshot = state.lastSnapshot;
  if (!snapshot) return;

  $("ticket-label").textContent = snapshot.ticket.tableLabel || "Orden";
  $("operator-label").textContent = `Operador: ${snapshot.session.name} · ${snapshot.session.role}`;
  $("dining-option").value = snapshot.ticket.diningOption || "dineIn";
  renderTables(snapshot);
  $("cart-lines").innerHTML = snapshot.cart.lines.length
    ? snapshot.cart.lines.map((line) => `
      <div class="cart-line">
        <span>${escapeHtml(line.name)} x ${line.qty}${line.discountAmount ? ` · desc. ${money(line.discountAmount)}` : ""}</span>
        <strong>${money(line.totals.total)}</strong>
      </div>
    `).join("")
    : `<div class="mini-row"><span>Carrito vacio</span><strong>0.00</strong></div>`;

  $("subtotal").textContent = money(snapshot.cart.totals.subtotal);
  $("itbis").textContent = money(snapshot.cart.totals.itbis);
  $("ley").textContent = money(snapshot.cart.totals.ley);
  $("total").textContent = money(snapshot.cart.totals.total);

  $("cds-view").innerHTML = renderCds(snapshot.cds);
  $("kds-view").innerHTML = renderRows(snapshot.kdsReceived, (command) => `${command.tableLabel || "Mesa"} · ${command.lines.length} productos`);
  $("inventory-view").innerHTML = renderRows(snapshot.inventoryMovements.slice(-5), (row) => `${row.wtfProductName || row.wtfProductId}: -${row.qty} ${row.unit}`);
  $("backend-view").innerHTML = `
    <div class="mini-row"><span>Ventas</span><strong>${snapshot.backend.sales.length}</strong></div>
    <div class="mini-row"><span>Mov. inventario</span><strong>${snapshot.backend.inventoryMovements.length}</strong></div>
    <div class="mini-row"><span>Alertas</span><strong>${snapshot.backend.inventoryAlerts.length}</strong></div>
  `;
  $("payment-print-view").innerHTML = `
    <div class="mini-row"><span>Recibos impresos</span><strong>${snapshot.printedReceipts.length}</strong></div>
    <div class="mini-row"><span>Trabajos de impresion</span><strong>${snapshot.printJobs.length}</strong></div>
    <div class="mini-row"><span>Ultimo estado</span><strong>${escapeHtml(snapshot.printJobs.at(-1)?.status || "N/A")}</strong></div>
  `;
  $("pos-config-view").innerHTML = `
    <div class="mini-row"><span>Promos activas</span><strong>${snapshot.posConfiguration.discounts.promotions.filter((row) => row.active !== false).length}</strong></div>
    <div class="mini-row"><span>Limite rol</span><strong>${escapeHtml(String(snapshot.posConfiguration.discounts.roleLimits[snapshot.session.role]?.maxPercent ?? 0))}%</strong></div>
    <div class="mini-row"><span>Impresora</span><strong>${escapeHtml(snapshot.deviceProfile.printer.enabled ? snapshot.deviceProfile.printer.mode : "desactivada")}</strong></div>
    <div class="mini-row"><span>Pago</span><strong>${escapeHtml(snapshot.deviceProfile.payment.mode)}</strong></div>
  `;
  $("hardware-view").innerHTML = `
    <div class="mini-row"><span>Perfiles</span><strong>${snapshot.hardwareMatrix.summary.profiles}</strong></div>
    <div class="mini-row"><span>Impresoras listas</span><strong>${snapshot.hardwareMatrix.summary.printersReady}</strong></div>
    <div class="mini-row"><span>Pagos listos</span><strong>${snapshot.hardwareMatrix.summary.paymentsReady}</strong></div>
    <div class="mini-row"><span>Bloqueos</span><strong>${snapshot.hardwareMatrix.summary.blockers}</strong></div>
  `;
  const lastPilot = snapshot.pilotRuns.at(-1);
  $("pilot-view").innerHTML = lastPilot ? `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastPilot.status)}</strong></div>
    <div class="mini-row"><span>Checklist</span><strong>${lastPilot.summary.passed}/${lastPilot.summary.total}</strong></div>
    <div class="mini-row"><span>Venta piloto</span><strong>${money(lastPilot.saleTotal)}</strong></div>
    <div class="mini-row"><span>Diferencia cierre</span><strong>${money(lastPilot.closeDifference || 0)}</strong></div>
  ` : `<div class="mini-row"><span>Sin piloto registrado</span></div>`;
  const lastReconciliation = snapshot.pilotReconciliations.at(-1);
  $("pilot-reconciliation-view").innerHTML = lastReconciliation ? `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastReconciliation.status)}</strong></div>
    <div class="mini-row"><span>Tickets</span><strong>${lastReconciliation.pos.salesCount}/${lastReconciliation.reference.salesCount}</strong></div>
    <div class="mini-row"><span>Total POS</span><strong>${money(lastReconciliation.pos.grossTotal)}</strong></div>
    <div class="mini-row"><span>Diferencias</span><strong>${lastReconciliation.checks.filter((row) => row.status === "difference").length}</strong></div>
  ` : `<div class="mini-row"><span>Sin conciliacion</span></div>`;
  const readiness = buildReadiness(snapshot);
  $("readiness-view").innerHTML = `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(readiness.status)}</strong></div>
    <div class="mini-row"><span>Listos</span><strong>${readiness.summary.ready}/${readiness.summary.total}</strong></div>
    <div class="mini-row"><span>Bloqueos</span><strong>${readiness.summary.blocked}</strong></div>
    <div class="mini-row"><span>Siguiente</span><strong>${escapeHtml(readiness.nextAction)}</strong></div>
  `;
  const lastCutover = snapshot.cutoverPlans.at(-1);
  $("cutover-view").innerHTML = lastCutover ? `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastCutover.status)}</strong></div>
    <div class="mini-row"><span>Checklist</span><strong>${lastCutover.summary.passed}/${lastCutover.summary.total}</strong></div>
    <div class="mini-row"><span>Bloqueos</span><strong>${lastCutover.summary.blocked}</strong></div>
    <div class="mini-row"><span>Rollback</span><strong>${escapeHtml(lastCutover.rollbackOwner || "Pendiente")}</strong></div>
  ` : `<div class="mini-row"><span>Sin plan de cambio</span></div>`;
  const lastFinalReport = snapshot.pilotFinalReports.at(-1);
  $("pilot-final-report-view").innerHTML = lastFinalReport ? `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastFinalReport.status)}</strong></div>
    <div class="mini-row"><span>Ventas piloto</span><strong>${lastFinalReport.operations.salesCount}</strong></div>
    <div class="mini-row"><span>Tablets</span><strong>${lastFinalReport.tablets.passed}/${lastFinalReport.tablets.totalReports}</strong></div>
    <div class="mini-row"><span>Bloqueos</span><strong>${lastFinalReport.decision.blockers.length}</strong></div>
    <div class="mini-row"><span>Siguiente</span><strong>${escapeHtml(lastFinalReport.decision.nextAction)}</strong></div>
  ` : `<div class="mini-row"><span>Sin reporte final</span></div>`;
  const lastEvidencePackage = snapshot.pilotEvidencePackages.at(-1);
  $("pilot-evidence-view").innerHTML = lastEvidencePackage ? `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastEvidencePackage.status)}</strong></div>
    <div class="mini-row"><span>Archivo JSON</span><strong>${escapeHtml(lastEvidencePackage.exportFiles.jsonFileName)}</strong></div>
    <div class="mini-row"><span>Archivo HTML</span><strong>${escapeHtml(lastEvidencePackage.exportFiles.htmlFileName)}</strong></div>
    <div class="mini-row"><span>Auditoria</span><strong>${lastEvidencePackage.auditTrail.length}</strong></div>
  ` : `<div class="mini-row"><span>Sin paquete exportable</span></div>`;
  const lastProductionControl = snapshot.productionControls.at(-1);
  $("production-control-view").innerHTML = lastProductionControl ? `
    <div class="mini-row"><span>Modo</span><strong>${escapeHtml(lastProductionControl.requestedMode)}</strong></div>
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastProductionControl.status)}</strong></div>
    <div class="mini-row"><span>Permitido</span><strong>${lastProductionControl.productionAllowed ? "Si" : "No"}</strong></div>
    <div class="mini-row"><span>Bloqueos</span><strong>${lastProductionControl.summary.blocked}</strong></div>
    <div class="mini-row"><span>Siguiente</span><strong>${escapeHtml(lastProductionControl.nextAction)}</strong></div>
  ` : `<div class="mini-row"><span>Sin control de produccion</span></div>`;
  const lastShadowShift = snapshot.shadowShiftReports.at(-1);
  $("shadow-shift-view").innerHTML = lastShadowShift ? `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastShadowShift.status)}</strong></div>
    <div class="mini-row"><span>Ventas POS/ICG</span><strong>${lastShadowShift.pos.salesCount}/${lastShadowShift.icg.salesCount}</strong></div>
    <div class="mini-row"><span>Diferencias</span><strong>${lastShadowShift.summary.differences}</strong></div>
    <div class="mini-row"><span>Incidentes</span><strong>${lastShadowShift.summary.openIncidents}</strong></div>
  ` : `<div class="mini-row"><span>Sin turno sombra</span></div>`;
  const lastShadowDecision = snapshot.shadowShiftDecisions.at(-1);
  $("shadow-decision-view").innerHTML = lastShadowDecision ? `
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastShadowDecision.status)}</strong></div>
    <div class="mini-row"><span>Decision</span><strong>${escapeHtml(lastShadowDecision.decision)}</strong></div>
    <div class="mini-row"><span>Bloqueos</span><strong>${lastShadowDecision.blockers.length}</strong></div>
    <div class="mini-row"><span>Siguiente</span><strong>${escapeHtml(lastShadowDecision.nextAction)}</strong></div>
  ` : `<div class="mini-row"><span>Sin decision</span></div>`;
  const lastOperationalStage = snapshot.operationalStageReports.at(-1);
  $("operational-stage-view").innerHTML = lastOperationalStage ? `
    <div class="mini-row"><span>Ultima</span><strong>${escapeHtml(lastOperationalStage.stageId)}</strong></div>
    <div class="mini-row"><span>Estado</span><strong>${escapeHtml(lastOperationalStage.status)}</strong></div>
    <div class="mini-row"><span>Siguiente</span><strong>${escapeHtml(lastOperationalStage.nextDecision)}</strong></div>
    <div class="mini-row"><span>Total etapas</span><strong>${snapshot.operationalStageReports.length}/7</strong></div>
  ` : `<div class="mini-row"><span>Sin etapas registradas</span></div>`;
  const lastClose = snapshot.shiftCloseReports.at(-1);
  $("shift-close-view").innerHTML = lastClose ? `
    <div class="mini-row"><span>Ventas</span><strong>${lastClose.salesCount}</strong></div>
    <div class="mini-row"><span>Total bruto</span><strong>${money(lastClose.grossTotal)}</strong></div>
    <div class="mini-row"><span>Esperado caja</span><strong>${money(lastClose.cashExpected)}</strong></div>
    <div class="mini-row"><span>Diferencia</span><strong>${money(lastClose.difference)}</strong></div>
  ` : `<div class="mini-row"><span>Turno abierto</span><strong>${escapeHtml(snapshot.shift.status)}</strong></div>`;
  $("audit-view").innerHTML = renderRows(snapshot.auditEvents.slice(-5), (row) => `${row.actorName}: ${row.type.replace("pos_audit_", "")}`);
  $("reversal-view").innerHTML = `
    <div class="mini-row"><span>Ventas pagadas</span><strong>${snapshot.sales.filter((row) => row.status === "paid").length}</strong></div>
    <div class="mini-row"><span>Reversos</span><strong>${snapshot.saleReversals.length}</strong></div>
    <div class="mini-row"><span>Ultimo reverso</span><strong>${escapeHtml(snapshot.saleReversals.at(-1)?.type || "N/A")}</strong></div>
  `;
  const otherTickets = snapshot.openTickets.filter((ticket) => ticket.ticketId !== snapshot.ticket.ticketId);
  $("ticket-tools-view").innerHTML = `
    <div class="mini-row"><span>Cuenta actual</span><strong>${snapshot.cart.lines.length} productos</strong></div>
    <div class="mini-row"><span>Cuentas abiertas</span><strong>${snapshot.openTickets.length}</strong></div>
    <div class="mini-row"><span>Separadas</span><strong>${otherTickets.length}</strong></div>
  `;
}

function renderTables(snapshot) {
  $("tables").innerHTML = snapshot.dining.tables.map((table) => {
    const active = table.tableId === snapshot.ticket.tableId;
    const className = ["table-btn", active ? "active" : "", table.status === "occupied" && !active ? "occupied" : ""].filter(Boolean).join(" ");
    return `<button class="${className}" data-table-id="${escapeHtml(table.tableId)}">${escapeHtml(table.label)}</button>`;
  }).join("");

  document.querySelectorAll("[data-table-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const response = await postJson("/api/ticket/transfer-table", { tableId: button.dataset.tableId });
      if (!response.ok) showToast(response.error || "No se pudo transferir mesa.");
      await loadState();
    });
  });
}

function renderCds(cds) {
  if (!cds) return "<div>Esperando orden...</div>";
  const lines = cds.lines.map((line) => `<div class="mini-row"><span>${escapeHtml(line.name)} x ${line.qty}</span><strong>${money(line.total)}</strong></div>`).join("");
  return `
    ${lines || `<div>${escapeHtml(cds.message || "Listo para ordenar.")}</div>`}
    <div class="mini-row"><span>Total</span><strong>${money(cds.totals.total)}</strong></div>
  `;
}

function renderRows(rows, mapper) {
  return rows.length
    ? rows.map((row) => `<div class="mini-row"><span>${escapeHtml(mapper(row))}</span></div>`).join("")
    : `<div class="mini-row"><span>Sin datos aun</span></div>`;
}

function buildReadiness(snapshot) {
  const latestPilot = snapshot.pilotRuns.at(-1);
  const latestReconciliation = snapshot.pilotReconciliations.at(-1);
  const currentHardwareReady = snapshot.deviceProfile?.printer?.enabled !== false && snapshot.deviceProfile?.payment?.enabled !== false;
  const checks = [
    { status: currentHardwareReady ? "ready" : "blocked", label: "Hardware" },
    { status: latestPilot?.status === "passed" ? "ready" : "pending", label: "Piloto" },
    { status: latestReconciliation?.status === "matched" ? "ready" : "pending", label: "Conciliacion" },
    { status: snapshot.auditEvents.length ? "ready" : "pending", label: "Auditoria" },
    { status: snapshot.backend ? "ready" : "blocked", label: "Backend" }
  ];
  const blocked = checks.filter((check) => check.status === "blocked");
  const pending = checks.filter((check) => check.status === "pending");
  return {
    status: blocked.length ? "blocked" : pending.length ? "pending" : "ready",
    summary: {
      total: checks.length,
      ready: checks.filter((check) => check.status === "ready").length,
      blocked: blocked.length
    },
    nextAction: blocked[0]?.label || pending[0]?.label || "Piloto interno supervisado"
  };
}

async function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then((row) => row.json());
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  setTimeout(() => {
    $("toast").hidden = true;
  }, 3200);
}

function downloadEvidence(evidencePackage, format) {
  const isHtml = format === "html";
  const fileName = isHtml ? evidencePackage.exportFiles.htmlFileName : evidencePackage.exportFiles.jsonFileName;
  const content = isHtml ? evidencePackage.exportFiles.html : JSON.stringify(evidencePackage, null, 2);
  const blob = new Blob([content], { type: isHtml ? "text/html;charset=utf-8" : "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function money(value) {
  return Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
