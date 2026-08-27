export function createPrinterPolicy(policy = {}) {
  return {
    printerId: policy.printerId || "receipt-main",
    name: policy.name || "Impresora principal",
    station: policy.station || "Caja",
    mode: policy.mode || "virtual",
    enabled: policy.enabled !== false,
    commandSet: policy.commandSet || "escpos",
    retry: policy.retry !== false,
    host: policy.host || "",
    port: Number(policy.port || 9100),
    realPrintingEnabled: policy.realPrintingEnabled === true,
    timeoutMs: Number(policy.timeoutMs || 2500)
  };
}

export function createPaymentPolicy(policy = {}) {
  return {
    providerId: policy.providerId || "cash-virtual",
    name: policy.name || "Pago virtual",
    provider: policy.provider || "cash",
    mode: policy.mode || "virtual",
    enabled: policy.enabled !== false,
    retry: policy.retry !== false,
    approvedByDefault: policy.approvedByDefault !== false
  };
}

export function renderEscPosCommands(job) {
  if (!job || !job.content) throw new Error("Trabajo de impresion invalido para ESC/POS.");
  const lines = String(job.content).split(/\r?\n/);
  return [
    { command: "INIT", hex: "1B40" },
    { command: "ALIGN_CENTER", hex: "1B6101" },
    { command: "TEXT", value: "WTF - Whats That Food" },
    { command: "ALIGN_LEFT", hex: "1B6100" },
    ...lines.map((line) => ({ command: "TEXT", value: line })),
    { command: "FEED", lines: 3, hex: "1B6403" },
    { command: "CUT", hex: "1D5600" }
  ];
}

export function assertPrinterEnabled(policy) {
  const printer = createPrinterPolicy(policy);
  if (!printer.enabled) throw new Error(`Impresora desactivada: ${printer.printerId}`);
  return printer;
}

export function assertPaymentEnabled(policy) {
  const payment = createPaymentPolicy(policy);
  if (!payment.enabled) throw new Error(`Proveedor de pago desactivado: ${payment.providerId}`);
  return payment;
}

