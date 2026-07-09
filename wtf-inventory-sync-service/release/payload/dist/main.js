"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestHostPackageJson = ingestHostPackageJson;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const config_js_1 = require("./config.js");
const icg_file_adapter_js_1 = require("./adapters/icg-file-adapter.js");
const local_store_js_1 = require("./core/local-store.js");
const logger_js_1 = require("./core/logger.js");
const server_js_1 = require("./dashboard/server.js");
const config = (0, config_js_1.getConfig)();
const store = new local_store_js_1.LocalStore(config.dataDir);
const logger = new logger_js_1.Logger("./logs");
let syncInFlight = false;
async function importParsedPackage(filePath, parsed) {
    const result = { filePath, inserted: 0, duplicated: 0, mappings: 0, errors: [] };
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
        if (upsert.inserted)
            result.inserted += 1;
        else
            result.duplicated += 1;
    }
    await store.appendAudit({ accion: "package_imported", filePath: filePath || "api", ...result });
    return result;
}
async function ingestHostPackageJson(raw) {
    return importParsedPackage(undefined, (0, icg_file_adapter_js_1.parseHostPackageText)(raw));
}
async function moveFileSafe(filePath, targetDir) {
    await promises_1.default.mkdir(targetDir, { recursive: true });
    const parsed = node_path_1.default.parse(filePath);
    const target = node_path_1.default.join(targetDir, `${parsed.name}-${Date.now()}${parsed.ext}`);
    await promises_1.default.rename(filePath, target);
    return target;
}
async function syncNow() {
    if (syncInFlight)
        return [];
    syncInFlight = true;
    const results = [];
    await promises_1.default.mkdir(config.icgExportDir, { recursive: true });
    await promises_1.default.mkdir(config.icgImportDir, { recursive: true });
    try {
        const packages = await (0, icg_file_adapter_js_1.listJsonPackages)(config.icgExportDir);
        for (const filePath of packages) {
            try {
                const parsed = await (0, icg_file_adapter_js_1.readHostPackage)(filePath);
                const result = await importParsedPackage(filePath, parsed);
                results.push(result);
                const processedPath = await moveFileSafe(filePath, config.processedDir);
                await logger.write("icg.log", "Paquete ICG Host procesado", { filePath, processedPath, result });
            }
            catch (error) {
                const quarantinePath = await moveFileSafe(filePath, config.quarantineDir).catch(() => "");
                const message = error instanceof Error ? error.message : String(error);
                results.push({ filePath, inserted: 0, duplicated: 0, mappings: 0, errors: [message] });
                await logger.error("No se pudo procesar paquete ICG Host", { filePath, quarantinePath, error: message });
            }
        }
        return results;
    }
    finally {
        syncInFlight = false;
    }
}
async function main() {
    await store.init();
    await syncNow();
    (0, server_js_1.startDashboard)(store, config, syncNow, ingestHostPackageJson);
    windowlessPoll();
    await logger.app("Servicio iniciado", { port: config.port, mode: config.mode });
    console.log(`WTF Inventory Sync Service listo en http://127.0.0.1:${config.port}`);
}
function windowlessPoll() {
    setInterval(() => {
        syncNow().catch((error) => logger.error("Fallo en sincronizacion programada", error instanceof Error ? error.message : error));
    }, config.pollSeconds * 1000);
}
main().catch(async (error) => {
    await logger.error("Fallo al iniciar servicio", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
