import { applyLineDiscount, calculateCart } from "../domain/cart.js";
import { ProductCatalog } from "../domain/catalog.js";
import { buildDashboardSnapshot } from "../domain/dashboard.js";
import { DiningRoom } from "../domain/dining-room.js";
import { buildInventoryImpactPlan, InventoryBridgeCatalog } from "../domain/inventory-bridge.js";
import { createKdsCommandFromTicket } from "../domain/kds-command.js";
import {
  addProductToTicket,
  createOpenTicket,
  markTicketPaid,
  mergeTickets,
  moveLineBetweenTickets
} from "../domain/open-ticket.js";
import { createReceiptPrintJob } from "../domain/print-job.js";
import { buildCutoverPlan, createCutoverPlanEvent } from "../domain/cutover-plan.js";
import { buildPilotEvidencePackage, createPilotEvidencePackageEvent } from "../domain/pilot-evidence-package.js";
import { buildPilotFinalReport, createPilotFinalReportEvent } from "../domain/pilot-final-report.js";
import { createPilotChecklist, createPilotRun, createPilotRunEvent } from "../domain/pos-pilot.js";
import { buildPilotReconciliation, createPilotReconciliationEvent } from "../domain/pilot-reconciliation.js";
import { createAuditEvent, POS_PERMISSIONS, PosUserDirectory, requirePermission } from "../domain/pos-user.js";
import { buildProductionReadiness } from "../domain/production-readiness.js";
import { buildHardwareMatrix, runPaymentDiagnostic, runPrinterDiagnostic } from "../domain/pos-hardware.js";
import {
  assertDiscountAllowed,
  calculatePromotionDiscount,
  createPosConfiguration,
  findPromotion,
  resolveDeviceProfile
} from "../domain/pos-configuration.js";
import { buildProductionControl, createProductionControlEvent } from "../domain/production-control.js";
import { renderReceipt } from "../domain/receipt.js";
import { refundSaleLines, voidSale } from "../domain/sale-reversal.js";
import { closeSaleWithApprovedPayment } from "../domain/sales.js";
import { buildShiftCloseReport, openShift } from "../domain/shift.js";
import { buildShadowShiftDecision, createShadowShiftDecisionEvent } from "../domain/shadow-shift-decision.js";
import { buildShadowShiftReport, createShadowShiftReportEvent } from "../domain/shadow-shift.js";
import { TransactionalPosApi } from "../backend/transactional-pos-api.js";
import { BackendSyncAdapter } from "../infrastructure/backend-sync-adapter.js";
import { CdsSyncService } from "../infrastructure/cds-sync-service.js";
import { InventoryImpactLedger } from "../infrastructure/inventory-impact-ledger.js";
import { KdsCommandQueue } from "../infrastructure/kds-command-queue.js";
import { LocalJsonStore } from "../infrastructure/local-store.js";
import { OutboxQueue } from "../infrastructure/outbox-queue.js";
import { PrintJobQueue } from "../infrastructure/print-job-queue.js";
import { buildOperationalStageReport, createOperationalStageReportEvent, OPERATIONAL_STAGES } from "../domain/operational-stage.js";
import { VirtualCdsAdapter } from "../infrastructure/virtual-cds-adapter.js";
import { VirtualKdsAdapter } from "../infrastructure/virtual-kds-adapter.js";
import { VirtualPaymentAdapter } from "../infrastructure/virtual-payment-adapter.js";
import { VirtualPrinterAdapter } from "../infrastructure/virtual-printer-adapter.js";

