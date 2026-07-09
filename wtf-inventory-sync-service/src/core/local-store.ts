import fs from "node:fs/promises";
import path from "node:path";
import type { ProductMapping, StoreData, SyncMovement } from "./types.js";

export class LocalStore {
  private filePath: string;

  constructor(baseDir = "./data") {
    this.filePath = path.resolve(baseDir, "queue.json");
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await this.write({ movements: [], mappings: [], audit: [] });
    }
  }

  async read(): Promise<StoreData> {
    await this.init();
    const text = await fs.readFile(this.filePath, "utf8");
    const parsed = JSON.parse(text) as Partial<StoreData>;
    return {
      movements: Array.isArray(parsed.movements) ? parsed.movements : [],
      mappings: Array.isArray(parsed.mappings) ? parsed.mappings : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : []
    };
  }

  async write(data: StoreData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  async upsertMovement(movement: SyncMovement): Promise<{ inserted: boolean; movement: SyncMovement }> {
    const data = await this.read();
    const existing = data.movements.find((row) => row.idempotencyKey === movement.idempotencyKey);
    if (existing) return { inserted: false, movement: existing };
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

  async updateMovementState(id: string, estado: SyncMovement["estado"], mensaje?: string): Promise<void> {
    const data = await this.read();
    const movement = data.movements.find((row) => row.id === id);
    if (!movement) return;
    movement.estado = estado;
    movement.mensaje = mensaje || movement.mensaje;
    movement.ultimoIntento = new Date().toISOString();
    movement.intentos += 1;
    data.audit.unshift({ fecha: new Date().toISOString(), accion: "movement_state", id, estado, mensaje });
    await this.write(data);
  }

  async updateMovementStates(ids: string[], estado: SyncMovement["estado"], mensaje?: string): Promise<number> {
    const idSet = new Set(ids);
    const data = await this.read();
    let count = 0;
    for (const movement of data.movements) {
      if (!idSet.has(movement.id)) continue;
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

  async replaceMappings(mappings: ProductMapping[]): Promise<void> {
    const data = await this.read();
    data.mappings = mappings;
    data.audit.unshift({ fecha: new Date().toISOString(), accion: "mappings_replaced", total: mappings.length });
    await this.write(data);
  }

  async appendAudit(entry: Record<string, unknown>): Promise<void> {
    const data = await this.read();
    data.audit.unshift({ fecha: new Date().toISOString(), ...entry });
    data.audit = data.audit.slice(0, 1000);
    await this.write(data);
  }

  async stats(): Promise<Record<string, number>> {
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
