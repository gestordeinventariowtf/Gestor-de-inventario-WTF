import { createPrintEvent, markPrintJobPrinted, markPrintJobRetry } from "../domain/print-job.js";

export class PrintJobQueue {
  constructor(store, { maxAttempts = 5 } = {}) {
    this.store = store;
    this.maxAttempts = maxAttempts;
  }

  async enqueue(job, event) {
    return this.store.upsertPrintJobWithEvent(job, event);
  }

  async pendingJobs({ printerId = "" } = {}) {
    const data = await this.store.read();
    return (Array.isArray(data.printJobs) ? data.printJobs : [])
      .filter((job) => ["queued", "retry"].includes(job.status) && Number(job.attempts || 0) < this.maxAttempts)
      .filter((job) => !printerId || job.printerId === printerId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  async printNext(printerAdapter, { now = new Date(), printerId = "" } = {}) {
    const pending = await this.pendingJobs({ printerId });
    if (pending.length === 0) return { printed: 0, failed: 0 };

    const job = pending[0];
    try {
      const result = await printerAdapter.print(job);
      const printed = markPrintJobPrinted(job, { printedAt: result.printedAt || now.toISOString() });
      await this.store.upsertPrintJobWithEvent(printed, createPrintEvent("print_job_printed", printed, printed.updatedAt));
      return {
        printed: 1,
        failed: 0,
        printJobId: job.printJobId,
        printerId: job.printerId,
        commandCount: result.commandCount || 0
      };
    } catch (error) {
      const retry = markPrintJobRetry(job, error.message, { now });
      await this.store.upsertPrintJobWithEvent(retry, createPrintEvent("print_job_retry", retry, retry.updatedAt));
      return { printed: 0, failed: 1, printJobId: job.printJobId, error: error.message };
    }
  }
}
