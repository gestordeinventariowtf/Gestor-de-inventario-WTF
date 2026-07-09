import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { listJsonPackages, parseHostPackageText, readHostPackage } from "./adapters/icg-file-adapter.js";
import { LocalStore } from "./core/local-store.js";
import { Logger } from "./core/logger.js";
import { startDashboard } from "./dashboard/server.js";
import type { ImportResult } from "./core/types.js";

const config = getConfig();
const store = new LocalStore(config.dataDir);
const logger = new Logger("./logs");
let syncInFlight = false;

async function importParsedPackage(filePath: string | undefined, parsed: Awaited<ReturnType<typeof readHostPackage>>): Promise<ImportResult> {
  const result: ImportResult = { filePath, inserted: 0, duplicated: 0, mappings: 0, errors: [] };
  if (parsed.mappings.length) {
    await store.replaceMappings(parsed.mappings);
    result.mappings = parsed.mappings.length;
  }
  for (const movement of parsed.movements) {
    if (!movement.codigoProducto) {
      movement.estado = "error";
      movement.mensaje = "Movimiento sin CodArticulo. Debe mapearse antes de sincronizar.";
    }
    if (!movement.nombreProducto) {
      movement.estado = "error";
      movement.mensaje = "Movimiento sin nombre de producto.";
    }
    if (!Number.isFinite(movement.cantidad) || movement.cantidad <= 0) {
      movement.estado = "error";
      movement.mensaje = "Movimiento con cantidad invalida.";
    }
    const upsert = await store.upsertMovement(movement);
    if (upsert.inserted) result.inserted += 1;
    else result.duplicated += 1;
  }
  await store.appendAudit({ accion: "package_imported", filePath: filePath || "api", ...result });
  return result;
}

export async function ingestHostPackageJson(raw: string): Promise<ImportResult> {
  return importParsedPackage(undefined, parseHostPackageText(raw));
}

async function moveFileSafe(filePath: string, targetDir: string): Promise<string> {
  await fs.mkdir(targetDir, { recursive: true });
  const parsed = path.parse(filePath);
  const target = path.join(targetDir, `${parsed.name}-${Date.now()}${parsed.ext}`);
  await fs.rename(filePath, target);
  return target;
}

async function syncNow(): Promise<ImportResult[]> {
  if (syncInFlight) return [];
  syncInFlight = true;
  const results: ImportResult[] = [];
  await fs.mkdir(config.icgExportDir, { recursive: true });
  await fs.mkdir(config.icgImportDir, { recursive: true });
  try {
    const packages = await listJsonPackages(config.icgExportDir);
    for (const filePath of packages) {
      try {
        const parsed = await readHostPackage(filePath);
        const result = await importParsedPackage(filePath, parsed);
        results.push(result);
        const processedPath = await moveFileSafe(filePath, config.processedDir);
        await logger.write("icg.log", "Paquete ICG Host procesado", { filePath, processedPath, result });
      } catch (error) {
        const quarantinePath = await moveFileSafe(filePath, config.quarantineDir).catch(() => "");
        const message = error instanceof Error ? error.message : String(error);
        results.push({ filePath, inserted: 0, duplicated: 0, mappings: 0, errors: [message] });
        await logger.error("No se pudo procesar paquete ICG Host", { filePath, quarantinePath, error: message });
      }
    }
    return results;
  } finally {
    syncInFlight = false;
  }
}

async function main(): Promise<void> {
  await store.init();
  await syncNow();
  startDashboard(store, config, syncNow, ingestHostPackageJson);
  windowlessPoll();
  await logger.app("Servicio iniciado", { port: config.port, mode: config.mode });
  console.log(`WTF Inventory Sync Service listo en http://127.0.0.1:${config.port}`);
}

function windowlessPoll(): void {
  setInterval(() => {
    syncNow().catch((error) => logger.error("Fallo en sincronizacion programada", error instanceof Error ? error.message : error));
  }, config.pollSeconds * 1000);
}

main().catch(async (error) => {
  await logger.error("Fallo al iniciar servicio", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
