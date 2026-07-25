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
  firebaseProjectId: string;
  firebaseCollection: string;
  firebaseDocumentId: string;
  autoApplyIcgBackup: boolean;
  apiKey: string;
  branch: string;
  defaultWarehouse: string;
  mode: "manual" | "automatico";
  pollSeconds: number;
  dataDir: string;
  icgExportDir: string;
  icgImportDir: string;
  processedDir: string;
  quarantineDir: string;
  sqlEnabled: boolean;
  sqlConnectionString: string;
  sqlServer: string;
  icgLiveDatabaseName: string;
  icgSqlDataPath: string;
  icgBackupPath: string;
  icgAuditDbName: string;
  icgSqlDataDir: string;
  icgBackupPollSeconds: number;
}

export interface StoreData {
  movements: SyncMovement[];
  mappings: ProductMapping[];
  audit: Array<Record<string, unknown>>;
}

export interface ImportResult {
  filePath?: string;
  inserted: number;
  duplicated: number;
  mappings: number;
  errors: string[];
}

export interface IcgBackupConsumptionRow {
  fecha: string;
  codArticulo: string;
  referencia: string;
  descripcion: string;
  codAlmacen: string;
  consumo: number;
  lineas: number;
}

export interface IcgBackupSyncResult {
  ok: boolean;
  backupPath: string;
  databaseName: string;
  fecha?: string;
  totalLines: number;
  matched: number;
  applied: number;
  skipped: number;
  pending: number;
  errors: string[];
  message: string;
  tableCounts?: Record<string, number>;
  movements?: SyncMovement[];
}
