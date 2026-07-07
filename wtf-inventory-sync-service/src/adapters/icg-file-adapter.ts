import fs from "node:fs/promises";
import path from "node:path";
import { buildIdempotencyKey, movementId } from "../core/idempotency.js";
import type { ProductMapping, SyncMovement } from "../core/types.js";

interface WtfHostPackage {
  queues?: {
    icgToWeb?: Array<Record<string, unknown>>;
    webToIcg?: Array<Record<string, unknown>>;
  };
  mappings?: Array<Record<string, unknown>>;
}

function asNumber(value: unknown): number {
  const num = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

export async function readHostPackage(filePath: string): Promise<{ movements: SyncMovement[]; mappings: ProductMapping[] }> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as WtfHostPackage;
  const movements: SyncMovement[] = [];

  for (const row of parsed.queues?.icgToWeb || []) {
    const key = buildIdempotencyKey(["icg", asText(row.id), asText(row.codigo), asText(row.cantidad), asText(row.fecha)]);
    movements.push({
      id: movementId("icg-web", key),
      idempotencyKey: key,
      fecha: asText(row.fecha) || new Date().toISOString(),
      origen: "ICG FrontRest",
      destino: "Sistema Web",
      tipo: "salida",
      codigoProducto: asText(row.codigo),
      nombreProducto: asText(row.producto),
      cantidad: asNumber(row.cantidad),
      unidad: asText(row.unidad) || "Uni",
      almacen: asText(row.modulo),
      usuario: asText(row.usuario) || "ICG FrontRest",
      estado: "pendiente_revision",
      mensaje: asText(row.mensaje) || "Pendiente de revisar",
      intentos: 0,
      referencia: asText(row.id),
      raw: row
    });
  }

  for (const row of parsed.queues?.webToIcg || []) {
    const key = buildIdempotencyKey(["web", asText(row.id), asText(row.codigo), asText(row.cantidad), asText(row.fecha)]);
    movements.push({
      id: movementId("web-icg", key),
      idempotencyKey: key,
      fecha: asText(row.fecha) || new Date().toISOString(),
      origen: "Sistema Web",
      destino: "ICG FrontRest",
      tipo: "entrada",
      codigoProducto: asText(row.codigo),
      nombreProducto: asText(row.producto),
      cantidad: asNumber(row.cantidad),
      unidad: asText(row.unidad) || "Uni",
      almacen: asText(row.modulo),
      usuario: asText(row.usuario),
      estado: "pendiente_revision",
      mensaje: asText(row.mensaje) || "Pendiente de preparar importacion ICG",
      intentos: 0,
      referencia: asText(row.id),
      raw: row
    });
  }

  const mappings: ProductMapping[] = (parsed.mappings || []).map((row, index) => ({
    id: asText(row._id) || `mapping-${index}`,
    icgCode: asText(row.CodArticulo || row.codigo),
    icgName: asText(row.ProductoICG || row.nombre),
    wtfTarget: asText(row.ModuloWTF || row.destino),
    wtfProduct: asText(row.ProductoWTF || row.ProductoMise),
    unitFactor: asNumber(row.CantidadPorVenta) || 1,
    active: !["no", "false", "0"].includes(asText(row.Activo).toLowerCase()),
    notes: asText(row.Notas)
  }));

  return { movements, mappings };
}

export async function listJsonPackages(inboxDir: string): Promise<string[]> {
  await fs.mkdir(inboxDir, { recursive: true });
  const files = await fs.readdir(inboxDir);
  return files.filter((name) => name.toLowerCase().endsWith(".json")).map((name) => path.join(inboxDir, name));
}
