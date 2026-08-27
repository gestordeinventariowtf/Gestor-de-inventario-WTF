export class InventoryImpactLedger {
  constructor(store) {
    this.store = store;
  }

  async applyPlan(plan) {
    if (!plan || !plan.planId) throw new Error("Plan de inventario invalido.");
    const data = await this.store.read();
    const inventoryMovements = Array.isArray(data.inventoryMovements) ? data.inventoryMovements : [];
    const inventoryAlerts = Array.isArray(data.inventoryAlerts) ? data.inventoryAlerts : [];

    for (const movement of plan.movements || []) {
      if (!inventoryMovements.some((row) => row.movementId === movement.movementId)) {
        inventoryMovements.push(Object.assign({}, movement, { status: "applied" }));
      }
    }

    for (const missing of plan.missingLinks || []) {
      const alertId = `missing_${missing.saleId}_${missing.lineId}`;
      if (!inventoryAlerts.some((row) => row.alertId === alertId)) {
        inventoryAlerts.push(Object.assign({
          alertId,
          type: "missing_inventory_bridge",
          status: "open"
        }, missing));
      }
    }

    await this.store.write(Object.assign({}, data, { inventoryMovements, inventoryAlerts }));
    return { inventoryMovements, inventoryAlerts };
  }

  async reverseSaleImpact(saleId, { reversalId, lineIds = [], now = new Date() } = {}) {
    if (!saleId) throw new Error("Venta requerida para reverso de inventario.");
    if (!reversalId) throw new Error("Reverso requerido para inventario.");
    const data = await this.store.read();
    const inventoryMovements = Array.isArray(data.inventoryMovements) ? data.inventoryMovements : [];
    const selectedLineIds = new Set(lineIds);
    const sourceMovements = inventoryMovements.filter((movement) => (
      movement.saleId === saleId
      && movement.direction === "out"
      && movement.status === "applied"
      && (selectedLineIds.size === 0 || selectedLineIds.has(movement.lineId))
    ));

    for (const movement of sourceMovements) {
      const reverseMovementId = `rev_${reversalId}_${movement.movementId}`;
      if (!inventoryMovements.some((row) => row.movementId === reverseMovementId)) {
        inventoryMovements.push(Object.assign({}, movement, {
          movementId: reverseMovementId,
          reversalId,
          direction: "in",
          status: "applied",
          createdAt: now.toISOString(),
          idempotencyKey: `inventory_reverse|${reversalId}|${movement.movementId}`
        }));
      }
    }

    await this.store.write(Object.assign({}, data, { inventoryMovements }));
    return { inventoryMovements, reversed: sourceMovements.length };
  }
}
