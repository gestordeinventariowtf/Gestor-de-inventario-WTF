import { assertPrinterEnabled, renderEscPosCommands } from "../domain/pos-hardware.js";

export class VirtualPrinterAdapter {
  constructor({ available = true, printerPolicy = {} } = {}) {
    this.available = available;
    this.printerPolicy = printerPolicy;
    this.printed = [];
  }

  async print(job) {
    if (!job || !job.printJobId) throw new Error("Trabajo de impresion invalido.");
    if (!this.available) throw new Error("PRINTER_UNAVAILABLE");
    const printer = assertPrinterEnabled(Object.assign({}, this.printerPolicy, { printerId: job.printerId || this.printerPolicy.printerId }));
    if (printer.printerId !== job.printerId) throw new Error("PRINTER_MISMATCH");
    const commands = printer.commandSet === "escpos" ? renderEscPosCommands(job) : [];
    if (!this.printed.some((row) => row.printJobId === job.printJobId)) {
      this.printed.push({
        printJobId: job.printJobId,
        saleId: job.saleId,
        printerId: job.printerId,
        station: job.station,
        content: job.content,
        commands
      });
    }
    return {
      status: "printed",
      duplicate: this.printed.filter((row) => row.printJobId === job.printJobId).length > 1,
      printJobId: job.printJobId,
      commandCount: commands.length,
      printedAt: new Date().toISOString()
    };
  }
}
