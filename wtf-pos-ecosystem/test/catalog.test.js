import test from "node:test";
import assert from "node:assert/strict";
import { BarcodeLookupService, ProductCatalog } from "../src/domain/catalog.js";

const catalog = new ProductCatalog([
  { id: "prod_1", sku: "WTF-001", barcode: "100001", name: "Limón Agrio", price: 25, categoryId: "bar" },
  { id: "prod_2", sku: "WTF-002", barcode: "100002", name: "Mozzarella Sticks", price: 350, categoryId: "cocina" },
  { id: "prod_3", sku: "WTF-003", barcode: "100003", name: "Naranja Bar", price: 80, categoryId: "bar" },
  { id: "prod_4", sku: "OLD-001", barcode: "900001", name: "Producto Archivado", price: 1, archived: true }
]);

test("busca productos ignorando acentos y mayusculas", () => {
  const result = catalog.search("limon");
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "prod_1");
});

test("no devuelve productos archivados", () => {
  assert.equal(catalog.search("archivado").length, 0);
  assert.equal(catalog.lookupBarcode("900001"), null);
});

test("resuelve barcode, sku y busqueda parcial desde un solo servicio", () => {
  const lookup = new BarcodeLookupService(catalog);

  assert.equal(lookup.resolve("100002").type, "barcode");
  assert.equal(lookup.resolve("WTF-003").product.id, "prod_3");

  const partial = lookup.resolve("mozza");
  assert.equal(partial.type, "name");
  assert.equal(partial.product.id, "prod_2");
});
