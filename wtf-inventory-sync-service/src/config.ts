import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ServiceConfig } from "./core/types.js";

loadEnv();

function bool(value: string | undefined): boolean {
  return ["1", "true", "yes", "si"].includes(String(value || "").toLowerCase());
}

function numberAtLeast(value: string | undefined, fallback: number, min: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
}

const DEFAULT_ICG_SQL_DATA_PATH = "C:\\ICG\\Microsoft SQL Server\\MSSQL12.MSSQLSERVER\\MSSQL\\DATA";
const DEFAULT_ICG_AUDIT_DATA_DIR = "C:\\ICG\\BACKUP\\WTF_AUDIT_SQL";

function absoluteWindowsPath(value: string | undefined, fallback: string): string {
  const raw = String(value || "").trim().replace(/\//g, "\\");
  // A business installation must never resolve the SQL data folder relative
  // to the temporary installer directory or the current working directory.
  if (!/^[A-Za-z]:\\/.test(raw) && !/^\\\\/.test(raw)) return fallback;
  return raw.replace(/[\\]+$/, "");
}

export function getConfig(): ServiceConfig {
  const dataDir = path.resolve(process.env.WTF_DATA_DIR || "./data");
  return {
    port: Number(process.env.WTF_HOST_PORT || 8787),
    webAppUrl: process.env.WTF_WEB_APP_URL || "https://gestor-de-inventario-wtf-29056.web.app",
    firebaseProjectId: process.env.WTF_FIREBASE_PROJECT_ID || "gestor-de-inventario-wtf-29056",
    firebaseCollection: process.env.WTF_FIREBASE_COLLECTION || "wtfSistema",
    firebaseDocumentId: process.env.WTF_FIREBASE_DOCUMENT_ID || "estadoGeneral",
    autoApplyIcgBackup: false,
    apiKey: process.env.WTF_API_KEY || "",
    firebaseApiKey: process.env.WTF_FIREBASE_API_KEY || process.env.WTF_API_KEY || "",
    firebaseAuthEmail: process.env.WTF_FIREBASE_AUTH_EMAIL || "wtfoodrdav.venezuela@gmail.com",
    firebaseAuthPassword: process.env.WTF_FIREBASE_AUTH_PASSWORD || "",
    hostIdentityMode: process.env.WTF_HOST_IDENTITY_MODE === "technical" ? "technical" : "legacy",
    hostSyncEndpoint: process.env.WTF_HOST_SYNC_ENDPOINT || "",
    terminalId: process.env.WTF_TERMINAL_ID || "",
    terminalSecretProtected: process.env.WTF_TERMINAL_SECRET_PROTECTED || "",
    branch: process.env.WTF_BRANCH || "principal",
    defaultWarehouse: process.env.WTF_DEFAULT_WAREHOUSE || "1",
    mode: process.env.WTF_MODE === "automatico" ? "automatico" : "manual",
    pollSeconds: numberAtLeast(process.env.WTF_POLL_SECONDS, 30, 5),
    dataDir,
    icgExportDir: path.resolve(process.env.ICG_EXPORT_DIR || path.join(dataDir, "inbox")),
    icgImportDir: path.resolve(process.env.ICG_IMPORT_DIR || path.join(dataDir, "outbox")),
    processedDir: path.resolve(process.env.WTF_PROCESSED_DIR || path.join(dataDir, "processed")),
    quarantineDir: path.resolve(process.env.WTF_QUARANTINE_DIR || path.join(dataDir, "quarantine")),
    sqlEnabled: bool(process.env.ICG_SQL_ENABLED),
    sqlConnectionString: process.env.ICG_SQL_CONNECTION_STRING || "",
    sqlServer: process.env.ICG_SQL_SERVER || "localhost",
    icgLiveDatabaseName: String(process.env.ICG_LIVE_DATABASE_NAME || "").trim() || "FRS_WTFOODVZL",
    icgSqlDataPath: absoluteWindowsPath(process.env.ICG_SQL_DATA_PATH, DEFAULT_ICG_SQL_DATA_PATH),
    icgBackupPath: path.resolve(process.env.ICG_BACKUP_PATH || "C:\\ICG\\BACKUP\\FRS_WTFOODVZL.BAK_1"),
    icgAuditDbName: process.env.ICG_AUDIT_DB_NAME || "WTF_AUDIT_FRS_WTFOODVZL",
    icgSqlDataDir: absoluteWindowsPath(process.env.ICG_SQL_DATA_DIR, DEFAULT_ICG_AUDIT_DATA_DIR),
    icgBackupPollSeconds: numberAtLeast(process.env.ICG_BACKUP_POLL_SECONDS, 30, 30),
    icgConsumptionLookbackDays: numberAtLeast(process.env.ICG_CONSUMPTION_LOOKBACK_DAYS, 30, 1),
    icgConsumptionFromDate: String(process.env.ICG_CONSUMPTION_FROM_DATE || "").trim()
  };
}
