import net from "node:net";
import { renderEscPosCommands, validateRealPrinterPolicy } from "../domain/pos-hardware.js";

export class EscPosNetworkPrinterAdapter {
  constructor({ printerPolicy = {} } = {}) {
    this.printerPolicy = printerPolicy;
    this.printed = [];
  }

  async print(job) {
    if (!job || !job.printJobId) throw new Error("Trabajo de impresion invalido.");
    const printer = validateRealPrinterPolicy(Object.assign({}, this.printerPolicy, {
      printerId: job.printerId || this.printerPolicy.printerId
    }));
    if (printer.printerId !== job.printerId) throw new Error("PRINTER_MISMATCH");
    const commands = renderEscPosCommands(job);
    const payload = escPosCommandsToBuffer(commands);
    await sendToNetworkPrinter({
      host: printer.host,
      port: printer.port,
      timeoutMs: printer.timeoutMs,
      payload
    });
    this.printed.push({
      printJobId: job.printJobId,
      saleId: job.saleId,
      printerId: job.printerId,
      station: job.station,
      bytes: payload.length,
      commandCount: commands.length
    });
    return {
      status: "printed",
      printJobId: job.printJobId,
      printerId: job.printerId,
      commandCount: commands.length,
      bytes: payload.length,
      printedAt: new Date().toISOString()
    };
  }
}

export function escPosCommandsToBuffer(commands = []) {
  const chunks = [];
  for (const command of commands) {
    if (command.hex) chunks.push(Buffer.from(command.hex, "hex"));
    if (command.command === "TEXT") chunks.push(Buffer.from(`${command.value || ""}\n`, "utf8"));
  }
  return Buffer.concat(chunks);
}

function sendToNetworkPrinter({ host, port, timeoutMs, payload }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };
    socket.setTimeout(timeoutMs, () => finish(new Error("PRINTER_NETWORK_TIMEOUT")));
    socket.once("error", (error) => finish(new Error(`PRINTER_NETWORK_ERROR: ${error.message}`)));
    socket.once("connect", () => {
      socket.write(payload, (error) => {
        if (error) finish(new Error(`PRINTER_WRITE_ERROR: ${error.message}`));
        else finish();
      });
    });
  });
}
