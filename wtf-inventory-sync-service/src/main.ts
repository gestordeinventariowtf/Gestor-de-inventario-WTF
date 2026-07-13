import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { applyCmsLinesToFirestore } from "./adapters/firestore-sync-adapter.js";
import { exportMovementsForIcg } from "./adapters/icg-export-adapter.js";
import { findLatestCmsFile, getCmsFingerprint, readCmsImportData, readCmsTicketLines } from "./adapters/icg-cms-adapter.js";
import { syncIcgBackupConsumption } from "./adapters/icg-backup-sync-adapter.js";
import { listJsonPackages, parseHostPackageText, readHostPackage } from "./adapters/icg-file-adapter.js";
import { LocalStore } from "./core/local-store.js";
import { Logger } from "./core/logger.js";
import { startDashboard } from "./dashboard/server.js";
import type { CmsImportResult, IcgBackupSyncResult, ImportResult } from "./core/types.js";

const config = getConfig();
const store = new LocalStore(config.dataDir);
const logger = new Logger("./logs");
let syncInFlight = false;
let backupSyncInFlight = false;

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
    if (config.mode === "automatico" && movement.estado !== "error") {
      movement.estado = "aprobado";
      movement.mensaje = "Aprobado automaticamente por WTF ICG Host.";
    }
    const upsert = await store.upsertMovement(movement);
    if (upsert.inserted) result.inserted += 1;
    else result.duplicated += 1;
  }
  await store.appendAudit({ accion: "package_imported", filePath: filePath || "api", ...result });
  return result;
}

async function exportApprovedIcgEntries(): Promise<{ exported: number; filePath?: string; message: string }> {
  if (!config.autoExportIcg) {
    return { exported: 0, message: "Exportacion automatica hacia ICG desactivada." };
  }
  const data = await store.read();
  const selected = data.movements.filter((row) => row.estado === "aprobado" && row.destino === "ICG FrontRest" && row.tipo === "entrada");
  if (!selected.length) {
    return { exported: 0, message: "Sin entradas aprobadas para exportar hacia ICG." };
  }
  const filePath = await exportMovementsForIcg(config.icgImportDir, selected);
  await store.updateMovementStates(selected.map((row) => row.id), "procesando", "Exportado automaticamente para ICG FrontRest.");
  await logger.write("icg.log", "Entradas exportadas automaticamente para ICG", { filePath, exported: selected.length });
  return { exported: selected.length, filePath, message: "Entradas exportadas automaticamente para ICG." };
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

async function syncLatestIcgCms(): Promise<CmsImportResult> {
  const empty: CmsImportResult = { ok: true, totalLines: 0, matched: 0, applied: 0, skipped: 0, errors: [], message: "Sin CMS nuevo para procesar." };
  if (!config.autoApplyIcgCms) {
    return { ...empty, message: "Importacion automatica CMS desactivada." };
  }
  const filePath = await findLatestCmsFile(config.icgCmsDir);
  if (!filePath) {
    return { ...empty, message: `No hay archivos .cms en ${config.icgCmsDir}.` };
  }
  return processCmsFile(filePath, "CMS ICG automatico");
}

async function processCmsFile(filePath: string, sourceLabel: string): Promise<CmsImportResult> {
  const fingerprint = await getCmsFingerprint(filePath);
  const importData = await readCmsImportData(filePath).catch((error) => {
    logger.error("No se pudieron leer tablas CMS para interfaz", error instanceof Error ? error.message : error);
    return null;
  });
  if (await store.hasProcessedCms(fingerprint.fingerprint)) {
    return {
      ok: true,
      filePath,
      fileName: fingerprint.fileName,
      fingerprint: fingerprint.fingerprint,
      datasets: importData?.datasets,
      tableCounts: importData?.tableCounts,
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      errors: [],
      message: "Este CMS ya fue procesado anteriormente."
    };
  }
  try {
    const parsed = await readCmsTicketLines(filePath);
    const result = await applyCmsLinesToFirestore(config, parsed.lines, parsed.fingerprint, parsed.fileName, filePath);
    result.datasets = importData?.datasets;
    result.tableCounts = importData?.tableCounts;
    await store.markProcessedCms({
      fingerprint: parsed.fingerprint,
      fileName: parsed.fileName,
      filePath,
      processedAt: new Date().toISOString(),
      status: result.ok ? "applied" : "error",
      message: result.message
    });
    await logger.write("icg.log", `${sourceLabel} procesado`, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result: CmsImportResult = {
      ok: false,
      filePath,
      fileName: fingerprint.fileName,
      fingerprint: fingerprint.fingerprint,
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      errors: [message],
      message
    };
    await store.markProcessedCms({
      fingerprint: fingerprint.fingerprint,
      fileName: fingerprint.fileName,
      filePath,
      processedAt: new Date().toISOString(),
      status: "error",
      message
    });
    await logger.error(`No se pudo procesar ${sourceLabel}`, result);
    return result;
  }
}

async function importManualCmsFile(fileName: string, base64: string): Promise<CmsImportResult> {
  if (!fileName.toLowerCase().endsWith(".cms")) {
    throw new Error("Solo se permite importar documentos .cms.");
  }
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    throw new Error("El documento .cms esta vacio.");
  }
  const maxBytes = 100 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error("El documento .cms supera el limite de 100 MB.");
  }
  const manualDir = path.join(config.dataDir, "manual-cms");
  await fs.mkdir(manualDir, { recursive: true });
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(manualDir, `${Date.now()}-${safeName}`);
  await fs.writeFile(filePath, buffer);
  await logger.write("icg.log", "CMS manual recibido desde panel local", { filePath, fileName, bytes: buffer.length });
  return processCmsFile(filePath, "CMS manual");
}

