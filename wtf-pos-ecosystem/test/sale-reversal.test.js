import test from "node:test";
import assert from "node:assert/strict";
import { addProduct, createCart } from "../src/domain/cart.js";
import { refundSaleLines, voidSale } from "../src/domain/sale-reversal.js";
import { closeCashSale } from "../src/domain/sales.js";
import { openShift } from "../src/domain/shift.js";

const product = { id: "prod_void", name: "Producto reverso", price: 100, active: true };

function makeSale() {
  const shift = openShift({ employeeId: "emp_void", deviceId: "pos_void" });
  let cart = createCart({ diningOption: "takeOut" });
  cart = addProduct(cart, product, { qty: 2 });
  return closeCashSale({ cart, shift, cashReceived: 300 }).sale;
}

const actor = { userId: "user_admin", name: "Admin" };

test("anula venta sin borrar la venta original", () => {
  const sale = makeSale();
  const result = voidSale(sale, { actor, reason: "Error de digitacion" });

  assert.equal(result.sale.status, "voided");
  assert.equal(result.reversal.type, "void");
  assert.equal(result.reversal.lines.length, 1);
  assert.equal(result.event.type, "sale_voided");
});

test("devolucion parcial calcula monto proporcional", () => {
  const sale = makeSale();
  const result = refundSaleLines(sale, [{ lineId: sale.lines[0].lineId, qty: 1 }], {
    actor,
    reason: "Cliente devolvio una unidad"
  });

  assert.equal(result.sale.status, "partially_refunded");
  assert.equal(result.reversal.type, "refund");
  assert.equal(result.reversal.lines[0].qty, 1);
  assert.equal(result.reversal.totals.total, 118);
});

test("reverso requiere motivo valido", () => {
  assert.throws(() => voidSale(makeSale(), { actor }), /Motivo requerido/);
  assert.throws(() => refundSaleLines(makeSale(), [], { actor, reason: "x" }), /Lineas de devolucion/);
});
