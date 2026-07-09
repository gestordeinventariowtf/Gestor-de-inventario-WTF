"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStore = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
class LocalStore {
    filePath;
    constructor(baseDir = "./data") {
        this.filePath = node_path_1.default.resolve(baseDir, "queue.json");
    }
    async init() {
        await promises_1.default.mkdir(node_path_1.default.dirname(this.filePath), { recursive: true });
        try {
            await promises_1.default.access(this.filePath);
        }
        catch {
            await this.write({ movements: [], mappings: [], audit: [] });
        }
    }
    async read() {
        await this.init();
        const text = await promises_1.default.readFile(this.filePath, "utf8");
        const parsed = JSON.parse(text);
        return {
            movements: Array.isArray(parsed.movements) ? parsed.movements : [],
            mappings: Array.isArray(parsed.mappings) ? parsed.mappings : [],
            audit: Array.isArray(parsed.audit) ? parsed.audit : []
        };
    }
    async write(data) {
        await promises_1.default.mkdir(node_path_1.default.dirname(this.filePath), { recursive: true });
        await promises_1.default.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }
    async upsertMovement(movement) {
        const data = await this.read();
        const existing = data.movements.find((row) => row.idempotencyKey === movement.idempotencyKey);
        if (existing)
            return { inserted: false, movement: existing };
        data.movements.unshift(movement);
        data.audit.unshift({
            fecha: new Date().toISOString(),
            accion: "movement_detected",
            id: movement.id,
            idempotencyKey: movement.idempotencyKey,
            origen: movement.origen,
            destino: movement.destino
        });
        await this.write(data);
        return { inserted: true, movement };
    }
    async updateMovementState(id, estado, mensaje) {
        const data = await this.read();
        const movement = data.movements.find((row) => row.id === id);
        if (!movement)
            return;
        movement.estado = estado;
        movement.mensaje = mensaje || movement.mensaje;
        movement.ultimoIntento = new Date().toISOString();
        movement.intentos += 1;
        data.audit.unshift({ fecha: new Date().toISOString(), accion: "movement_state", id, estado, mensaje });
        await this.write(data);
    }
    async updateMovementStates(ids, estado, mensaje) {
        const idSet = new Set(ids);
        const data = await this.read();
        let count = 0;
        for (const movement of data.movements) {
            if (!idSet.has(movement.id))
                continue;
            movement.estado = estado;
            movement.mensaje = mensaje || movement.mensaje;
            movement.ultimoIntento = new Date().toISOString();
            movement.intentos += 1;
            count++;
        }
        if (count > 0) {
            data.audit.unshift({ fecha: new Date().toISOString(), accion: "movement_states", total: count, estado, mensaje });
            await this.write(data);
        }
        return count;
    }
    async replaceMappings(mappings) {
        const data = await this.read();
        data.mappings = mappings;
        data.audit.unshift({ fecha: new Date().toISOString(), accion: "mappings_replaced", total: mappings.length });
        await this.write(data);
    }
    async appendAudit(entry) {
        const data = await this.read();
        data.audit.unshift({ fecha: new Date().toISOString(), ...entry });
        data.audit = data.audit.slice(0, 1000);
        await this.write(data);
    }
    async stats() {
        const data = await this.read();
        return {
            movements: data.movements.length,
            pending: data.movements.filter((row) => row.estado === "pendiente" || row.estado === "pendiente_revision").length,
            approved: data.movements.filter((row) => row.estado === "aprobado").length,
            synced: data.movements.filter((row) => row.estado === "sincronizado").length,
            errors: data.movements.filter((row) => row.estado === "error").length,
            mappings: data.mappings.length,
            audit: data.audit.length
        };
    }
}
exports.LocalStore = LocalStore;
