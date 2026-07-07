import fs from "node:fs/promises";
import path from "node:path";
import type { ProductMapping, SyncMovement } from "./types.js";

interface StoreData {
  movements: SyncMovement[];
  mappings: ProductMapping[];
  audit: Array<Record<string, unknown>>;
}

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

  async replaceMappings(mappings: ProductMapping[]): Promise<void> {
    const data = await this.read();
    data.mappings = mappings;
    data.audit.unshift({ fecha: new Date().toISOString(), accion: "mappings_replaced", total: mappings.length });
    await this.write(data);
  }
}
