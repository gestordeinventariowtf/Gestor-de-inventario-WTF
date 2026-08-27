import { createPaymentPolicy, createPrinterPolicy } from "./pos-hardware.js";
import { createId } from "./ids.js";

export function createPosConfiguration(config = {}) {
  return {
    configId: config.configId || createId("pos_config"),
    discounts: {
      enabled: config.discounts?.enabled !== false,
      roleLimits: Object.assign({
        admin: { maxPercent: 100, requiresReason: true },
        manager: { maxPercent: 25, requiresReason: true },
        cashier: { maxPercent: 10, requiresReason: true }
      }, config.discounts?.roleLimits || {}),
      promotions: Array.isArray(config.discounts?.promotions) ? config.discounts.promotions : []
    },
    devices: Array.isArray(config.devices) ? config.devices : [],
    hardwareProfiles: Array.isArray(config.hardwareProfiles) ? config.hardwareProfiles : defaultHardwareProfiles(),
    updatedAt: config.updatedAt || new Date().toISOString()
  };
}

export function findPromotion(config, promotionId) {
  const normalized = createPosConfiguration(config);
  return normalized.discounts.promotions.find((promotion) => promotion.promotionId === promotionId && promotion.active !== false) || null;
}

export function calculatePromotionDiscount({ line, promotion }) {
  if (!line || !promotion) throw new Error("Promocion o linea invalida.");
  const lineSubtotal = Number(line.unitPrice || 0) * Number(line.qty || 0);
  if (lineSubtotal <= 0) return 0;
  if (promotion.type === "percent") return round4(lineSubtotal * (Number(promotion.value || 0) / 100));
  if (promotion.type === "amount") return round4(Math.min(lineSubtotal, Number(promotion.value || 0)));
  throw new Error("Tipo de promocion invalido.");
}

export function assertDiscountAllowed({ config, session, line, discountAmount, reason = "" }) {
  const normalized = createPosConfiguration(config);
  if (!normalized.discounts.enabled) throw new Error("Los descuentos estan desactivados.");
  if (!session?.role) throw new Error("Sesion POS requerida para descuento.");
  const limit = normalized.discounts.roleLimits[session.role] || { maxPercent: 0, requiresReason: true };
  const lineSubtotal = Number(line.unitPrice || 0) * Number(line.qty || 0);
  const percent = lineSubtotal > 0 ? (Number(discountAmount || 0) / lineSubtotal) * 100 : 0;
  if (percent > Number(limit.maxPercent || 0)) {
    throw new Error(`Descuento excede limite del rol ${session.role}.`);
  }
  if (limit.requiresReason && !String(reason || "").trim()) {
    throw new Error("Motivo requerido para descuento.");
  }
  return {
    maxPercent: Number(limit.maxPercent || 0),
    discountPercent: round4(percent)
  };
}

export function resolveDeviceProfile(config, deviceId) {
  const normalized = createPosConfiguration(config);
  const device = normalized.devices.find((row) => row.deviceId === deviceId) || {
    deviceId,
    name: "Dispositivo POS",
    station: "Caja",
    hardwareProfileId: "default"
  };
    const hardwareProfile = normalized.hardwareProfiles.find((row) => row.hardwareProfileId === device.hardwareProfileId)
    || normalized.hardwareProfiles[0]
    || defaultHardwareProfiles()[0];
  return {
    device,
    hardwareProfile,
    printer: createPrinterPolicy(hardwareProfile.printer || { enabled: false, mode: "virtual" }),
    payment: createPaymentPolicy(hardwareProfile.payment || { enabled: false, mode: "virtual" })
  };
}

function defaultHardwareProfiles() {
  return [
    {
      hardwareProfileId: "default",
      name: "Virtual seguro",
      printer: {
        printerId: "receipt-main",
        enabled: true,
        mode: "virtual",
        station: "Caja",
        retry: true
      },
      payment: {
        providerId: "cash-virtual",
        enabled: true,
        mode: "virtual",
        provider: "cash",
        retry: true
      }
    }
  ];
}

function round4(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}
