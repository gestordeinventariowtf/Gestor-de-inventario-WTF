import { fromCents, toCents } from "./money.js";

export const TAX_POLICIES = {
  dineIn: { itbis: 0.18, ley: 0.1, included: false },
  takeOut: { itbis: 0.18, ley: 0, included: false },
  delivery: { itbis: 0.18, ley: 0, included: false },
  appsDelivery: { itbis: 0.18, ley: 0, included: false }
};

export function calculateLineTotals({ qty, unitPrice, taxPolicy }) {
  const quantity = Number(qty || 0);
  if (quantity <= 0) throw new Error("La cantidad debe ser mayor que cero.");

  const policy = Object.assign({}, TAX_POLICIES.takeOut, taxPolicy || {});
  const baseCents = toCents(unitPrice) * quantity;
  const taxRate = Number(policy.itbis || 0) + Number(policy.ley || 0);

  if (policy.included && taxRate > 0) {
    const subtotalCents = Math.round(baseCents / (1 + taxRate));
    const itbisCents = Math.round(subtotalCents * Number(policy.itbis || 0));
    const leyCents = baseCents - subtotalCents - itbisCents;
    return {
      subtotal: fromCents(subtotalCents),
      itbis: fromCents(itbisCents),
      ley: fromCents(leyCents),
      total: fromCents(baseCents)
    };
  }

  const itbisCents = Math.round(baseCents * Number(policy.itbis || 0));
  const leyCents = Math.round(baseCents * Number(policy.ley || 0));
  return {
    subtotal: fromCents(baseCents),
    itbis: fromCents(itbisCents),
    ley: fromCents(leyCents),
    total: fromCents(baseCents + itbisCents + leyCents)
  };
}
