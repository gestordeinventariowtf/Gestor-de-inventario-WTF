"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportMovementsForIcg = exportMovementsForIcg;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
async function exportMovementsForIcg(outDir, movements) {
    await promises_1.default.mkdir(outDir, { recursive: true });
    const generatedAt = new Date().toISOString();
    const safeDate = generatedAt.replace(/[:.]/g, "-").slice(0, 19);
    const filePath = node_path_1.default.join(outDir, `wtf-web-entradas-para-icg-${safeDate}.csv`);
    const selected = movements.filter((movement) => movement.destino === "ICG FrontRest" && movement.tipo === "entrada");
    const header = "id,codigoProducto,nombreProducto,cantidad,unidad,almacen,fecha,usuario,referencia\n";
    const lines = selected.map((movement) => [
        movement.id,
        movement.codigoProducto,
        movement.nombreProducto,
        movement.cantidad,
        movement.unidad,
        movement.almacen,
        movement.fecha,
        movement.usuario || "",
        movement.referencia || ""
    ].map(csv).join(","));
    await promises_1.default.writeFile(filePath, header + lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
    await promises_1.default.writeFile(`${filePath}.manifest.json`, JSON.stringify({
        generatedAt,
        target: "ICG FrontRest",
        format: "CSV_PREVIEW_REQUIRES_ICG_VALIDATION",
        count: selected.length,
        totalQuantity: selected.reduce((sum, row) => sum + Number(row.cantidad || 0), 0),
        movementIds: selected.map((row) => row.id),
        warning: "Este archivo es una salida controlada para prueba/importacion. Validar con backup antes de escritura real en ICG."
    }, null, 2), "utf8");
    return filePath;
}
function csv(value) {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text))
        return `"${text.replace(/"/g, '""')}"`;
    return text;
}
