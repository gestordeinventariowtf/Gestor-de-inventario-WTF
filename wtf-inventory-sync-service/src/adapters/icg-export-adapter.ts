import fs from "node:fs/promises";
import path from "node:path";
import type { SyncMovement } from "../core/types.js";

export async function exportMovementsForIcg(outDir: string, movements: SyncMovement[]): Promise<string> {
  await fs.mkdir(outDir, { recursive: true });
  const safeDate = new Date().toISOString().slice(0, 10);
  const filePath = path.join(outDir, `wtf-web-entradas-para-icg-${safeDate}.csv`);
  const header = "id,codigoProducto,nombreProducto,cantidad,unidad,almacen,fecha,usuario,referencia\n";
  const lines = movements
    .filter((movement) => movement.destino === "ICG FrontRest" && movement.tipo === "entrada")
    .map((movement) => [
      movement.id,
      movement.codigoProducto,
      movement.nombreProducto,
      movement.cantidad,
      movement.unidad,
      movement.almacen,
      movement.fecha,
      movement.usuario || "",
      movement.referencia || ""
    ].map(csv).join(","));
  await fs.writeFile(filePath, header + lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  return filePath;
}

function csv(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