export function buildHardwareMatrix(config = {}) {
  const profiles = Array.isArray(config.hardwareProfiles) ? config.hardwareProfiles : [];
  const devices = Array.isArray(config.devices) ? config.devices : [];
  const rows = [];
  for (const profile of profiles) {
    const profileDevices = devices.filter((device) => device.hardwareProfileId === profile.hardwareProfileId);
    const printer = createPrinterPolicy(profile.printer || {});
    const payment = createPaymentPolicy(profile.payment || {});
    rows.push({
      hardwareProfileId: profile.hardwareProfileId,
      profileName: profile.name || profile.hardwareProfileId,
      station: printer.station || profile.station || "Caja",
      devices: profileDevices.map((device) => ({
        deviceId: device.deviceId,
        name: device.name || device.deviceId,
        station: device.station || printer.station || "Caja"
      })),
      printer: hardwarePeripheralStatus({
        peripheralId: printer.printerId,
        name: printer.name,
        type: "printer",
        enabled: printer.enabled,
        mode: printer.mode,
        station: printer.station,
        commandSet: printer.commandSet
      }),
      payment: hardwarePeripheralStatus({
        peripheralId: payment.providerId,
        name: payment.name,
        type: "payment",
        enabled: payment.enabled,
        mode: payment.mode,
        station: printer.station,
        provider: payment.provider
      }),
      checklist: buildHardwareChecklist({ printer, payment, devices: profileDevices })
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    rows,
    summary: {
      profiles: rows.length,
      devices: devices.length,
      printersReady: rows.filter((row) => row.printer.status === "ready").length,
      paymentsReady: rows.filter((row) => row.payment.status === "ready").length,
      blockers: rows.flatMap((row) => row.checklist).filter((item) => item.status === "blocker").length
    }
  };
}

export function runPrinterDiagnostic(policy, { sample = "WTF TEST PRINT" } = {}) {
  const printer = createPrinterPolicy(policy);
  const job = {
    printJobId: "diagnostic_print",
    printerId: printer.printerId,
    station: printer.station,
    content: sample
  };
  try {
    assertPrinterEnabled(printer);
    if (printer.mode === "network") validateRealPrinterPolicy(printer);
    const commands = printer.commandSet === "escpos" ? renderEscPosCommands(job) : [];
    return {
      ok: true,
      peripheralId: printer.printerId,
      type: "printer",
      status: "ready",
      commandCount: commands.length,
      message: "Impresora virtual lista."
    };
  } catch (error) {
    return {
      ok: false,
      peripheralId: printer.printerId,
      type: "printer",
      status: "blocker",
      commandCount: 0,
      message: error.message
    };
  }
}

export function validateRealPrinterPolicy(policy) {
  const printer = createPrinterPolicy(policy);
  assertPrinterEnabled(printer);
  if (printer.mode !== "network") return printer;
  if (!printer.realPrintingEnabled) {
    throw new Error("Impresion real bloqueada: activar realPrintingEnabled para laboratorio.");
  }
  if (!printer.host) throw new Error("Impresion real bloqueada: host requerido.");
  if (!Number.isFinite(printer.port) || printer.port <= 0) {
    throw new Error("Impresion real bloqueada: puerto invalido.");
  }
  return printer;
}

export function buildRealPrinterLabPlan(policy = {}) {
  const printer = createPrinterPolicy(policy);
  const checks = [
    {
      item: "Modo red configurado",
      status: printer.mode === "network" ? "ready" : "warning",
      detail: printer.mode === "network" ? "Impresora por red" : "Continua en modo virtual."
    },
    {
      item: "Activacion explicita",
      status: printer.realPrintingEnabled ? "ready" : "blocker",
      detail: printer.realPrintingEnabled ? "Permitido para laboratorio" : "Impresion real desactivada."
    },
    {
      item: "Host y puerto",
      status: printer.host && printer.port ? "ready" : "blocker",
      detail: printer.host ? `${printer.host}:${printer.port}` : "Falta host."
    },
    {
      item: "Timeout seguro",
      status: printer.timeoutMs <= 5000 ? "ready" : "warning",
      detail: `${printer.timeoutMs} ms`
    }
  ];
  return {
    printerId: printer.printerId,
    mode: printer.mode,
    station: printer.station,
    ready: checks.every((check) => check.status === "ready"),
    checks
  };
}

export function runPaymentDiagnostic(policy) {
  const payment = createPaymentPolicy(policy);
  try {
    assertPaymentEnabled(payment);
    return {
      ok: true,
      peripheralId: payment.providerId,
      type: "payment",
      status: "ready",
      provider: payment.provider,
      message: "Proveedor de pago virtual listo."
    };
  } catch (error) {
    return {
      ok: false,
      peripheralId: payment.providerId,
      type: "payment",
      status: "blocker",
      provider: payment.provider,
      message: error.message
    };
  }
}

function hardwarePeripheralStatus(peripheral) {
  return Object.assign({}, peripheral, {
    status: peripheral.enabled ? "ready" : "blocker",
    lastError: peripheral.enabled ? "" : `${peripheral.type.toUpperCase()}_DISABLED`
  });
}

function buildHardwareChecklist({ printer, payment, devices }) {
  return [
    {
      item: "Dispositivo asignado",
      status: devices.length ? "ready" : "warning",
      detail: devices.length ? `${devices.length} dispositivo(s)` : "No hay tablet asignada a este perfil."
    },
    {
      item: "Impresora habilitada",
      status: printer.enabled ? "ready" : "blocker",
      detail: printer.enabled ? `${printer.name} (${printer.mode})` : `${printer.printerId} desactivada`
    },
    {
      item: "Proveedor de pago habilitado",
      status: payment.enabled ? "ready" : "blocker",
      detail: payment.enabled ? `${payment.name} (${payment.provider})` : `${payment.providerId} desactivado`
    },
    {
      item: "Modo virtual antes de hardware real",
      status: printer.mode === "virtual" && payment.mode === "virtual" ? "ready" : "warning",
      detail: "Validar con simulador antes de conectar equipos fisicos."
    }
  ];
}
