import { toCents, fromCents } from "./money.js";

export function buildDashboardSnapshot(data = {}) {
  const sales = Array.isArray(data.sales) ? data.sales : [];
  const tickets = Array.isArray(data.tickets) ? data.tickets : [];
  const outbox = Array.isArray(data.outbox) ? data.outbox : [];

  const totals = sales.reduce((acc, sale) => {
    acc.sales += 1;
    acc.subtotal += toCents(sale.totals && sale.totals.subtotal);
    acc.itbis += toCents(sale.totals && sale.totals.itbis);
    acc.ley += toCents(sale.totals && sale.totals.ley);
    acc.total += toCents(sale.totals && sale.totals.total);
    return acc;
  }, { sales: 0, subtotal: 0, itbis: 0, ley: 0, total: 0 });

  const paymentMethods = {};
  sales.forEach((sale) => {
    (Array.isArray(sale.payments) ? sale.payments : []).forEach((payment) => {
      paymentMethods[payment.method] = fromCents(toCents(paymentMethods[payment.method]) + toCents(payment.amount));
    });
  });

  return {
    salesCount: totals.sales,
    grossTotal: fromCents(totals.total),
    subtotal: fromCents(totals.subtotal),
    itbis: fromCents(totals.itbis),
    ley: fromCents(totals.ley),
    openTickets: tickets.filter((ticket) => ["open", "held"].includes(ticket.status)).length,
    paidTickets: tickets.filter((ticket) => ticket.status === "paid").length,
    outboxPending: outbox.filter((event) => event.status === "pending" || event.status === "retry").length,
    outboxSent: outbox.filter((event) => event.status === "sent").length,
    paymentMethods
  };
}
