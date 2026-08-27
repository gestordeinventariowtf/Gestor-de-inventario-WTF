import { makeEventId, makeIdempotencyKey } from "./ids.js";

const UNIT_FACTORS = {
  uni: { family: "unit", factor: 1 },
  unidad: { family: "unit", factor: 1 },
  unidades: { family: "unit", factor: 1 },
  g: { family: "mass", factor: 1 },
  gr: { family: "mass", factor: 1 },
  kg: { family: "mass", factor: 1000 },
  oz: { family: "mass", factor: 28.3495 },
  lb: { family: "mass", factor: 453.59237 },
  l: { family: "volume", factor: 1 },
  litro: { family: "volume", factor: 1 },
  galon: { family: "volume", factor: 3.78541 },
  "medio galon": { family: "volume", factor: 1.892705 }
};

export class InventoryBridgeCatalog {
  constructor(bridges = []) {
    this.bridges = bridges.map((bridge) => normalizeBridge(bridge));
  }

  activeForPosProduct(posProductId) {
    return this.bridges.filter((bridge) => bridge.active !== false && bridge.posProductId === posProductId);
  }
}

export function buildInventoryImpactPlan(sale, bridgeCatalog, { now = new Date() } = {}) {
  if (!sale || !sale.saleId || !Array.isArray(sale.lines)) throw new Error("Venta invalida para puente de inventario.");
  if (!bridgeCatalog || typeof bridgeCatalog.activeForPosProduct !== "function") {
    throw new Error("Catalogo de puentes invalido.");
  }

  const createdAt = now.toISOString();
  const movements = [];
  const missingLinks = [];

  for (const line of sale.lines) {
    const bridges = bridgeCatalog.activeForPosProduct(line.productId);
    if (bridges.length === 0) {
      missingLinks.push({
        saleId: sale.saleId,
        lineId: line.lineId,
        posProductId: line.productId,
        posProductName: line.name,
        qtySold: Number(line.qty || 0)
      });
      continue;
    }

    for (const bridge of bridges) {
      const qty = convertQuantity(Number(line.qty || 0) * bridge.qtyPerSale, bridge.sourceUnit, bridge.targetUnit);
      const movementId = makeMovementId(sale.saleId, line.lineId, bridge.bridgeId);
      movements.push({
        movementId,
        saleId: sale.saleId,
        lineId: line.lineId,
        bridgeId: bridge.bridgeId,
        posProductId: line.productId,
        posProductName: line.name,
        wtfProductId: bridge.wtfProductId,
        wtfProductName: bridge.wtfProductName || "",
        wtfArea: bridge.wtfArea,
        wtfLocation: bridge.wtfLocation,
        qty,
        unit: bridge.targetUnit,
        direction: "out",
        createdAt,
        status: "planned",
        idempotencyKey: makeIdempotencyKey(["inventory_out", sale.saleId, line.lineId, bridge.bridgeId])
      });
    }
  }

  return {
    planId: `inventory_plan_${sale.saleId}`,
    saleId: sale.saleId,
    createdAt,
    status: missingLinks.length > 0 ? "needs_mapping" : "ready",
    movements,
    missingLinks,
    event: createInventoryPlanEvent(sale, movements, missingLinks, createdAt)
  };
}

export function convertQuantity(quantity, sourceUnit, targetUnit) {
  const source = normalizeUnit(sourceUnit);
  const target = normalizeUnit(targetUnit);
  const value = Number(quantity || 0);
  if (!Number.isFinite(value)) throw new Error("Cantidad invalida para conversion.");
  if (source.key === target.key) return round4(value);
  if (source.family !== target.family) {
    throw new Error(`No se puede convertir ${sourceUnit} a ${targetUnit}.`);
  }
  return round4((value * source.factor) / target.factor);
}

function normalizeBridge(bridge) {
  if (!bridge || !bridge.bridgeId) throw new Error("Puente de inventario invalido.");
  if (!bridge.posProductId) throw new Error(`Puente ${bridge.bridgeId} sin producto POS.`);
  if (!bridge.wtfProductId) throw new Error(`Puente ${bridge.bridgeId} sin producto WTF.`);
  return Object.assign({
    wtfProductName: "",
    wtfArea: "cocina",
    wtfLocation: "mise",
    qtyPerSale: 1,
    sourceUnit: "Uni",
    targetUnit: "Uni",
    active: true
  }, bridge, {
    qtyPerSale: Number(bridge.qtyPerSale || 0)
  });
}

function normalizeUnit(unit) {
  const key = String(unit || "Uni").trim().toLowerCase();
  const found = UNIT_FACTORS[key];
  if (!found) throw new Error(`Unidad no soportada: ${unit}`);
  return Object.assign({ key }, found);
}

function makeMovementId(saleId, lineId, bridgeId) {
  return `inv_${saleId}_${lineId}_${bridgeId}`;
}

function createInventoryPlanEvent(sale, movements, missingLinks, createdAt) {
  return {
    eventId: makeEventId("inventory_impact_planned", sale.saleId),
    type: "inventory_impact_planned",
    aggregateId: sale.saleId,
    createdAt,
    sourceDeviceId: sale.deviceId,
    idempotencyKey: makeIdempotencyKey(["inventory_impact_planned", sale.saleId]),
    schemaVersion: 1,
    payload: {
      saleId: sale.saleId,
      movements,
      missingLinks
    },
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null
  };
}

function round4(value) {
  return Number(Number(value || 0).toFixed(4));
}
