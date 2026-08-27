import fs from "node:fs/promises";
import path from "node:path";

export class LocalJsonStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read() {
    try {
      return JSON.parse(await fs.readFile(this.filePath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        return {
          shifts: [],
          shiftCloseReports: [],
          tickets: [],
          sales: [],
          saleReversals: [],
          kdsCommands: [],
          cdsSnapshots: [],
          printJobs: [],
          pilotRuns: [],
          pilotReconciliations: [],
          cutoverPlans: [],
          pilotFinalReports: [],
          pilotEvidencePackages: [],
          productionControls: [],
          shadowShiftReports: [],
          shadowShiftDecisions: [],
          operationalStageReports: [],
          auditEvents: [],
          inventoryMovements: [],
          inventoryAlerts: [],
          outbox: []
        };
      }
      throw error;
    }
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  async appendShift(shift) {
    const data = await this.read();
    const shifts = Array.isArray(data.shifts) ? data.shifts : [];
    if (!shifts.some((row) => row.shiftId === shift.shiftId)) shifts.push(shift);
    await this.write(Object.assign({}, data, { shifts }));
    return shift;
  }

  async closeShiftWithReport(closedShift, report, event) {
    const data = await this.read();
    const shifts = Array.isArray(data.shifts) ? data.shifts : [];
    const shiftCloseReports = Array.isArray(data.shiftCloseReports) ? data.shiftCloseReports : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const shiftIndex = shifts.findIndex((row) => row.shiftId === closedShift.shiftId);
    if (shiftIndex >= 0) shifts[shiftIndex] = closedShift;
    else shifts.push(closedShift);
    const reportIndex = shiftCloseReports.findIndex((row) => row.closeReportId === report.closeReportId);
    if (reportIndex >= 0) shiftCloseReports[reportIndex] = report;
    else shiftCloseReports.push(report);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { shifts, shiftCloseReports, outbox }));
    return { shifts, shiftCloseReports, outbox };
  }

  async appendSaleWithEvent(sale, event) {
    const data = await this.read();
    const sales = Array.isArray(data.sales) ? data.sales : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    if (!sales.some((row) => row.saleId === sale.saleId)) sales.push(sale);
    if (!outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { sales, outbox }));
    return { sales, outbox };
  }

  async upsertSaleReversalWithEvent(sale, reversal, event) {
    const data = await this.read();
    const sales = Array.isArray(data.sales) ? data.sales : [];
    const saleReversals = Array.isArray(data.saleReversals) ? data.saleReversals : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const saleIndex = sales.findIndex((row) => row.saleId === sale.saleId);
    if (saleIndex >= 0) sales[saleIndex] = sale;
    else sales.push(sale);
    if (!saleReversals.some((row) => row.reversalId === reversal.reversalId)) saleReversals.push(reversal);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { sales, saleReversals, outbox }));
    return { sales, saleReversals, outbox };
  }

  async appendOutboxEvent(event) {
    const data = await this.read();
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { outbox }));
    return outbox;
  }

  async appendAuditEvent(event) {
    const data = await this.read();
    const auditEvents = Array.isArray(data.auditEvents) ? data.auditEvents : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    if (event && !auditEvents.some((row) => row.eventId === event.eventId)) auditEvents.push(event);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { auditEvents, outbox }));
    return { auditEvents, outbox };
  }

  async upsertTicketWithEvent(ticket, event) {
    const data = await this.read();
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = tickets.findIndex((row) => row.ticketId === ticket.ticketId);
    if (index >= 0) tickets[index] = ticket;
    else tickets.push(ticket);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { tickets, outbox }));
    return { tickets, outbox };
  }

  async upsertTicketsWithEvent(nextTickets, event) {
    const data = await this.read();
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    for (const ticket of nextTickets) {
      const index = tickets.findIndex((row) => row.ticketId === ticket.ticketId);
      if (index >= 0) tickets[index] = ticket;
      else tickets.push(ticket);
    }
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { tickets, outbox }));
    return { tickets, outbox };
  }

  async upsertKdsCommandWithEvent(command, event) {
    const data = await this.read();
    const kdsCommands = Array.isArray(data.kdsCommands) ? data.kdsCommands : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = kdsCommands.findIndex((row) => row.commandId === command.commandId);
    if (index >= 0) kdsCommands[index] = command;
    else kdsCommands.push(command);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { kdsCommands, outbox }));
    return { kdsCommands, outbox };
  }

  async upsertCdsSnapshotWithEvent(snapshot, event) {
    const data = await this.read();
    const cdsSnapshots = Array.isArray(data.cdsSnapshots) ? data.cdsSnapshots : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = cdsSnapshots.findIndex((row) => row.snapshotId === snapshot.snapshotId);
    if (index >= 0) {
      const current = cdsSnapshots[index];
      if (String(snapshot.updatedAt || "").localeCompare(String(current.updatedAt || "")) >= 0) {
        cdsSnapshots[index] = snapshot;
      }
    } else {
      cdsSnapshots.push(snapshot);
    }
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { cdsSnapshots, outbox }));
    return { cdsSnapshots, outbox };
  }

  async upsertPrintJobWithEvent(job, event) {
    const data = await this.read();
    const printJobs = Array.isArray(data.printJobs) ? data.printJobs : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = printJobs.findIndex((row) => row.printJobId === job.printJobId);
    if (index >= 0) printJobs[index] = job;
    else printJobs.push(job);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { printJobs, outbox }));
    return { printJobs, outbox };
  }

  async upsertPilotRunWithEvent(pilotRun, event) {
    const data = await this.read();
    const pilotRuns = Array.isArray(data.pilotRuns) ? data.pilotRuns : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = pilotRuns.findIndex((row) => row.pilotRunId === pilotRun.pilotRunId);
    if (index >= 0) pilotRuns[index] = pilotRun;
    else pilotRuns.push(pilotRun);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { pilotRuns, outbox }));
    return { pilotRuns, outbox };
  }

  async upsertPilotReconciliationWithEvent(reconciliation, event) {
    const data = await this.read();
    const pilotReconciliations = Array.isArray(data.pilotReconciliations) ? data.pilotReconciliations : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = pilotReconciliations.findIndex((row) => row.reconciliationId === reconciliation.reconciliationId);
    if (index >= 0) pilotReconciliations[index] = reconciliation;
    else pilotReconciliations.push(reconciliation);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { pilotReconciliations, outbox }));
    return { pilotReconciliations, outbox };
  }

  async upsertCutoverPlanWithEvent(plan, event) {
    const data = await this.read();
    const cutoverPlans = Array.isArray(data.cutoverPlans) ? data.cutoverPlans : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = cutoverPlans.findIndex((row) => row.cutoverPlanId === plan.cutoverPlanId);
    if (index >= 0) cutoverPlans[index] = plan;
    else cutoverPlans.push(plan);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { cutoverPlans, outbox }));
    return { cutoverPlans, outbox };
  }

  async upsertPilotFinalReportWithEvent(report, event) {
    const data = await this.read();
    const pilotFinalReports = Array.isArray(data.pilotFinalReports) ? data.pilotFinalReports : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = pilotFinalReports.findIndex((row) => row.finalReportId === report.finalReportId);
    if (index >= 0) pilotFinalReports[index] = report;
    else pilotFinalReports.push(report);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { pilotFinalReports, outbox }));
    return { pilotFinalReports, outbox };
  }

  async upsertPilotEvidencePackageWithEvent(evidencePackage, event) {
    const data = await this.read();
    const pilotEvidencePackages = Array.isArray(data.pilotEvidencePackages) ? data.pilotEvidencePackages : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = pilotEvidencePackages.findIndex((row) => row.evidencePackageId === evidencePackage.evidencePackageId);
    if (index >= 0) pilotEvidencePackages[index] = evidencePackage;
    else pilotEvidencePackages.push(evidencePackage);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { pilotEvidencePackages, outbox }));
    return { pilotEvidencePackages, outbox };
  }

  async upsertProductionControlWithEvent(control, event) {
    const data = await this.read();
    const productionControls = Array.isArray(data.productionControls) ? data.productionControls : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = productionControls.findIndex((row) => row.productionControlId === control.productionControlId);
    if (index >= 0) productionControls[index] = control;
    else productionControls.push(control);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { productionControls, outbox }));
    return { productionControls, outbox };
  }

  async upsertShadowShiftReportWithEvent(report, event) {
    const data = await this.read();
    const shadowShiftReports = Array.isArray(data.shadowShiftReports) ? data.shadowShiftReports : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = shadowShiftReports.findIndex((row) => row.shadowShiftId === report.shadowShiftId);
    if (index >= 0) shadowShiftReports[index] = report;
    else shadowShiftReports.push(report);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { shadowShiftReports, outbox }));
    return { shadowShiftReports, outbox };
  }

  async upsertShadowShiftDecisionWithEvent(decision, event) {
    const data = await this.read();
    const shadowShiftDecisions = Array.isArray(data.shadowShiftDecisions) ? data.shadowShiftDecisions : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = shadowShiftDecisions.findIndex((row) => row.decisionId === decision.decisionId);
    if (index >= 0) shadowShiftDecisions[index] = decision;
    else shadowShiftDecisions.push(decision);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { shadowShiftDecisions, outbox }));
    return { shadowShiftDecisions, outbox };
  }

  async upsertOperationalStageReportWithEvent(report, event) {
    const data = await this.read();
    const operationalStageReports = Array.isArray(data.operationalStageReports) ? data.operationalStageReports : [];
    const outbox = Array.isArray(data.outbox) ? data.outbox : [];
    const index = operationalStageReports.findIndex((row) => row.operationalStageReportId === report.operationalStageReportId);
    if (index >= 0) operationalStageReports[index] = report;
    else operationalStageReports.push(report);
    if (event && !outbox.some((row) => row.eventId === event.eventId)) outbox.push(event);
    await this.write(Object.assign({}, data, { operationalStageReports, outbox }));
    return { operationalStageReports, outbox };
  }
}
