"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readHostPackage = readHostPackage;
exports.parseHostPackageText = parseHostPackageText;
exports.listJsonPackages = listJsonPackages;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const idempotency_js_1 = require("../core/idempotency.js");
function asNumber(value) {
    const num = Number(String(value ?? "0").replace(",", "."));
    return Number.isFinite(num) ? num : 0;
}
function asText(value) {
    return String(value ?? "").trim();
}
async function readHostPackage(filePath) {
    const raw = await promises_1.default.readFile(filePath, "utf8");
    return parseHostPackageText(raw);
}
function parseHostPackageText(raw) {
    const parsed = JSON.parse(raw);
    return parseHostPackage(parsed);
}
function parseHostPackage(parsed) {
    const movements = [];
    for (const row of parsed.queues?.icgToWeb || []) {
        const key = (0, idempotency_js_1.buildIdempotencyKey)(["icg", asText(row.id), asText(row.codigo), asText(row.cantidad), asText(row.fecha)]);
        movements.push({
            id: (0, idempotency_js_1.movementId)("icg-web", key),
            idempotencyKey: key,
            fecha: asText(row.fecha) || new Date().toISOString(),
            origen: "ICG FrontRest",
            destino: "Sistema Web",
            tipo: "salida",
            codigoProducto: asText(row.codigo),
            nombreProducto: asText(row.producto),
            cantidad: asNumber(row.cantidad),
            unidad: asText(row.unidad) || "Uni",
            almacen: asText(row.modulo),
            usuario: asText(row.usuario) || "ICG FrontRest",
            estado: "pendiente_revision",
            mensaje: asText(row.mensaje) || "Pendiente de revisar",
            intentos: 0,
            referencia: asText(row.id),
            raw: row
        });
    }
    for (const row of parsed.queues?.webToIcg || []) {
        const key = (0, idempotency_js_1.buildIdempotencyKey)(["web", asText(row.id), asText(row.codigo), asText(row.cantidad), asText(row.fecha)]);
        movements.push({
            id: (0, idempotency_js_1.movementId)("web-icg", key),
            idempotencyKey: key,
            fecha: asText(row.fecha) || new Date().toISOString(),
            origen: "Sistema Web",
            destino: "ICG FrontRest",
            tipo: "entrada",
            codigoProducto: asText(row.codigo),
            nombreProducto: asText(row.producto),
            cantidad: asNumber(row.cantidad),
            unidad: asText(row.unidad) || "Uni",
            almacen: asText(row.modulo),
            usuario: asText(row.usuario),
            estado: "pendiente_revision",
            mensaje: asText(row.mensaje) || "Pendiente de preparar importacion ICG",
            intentos: 0,
            referencia: asText(row.id),
            raw: row
        });
    }
    const mappings = (parsed.mappings || []).map((row, index) => ({
        id: asText(row._id) || `mapping-${index}`,
        icgCode: asText(row.CodArticulo || row.codigo),
        icgName: asText(row.ProductoICG || row.nombre),
        wtfTarget: asText(row.ModuloWTF || row.destino),
        wtfProduct: asText(row.ProductoWTF || row.ProductoMise),
        unitFactor: asNumber(row.CantidadPorVenta) || 1,
        active: !["no", "false", "0"].includes(asText(row.Activo).toLowerCase()),
        notes: asText(row.Notas)
    }));
    return { movements, mappings };
}
async function listJsonPackages(inboxDir) {
    await promises_1.default.mkdir(inboxDir, { recursive: true });
    const files = await promises_1.default.readdir(inboxDir);
    return files.filter((name) => name.toLowerCase().endsWith(".json")).map((name) => node_path_1.default.join(inboxDir, name));
}