export class PosUiEngine {
  constructor({
    store,
    products,
    bridges,
    zones = [],
    tables = [],
    users = [],
    pin = "1234",
    employeeId = "employee_demo",
    deviceId = "pos_demo",
    posConfiguration = {},
    now = new Date()
  }) {
    this.store = store;
    this.catalog = new ProductCatalog(products);
    this.bridges = new InventoryBridgeCatalog(bridges);
    this.diningRoom = new DiningRoom({ zones, tables });
    this.userDirectory = new PosUserDirectory(users);
    this.session = this.userDirectory.authenticatePin(pin);
    this.deviceId = deviceId;
    this.posConfiguration = createPosConfiguration(posConfiguration);
    this.deviceProfile = resolveDeviceProfile(this.posConfiguration, deviceId);
    this.backend = new TransactionalPosApi();
    this.backendAdapter = new BackendSyncAdapter(this.backend);
    this.cdsAdapter = new VirtualCdsAdapter();
    this.kdsAdapter = new VirtualKdsAdapter({ ack: true });
    this.paymentAdapter = new VirtualPaymentAdapter({
      approved: this.deviceProfile.payment.approvedByDefault !== false,
      paymentPolicy: this.deviceProfile.payment
    });
    this.printerAdapter = new VirtualPrinterAdapter({
      available: this.deviceProfile.printer.enabled !== false,
      printerPolicy: this.deviceProfile.printer
    });
    this.shift = openShift({ employeeId: this.session.userId || employeeId, deviceId: this.deviceId, openingCash: 5000, now });
    this.ticket = createOpenTicket({
      shift: this.shift,
      diningOption: "dineIn",
      tableId: "mesa_1",
      tableLabel: "Mesa 1",
      zoneId: "zone_salon",
      zoneName: "Salon principal",
      now
    });
  }

