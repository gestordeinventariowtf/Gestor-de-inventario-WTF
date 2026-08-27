export function renderReceipt(sale, { businessName = "WTF - What's That Food!" } = {}) {
  const lines = [
    businessName,
    `Venta: ${sale.saleId}`,
    `Turno: ${sale.shiftId}`,
    `Fecha: ${sale.createdAt}`,
    "--------------------------------"
  ];

  sale.lines.forEach((line) => {
    lines.push(`${line.qty} x ${line.name}`);
    if (line.notes) lines.push(`  Nota: ${line.notes}`);
    lines.push(`  RD$ ${line.totals.total.toFixed(2)}`);
  });

  lines.push("--------------------------------");
  lines.push(`Subtotal: RD$ ${sale.totals.subtotal.toFixed(2)}`);
  lines.push(`ITBIS: RD$ ${sale.totals.itbis.toFixed(2)}`);
  lines.push(`Ley: RD$ ${sale.totals.ley.toFixed(2)}`);
  lines.push(`Total: RD$ ${sale.totals.total.toFixed(2)}`);
  lines.push(`Recibido: RD$ ${sale.payments[0].received.toFixed(2)}`);
  lines.push(`Cambio: RD$ ${sale.payments[0].change.toFixed(2)}`);
  lines.push("Gracias por su compra WTFLover");

  return lines.join("\n");
}
