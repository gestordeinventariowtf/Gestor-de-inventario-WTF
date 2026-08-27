import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { addProduct, createCart } from "../src/domain/cart.js";
import { createReceiptPrintJob } from "../src/domain/print-job.js";
import { closeSaleWithApprovedPayment } from "../src/domain/sales.js";
import { openShift } from "../src/domain/shift.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";
import { PrintJobQueue } from "../src/infrastructure/print-job-queue.js";
import { EscPosNetworkPrinterAdapter } from "../src/infrastructure/escpos-network-printer-adapter.js";
import { VirtualPaymentAdapter } from "../src/infrastructure/virtual-payment-adapter.js";
import { VirtualPrinterAdapter } from "../src/infrastructure/virtual-printer-adapter.js";
import { buildHardwareMatrix, buildRealPrinterLabPlan, runPaymentDiagnostic, runPrinterDiagnostic } from "../src/domain/pos-hardware.js";

const product = {
  id: "prod_pay",
  sku: "PAY-1",
  barcode: "7001",
  name: "Producto pago",
  price: 100,
  active: true
};

function makeCart() {
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 1 });
  return cart;
}

function makeShift() {
  return openShift({ employeeId: "emp_pay", deviceId: "pos_pay", now: new Date("2026-08-22T12:00:00.000Z") });
}

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-print-"));
  return new LocalJsonStore(path.join(dir, "store.json"));
}

test("pago virtual aprobado permite cerrar venta", async () => {
  const payment = await new VirtualPaymentAdapter({ approved: true }).authorize({
    method: "card",
    amount: 118
  });
  const { sale } = closeSaleWithApprovedPayment({
    cart: makeCart(),
    shift: makeShift(),
    paymentAttempt: payment
  });

  assert.equal(sale.status, "paid");
  assert.equal(sale.payments[0].status, "approved");
});

test("pago virtual rechazado bloquea cierre de venta", async () => {
  const payment = await new VirtualPaymentAdapter({ approved: false }).authorize({
    method: "card",
    amount: 118
  });

  assert.throws(() => closeSaleWithApprovedPayment({
    cart: makeCart(),
    shift: makeShift(),
    paymentAttempt: payment
  }), /pago no fue aprobado/);
});

test("impresora virtual imprime recibo y marca trabajo como impreso", async () => {
  const payment = await new VirtualPaymentAdapter({ approved: true }).authorize({
    method: "cash",
    amount: 118,
    received: 150
  });
  const { sale } = closeSaleWithApprovedPayment({
    cart: makeCart(),
    shift: makeShift(),
    paymentAttempt: payment
  });
  const { job, event } = createReceiptPrintJob(sale);
  const store = await makeStore();
  const queue = new PrintJobQueue(store);

  await queue.enqueue(job, event);
  const result = await queue.printNext(new VirtualPrinterAdapter({
    available: true,
    printerPolicy: { printerId: "receipt-main", enabled: true, commandSet: "escpos" }
  }));
  const data = await store.read();

  assert.equal(result.printed, 1);
  assert.ok(result.commandCount > 0);
  assert.equal(data.printJobs[0].status, "printed");
});

test("impresora virtual fallando deja trabajo en retry sin perder recibo", async () => {
  const payment = await new VirtualPaymentAdapter({ approved: true }).authorize({
    method: "cash",
    amount: 118,
    received: 150
  });
  const { sale } = closeSaleWithApprovedPayment({
    cart: makeCart(),
    shift: makeShift(),
    paymentAttempt: payment
  });
  const { job, event } = createReceiptPrintJob(sale);
  const store = await makeStore();
  const queue = new PrintJobQueue(store);

  await queue.enqueue(job, event);
  const result = await queue.printNext(new VirtualPrinterAdapter({ available: false }), {
    now: new Date("2026-08-22T12:10:00.000Z")
  });
  const data = await store.read();

  assert.equal(result.failed, 1);
  assert.equal(data.printJobs[0].status, "retry");
  assert.match(data.printJobs[0].lastError, /PRINTER_UNAVAILABLE/);
});