  async init() {
    requirePermission(this.session, POS_PERMISSIONS.OPEN_SHIFT);
    await this.store.appendShift(this.shift);
    await this.store.upsertTicketWithEvent(this.ticket);
    await this.audit("pos_audit_shift_opened", this.shift.shiftId, { shiftId: this.shift.shiftId });
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);
    return this.snapshot();
  }

  searchProducts(query) {
    return this.catalog.search(query, { limit: 12 });
  }

  async diningState() {
    const data = await this.store.read();
    return {
      zones: this.diningRoom.zones,
      tables: this.diningRoom.availableTables((data.tickets || []).concat([this.ticket]))
    };
  }

  async transferCurrentTicket(toTableId) {
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    const data = await this.store.read();
    const { ticket, event } = this.diningRoom.transferTicket(this.ticket, toTableId, {
      tickets: data.tickets || []
    });
    this.ticket = ticket;
    await this.store.upsertTicketWithEvent(this.ticket, event);
    await this.audit("pos_audit_ticket_table_transferred", this.ticket.ticketId, {
      ticketId: this.ticket.ticketId,
      toTableId
    });
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);
    return this.snapshot();
  }

  async changeDiningOption(diningOption) {
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    const { ticket, event } = this.diningRoom.changeDiningOption(this.ticket, diningOption);
    this.ticket = ticket;
    await this.store.upsertTicketWithEvent(this.ticket, event);
    await this.audit("pos_audit_dining_option_changed", this.ticket.ticketId, {
      ticketId: this.ticket.ticketId,
      diningOption
    });
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);
    return this.snapshot();
  }

  async addProduct(productId, { qty = 1, notes = "" } = {}) {
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    const product = this.catalog.getById(productId);
    if (!product) throw new Error("Producto no encontrado.");
    this.ticket = addProductToTicket(this.ticket, product, { qty, notes });
    await this.store.upsertTicketWithEvent(this.ticket);
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);
    return this.snapshot();
  }

  async applyPromotionToLine(lineId, promotionId, { reason = "Promocion autorizada" } = {}) {
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    const line = this.ticket.cart.lines.find((row) => row.lineId === lineId);
    if (!line) throw new Error("Linea no encontrada para promocion.");
    const promotion = findPromotion(this.posConfiguration, promotionId);
    if (!promotion) throw new Error("Promocion no encontrada o inactiva.");
    if (promotion.productIds?.length && !promotion.productIds.includes(line.productId)) {
      throw new Error("Promocion no aplica a este producto.");
    }
    const discountAmount = calculatePromotionDiscount({ line, promotion });
    const limits = assertDiscountAllowed({
      config: this.posConfiguration,
      session: this.session,
      line,
      discountAmount,
      reason
    });
    this.ticket = Object.assign({}, this.ticket, {
      cart: applyLineDiscount(this.ticket.cart, lineId, {
        discountAmount,
        reason,
        ruleId: promotion.promotionId,
        actorUserId: this.session.userId
      })
    });
    await this.store.upsertTicketWithEvent(this.ticket);
    await this.audit("pos_audit_discount_applied", this.ticket.ticketId, {
      ticketId: this.ticket.ticketId,
      lineId,
      promotionId,
      discountAmount,
      discountPercent: limits.discountPercent
    });
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);
    return this.snapshot();
  }

  async splitCurrentTicketLine(lineId, qty = 1) {
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    const splitTicket = createOpenTicket({
      shift: this.shift,
      diningOption: this.ticket.diningOption,
      customerLabel: "Cuenta separada",
      tableLabel: `${this.ticket.tableLabel || "Orden"} - Cuenta separada`,
      zoneId: this.ticket.zoneId,
      zoneName: this.ticket.zoneName
    });
    const { fromTicket, toTicket, movedLine, event } = moveLineBetweenTickets(this.ticket, splitTicket, lineId, { qty });
    this.ticket = fromTicket;
    await this.store.upsertTicketsWithEvent([fromTicket, toTicket], event);
    await this.audit("pos_audit_ticket_line_moved", fromTicket.ticketId, {
      fromTicketId: fromTicket.ticketId,
      toTicketId: toTicket.ticketId,
      lineId,
      movedLineId: movedLine.lineId,
      qty: movedLine.qty
    });
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return this.snapshot();
  }

  async mergeTicketIntoCurrent(sourceTicketId) {
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    const data = await this.store.read();
    const sourceTicket = (data.tickets || []).find((ticket) => ticket.ticketId === sourceTicketId);
    if (!sourceTicket) throw new Error("Cuenta origen no encontrada.");
    const { targetTicket, sourceTicket: mergedSource, event } = mergeTickets(this.ticket, sourceTicket);
    this.ticket = targetTicket;
    await this.store.upsertTicketsWithEvent([targetTicket, mergedSource], event);
    await this.audit("pos_audit_ticket_merged", targetTicket.ticketId, {
      targetTicketId: targetTicket.ticketId,
      sourceTicketId: sourceTicket.ticketId
    });
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return this.snapshot();
  }

  async sendKds() {
    requirePermission(this.session, POS_PERMISSIONS.SEND_KDS);
    const { command, event } = createKdsCommandFromTicket(this.ticket);
    const queue = new KdsCommandQueue(this.store);
    await queue.enqueue(command, event);
    return queue.dispatchNext(this.kdsAdapter);
  }

  async payCash(cashReceived) {
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    requirePermission(this.session, POS_PERMISSIONS.PRINT_RECEIPT);
    const total = calculateCart(this.ticket.cart).totals.total;
    const paymentAttempt = await this.paymentAdapter.authorize({
      method: "cash",
      amount: total,
      received: cashReceived
    });
    const { sale, event } = closeSaleWithApprovedPayment({
      cart: this.ticket.cart,
      shift: this.shift,
      paymentAttempt
    });
    await this.store.appendSaleWithEvent(sale, event);
    await this.audit("pos_audit_sale_paid", sale.saleId, { saleId: sale.saleId, total: sale.totals.total });

    const { job, event: printEvent } = createReceiptPrintJob(sale, {
      printerId: this.deviceProfile.printer.printerId,
      station: this.deviceProfile.printer.station,
      commandSet: this.deviceProfile.printer.commandSet
    });
    const printQueue = new PrintJobQueue(this.store);
    await printQueue.enqueue(job, printEvent);
    const printResult = await printQueue.printNext(this.printerAdapter, {
      printerId: this.deviceProfile.printer.printerId
    });

    const impactPlan = buildInventoryImpactPlan(sale, this.bridges);
    await new InventoryImpactLedger(this.store).applyPlan(impactPlan);
    await this.store.appendOutboxEvent(impactPlan.event);
    await this.store.upsertTicketWithEvent(markTicketPaid(this.ticket, sale));
    await new CdsSyncService(this.store).clearTicket(this.ticket, this.cdsAdapter);
    await new OutboxQueue(this.store).drain(this.backendAdapter);

    this.ticket = createOpenTicket({
      shift: this.shift,
      diningOption: "dineIn",
      tableId: "mesa_1",
      tableLabel: "Mesa 1",
      zoneId: "zone_salon",
      zoneName: "Salon principal"
    });
    await new CdsSyncService(this.store).publishTicket(this.ticket, this.cdsAdapter);

    return {
      sale,
      receipt: renderReceipt(sale),
      paymentAttempt,
      printResult,
      impactPlan,
      snapshot: await this.snapshot()
    };
  }

  async closeShift(countedCash) {
    requirePermission(this.session, POS_PERMISSIONS.CLOSE_SHIFT);
    const data = await this.store.read();
    const { report, closedShift, event } = buildShiftCloseReport({
      shift: this.shift,
      sales: data.sales || [],
      countedCash
    });
    await this.store.closeShiftWithReport(closedShift, report, event);
    await this.audit("pos_audit_shift_closed", report.closeReportId, {
      closeReportId: report.closeReportId,
      difference: report.difference
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    this.shift = closedShift;
    return {
      report,
      snapshot: await this.snapshot()
    };
  }

  async voidSale(saleId, reason) {
    requirePermission(this.session, POS_PERMISSIONS.VOID_SALE);
    const data = await this.store.read();
    const sale = (data.sales || []).find((row) => row.saleId === saleId);
    if (!sale) throw new Error("Venta no encontrada para anular.");
    const { reversal, sale: voidedSale, event } = voidSale(sale, {
      actor: this.session,
      reason
    });
    await this.store.upsertSaleReversalWithEvent(voidedSale, reversal, event);
    await new InventoryImpactLedger(this.store).reverseSaleImpact(saleId, {
      reversalId: reversal.reversalId
    });
    await this.audit("pos_audit_sale_voided", saleId, {
      saleId,
      reversalId: reversal.reversalId,
      reason
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      reversal,
      snapshot: await this.snapshot()
    };
  }

  async refundSale(saleId, refundLines, reason) {
    requirePermission(this.session, POS_PERMISSIONS.REFUND_SALE);
    const data = await this.store.read();
    const sale = (data.sales || []).find((row) => row.saleId === saleId);
    if (!sale) throw new Error("Venta no encontrada para devolucion.");
    const { reversal, sale: refundedSale, event } = refundSaleLines(sale, refundLines, {
      actor: this.session,
      reason
    });
    await this.store.upsertSaleReversalWithEvent(refundedSale, reversal, event);
    await new InventoryImpactLedger(this.store).reverseSaleImpact(saleId, {
      reversalId: reversal.reversalId,
      lineIds: reversal.lines.map((line) => line.lineId)
    });
    await this.audit("pos_audit_sale_refunded", saleId, {
      saleId,
      reversalId: reversal.reversalId,
      reason
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      reversal,
      snapshot: await this.snapshot()
    };
  }

  async audit(type, aggregateId, payload) {
    const event = createAuditEvent({
      type,
      actor: this.session,
      aggregateId,
      payload
    });
    await this.store.appendAuditEvent(event);
    return event;
  }

  hardwareMatrix() {
    return buildHardwareMatrix(this.posConfiguration);
  }

  async runHardwareDiagnostics() {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const printerDiagnostic = runPrinterDiagnostic(this.deviceProfile.printer);
    const paymentDiagnostic = runPaymentDiagnostic(this.deviceProfile.payment);
    await this.audit("pos_audit_hardware_diagnostic", this.deviceId, {
      deviceId: this.deviceId,
      printer: printerDiagnostic,
      payment: paymentDiagnostic
    });
    return {
      matrix: this.hardwareMatrix(),
      printerDiagnostic,
      paymentDiagnostic,
      snapshot: await this.snapshot()
    };
  }

  async runOperationalPilot({
    productId = "pos_limonada",
    qty = 1,
    cashReceived = 1000,
    countedCash = 5153.6,
    notes = "Piloto operativo local"
  } = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    requirePermission(this.session, POS_PERMISSIONS.SEND_KDS);
    requirePermission(this.session, POS_PERMISSIONS.SELL);
    requirePermission(this.session, POS_PERMISSIONS.CLOSE_SHIFT);

    await this.runHardwareDiagnostics();
    await this.addProduct(productId, { qty, notes: "Producto piloto" });
    await this.sendKds();
    const activeOrderSnapshot = await this.snapshot();
    const paid = await this.payCash(cashReceived);
    const closed = await this.closeShift(countedCash);
    const snapshot = await this.snapshot();
    const checklist = createPilotChecklist(Object.assign({}, snapshot, {
      cart: activeOrderSnapshot.cart,
      cds: activeOrderSnapshot.cds,
      kdsReceived: snapshot.kdsReceived
    }));
    const pilotRun = createPilotRun({
      deviceId: this.deviceId,
      operator: this.session,
      checklist,
      sale: paid.sale,
      closeReport: closed.report,
      hardwareMatrix: snapshot.hardwareMatrix,
      notes
    });
    const event = createPilotRunEvent(pilotRun);
    await this.store.upsertPilotRunWithEvent(pilotRun, event);
    await this.audit("pos_audit_pilot_run_recorded", pilotRun.pilotRunId, {
      pilotRunId: pilotRun.pilotRunId,
      status: pilotRun.status,
      saleTotal: pilotRun.saleTotal,
      closeDifference: pilotRun.closeDifference
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      pilotRun,
      receipt: paid.receipt,
      snapshot: await this.snapshot()
    };
  }

  async reconcilePilot(reference = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const data = await this.store.read();
    const reconciliation = buildPilotReconciliation({
      sales: data.sales || [],
      inventoryMovements: data.inventoryMovements || [],
      reference
    });
    const event = createPilotReconciliationEvent(reconciliation);
    await this.store.upsertPilotReconciliationWithEvent(reconciliation, event);
    await this.audit("pos_audit_pilot_reconciliation_recorded", reconciliation.reconciliationId, {
      reconciliationId: reconciliation.reconciliationId,
      status: reconciliation.status,
      checks: reconciliation.checks
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      reconciliation,
      snapshot: await this.snapshot()
    };
  }

  async productionReadiness() {
    return buildProductionReadiness(await this.snapshot());
  }

  async createCutoverPlan(options = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const snapshot = await this.snapshot();
    const plan = buildCutoverPlan(snapshot, options);
    const event = createCutoverPlanEvent(plan);
    await this.store.upsertCutoverPlanWithEvent(plan, event);
    await this.audit("pos_audit_cutover_plan_recorded", plan.cutoverPlanId, {
      cutoverPlanId: plan.cutoverPlanId,
      status: plan.status,
      blocked: plan.summary.blocked,
      pending: plan.summary.pending
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      plan,
      snapshot: await this.snapshot()
    };
  }

  async createPilotFinalReport(options = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const snapshot = await this.snapshot();
    const report = buildPilotFinalReport(snapshot, {
      deviceReports: options.deviceReports || [],
      generatedBy: options.generatedBy || this.session.name,
      notes: options.notes || ""
    });
    const event = createPilotFinalReportEvent(report);
    await this.store.upsertPilotFinalReportWithEvent(report, event);
    await this.audit("pos_audit_pilot_final_report_recorded", report.finalReportId, {
      finalReportId: report.finalReportId,
      status: report.status,
      blockers: report.decision.blockers.length,
      pending: report.decision.pending.length
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      report,
      snapshot: await this.snapshot()
    };
  }

  async createPilotEvidencePackage(options = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const snapshot = await this.snapshot();
    const evidencePackage = buildPilotEvidencePackage(snapshot, {
      generatedBy: options.generatedBy || this.session.name,
      notes: options.notes || ""
    });
    const event = createPilotEvidencePackageEvent(evidencePackage);
    await this.store.upsertPilotEvidencePackageWithEvent(evidencePackage, event);
    await this.audit("pos_audit_pilot_evidence_package_recorded", evidencePackage.evidencePackageId, {
      evidencePackageId: evidencePackage.evidencePackageId,
      status: evidencePackage.status,
      blockers: evidencePackage.summary.blockers.length,
      pending: evidencePackage.summary.pending.length
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      evidencePackage,
      snapshot: await this.snapshot()
    };
  }

  async createProductionControl(options = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const snapshot = await this.snapshot();
    const control = buildProductionControl(snapshot, {
      requestedMode: options.requestedMode || "pilot",
      approvedBy: options.approvedBy || this.session.name,
      notes: options.notes || "",
      icgFallbackReady: options.icgFallbackReady !== false,
      rollbackConfirmed: options.rollbackConfirmed === true,
      firstShiftOwner: options.firstShiftOwner || "",
      supervisionWindow: options.supervisionWindow || ""
    });
    const event = createProductionControlEvent(control);
    await this.store.upsertProductionControlWithEvent(control, event);
    await this.audit("pos_audit_production_control_recorded", control.productionControlId, {
      productionControlId: control.productionControlId,
      requestedMode: control.requestedMode,
      status: control.status,
      productionAllowed: control.productionAllowed,
      blocked: control.summary.blocked
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      control,
      snapshot: await this.snapshot()
    };
  }

  async createShadowShiftReport(options = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const snapshot = await this.snapshot();
    const report = buildShadowShiftReport(snapshot, {
      icgReference: options.icgReference || {},
      incidents: options.incidents || [],
      supervisedBy: options.supervisedBy || this.session.name,
      notes: options.notes || ""
    });
    const event = createShadowShiftReportEvent(report);
    await this.store.upsertShadowShiftReportWithEvent(report, event);
    await this.audit("pos_audit_shadow_shift_report_recorded", report.shadowShiftId, {
      shadowShiftId: report.shadowShiftId,
      status: report.status,
      differences: report.summary.differences,
      openIncidents: report.summary.openIncidents
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      report,
      snapshot: await this.snapshot()
    };
  }

  async createShadowShiftDecision(options = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const snapshot = await this.snapshot();
    const decision = buildShadowShiftDecision(snapshot, {
      decidedBy: options.decidedBy || this.session.name,
      notes: options.notes || ""
    });
    const event = createShadowShiftDecisionEvent(decision);
    await this.store.upsertShadowShiftDecisionWithEvent(decision, event);
    await this.audit("pos_audit_shadow_shift_decision_recorded", decision.decisionId, {
      decisionId: decision.decisionId,
      decision: decision.decision,
      status: decision.status,
      blockers: decision.blockers.length
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      decision,
      snapshot: await this.snapshot()
    };
  }

  async createOperationalStageReport(options = {}) {
    requirePermission(this.session, POS_PERMISSIONS.MANAGE_SETTINGS);
    const snapshot = await this.snapshot();
    const report = buildOperationalStageReport(snapshot, {
      stageId: options.stageId || nextOperationalStageId(snapshot),
      approvedBy: options.approvedBy || this.session.name,
      evidence: options.evidence || [{ label: "Validacion local", status: "passed" }],
      notes: options.notes || ""
    });
    const event = createOperationalStageReportEvent(report);
    await this.store.upsertOperationalStageReportWithEvent(report, event);
    await this.audit("pos_audit_operational_stage_report_recorded", report.operationalStageReportId, {
      operationalStageReportId: report.operationalStageReportId,
      stageId: report.stageId,
      status: report.status,
      nextDecision: report.nextDecision,
      blockers: report.blockers.length
    });
    await new OutboxQueue(this.store).drain(this.backendAdapter);
    return {
      report,
      snapshot: await this.snapshot()
    };
  }

  async snapshot() {
    const data = await this.store.read();
    return {
      shift: this.shift,
      session: this.session,
      ticket: this.ticket,
      dining: await this.diningState(),
      cart: calculateCart(this.ticket.cart),
      cds: this.cdsAdapter.currentSnapshot(this.ticket.ticketId),
      kdsReceived: this.kdsAdapter.received,
      printedReceipts: this.printerAdapter.printed,
      dashboard: buildDashboardSnapshot(data),
      backend: this.backend.snapshot(),
      printJobs: data.printJobs || [],
      pilotRuns: data.pilotRuns || [],
      pilotReconciliations: data.pilotReconciliations || [],
      cutoverPlans: data.cutoverPlans || [],
      pilotFinalReports: data.pilotFinalReports || [],
      pilotEvidencePackages: data.pilotEvidencePackages || [],
      productionControls: data.productionControls || [],
      shadowShiftReports: data.shadowShiftReports || [],
      shadowShiftDecisions: data.shadowShiftDecisions || [],
      operationalStageReports: data.operationalStageReports || [],
      auditEvents: data.auditEvents || [],
      sales: data.sales || [],
      saleReversals: data.saleReversals || [],
      shiftCloseReports: data.shiftCloseReports || [],
      inventoryMovements: data.inventoryMovements || [],
      inventoryAlerts: data.inventoryAlerts || [],
      openTickets: (data.tickets || []).filter((ticket) => ["open", "held"].includes(ticket.status)),
      products: this.catalog.allActive(),
      posConfiguration: this.posConfiguration,
      deviceProfile: this.deviceProfile,
      hardwareMatrix: this.hardwareMatrix()
    };
  }
}

function nextOperationalStageId(snapshot = {}) {
  const completed = snapshot.operationalStageReports || [];
  const next = OPERATIONAL_STAGES[completed.length] || OPERATIONAL_STAGES.at(-1);
  return next.stageId;
}
