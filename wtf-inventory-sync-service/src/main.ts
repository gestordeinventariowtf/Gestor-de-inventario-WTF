import { getConfig } from "./config.js";
import { syncIcgBackupConsumption } from "./adapters/icg-backup-sync-adapter.js";
import { LocalStore } from "./core/local-store.js";
import { Logger } from "./core/logger.js";
import { startDashboard } from "./dashboard/server.js";
import type { IcgBackupSyncResult } from "./core/types.js";

const config = getConfig();
const store = new LocalStore(config.dataDir);
const logger = new Logger("./logs");
let backupSyncInFlight: Promise<IcgBackupSyncResult> | null = null;

function icgSourceDatabaseName(): string {
  return String(config.icgLiveDatabaseName || "").trim() || "FRS_WTFOODVZL";
}

async function syncIcgBackup(): Promise<IcgBackupSyncResult> {
  if (backupSyncInFlight) return backupSyncInFlight;
  backupSyncInFlight = (async () => {
    try {
    const result = await syncIcgBackupConsumption(config, await store.cancelledKeys());
    // Una lectura correcta sin líneas nuevas no significa que la cola histórica
    // deba borrarse. Solo reemplazar la vista cuando llegaron movimientos reales.
    if (Array.isArray(result.movements) && result.movements.length > 0 && !result.preserveLocalIcgQueue) {
      await store.replaceIcgPreviewMovements(result.movements);
    }
    await store.appendAudit({ accion: "icg_catalog_sync", ...result });
    await logger.write("icg.log", "Catalogos SQL ICG sincronizados", result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result: IcgBackupSyncResult = {
      ok: false,
      backupPath: config.icgBackupPath,
      databaseName: icgSourceDatabaseName(),
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      pending: 0,
      errors: [message],
      message
    };
    await store.appendAudit({ accion: "icg_catalog_sync_error", ...result });
    await logger.error("Fallo en actualizacion de catalogos SQL ICG", result);
    return result;
    } finally {
      backupSyncInFlight = null;
    }
  })();
  return backupSyncInFlight;
}

async function main(): Promise<void> {
  await store.init();
  const server = startDashboard(store, config, syncIcgBackup);
  server.on("error", async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    await logger.error("Fallo al abrir panel local del Host", {
      port: config.port,
      message
    });
    console.error(`No se pudo abrir http://127.0.0.1:${config.port}: ${message}`);
  });
  windowlessBackupPoll();
  await logger.app("Servicio iniciado", { port: config.port, mode: config.mode });
  console.log(`WTF Inventory Sync Service listo en http://127.0.0.1:${config.port}`);
  syncIcgBackup().catch((error) => logger.error("Fallo en sincronizacion inicial SQL ICG", error instanceof Error ? error.message : error));
}

function windowlessBackupPoll(): void {
  if (config.mode !== "automatico") {
    void logger.write("icg.log", "Modo manual activo: no se inicia sincronizacion programada", { mode: config.mode });
    return;
  }
  setInterval(() => {
    syncIcgBackup().catch((error) => logger.error("Fallo en actualizacion programada de catalogos SQL ICG", error instanceof Error ? error.message : error));
  }, config.icgBackupPollSeconds * 1000);
}

main().catch(async (error) => {
  await logger.error("Fallo al iniciar servicio", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
