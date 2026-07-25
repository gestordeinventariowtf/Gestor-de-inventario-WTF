import { getConfig } from "./config.js";
import { syncIcgBackupConsumption } from "./adapters/icg-backup-sync-adapter.js";
import { LocalStore } from "./core/local-store.js";
import { Logger } from "./core/logger.js";
import { startDashboard } from "./dashboard/server.js";
import type { IcgBackupSyncResult } from "./core/types.js";

const config = getConfig();
const store = new LocalStore(config.dataDir);
const logger = new Logger("./logs");
let backupSyncInFlight = false;

function icgSourceDatabaseName(): string {
  return String(config.icgLiveDatabaseName || "").trim() || config.icgAuditDbName;
}

async function syncIcgBackup(): Promise<IcgBackupSyncResult> {
  if (backupSyncInFlight) {
    return {
      ok: true,
      backupPath: config.icgBackupPath,
      databaseName: icgSourceDatabaseName(),
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
    if (Array.isArray(result.movements)) {
      for (const movement of result.movements) {
        await store.upsertMovement(movement);
      }
    }
    await store.appendAudit({ accion: "icg_backup_sync", ...result });
    await logger.write("icg.log", "Backup SQL ICG sincronizado", result);
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
    await store.appendAudit({ accion: "icg_backup_sync_error", ...result });
    await logger.error("Fallo en sincronizacion de backup SQL ICG", result);
    return result;
  } finally {
    backupSyncInFlight = false;
  }
}

async function main(): Promise<void> {
  await store.init();
  await syncIcgBackup();
  startDashboard(store, config, syncIcgBackup);
  windowlessBackupPoll();
  await logger.app("Servicio iniciado", { port: config.port, mode: config.mode });
  console.log(`WTF Inventory Sync Service listo en http://127.0.0.1:${config.port}`);
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
