import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ServiceConfig } from "./core/types.js";

loadEnv();

function bool(value: string | undefined): boolean {
  return ["1", "true", "yes", "si"].includes(String(value || "").toLowerCase());
}

export function getConfig(): ServiceConfig {
  const dataDir = path.resolve(process.env.WTF_DATA_DIR || "./data");
  return {
    port: Number(process.env.WTF_HOST_PORT || 8787),
    webAppUrl: process.env.WTF_WEB_APP_URL || "https://gestor-de-inventario-wtf-prod-2026.web.app",
    apiKey: process.env.WTF_API_KEY || "",
    branch: process.env.WTF_BRANCH || "principal",
    defaultWarehouse: process.env.WTF_DEFAULT_WAREHOUSE || "1",
    mode: process.env.WTF_MODE === "automatico" ? "automatico" : "manual",
    pollSeconds: Math.max(5, Number(process.env.WTF_POLL_SECONDS || 30)),
    dataDir,
    icgExportDir: path.resolve(process.env.ICG_EXPORT_DIR || path.join(dataDir, "inbox")),
    icgImportDir: path.resolve(process.env.ICG_IMPORT_DIR || path.join(dataDir, "outbox")),
    processedDir: path.resolve(process.env.WTF_PROCESSED_DIR || path.join(dataDir, "processed")),
    quarantineDir: path.resolve(process.env.WTF_QUARANTINE_DIR || path.join(dataDir, "quarantine")),
    sqlEnabled: bool(process.env.ICG_SQL_ENABLED),
    sqlConnectionString: process.env.ICG_SQL_CONNECTION_STRING || ""
  };
}
