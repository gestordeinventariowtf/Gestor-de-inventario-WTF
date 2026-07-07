export type MovementType = "entrada" | "salida";

export type MovementState =
  | "pendiente"
  | "pendiente_revision"
  | "aprobado"
  | "procesando"
  | "sincronizado"
  | "rechazado"
  | "error"
  | "esperando_conexion";

export interface SyncMovement {
  id: string;
  idempotencyKey: string;
  fecha: string;
  origen: "ICG FrontRest" | "Sistema Web" | "Manual";
  destino: "Sistema Web" | "ICG FrontRest";
  tipo: MovementType;
  codigoProducto: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  almacen: string;
  usuario?: string;
  stockAnterior?: number;
  stockNuevoEstimado?: number;
  estado: MovementState;
  mensaje?: string;
  ultimoIntento?: string;
  intentos: number;
  referencia?: string;
  raw?: Record<string, unknown>;
}

export interface ProductMapping {
  id: string;
  icgCode: string;
  icgName: string;
  wtfTarget: string;
  wtfProduct: string;
  unitFactor: number;
  active: boolean;
  notes?: string;
}

export interface ServiceConfig {
  port: number;
  webAppUrl: string;
  apiKey: string;
  branch: string;
  defaultWarehouse: string;
  mode: "manual" | "automatico";
  icgExportDir: string;
  icgImportDir: string;
  sqlEnabled: boolean;
}