async function syncIcgBackup(): Promise<IcgBackupSyncResult> {
  if (backupSyncInFlight) {
    return {
      ok: true,
      backupPath: config.icgBackupPath,
      databaseName: config.icgAuditDbName,
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      pending: 0,
      errors: [],
      message: "La sincronizacion del backup ICG ya esta en curso."
    };
  }
  backupSyncInFlight = true;
  try {
    const result = await syncIcgBackupConsumption(config);
    await store.appendAudit({ accion: "icg_backup_sync", ...result });
    await logger.write("icg.log", "Backup SQL ICG sincronizado", result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result: IcgBackupSyncResult = {
      ok: false,
      backupPath: config.icgBackupPath,
      databaseName: config.icgAuditDbName,
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      pending: 0,
      errors: [message],
      message
    };
    await store.appendAudit({ accion: "icg_backup_sync_error", ...result });
    await logger.error("Fallo en sincronizacion de backup SQL ICG", result);
    return result;
  } finally {
    backupSyncInFlight = false;
  }
}

async function main(): Promise<void> {
  await store.init();
  await syncNow();
  await syncLatestIcgCms();
  await syncIcgBackup();
  await exportApprovedIcgEntries();
  startDashboard(store, config, syncNow, ingestHostPackageJson, syncLatestIcgCms, importManualCmsFile, syncIcgBackup);
  windowlessPoll();
  windowlessBackupPoll();
  await logger.app("Servicio iniciado", { port: config.port, mode: config.mode });
  console.log(`WTF Inventory Sync Service listo en http://127.0.0.1:${config.port}`);
}

function windowlessPoll(): void {
  setInterval(() => {
    syncNow().catch((error) => logger.error("Fallo en sincronizacion programada", error instanceof Error ? error.message : error));
    syncLatestIcgCms().catch((error) => logger.error("Fallo en importacion CMS ICG", error instanceof Error ? error.message : error));
    exportApprovedIcgEntries().catch((error) => logger.error("Fallo en exportacion automatica ICG", error instanceof Error ? error.message : error));
  }, config.pollSeconds * 1000);
}

function windowlessBackupPoll(): void {
  setInterval(() => {
    syncIcgBackup().catch((error) => logger.error("Fallo en sincronizacion programada de backup SQL ICG", error instanceof Error ? error.message : error));
  }, config.icgBackupPollSeconds * 1000);
}

main().catch(async (error) => {
  await logger.error("Fallo al iniciar servicio", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
