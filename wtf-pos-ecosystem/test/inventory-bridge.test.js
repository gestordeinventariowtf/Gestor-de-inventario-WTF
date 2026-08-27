import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addProduct, createCart } from "../src/domain/cart.js";
import { InventoryBridgeCatalog, buildInventoryImpactPlan, convertQuantity } from "../src/domain/inventory-bridge.js";
import { closeCashSale } from "../src/domain/sales.js";
import { openShift } from "../src/domain/shift.js";
import { InventoryImpactLedger } from "../src/infrastructure/inventory-impact-ledger.js";
import { LocalJsonStore } from "../src/infrastructure/local-store.js";

const product = {
  id: "pos_camarofongo",
  sku: "ICG-100",
  barcode: "100",
  name: "Camarofongo",
  price: 750,
  active: true
};

const unmappedProduct = {
  id: "pos_sin_mapa",
  sku: "ICG-999",
  barcode: "999",
  name: "Producto sin puente",
  price: 100,
  active: true
};

function makeSale(lines = [{ product, qty: 1 }]) {
  const shift = openShift({ employeeId: "emp_inv", deviceId: "pos_inv", now: new Date("2026-08-22T12:00:00.000Z") });
  let cart = createCart({ diningOption: "takeOut" });
  for (const line of lines) cart = addProduct(cart, line.product, { qty: line.qty });
  return closeCashSale({ cart, shift, cashReceived: 5000, now: new Date("2026-08-22T12:02:00.000Z") }).sale;
}

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wtf-pos-inventory-"));
  return new LocalJsonStore(path.join(dir, "store.json"));
}

test("convierte unidades con 4 decimales para inventario", () => {
  assert.equal(convertQuantity(1, "Lb", "G"), 453.5924);
  assert.equal(convertQuantity(453.59237, "G", "Lb"), 1);
  assert.equal(convertQuantity(2, "Uni", "Uni"), 2);
  assert.throws(() => convertQuantity(1, "Uni", "G"), /No se puede convertir/);
});

test("genera multiples descuentos WTF para un producto POS vendido", () => {
  const sale = makeSale();
  const bridges = new InventoryBridgeCatalog([
    {
      bridgeId: "bridge_bechamel",
      posProductId: "pos_camarofongo",
      wtfProductId: "wtf_bechamel",
      wtfProductName: "Bechamel",
      wtfArea: "cocina",
      wtfLocation: "mise",
      qtyPerSale: 120,
      sourceUnit: "G",
      targetUnit: "G"
    },
    {
      bridgeId: "bridge_camarones",
      posProductId: "pos_camarofongo",
      wtfProductId: "wtf_camarones",
      wtfProductName: "Camarones",
      wtfArea: "cocina",
      wtfLocation: "cuarto_frio",
      qtyPerSale: 0.5,
      sourceUnit: "Lb",
      targetUnit: "G"
    }
  ]);

  const plan = buildInventoryImpactPlan(sale, bridges);

  assert.equal(plan.status, "ready");
  assert.equal(plan.movements.length, 2);
  assert.equal(plan.movements[0].wtfProductName, "Bechamel");
  assert.equal(plan.movements[1].qty, 226.7962);
});

test("marca venta como pendiente de mapeo cuando no hay puente", () => {
  const sale = makeSale([{ product: unmappedProduct, qty: 2 }]);
  const plan = buildInventoryImpactPlan(sale, new InventoryBridgeCatalog([]));

  assert.equal(plan.status, "needs_mapping");
  assert.equal(plan.movements.length, 0);
  assert.equal(plan.missingLinks.length, 1);
  assert.equal(plan.missingLinks[0].posProductName, "Producto sin puente");
});

test("ledger aplica movimientos sin duplicarlos y registra alertas de mapeo", async () => {
  const sale = makeSale([{ product, qty: 1 }, { product: unmappedProduct, qty: 1 }]);
  const bridges = new InventoryBridgeCatalog([
    {
      bridgeId: "bridge_bechamel",
      posProductId: "pos_camarofongo",
      wtfProductId: "wtf_bechamel",
      qtyPerSale: 120,
      sourceUnit: "G",
      targetUnit: "G"
    }
  ]);
  const plan = buildInventoryImpactPlan(sale, bridges);
  const ledger = new InventoryImpactLedger(await makeStore());

  await ledger.applyPlan(plan);
  const result = await ledger.applyPlan(plan);

  assert.equal(result.inventoryMovements.length, 1);
  assert.equal(result.inventoryAlerts.length, 1);
  assert.equal(result.inventoryMovements[0].status, "applied");
});
