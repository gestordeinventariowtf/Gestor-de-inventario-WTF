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
    firebaseProjectId: process.env.WTF_FIREBASE_PROJECT_ID || "gestor-de-inventario-wtf-29056",
    firebaseCollection: process.env.WTF_FIREBASE_COLLECTION || "wtfSistema",
    firebaseDocumentId: process.env.WTF_FIREBASE_DOCUMENT_ID || "estadoGeneral",
    autoApplyIcgCms: process.env.WTF_AUTO_APPLY_ICG_CMS !== "false",
    autoExportIcg: process.env.WTF_AUTO_EXPORT_ICG !== "false",
    autoApplyIcgBackup: process.env.WTF_AUTO_APPLY_ICG_BACKUP !== "false",
    apiKey: process.env.WTF_API_KEY || "",
    branch: process.env.WTF_BRANCH || "principal",
    defaultWarehouse: process.env.WTF_DEFAULT_WAREHOUSE || "1",
    mode: process.env.WTF_MODE === "automatico" ? "automatico" : "manual",
    pollSeconds: Math.max(5, Number(process.env.WTF_POLL_SECONDS || 30)),
    dataDir,
    icgCmsDir: path.resolve(process.env.ICG_CMS_DIR || "C:\\ICG EXPORTACION"),
    icgExportDir: path.resolve(process.env.ICG_EXPORT_DIR || path.join(dataDir, "inbox")),
    icgImportDir: path.resolve(process.env.ICG_IMPORT_DIR || path.join(dataDir, "outbox")),
    processedDir: path.resolve(process.env.WTF_PROCESSED_DIR || path.join(dataDir, "processed")),
    quarantineDir: path.resolve(process.env.WTF_QUARANTINE_DIR || path.join(dataDir, "quarantine")),
    sqlEnabled: bool(process.env.ICG_SQL_ENABLED),
    sqlConnectionString: process.env.ICG_SQL_CONNECTION_STRING || "",
    sqlServer: process.env.ICG_SQL_SERVER || "localhost",
    icgLiveDatabaseName: process.env.ICG_LIVE_DATABASE_NAME || "",
    icgSqlDataPath: path.resolve(process.env.ICG_SQL_DATA_PATH || "C:\\ICG\\Microsoft SQL Server\\MSSQL12.MSSQLSERVER\\MSSQL\\DATA\\FRS_WTFOODVZL"),
    icgBackupPath: path.resolve(process.env.ICG_BACKUP_PATH || "C:\\ICG\\BACKUP\\FRS_WTFOODVZL.BAK_1"),
    icgAuditDbName: process.env.ICG_AUDIT_DB_NAME || "WTF_AUDIT_FRS_WTFOODVZL",
    icgSqlDataDir: path.resolve(process.env.ICG_SQL_DATA_DIR || "C:\\ICG\\BACKUP\\WTF_AUDIT_SQL"),
    icgBackupPollSeconds: Math.max(300, Number(process.env.ICG_BACKUP_POLL_SECONDS || 1800))
  };
}
