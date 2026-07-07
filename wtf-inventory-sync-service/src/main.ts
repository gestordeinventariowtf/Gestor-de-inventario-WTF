import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { listJsonPackages, readHostPackage } from "./adapters/icg-file-adapter.js";
import { LocalStore } from "./core/local-store.js";
import { Logger } from "./core/logger.js";
import { startDashboard } from "./dashboard/server.js";

const config = getConfig();
const store = new LocalStore("./data");
const logger = new Logger("./logs");

async function syncNow(): Promise<void> {
  await fs.mkdir(config.icgExportDir, { recursive: true });
  await fs.mkdir(config.icgImportDir, { recursive: true });
  const packages = await listJsonPackages(config.icgExportDir);
  for (const filePath of packages) {
    try {
      const parsed = await readHostPackage(filePath);
      if (parsed.mappings.length) await store.replaceMappings(parsed.mappings);
      for (const movement of parsed.movements) {
        await store.upsertMovement(movement);
      }
      const processedDir = path.resolve("./data/processed");
      await fs.mkdir(processedDir, { recursive: true });
      await fs.rename(filePath, path.join(processedDir, path.basename(filePath)));
      await logger.write("icg.log", "Paquete ICG Host procesado", { filePath });
    } catch (error) {
      await logger.error("No se pudo procesar paquete ICG Host", { filePath, error: error instanceof Error ? error.message : error });
    }
  }
}

async function main(): Promise<void> {
  await store.init();
  await syncNow();
  startDashboard(store, config, syncNow);
  await logger.app("Servicio iniciado", { port: config.port, mode: config.mode });
  console.log(`WTF Inventory Sync Service listo en http://127.0.0.1:${config.port}`);
}

main().catch(async (error) => {
  await logger.error("Fallo al iniciar servicio", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
