"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
function bool(value) {
    return ["1", "true", "yes", "si"].includes(String(value || "").toLowerCase());
}
function getConfig() {
    const dataDir = node_path_1.default.resolve(process.env.WTF_DATA_DIR || "./data");
    return {
        port: Number(process.env.WTF_HOST_PORT || 8787),
        webAppUrl: process.env.WTF_WEB_APP_URL || "https://gestor-de-inventario-wtf-prod-2026.web.app",
        apiKey: process.env.WTF_API_KEY || "",
        branch: process.env.WTF_BRANCH || "principal",
        defaultWarehouse: process.env.WTF_DEFAULT_WAREHOUSE || "1",
        mode: process.env.WTF_MODE === "automatico" ? "automatico" : "manual",
        pollSeconds: Math.max(5, Number(process.env.WTF_POLL_SECONDS || 30)),
        dataDir,
        icgExportDir: node_path_1.default.resolve(process.env.ICG_EXPORT_DIR || node_path_1.default.join(dataDir, "inbox")),
        icgImportDir: node_path_1.default.resolve(process.env.ICG_IMPORT_DIR || node_path_1.default.join(dataDir, "outbox")),
        processedDir: node_path_1.default.resolve(process.env.WTF_PROCESSED_DIR || node_path_1.default.join(dataDir, "processed")),
        quarantineDir: node_path_1.default.resolve(process.env.WTF_QUARANTINE_DIR || node_path_1.default.join(dataDir, "quarantine")),
        sqlEnabled: bool(process.env.ICG_SQL_ENABLED),
        sqlConnectionString: process.env.ICG_SQL_CONNECTION_STRING || ""
    };
}