test("cola de impresion procesa solo la impresora solicitada", async () => {
  const payment = await new VirtualPaymentAdapter({ approved: true }).authorize({
    method: "cash",
    amount: 118,
    received: 150
  });
  const { sale } = closeSaleWithApprovedPayment({
    cart: makeCart(),
    shift: makeShift(),
    paymentAttempt: payment
  });
  const main = createReceiptPrintJob(sale, { printerId: "receipt-main", station: "Caja" });
  const bar = createReceiptPrintJob(sale, { printerId: "bar-printer", station: "Bar" });
  const store = await makeStore();
  const queue = new PrintJobQueue(store);

  await queue.enqueue(main.job, main.event);
  await queue.enqueue(bar.job, bar.event);
  const result = await queue.printNext(new VirtualPrinterAdapter({
    available: true,
    printerPolicy: { printerId: "bar-printer", enabled: true, commandSet: "escpos" }
  }), { printerId: "bar-printer" });
  const data = await store.read();

  assert.equal(result.printed, 1);
  assert.equal(data.printJobs.find((job) => job.printerId === "bar-printer").status, "printed");
  assert.equal(data.printJobs.find((job) => job.printerId === "receipt-main").status, "queued");
});

test("proveedor de pago desactivado bloquea autorizacion", async () => {
  await assert.rejects(
    () => new VirtualPaymentAdapter({
      approved: true,
      paymentPolicy: { providerId: "card-disabled", enabled: false }
    }).authorize({ method: "card", amount: 118 }),
    /Proveedor de pago desactivado/
  );
});

test("matriz de hardware resume perifericos listos y bloqueados", () => {
  const matrix = buildHardwareMatrix({
    devices: [{ deviceId: "pos_1", name: "Caja", hardwareProfileId: "profile_ok" }],
    hardwareProfiles: [
      {
        hardwareProfileId: "profile_ok",
        name: "Caja",
        printer: { printerId: "receipt-main", enabled: true, mode: "virtual" },
        payment: { providerId: "cash", enabled: true, provider: "cash", mode: "virtual" }
      },
      {
        hardwareProfileId: "profile_blocked",
        name: "Bar",
        printer: { printerId: "bar", enabled: false, mode: "virtual" },
        payment: { providerId: "card", enabled: false, provider: "card", mode: "virtual" }
      }
    ]
  });

  assert.equal(matrix.summary.profiles, 2);
  assert.equal(matrix.summary.printersReady, 1);
  assert.equal(matrix.summary.paymentsReady, 1);
  assert.equal(matrix.summary.blockers, 2);
});

test("diagnostico de perifericos devuelve estado operativo claro", () => {
  const printer = runPrinterDiagnostic({ printerId: "receipt-main", enabled: true, commandSet: "escpos" });
  const payment = runPaymentDiagnostic({ providerId: "cash", enabled: true, provider: "cash" });
  const blocked = runPrinterDiagnostic({ printerId: "off", enabled: false });

  assert.equal(printer.ok, true);
  assert.ok(printer.commandCount > 0);
  assert.equal(payment.status, "ready");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, "blocker");
});

test("laboratorio de impresora real bloquea si no esta activado explicitamente", async () => {
  const plan = buildRealPrinterLabPlan({
    printerId: "receipt-main",
    mode: "network",
    host: "127.0.0.1",
    port: 9100,
    realPrintingEnabled: false
  });
  const adapter = new EscPosNetworkPrinterAdapter({
    printerPolicy: {
      printerId: "receipt-main",
      enabled: true,
      mode: "network",
      host: "127.0.0.1",
      port: 9100,
      realPrintingEnabled: false
    }
  });

  assert.equal(plan.ready, false);
  await assert.rejects(
    () => adapter.print({
      printJobId: "print_lab_1",
      printerId: "receipt-main",
      station: "Caja",
      content: "Prueba"
    }),
    /Impresion real bloqueada/
  );
});

test("laboratorio de impresora real envia comandos ESC POS a servidor local", async () => {
  const received = [];
  const server = net.createServer((socket) => {
    socket.on("data", (chunk) => received.push(chunk));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const adapter = new EscPosNetworkPrinterAdapter({
    printerPolicy: {
      printerId: "receipt-main",
      enabled: true,
      mode: "network",
      host: "127.0.0.1",
      port,
      realPrintingEnabled: true,
      timeoutMs: 1000
    }
  });

  const result = await adapter.print({
    printJobId: "print_lab_2",
    printerId: "receipt-main",
    station: "Caja",
    content: "WTF prueba red"
  });
  await new Promise((resolve) => setTimeout(resolve, 25));
  await new Promise((resolve) => server.close(resolve));

  assert.equal(result.status, "printed");
  assert.ok(result.bytes > 0);
  assert.ok(Buffer.concat(received).includes(Buffer.from("WTF prueba red")));
});
