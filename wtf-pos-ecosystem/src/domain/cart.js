import { createId } from "./ids.js";
import { toCents, fromCents } from "./money.js";
import { calculateLineTotals, TAX_POLICIES } from "./taxes.js";

export function createCart({ diningOption = "takeOut" } = {}) {
  return {
    cartId: createId("cart"),
    diningOption,
    lines: []
  };
}

export function addProduct(cart, product, { qty = 1, notes = "" } = {}) {
  if (!cart) throw new Error("Carrito invalido.");
  if (!product || !product.id) throw new Error("Producto invalido.");
  if (product.active === false) throw new Error("Producto no disponible.");

  const policy = Object.assign({}, TAX_POLICIES[cart.diningOption] || TAX_POLICIES.takeOut, product.taxPolicy || {});
  const line = {
    lineId: createId("line"),
    productId: product.id,
    sku: product.sku || "",
    barcode: product.barcode || "",
    name: product.name,
    qty: Number(qty),
    unitPrice: Number(product.price || 0),
    notes,
    taxPolicySnapshot: policy
  };

  return Object.assign({}, cart, { lines: cart.lines.concat(line) });
}

export function calculateCart(cart) {
  const lineTotals = cart.lines.map((line) => calculateLineTotals({
    qty: line.qty,
    unitPrice: effectiveUnitPrice(line),
    taxPolicy: line.taxPolicySnapshot
  }));

  const totals = lineTotals.reduce((acc, line) => {
    acc.subtotal += toCents(line.subtotal);
    acc.itbis += toCents(line.itbis);
    acc.ley += toCents(line.ley);
    acc.total += toCents(line.total);
    return acc;
  }, { subtotal: 0, itbis: 0, ley: 0, total: 0 });

  return {
    lines: cart.lines.map((line, index) => Object.assign({}, line, {
      effectiveUnitPrice: effectiveUnitPrice(line),
      discountAmount: Number(line.discountAmount || 0),
      totals: lineTotals[index]
    })),
    totals: {
      subtotal: fromCents(totals.subtotal),
      itbis: fromCents(totals.itbis),
      ley: fromCents(totals.ley),
      total: fromCents(totals.total)
    }
  };
}

export function applyLineDiscount(cart, lineId, { discountAmount = 0, reason = "", ruleId = "", actorUserId = "" } = {}) {
  if (!cart) throw new Error("Carrito invalido.");
  const amount = Number(discountAmount || 0);
  if (amount < 0) throw new Error("Descuento invalido.");
  let found = false;
  const lines = cart.lines.map((line) => {
    if (line.lineId !== lineId) return line;
    found = true;
    const maxDiscount = Number(line.unitPrice || 0) * Number(line.qty || 0);
    if (amount > maxDiscount) throw new Error("Descuento mayor que el importe de la linea.");
    return Object.assign({}, line, {
      discountAmount: amount,
      discountReason: reason,
      discountRuleId: ruleId,
      discountActorUserId: actorUserId
    });
  });
  if (!found) throw new Error("Linea no encontrada para descuento.");
  return Object.assign({}, cart, { lines });
}

function effectiveUnitPrice(line) {
  const qty = Number(line.qty || 0);
  const totalDiscount = Number(line.discountAmount || 0);
  if (qty <= 0) return Number(line.unitPrice || 0);
  return Math.max(0, Number(line.unitPrice || 0) - (totalDiscount / qty));
}
