import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ServiceConfig } from "./core/types.js";

loadEnv();

function bool(value: string | undefined): boolean {
  return ["1", "true", "yes", "si"].includes(String(value || "").toLowerCase());
}

export function getConfig(): ServiceConfig {
  return {
    port: Number(process.env.WTF_HOST_PORT || 8787),
    webAppUrl: process.env.WTF_WEB_APP_URL || "https://gestor-de-inventario-wtf-prod-2026.web.app",
    apiKey: process.env.WTF_API_KEY || "",
    branch: process.env.WTF_BRANCH || "principal",
    defaultWarehouse: process.env.WTF_DEFAULT_WAREHOUSE || "1",
    mode: process.env.WTF_MODE === "automatico" ? "automatico" : "manual",
    icgExportDir: path.resolve(process.env.ICG_EXPORT_DIR || "./data/inbox"),
    icgImportDir: path.resolve(process.env.ICG_IMPORT_DIR || "./data/outbox"),
    sqlEnabled: bool(process.env.ICG_SQL_ENABLED)
  };
}
