import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.ok(
  html.includes('["Fecha", "Ticket", "ICG", "Destino WTF", "Producto WTF", "Vendidas", "Descontar", "Exist.", "Nueva", "Estado"]'),
  "Ventas ICG debe ocultar ID Mov. y mantener las columnas operativas esperadas."
);

assert.ok(
  html.includes('["ProductoMise", "ProductoICG", "CodArticulo", "Referencia", "UnidadesVendidas", "CantidadDescontar"]'),
  "Tabla externa Consumo Mise ventas debe mostrar solo las seis columnas solicitadas."
);

assert.ok(
  html.includes('"Sin Existencia / No Aplicar"'),
  "Ventas ICG debe mostrar el estado operativo para consumos sin existencia."
);

assert.ok(
  html.includes("DescontarTexto") && html.includes("ExistenciaTexto") && html.includes("ExistenciaNuevaTexto"),
  "Ventas ICG debe mostrar cantidades con unidad y existencia previa/nueva calculadas."
);

assert.ok(
  html.includes("convertPackageAwareQtyToStock(target.item || target"),
  "Ventas ICG debe respetar conversiones de unidad antes de calcular Exist. y Nueva."
);

assert.ok(
  html.includes("function getSalesConsumptionVisualGroupKey") &&
  html.includes("row.Serie ||") &&
  html.includes("row.Numero ||") &&
  html.includes("row.NumLinea ||") &&
  html.includes("row.CodAlmacen || row.CODALMACEN"),
  "Ventas ICG debe agrupar visualmente por movimiento ICG fisico, separando facturas y lineas distintas."
);

assert.ok(
  !html.includes("Producto a descontar"),
  "Ventas ICG no debe crear subfilas visuales por cada producto WTF/Mise vinculado; deben verse agrupados en una sola fila."
);

console.log("ICG sales consumption UI checks passed");
