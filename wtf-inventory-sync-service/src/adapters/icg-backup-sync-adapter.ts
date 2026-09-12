import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { IcgBackupConsumptionRow, IcgBackupSyncResult, ServiceConfig, SyncMovement } from "../core/types.js";
import { decodeFirestoreAppState, decodeFirestoreValue, encodeCompressedAppState, encodeFirestoreValue } from "../core/firestore-state.js";

type AnyRecord = Record<string, any>;

const execFileAsync = promisify(execFile);

const DATASET_COLUMNS: Record<string, string[]> = {
  TiquetsCab: ["FO", "SERIE", "NUMERO", "N", "NUMFACTURA", "FECHA", "HORAINI", "HORAFIN", "CAJA", "TOTALBRUTO", "TOTALNETO", "SUBTOTAL", "PROPINA", "FECHAANULACION"],
  TiquetsConsumo: ["MovimientoICGId", "PhysicalIcgKey", "FO", "SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "CONSUMO", "CODALMACEN", "CODMACRO", "FECHA", "FECHAHORA", "DESCRIPCION", "REFERENCIA", "USASTOCKS"],
  Articulos: ["CodArticulo", "Referencia", "Descripcion", "Dpto", "Seccion", "Unidades", "PrecioRestaurante", "PrecioAppsDelivery", "UnidadMedida", "SeCompra", "SeVende", "UsaStocks", "StockMinimo", "CosteMedio", "UltimoCoste", "Suspendido", "Descatalogado", "FechaModificado"],
  Referencias: ["REFERENCIA", "CODIGO", "TIPOREF", "CODPROVEEDOR"],
  Kits: ["CODARTICULO", "LINEAKIT", "CODARTKIT", "REFERENCIA", "DESCRIPCIOKIT", "REFERENCIAKIT", "UNIDADES", "PRECIOUNIDAD", "TOTALLINEA"],
  Moviments: ["ID", "CODALMACENORIGEN", "CODALMACENDESTINO", "NUMSERIE", "CODARTICULO", "FECHA", "HORA", "TIPO", "UNIDADES", "SERIEDOC", "NUMDOC"],
  Stocks: ["CODARTICULO", "CODALMACEN", "STOCK", "PEDIDO", "ASERVIR", "MINIMO", "FECHAMODIFICADO"],
  ComprasCab: ["SERIE", "NUMERO", "N", "FECHA", "CODPROVEEDOR", "CODALMACEN", "SUFACTURA", "TOTALBRUTO", "TOTALNETO"],
  ComprasLin: ["SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "REFERENCIA", "DESCRIPCION", "UDSTOTAL", "PRECIO", "TOTAL", "CODALMACEN"],
  PreciosVenta: ["CODARTICULO", "CodArticulo", "CODFORMATO", "CodFormato", "IDTARIFAV", "TarifaNombre", "VALOR", "Valor", "_source", "_updatedAt"],
  Proveedores: ["CODPROVEEDOR", "NOMPROVEEDOR", "NOMCOMERCIAL", "ALIAS", "TELEFONO1", "TELEFONO2", "E_MAIL"],
  Clientes: ["CODCLIENTE", "NOMBRECOMERCIAL", "NOMBRECLIENTE", "ALIAS", "TELEFONO1", "TELEFONO2", "E_MAIL", "ESTADO", "NUMTARJETA"],
  ConsumoMiseVentas: ["Fecha", "MovimientoICGId", "PhysicalIcgKey", "Serie", "Numero", "TicketICG", "FechaHora", "NumLinea", "ModuloWTF", "ProductoWTF", "ProductoMise", "CodArticulo", "Referencia", "ProductoICG", "UnidadesVendidas", "CantidadDescontar", "Unidad", "ExistenciaActual", "ExistenciaNueva", "MotivoRevision", "Archivo", "ImportKey", "IcgAuditKey", "Estado"]
};

const CIERRES_DIARIOS_COLUMNS = ["Archivo", "FechaCierre", "Tickets", "Lineas", "VentaBruta", "VentaNeta", "Pagos", "Propina", "Estado", "Observacion"];
const FIREBASE_APP_STATE_SHARD_KEYS = [
  "regProduccion",
  "icgFrontRestData",
  "regSalidas",
  "recetasProduccion",
  "barRegSalidas",
  "systemLogs",
  "histSalidaRapida",
  "regEntradas",
  "barRegEntradas",
  "barRecetasProduccion",
  "assetManagementData",
  "employeeCenterData",
  "financialData"
];

function normalizar(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const num = Number(String(value ?? "").replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function active(row: AnyRecord): boolean {
  const value = normalizar(row.Activo == null ? "si" : row.Activo);
  return value !== "false" && value !== "no" && value !== "0" && value !== "inactivo";
}

function firstText(row: AnyRecord | undefined | null, keys: string[]): string {
  for (const key of keys) {
    const value = row?.[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function bridgeCode(row: AnyRecord): string {
  return firstText(row, ["CodArticulo", "CODARTICULO", "Codigo", "CODIGO", "Cod", "COD", "CodigoArticulo", "codigoArticulo"]);
}

function bridgeReference(row: AnyRecord): string {
  return firstText(row, ["Referencia", "REFERENCIA", "CodigoBarras", "CODIGOBARRAS", "Barcode", "REF", "Ref"]);
}

function bridgeIcgProduct(row: AnyRecord): string {
  return firstText(row, ["ProductoICG", "productoICG", "Descripcion", "DESCRIPCION", "DescripcionArticulo", "Articulo", "Nombre", "Producto"]);
}

function bridgeWtfProduct(row: AnyRecord): string {
  return firstText(row, ["ProductoWTF", "productoWTF", "ProductoMise", "productoMise", "ProductoWebRelacionado", "ProductoWeb", "producto", "nombre"]);
}

function bridgeQuantity(row: AnyRecord): number {
  return parseNumber(firstText(row, ["CantidadPorVenta", "cantidadPorVenta", "CantidadDescontar", "Cantidad", "cantidad", "Factor", "factor"]));
}

function bridgeUnit(row: AnyRecord, fallback = "Uni"): string {
  return firstText(row, ["Unidad", "unidad", "Medida", "medida", "UnidadWTF", "unidadWTF"]) || fallback;
}

function quickHashText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function icgEventIso(line: IcgBackupConsumptionRow, fallbackDate: string): string {
  const raw = String(line.fechaHora || line.fecha || fallbackDate || "").trim().replace(" ", "T");
  const parsed = raw ? new Date(raw) : null;
  if (parsed && Number.isFinite(parsed.getTime())) return parsed.toISOString();
  const fallback = String(fallbackDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  return `${fallback}T00:00:00.000Z`;
}

function targetKey(value: unknown): string {
  const key = normalizar(value || "");
  if (key.includes("bar") && (key.includes("cuarto") || key.includes("frio"))) return "barCuartoFrioInventario";
  if (key.includes("bar") && key.includes("mise")) return "barMiseAnPlace";
  if (key.includes("bar")) return "barInventario";
  if (key.includes("cuarto") || key.includes("frio")) return "cuartoFrioInventario";
  if (key.includes("inventario") && key.includes("cocina")) return "inventario";
  if (key.includes("inventario")) return "inventario";
  return "miseAnPlace";
}

function targetLabel(key: string): string {
  return ({
    inventario: "Inventario Cocina",
    cuartoFrioInventario: "Cuarto Frio Cocina",
    miseAnPlace: "Mise an Place Cocina",
    barInventario: "Inventario Bar",
    barCuartoFrioInventario: "Cuarto Frio Bar",
    barMiseAnPlace: "Mise an Place Bar"
  } as Record<string, string>)[key] || key;
}

function targetProductName(row: AnyRecord, key: string): string {
  return key === "inventario" || key === "cuartoFrioInventario" || key === "barInventario" || key === "barCuartoFrioInventario"
    ? String(row.nombre || row.producto || "")
    : String(row.producto || row.nombre || "");
}

function icgTicketIdentityFromLine(line: Partial<IcgBackupConsumptionRow>): string {
  return [line.fo, line.serie, line.numero, line.n].map((part) => String(part || "").trim()).filter(Boolean).join("-");
}

function tiquetsConsumoPrimaryKey(line: Partial<IcgBackupConsumptionRow>): string {
  return [
    line.fo || "",
    line.serie || "",
    line.numero || "",
    line.n || "",
    line.numLinea || "",
    line.codArticulo || ""
  ].map((part) => normalizar(part)).join("|");
}

function icgStableConsumptionIdentity(line: Partial<IcgBackupConsumptionRow>, fallbackDate = ""): string {
  return [
    "tiquetsconsumo-v1",
    tiquetsConsumoPrimaryKey(line),
    line.codAlmacen || ""
  ].map((part) => normalizar(part)).join("|");
}

export function movementIcgIdFromLine(line: Partial<IcgBackupConsumptionRow>, fallbackDate = ""): string {
  const stableIdentity = icgStableConsumptionIdentity(line, fallbackDate);
  if (icgTicketIdentityFromLine(line) && line.numLinea && line.codArticulo) {
    return quickHashText(["icg-consumo-stable-v1", stableIdentity].join("|"));
  }
  const existing = String(line.movimientoIcgId || "").trim();
  return existing || quickHashText(["icg-consumo-stable-v1", stableIdentity].join("|"));
}

function icgTicketIdentityFromConsumptionRow(row: AnyRecord): string {
  return firstText(row, ["TicketICG", "Ticket", "TicketKey", "Factura"]);
}

function consumptionAggregationKey(fecha: string, code: string, reference: string, warehouse: string, target: string, product: string, ticket: string): string {
  return [
    normalizar(String(fecha || "").slice(0, 10)),
    normalizar(ticket),
    normalizar(code),
    normalizar(reference),
    normalizar(warehouse),
    targetKey(target),
    normalizar(product)
  ].join("|");
}

export function consumptionAuditKey(line: Partial<IcgBackupConsumptionRow>, target: string, product: string, fecha: string): string {
  return [
    "icg-consumption-v2",
    icgStableConsumptionIdentity(line, fecha),
    targetKey(target),
    normalizar(product)
  ].join("|");
}

function consumptionAuditKeyFromRow(row: AnyRecord): string {
  return [
    "icg-consumption-v2",
    normalizar(String(row.Fecha || row.FechaHora || "").slice(0, 10)),
    normalizar(firstText(row, ["TicketICG", "Ticket", "TicketKey", "Factura"])),
    normalizar(firstText(row, ["NumLinea", "NUMLINEA"])),
    normalizar(bridgeCode(row)),
    normalizar(bridgeReference(row)),
    normalizar(firstText(row, ["CodAlmacen", "CODALMACEN"])),
    targetKey(row.targetKey || row.ModuloWTF || row.DestinoWTF || row.Modulo || ""),
    normalizar(bridgeWtfProduct(row))
  ].join("|");
}

export function consumptionPhysicalKey(line: Partial<IcgBackupConsumptionRow>, target: string, product: string): string {
  return [
    "icg-physical-tiquetsconsumo-v1",
    normalizar(icgTicketIdentityFromLine(line)),
    normalizar(line.numLinea || ""),
    normalizar(line.codArticulo || ""),
    normalizar(line.codAlmacen || ""),
    targetKey(target),
    normalizar(product)
  ].join("|");
}

function consumptionPhysicalKeyFromRow(row: AnyRecord): string {
  const ticket = firstText(row, ["TicketICG", "Ticket", "TicketKey", "Factura"]);
  return [
    "icg-physical-tiquetsconsumo-v1",
    normalizar(ticket),
    normalizar(firstText(row, ["NumLinea", "NUMLINEA"])),
    normalizar(bridgeCode(row)),
    normalizar(firstText(row, ["CodAlmacen", "CODALMACEN"])),
    targetKey(row.targetKey || row.ModuloWTF || row.DestinoWTF || row.Modulo || ""),
    normalizar(bridgeWtfProduct(row))
  ].join("|");
}

function parseLocalIcgLinkValue(link: AnyRecord): AnyRecord {
  const parts = String(link?.value || "").split("|").map((part) => part.trim()).filter(Boolean);
  return {
    CodArticulo: bridgeCode(link) || parts[0] || "",
    Referencia: bridgeReference(link) || parts[1] || "",
    ProductoICG: bridgeIcgProduct(link) || parts.slice(2).join(" | ") || parts[0] || ""
  };
}

function bridgeIdentity(row: AnyRecord): string {
  return [
    targetKey(row.ModuloWTF || row.DestinoWTF || row.Modulo || ""),
    normalizar(bridgeWtfProduct(row)),
    normalizar(bridgeCode(row)),
    normalizar(bridgeReference(row)),
    normalizar(bridgeIcgProduct(row))
  ].join("::");
}

function bridgeRowsFromTarget(appState: AnyRecord, key: string): AnyRecord[] {
  const list: AnyRecord[] = Array.isArray(appState[key]) ? appState[key] : [];
  return list.flatMap((item) => {
    const productName = targetProductName(item, key).trim();
    const links: AnyRecord[] = Array.isArray(item?.icgLinks) ? item.icgLinks : [];
    if (!productName || !links.length) return [];
    return links.map((link) => {
      const parsed = parseLocalIcgLinkValue(link);
      if (!parsed.CodArticulo && !parsed.Referencia && !parsed.ProductoICG) return null;
      return {
        _id: `local-${key}-${quickHashText([productName, parsed.CodArticulo, parsed.Referencia, parsed.ProductoICG].join("|"))}`,
        ModuloWTF: targetLabel(key),
        ProductoWTF: productName,
        ProductoMise: productName,
        CodArticulo: parsed.CodArticulo,
        Referencia: parsed.Referencia,
        ProductoICG: parsed.ProductoICG,
        Metodo: link.Metodo || "Vinculo guardado en producto WTF",
        CantidadPorVenta: bridgeQuantity(link) || 1,
        Unidad: bridgeUnit(link, item.medida || "Uni"),
        Activo: link.Activo == null ? "Si" : link.Activo,
        Notas: link.Notas || ""
      };
    }).filter(Boolean) as AnyRecord[];
  });
}

function collectIcgBridgeRows(appState: AnyRecord): AnyRecord[] {
  const centralRows = rows(appState, "VinculosMiseICG");
  const localRows = [
    "inventario",
    "cuartoFrioInventario",
    "miseAnPlace",
    "barInventario",
    "barCuartoFrioInventario",
    "barMiseAnPlace"
  ].flatMap((key) => bridgeRowsFromTarget(appState, key));
  const seen = new Set<string>();
  return centralRows.concat(localRows).filter((row) => {
    const identity = bridgeIdentity(row);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function targetExistence(row: AnyRecord, key: string): number {
  if (key === "inventario" || key === "cuartoFrioInventario" || key === "barInventario" || key === "barCuartoFrioInventario") {
    return Math.max(0, parseNumber(row.entrada) - parseNumber(row.salida) - parseNumber(row.decomiso));
  }
  return Math.max(0, parseNumber(row.existencia));
}

function applyTargetSalida(row: AnyRecord, key: string, cantidad: number, updatedAt = new Date().toISOString(), importKey = ""): void {
  if (key === "inventario" || key === "cuartoFrioInventario" || key === "barInventario" || key === "barCuartoFrioInventario") {
    row.salida = Number((parseNumber(row.salida) + cantidad).toFixed(4));
    row.updatedAt = updatedAt;
    row.icgLastImportKey = importKey || row.icgLastImportKey || "";
    return;
  }
  row.existencia = Math.max(0, Number((parseNumber(row.existencia) - cantidad).toFixed(4)));
  row.updatedAt = updatedAt;
  row.icgLastImportKey = importKey || row.icgLastImportKey || "";
}

function rows(appState: AnyRecord, tableKey: string): AnyRecord[] {
  return appState?.icgFrontRestData?.datasets?.[tableKey]?.rows || [];
}

function ensureIcgData(appState: AnyRecord): AnyRecord {
  appState.icgFrontRestData = appState.icgFrontRestData || {};
  appState.icgFrontRestData.datasets = appState.icgFrontRestData.datasets || {};
  appState.icgFrontRestData.datasets.Articulos = appState.icgFrontRestData.datasets.Articulos || {
    key: "Articulos",
    label: "Articulos ICG",
    columns: DATASET_COLUMNS.Articulos,
    rows: []
  };
  appState.icgFrontRestData.datasets.Referencias = appState.icgFrontRestData.datasets.Referencias || {
    key: "Referencias",
    label: "Codigos / referencias",
    columns: DATASET_COLUMNS.Referencias,
    rows: []
  };
  appState.icgFrontRestData.datasets.Stocks = appState.icgFrontRestData.datasets.Stocks || {
    key: "Stocks",
    label: "Stocks",
    columns: DATASET_COLUMNS.Stocks,
    rows: []
  };
  appState.icgFrontRestData.datasets.TiquetsConsumo = appState.icgFrontRestData.datasets.TiquetsConsumo || {
    key: "TiquetsConsumo",
    label: "TIQUETSCONSUMO SQL",
    columns: DATASET_COLUMNS.TiquetsConsumo,
    rows: []
  };
  appState.icgFrontRestData.datasets.PreciosVenta = appState.icgFrontRestData.datasets.PreciosVenta || {
    key: "PreciosVenta",
    label: "Precios de venta",
    columns: DATASET_COLUMNS.PreciosVenta,
    rows: []
  };
  appState.icgFrontRestData.datasets.ConsumoMiseVentas = appState.icgFrontRestData.datasets.ConsumoMiseVentas || {
    key: "ConsumoMiseVentas",
    label: "Consumo Mise ventas",
    columns: DATASET_COLUMNS.ConsumoMiseVentas,
    rows: []
  };
  appState.icgFrontRestData.datasets.CierresDiarios = appState.icgFrontRestData.datasets.CierresDiarios || {
    key: "CierresDiarios",
    label: "Cierres diarios",
    columns: CIERRES_DIARIOS_COLUMNS,
    rows: []
  };
  appState.icgFrontRestData.appliedImports = Array.isArray(appState.icgFrontRestData.appliedImports) ? appState.icgFrontRestData.appliedImports : [];
  appState.icgFrontRestData.appliedPhysicalIcgKeys = Array.isArray(appState.icgFrontRestData.appliedPhysicalIcgKeys) ? appState.icgFrontRestData.appliedPhysicalIcgKeys : [];
  appState.icgFrontRestData.processedBackupDates = Array.isArray(appState.icgFrontRestData.processedBackupDates) ? appState.icgFrontRestData.processedBackupDates : [];
  appState.icgFrontRestData.inventoryImpactPaused = Boolean(appState.icgFrontRestData.inventoryImpactPaused);
  appState.icgFrontRestData.icgHostDiscountsPaused = Boolean(appState.icgFrontRestData.icgHostDiscountsPaused);
  appState.icgFrontRestData.inventoryImpactPauseReason = appState.icgFrontRestData.inventoryImpactPauseReason || "";
  appState.icgFrontRestData.inventoryImpactPausedAt = appState.icgFrontRestData.inventoryImpactPausedAt || "";
  return appState.icgFrontRestData;
}

function mergeBackupArticlesIntoIcgData(icg: AnyRecord, articles: AnyRecord[]): void {
  if (!Array.isArray(articles) || !articles.length) return;
  const current = icg.datasets.Articulos || { key: "Articulos", label: "Articulos ICG", columns: DATASET_COLUMNS.Articulos, rows: [] };
  const existingRows = Array.isArray(current.rows) ? current.rows : [];
  const byCode = new Map<string, AnyRecord>();
  existingRows.forEach((row: AnyRecord) => {
    const code = normalizar(row.CodArticulo || row.CODARTICULO || row.Codigo || "");
    if (code) byCode.set(code, row);
  });
  articles.forEach((row) => {
    const code = normalizar(row.CodArticulo || row.CODARTICULO || row.Codigo || "");
    if (!code) return;
    byCode.set(code, Object.assign({}, byCode.get(code) || {}, row, {
      _source: "Backup SQL ICG",
      _updatedAt: new Date().toISOString()
    }));
  });
  icg.datasets.Articulos = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.Articulos])),
    rows: Array.from(byCode.values()).sort((a, b) => String(b.CodArticulo || b.CODARTICULO || "").localeCompare(String(a.CodArticulo || a.CODARTICULO || ""), undefined, { numeric: true }))
  });
}

function mergeLookupRowsIntoIcgData(icg: AnyRecord, key: string, rows: AnyRecord[], keyFields: string[], label: string): void {
  if (!Array.isArray(rows) || !rows.length) return;
  const columns = DATASET_COLUMNS[key] || [];
  const current = icg.datasets[key] || { key, label, columns, rows: [] };
  const byKey = new Map<string, AnyRecord>();
  (Array.isArray(current.rows) ? current.rows : []).forEach((row: AnyRecord) => {
    const rowKey = keyFields.map((field) => normalizar(row[field] ?? "")).join("|");
    if (rowKey.replace(/\|/g, "")) byKey.set(rowKey, row);
  });
  rows.forEach((row) => {
    const rowKey = keyFields.map((field) => normalizar(row[field] ?? "")).join("|");
    if (!rowKey.replace(/\|/g, "")) return;
    byKey.set(rowKey, Object.assign({}, byKey.get(rowKey) || {}, row, {
      _source: "Base SQL ICG",
      _updatedAt: new Date().toISOString()
    }));
  });
  icg.datasets[key] = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...columns, "_source", "_updatedAt"])),
    rows: Array.from(byKey.values())
  });
}

function consumptionSourceRowKey(row: AnyRecord): string {
  return [
    firstText(row, ["FO", "fo"]),
    firstText(row, ["SERIE", "Serie", "serie"]),
    firstText(row, ["NUMERO", "Numero", "numero"]),
    firstText(row, ["N", "n"]),
    firstText(row, ["NUMLINEA", "NumLinea", "numLinea"]),
    firstText(row, ["CODARTICULO", "CodArticulo", "codArticulo"])
  ].map((value) => normalizar(value)).join("|");
}

function consumptionRowFromBackupLine(line: Partial<IcgBackupConsumptionRow>, fecha: string): AnyRecord {
  const ticketIcg = icgTicketIdentityFromLine(line);
  const sourcePhysicalKey = ["icg-consumo-source-v1", tiquetsConsumoPrimaryKey(line), line.codAlmacen || ""].map((part) => normalizar(part)).join("|");
  return {
    MovimientoICGId: movementIcgIdFromLine(line, fecha),
    PhysicalIcgKey: sourcePhysicalKey,
    FO: line.fo || "",
    SERIE: line.serie || "",
    NUMERO: line.numero || "",
    N: line.n || "",
    NUMLINEA: line.numLinea || "",
    CODARTICULO: line.codArticulo || "",
    CONSUMO: line.consumo ?? "",
    CODALMACEN: line.codAlmacen || "",
    CODMACRO: line.codMacro || "",
    FECHA: line.fecha || fecha || "",
    FECHAHORA: line.fechaHora || line.fecha || fecha || "",
    DESCRIPCION: line.descripcion || "",
    REFERENCIA: line.referencia || "",
    USASTOCKS: "T",
    TicketICG: ticketIcg,
    _source: "TIQUETSCONSUMO SQL ICG",
    _updatedAt: new Date().toISOString()
  };
}

function mergeBackupTiquetsConsumoIntoIcgData(icg: AnyRecord, sourceRows: AnyRecord[], fecha: string): void {
  if (!Array.isArray(sourceRows) || !sourceRows.length) return;
  const current = icg.datasets.TiquetsConsumo || { key: "TiquetsConsumo", label: "TIQUETSCONSUMO SQL", columns: DATASET_COLUMNS.TiquetsConsumo, rows: [] };
  const existingRows = Array.isArray(current.rows) ? current.rows : [];
  const byKey = new Map<string, AnyRecord>();
  existingRows.forEach((row: AnyRecord) => {
    const key = consumptionSourceRowKey(row);
    if (key.replace(/\|/g, "")) byKey.set(key, row);
  });
  sourceRows.forEach((row) => {
    const key = consumptionSourceRowKey(row);
    if (!key.replace(/\|/g, "")) return;
    const line: Partial<IcgBackupConsumptionRow> = {
      fecha: firstText(row, ["FECHA", "Fecha", "fecha"]),
      fechaHora: firstText(row, ["FECHAHORA", "FechaHora", "fechaHora"]),
      fo: firstText(row, ["FO", "fo"]),
      serie: firstText(row, ["SERIE", "Serie", "serie"]),
      numero: firstText(row, ["NUMERO", "Numero", "numero"]),
      n: firstText(row, ["N", "n"]),
      numLinea: firstText(row, ["NUMLINEA", "NumLinea", "numLinea"]),
      codArticulo: firstText(row, ["CODARTICULO", "CodArticulo", "codArticulo"]),
      referencia: firstText(row, ["REFERENCIA", "Referencia", "referencia"]),
      descripcion: firstText(row, ["DESCRIPCION", "Descripcion", "descripcion"]),
      codAlmacen: firstText(row, ["CODALMACEN", "CodAlmacen", "codAlmacen"]),
      codMacro: firstText(row, ["CODMACRO", "CodMacro", "codMacro"]),
      consumo: parseNumber(row.CONSUMO ?? row.Consumo ?? row.consumo)
    };
    const rowDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || fecha;
    byKey.set(key, Object.assign({}, byKey.get(key) || {}, consumptionRowFromBackupLine(line, rowDate), row));
  });
  const mergedRows = Array.from(byKey.values()).sort((a, b) => {
    const ticketA = [a.FECHA || "", a.FECHAHORA || "", a.SERIE || "", a.NUMERO || "", a.N || "", a.NUMLINEA || ""].join("|");
    const ticketB = [b.FECHA || "", b.FECHAHORA || "", b.SERIE || "", b.NUMERO || "", b.N || "", b.NUMLINEA || ""].join("|");
    return String(ticketB).localeCompare(String(ticketA), undefined, { numeric: true });
  });
  icg.datasets.TiquetsConsumo = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.TiquetsConsumo, "TicketICG", "_source", "_updatedAt"])),
    rows: mergedRows
  });
}

function mergeBackupSalePricesIntoIcgData(icg: AnyRecord, salePrices: AnyRecord[]): void {
  if (!Array.isArray(salePrices) || !salePrices.length) return;
  const current = icg.datasets.PreciosVenta || { key: "PreciosVenta", label: "Precios de venta", columns: DATASET_COLUMNS.PreciosVenta, rows: [] };
  const existingRows = Array.isArray(current.rows) ? current.rows : [];
  const byKey = new Map<string, AnyRecord>();
  existingRows.forEach((row: AnyRecord) => {
    const key = [
      row.CodArticulo || row.CODARTICULO || "",
      row.CodFormato || row.CODFORMATO || "",
      row.IDTarifaV || row.IDTARIFAV || ""
    ].map((value) => normalizar(value)).join("|");
    if (key.replace(/\|/g, "")) byKey.set(key, row);
  });
  salePrices.forEach((row) => {
    const tarifa = normalizar(row.IDTARIFAV || row.IDTarifaV || "");
    if (tarifa !== "1" && tarifa !== "2") return;
    const price = parseNumber(row.VALOR ?? row.Valor);
    if (!(price > 0)) return;
    const key = [
      row.CodArticulo || row.CODARTICULO || "",
      row.CodFormato || row.CODFORMATO || "",
      row.IDTarifaV || row.IDTARIFAV || ""
    ].map((value) => normalizar(value)).join("|");
    if (!key.replace(/\|/g, "")) return;
    byKey.set(key, Object.assign({}, byKey.get(key) || {}, row, {
      TarifaNombre: tarifa === "1" ? "Precio Restaurante" : "Precio APPS Delivery",
      _source: row._source || "PRECIOSVENTA SQL ICG",
      _updatedAt: new Date().toISOString()
    }));
  });
  icg.datasets.PreciosVenta = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.PreciosVenta])),
    rows: Array.from(byKey.values()).sort((a, b) => String(a.CodArticulo || a.CODARTICULO || "").localeCompare(String(b.CodArticulo || b.CODARTICULO || ""), undefined, { numeric: true }))
  });

  const priceByCode = new Map<string, { restaurant?: number; apps?: number }>();
  Array.from(byKey.values())
    .sort((a, b) => parseNumber(a.CODFORMATO || a.CodFormato) - parseNumber(b.CODFORMATO || b.CodFormato))
    .forEach((row) => {
    const code = normalizar(bridgeCode(row));
    const tariff = normalizar(row.IDTARIFAV || row.IDTarifaV || "");
    const price = parseNumber(row.VALOR ?? row.Valor);
    if (!code || !(price > 0)) return;
    const currentPrices = priceByCode.get(code) || {};
    if (tariff === "1" && currentPrices.restaurant === undefined) currentPrices.restaurant = price;
    if (tariff === "2" && currentPrices.apps === undefined) currentPrices.apps = price;
    priceByCode.set(code, currentPrices);
  });
  const articles = icg.datasets.Articulos;
  if (!articles || !Array.isArray(articles.rows)) return;
  articles.rows = articles.rows.map((row: AnyRecord) => {
    const code = normalizar(bridgeCode(row));
    const prices = code ? priceByCode.get(code) : null;
    if (!prices || (!(prices.restaurant && prices.restaurant > 0) && !(prices.apps && prices.apps > 0))) return row;
    const restaurantPrice = prices.restaurant ?? "";
    const appsPrice = prices.apps ?? "";
    const legacyPrice = prices.restaurant ?? prices.apps ?? "";
    return Object.assign({}, row, {
      PrecioVentaSinImpuestos: legacyPrice,
      PrecioRestaurante: restaurantPrice,
      PrecioAppsDelivery: appsPrice,
      PrecioVenta: legacyPrice,
      PRECIOVENTA: legacyPrice,
      Precio: legacyPrice,
      PRECIO: legacyPrice,
      PVP: legacyPrice,
      _salePriceSource: "PRECIOSVENTA SQL ICG",
      _salePriceUpdatedAt: new Date().toISOString()
    });
  });
  articles.columns = Array.from(new Set((articles.columns || []).map((column: string) => column === "PCoste" ? "PrecioVentaSinImpuestos" : column).concat(["PrecioVentaSinImpuestos", "PrecioRestaurante", "PrecioAppsDelivery", "PrecioVenta", "PRECIOVENTA", "Precio", "PRECIO", "PVP"])));
}

function documentUrl(config: ServiceConfig): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.firebaseProjectId)}/databases/(default)/documents/${encodeURIComponent(config.firebaseCollection)}/${encodeURIComponent(config.firebaseDocumentId)}`;
}

function shardDocumentUrl(config: ServiceConfig, key: string): string {
  return `${documentUrl(config)}/stateShards/${encodeURIComponent(key)}`;
}

function icgControlDocumentUrl(config: ServiceConfig): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.firebaseProjectId)}/databases/(default)/documents/${encodeURIComponent(config.firebaseCollection)}/icgControl`;
}

function icgLedgerDocumentUrl(config: ServiceConfig, physicalKey: string, createOnly = false): string {
  const docId = `phys-${quickHashText(["icg-ledger-v1", physicalKey].join("|"))}`;
  const query = new URLSearchParams({ key: config.apiKey });
  if (createOnly) query.set("currentDocument.exists", "false");
  return `${documentUrl(config)}/icgAppliedMovements/${encodeURIComponent(docId)}?${query.toString()}`;
}

function isFirestoreDuplicateResponse(status: number, text: string): boolean {
  return status === 409 || /ALREADY_EXISTS|already exists|exists|FAILED_PRECONDITION|Precondition/i.test(text || "");
}

function firestoreFieldsFromRecord(record: AnyRecord): AnyRecord {
  const fields: AnyRecord = {};
  Object.entries(record).forEach(([key, value]) => {
    if (value !== undefined) fields[key] = encodeFirestoreValue(value);
  });
  return fields;
}

async function createIcgLedgerClaim(config: ServiceConfig, payload: AnyRecord): Promise<boolean> {
  const res = await fetch(icgLedgerDocumentUrl(config, String(payload.physicalIcgKey || ""), true), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFieldsFromRecord(payload) })
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => "");
  if (isFirestoreDuplicateResponse(res.status, text)) return false;
  throw new Error(`No se pudo bloquear el movimiento ICG en Firestore (${res.status}). ${text.slice(0, 240)}`);
}

async function updateIcgLedgerStatus(config: ServiceConfig, physicalKey: string, payload: AnyRecord): Promise<void> {
  const res = await fetch(icgLedgerDocumentUrl(config, physicalKey), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFieldsFromRecord(payload) })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo actualizar el ledger ICG (${res.status}). ${text.slice(0, 240)}`);
  }
}

function splitAppStateIntoShards(appState: AnyRecord): { mainState: AnyRecord; shards: Array<{ key: string; value: unknown }> } {
  const mainState = Object.assign({}, appState || {});
  const shards: Array<{ key: string; value: unknown }> = [];
  FIREBASE_APP_STATE_SHARD_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(mainState, key)) return;
    shards.push({ key, value: mainState[key] });
    delete mainState[key];
  });
  return { mainState, shards };
}

async function readAppState(config: ServiceConfig): Promise<AnyRecord> {
  const res = await fetch(documentUrl(config));
  if (!res.ok) throw new Error(`Firestore no permitio leer estado WTF (${res.status}).`);
  const doc = await res.json() as AnyRecord;
  const appState = decodeFirestoreAppState(doc.fields);
  const shardKeys = decodeFirestoreValue(doc.fields?.appStateShardKeys);
  if (!Array.isArray(shardKeys) || !shardKeys.length) return appState;
  await Promise.all(shardKeys.map(async (key) => {
    const shardKey = String(key || "").trim();
    if (!shardKey) return;
    const shardRes = await fetch(shardDocumentUrl(config, shardKey));
    if (!shardRes.ok) return;
    const shardDoc = await shardRes.json() as AnyRecord;
    const shardValue = decodeFirestoreAppState(shardDoc.fields);
    if (shardValue !== undefined && shardValue !== null) appState[shardKey] = shardValue;
  }));
  return appState;
}

async function readIcgControlPause(config: ServiceConfig): Promise<{ paused: boolean; reason: string }> {
  const res = await fetch(icgControlDocumentUrl(config));
  if (res.status === 404) return { paused: false, reason: "" };
  if (!res.ok) return { paused: false, reason: "" };
  const doc = await res.json() as AnyRecord;
  const fields = doc.fields || {};
  const paused = Boolean(decodeFirestoreValue(fields.inventoryImpactPaused) || decodeFirestoreValue(fields.icgHostDiscountsPaused));
  const reason = String(decodeFirestoreValue(fields.reason) || "");
  return { paused, reason };
}

async function writeAppState(config: ServiceConfig, appState: AnyRecord, result: IcgBackupSyncResult): Promise<void> {
  const splitState = splitAppStateIntoShards(appState);
  const packed = encodeCompressedAppState(splitState.mainState);
  const shardPayloads = splitState.shards.map((shard) => {
    const packedShard = encodeCompressedAppState(shard.value as AnyRecord);
    return {
      key: shard.key,
      packed: packedShard,
      payload: {
        fields: {
          key: encodeFirestoreValue(shard.key),
          appStateCompressed: encodeFirestoreValue(packedShard.compressed),
          appStateFormat: encodeFirestoreValue("pako-base64-json-v1"),
          appStateJsonBytes: encodeFirestoreValue(packedShard.jsonBytes),
          appStateCompressedBytes: encodeFirestoreValue(packedShard.compressedBytes),
          updatedAtHost: encodeFirestoreValue(new Date().toISOString())
        }
      }
    };
  });
  const payload = {
    fields: {
      appStateCompressed: encodeFirestoreValue(packed.compressed),
      appStateFormat: encodeFirestoreValue("pako-base64-json-v1"),
      appStateJsonBytes: encodeFirestoreValue(Buffer.byteLength(JSON.stringify(appState || {}), "utf8")),
      appStateMainJsonBytes: encodeFirestoreValue(packed.jsonBytes),
      appStateCompressedBytes: encodeFirestoreValue(packed.compressedBytes),
      appStateShardVersion: encodeFirestoreValue(1),
      appStateShardKeys: encodeFirestoreValue(shardPayloads.map((shard) => shard.key)),
      appStateShardCompressedBytes: encodeFirestoreValue(shardPayloads.reduce((total, shard) => total + shard.packed.compressedBytes, 0)),
      syncMeta: encodeFirestoreValue({
        clientId: "wtf-icg-host-backup",
        clientTime: Date.now(),
        signature: quickHashText(JSON.stringify(appState)),
        reason: "icg-backup-consumption-sync"
      }),
      updatedBy: encodeFirestoreValue("icg-backup-consumption-sync"),
      updatedAtHost: encodeFirestoreValue(new Date().toISOString()),
      lastIcgBackupSync: encodeFirestoreValue(result)
    }
  };
  await Promise.all(shardPayloads.map(async (shard) => {
    const shardRes = await fetch(shardDocumentUrl(config, shard.key), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shard.payload)
    });
    if (!shardRes.ok) {
      const text = await shardRes.text().catch(() => "");
      throw new Error(`Firestore no permitio guardar shard ${shard.key} (${shardRes.status}). ${text.slice(0, 300)}`);
    }
  }));
  const res = await fetch(documentUrl(config), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Firestore no permitio guardar estado WTF (${res.status}). ${text.slice(0, 300)}`);
  }
}

async function runSql(config: ServiceConfig, database: string, sql: string): Promise<string> {
  const args = ["-S", config.sqlServer, "-E"];
  if (database) args.push("-d", database);
  args.push("-W", "-s", "\t", "-Q", `SET NOCOUNT ON; ${sql}`);
  const { stdout, stderr } = await execFileAsync("sqlcmd", args, { maxBuffer: 40 * 1024 * 1024, windowsHide: true });
  const text = `${stdout || ""}${stderr ? `\n${stderr}` : ""}`;
  if (/Sqlcmd: error|Msg \d+/i.test(text)) throw new Error(text.slice(0, 2000));
  return stdout || "";
}

function quoteSql(value: string): string {
  return value.replace(/'/g, "''");
}

function parseSqlRows(output: string): AnyRecord[] {
  const lines = output.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.trim() && !/^\(\d+ filas? afectadas\)$/i.test(line.trim()));
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map((h) => h.trim());
  const rowsOut: AnyRecord[] = [];
  for (const line of lines.slice(2)) {
    if (/^-+\t?/.test(line)) continue;
    const parts = line.split("\t");
    if (parts.length < headers.length) continue;
    const row: AnyRecord = {};
    headers.forEach((header, index) => {
      const value = (parts[index] || "").trim();
      row[header] = value === "NULL" ? "" : value;
    });
    rowsOut.push(row);
  }
  return rowsOut;
}

function normalizeIcgClosureRows(rows: AnyRecord[], sourceName: string): AnyRecord[] {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const fecha = String(row.FechaCierre || row.Fecha || "").slice(0, 10);
    return {
      _id: `sql-cierre-${fecha || quickHashText(JSON.stringify(row))}`,
      Archivo: sourceName,
      FechaCierre: fecha || String(row.FechaCierre || row.Fecha || ""),
      Tickets: Math.round(parseNumber(row.Tickets)),
      Lineas: Math.round(parseNumber(row.Lineas)),
      VentaBruta: Number(parseNumber(row.VentaBruta).toFixed(2)),
      VentaNeta: Number(parseNumber(row.VentaNeta).toFixed(2)),
      Pagos: Number(parseNumber(row.Pagos).toFixed(2)),
      Propina: Number(parseNumber(row.Propina).toFixed(2)),
      Estado: row.Estado || "Calculado desde Base de Datos ICG Local",
      Observacion: row.Observacion || "Generado desde TIQUETSCAB, TIQUETSCONSUMO y pagos de la base local."
    };
  }).filter((row) => row.FechaCierre);
}

function mergeClosureRows(existingRows: AnyRecord[], newRows: AnyRecord[]): AnyRecord[] {
  const map = new Map<string, AnyRecord>();
  (Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
    const key = String(row.FechaCierre || row.Fecha || row._id || "").trim();
    if (key) map.set(key, row);
  });
  (Array.isArray(newRows) ? newRows : []).forEach((row) => {
    const key = String(row.FechaCierre || row.Fecha || row._id || "").trim();
    if (!key) return;
    map.set(key, Object.assign({}, map.get(key) || {}, row));
  });
  return Array.from(map.values()).sort((a, b) => String(b.FechaCierre || "").localeCompare(String(a.FechaCierre || "")));
}

async function readBackupDailyClosures(config: ServiceConfig, databaseName: string): Promise<AnyRecord[]> {
  const paymentsExists = parseSqlRows(await runSql(config, databaseName, "SELECT CASE WHEN OBJECT_ID('TIQUETSPAG','U') IS NULL THEN 0 ELSE 1 END AS Existe;"))[0]?.Existe === "1";
  const paymentsJoin = paymentsExists
    ? "LEFT JOIN (SELECT FO,SERIE,NUMERO,N,SUM(IMPORTE) AS PAGOS FROM TIQUETSPAG GROUP BY FO,SERIE,NUMERO,N) p ON p.FO=c.FO AND p.SERIE=c.SERIE AND p.NUMERO=c.NUMERO AND p.N=c.N"
    : "LEFT JOIN (SELECT CAST(NULL AS varchar(20)) AS FO, CAST(NULL AS varchar(20)) AS SERIE, CAST(NULL AS int) AS NUMERO, CAST(NULL AS int) AS N, CAST(0 AS decimal(18,4)) AS PAGOS WHERE 1=0) p ON 1=0";
  const sql = `
WITH cab AS (
  SELECT
    CONVERT(date,c.FECHA) AS FechaCierre,
    c.FO,
    c.SERIE,
    c.NUMERO,
    c.N,
    ISNULL(c.TOTALBRUTO,0) AS TOTALBRUTO,
    ISNULL(c.TOTALNETO,0) AS TOTALNETO,
    ISNULL(c.PROPINA,0) AS PROPINA
  FROM TIQUETSCAB c
  WHERE (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101')
),
lineas AS (
  SELECT FO,SERIE,NUMERO,N,COUNT(NUMLINEA) AS Lineas
  FROM TIQUETSCONSUMO
  GROUP BY FO,SERIE,NUMERO,N
)
SELECT
  CONVERT(varchar(10), c.FechaCierre, 120) AS FechaCierre,
  CAST(COUNT(*) AS int) AS Tickets,
  CAST(SUM(ISNULL(l.Lineas,0)) AS int) AS Lineas,
  CAST(SUM(ISNULL(c.TOTALBRUTO,0)) AS decimal(18,2)) AS VentaBruta,
  CAST(SUM(ISNULL(c.TOTALNETO,0)) AS decimal(18,2)) AS VentaNeta,
  CAST(SUM(ISNULL(p.PAGOS,0)) AS decimal(18,2)) AS Pagos,
  CAST(SUM(ISNULL(c.PROPINA,0)) AS decimal(18,2)) AS Propina,
  'Calculado desde Base de Datos ICG Local' AS Estado,
  'Generado sin CMS desde SQL/backup local' AS Observacion
FROM cab c
LEFT JOIN lineas l ON l.FO=c.FO AND l.SERIE=c.SERIE AND l.NUMERO=c.NUMERO AND l.N=c.N
${paymentsJoin}
GROUP BY c.FechaCierre
ORDER BY FechaCierre DESC;`;
  return normalizeIcgClosureRows(parseSqlRows(await runSql(config, databaseName, sql)), path.basename(config.icgBackupPath || databaseName));
}

async function readRecentIcgConsumptionPreview(config: ServiceConfig, databaseName: string): Promise<IcgBackupConsumptionRow[]> {
  const days = Math.max(1, Math.round(Number(config.icgConsumptionLookbackDays || 30)));
  const sql = `
IF OBJECT_ID('TIQUETSCONSUMO','U') IS NOT NULL
BEGIN
  WITH consumo AS (
    SELECT
      ISNULL(CAST(tc.FO AS varchar(30)),'') AS FO,
      ISNULL(CAST(tc.SERIE AS varchar(30)),'') AS SERIE,
      ISNULL(CAST(tc.NUMERO AS varchar(30)),'') AS NUMERO,
      ISNULL(CAST(tc.N AS varchar(30)),'') AS N,
      ISNULL(CAST(tc.NUMLINEA AS varchar(30)),'') AS NUMLINEA,
      ISNULL(CAST(tc.CODARTICULO AS varchar(30)),'') AS CODARTICULO,
      ISNULL(tc.CODALMACEN,'') AS CODALMACEN,
      ISNULL(CAST(tc.CODMACRO AS varchar(30)),'') AS CODMACRO,
      MIN(COALESCE(TRY_CONVERT(datetime, tc.FECHAHORA), TRY_CONVERT(datetime, tc.FECHA), TRY_CONVERT(datetime, c.HORAFIN), TRY_CONVERT(datetime, c.FECHA), GETDATE())) AS FECHAHORA,
      SUM(ISNULL(tc.CONSUMO,0)) AS CONSUMO,
      MAX(ISNULL(a.DESCRIPCION,'')) AS DESCRIPCION,
      MAX(ISNULL(a.REFERENCIA,'')) AS REFERENCIA,
      MAX(ISNULL(CAST(a.USASTOCKS AS varchar(10)),'')) AS USASTOCKS
    FROM TIQUETSCONSUMO tc
    LEFT JOIN TIQUETSCAB c ON c.FO=tc.FO AND c.SERIE=tc.SERIE AND c.NUMERO=tc.NUMERO AND c.N=tc.N
    LEFT JOIN ARTICULOS a ON CAST(a.CODARTICULO AS varchar(30)) = CAST(tc.CODARTICULO AS varchar(30))
    WHERE (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101')
      AND CONVERT(date, COALESCE(TRY_CONVERT(datetime, tc.FECHAHORA), TRY_CONVERT(datetime, tc.FECHA), TRY_CONVERT(datetime, c.HORAFIN), TRY_CONVERT(datetime, c.FECHA), GETDATE())) >= DATEADD(day, -${days - 1}, CONVERT(date, GETDATE()))
    GROUP BY tc.FO, tc.SERIE, tc.NUMERO, tc.N, tc.NUMLINEA, tc.CODARTICULO, tc.CODALMACEN, tc.CODMACRO
  )
  SELECT
    FO,
    SERIE,
    NUMERO,
    N,
    NUMLINEA,
    CODARTICULO,
    ISNULL(CAST(CONSUMO AS varchar(30)),'') AS CONSUMO,
    CODALMACEN,
    CODMACRO,
    ISNULL(CONVERT(varchar(10),FECHAHORA,120),'') AS FECHA,
    ISNULL(CONVERT(varchar(19),FECHAHORA,120),'') AS FECHAHORA,
    DESCRIPCION,
    REFERENCIA,
    USASTOCKS
  FROM consumo
  WHERE ISNULL(CONSUMO,0) <> 0
  ORDER BY FECHAHORA DESC, SERIE DESC, NUMERO DESC, N DESC, NUMLINEA DESC, CODARTICULO DESC, CODALMACEN DESC;
END
ELSE
BEGIN
  SELECT TOP 0
    CAST('' AS varchar(30)) AS FO,
    CAST('' AS varchar(30)) AS SERIE,
    CAST('' AS varchar(30)) AS NUMERO,
    CAST('' AS varchar(30)) AS N,
    CAST('' AS varchar(30)) AS NUMLINEA,
    CAST('' AS varchar(30)) AS CODARTICULO,
    CAST('' AS varchar(30)) AS CONSUMO,
    CAST('' AS varchar(30)) AS CODALMACEN,
    CAST('' AS varchar(30)) AS CODMACRO,
    CAST('' AS varchar(30)) AS FECHA,
    CAST('' AS varchar(30)) AS FECHAHORA,
    CAST('' AS varchar(120)) AS DESCRIPCION,
    CAST('' AS varchar(60)) AS REFERENCIA,
    CAST('' AS varchar(10)) AS USASTOCKS;
END`;
  return parseSqlRows(await runSql(config, databaseName, sql)).map((row) => {
    const consumo = parseNumber(row.CONSUMO);
    const tipoMovimiento: IcgBackupConsumptionRow["tipoMovimiento"] = consumo < 0 ? "devolucion" : "venta";
    return {
      fecha: firstText(row, ["FECHA", "Fecha"]),
      fechaHora: firstText(row, ["FECHAHORA", "FechaHora"]),
      fo: firstText(row, ["FO", "fo"]),
      serie: firstText(row, ["SERIE", "Serie"]),
      numero: firstText(row, ["NUMERO", "Numero"]),
      n: firstText(row, ["N", "n"]),
      numLinea: firstText(row, ["NUMLINEA", "NumLinea"]),
      tipoMovimiento,
      codArticulo: firstText(row, ["CODARTICULO", "CodArticulo"]),
      referencia: firstText(row, ["REFERENCIA", "Referencia"]),
      descripcion: firstText(row, ["DESCRIPCION", "Descripcion"]),
      codAlmacen: firstText(row, ["CODALMACEN", "CodAlmacen"]),
      codMacro: firstText(row, ["CODMACRO", "CodMacro"]),
      consumo,
      lineas: 1
    };
  }).filter((row) => row.codArticulo && row.consumo !== 0);
}

function sourceDatabaseName(config: ServiceConfig): string {
  return String(config.icgLiveDatabaseName || "").trim() || "FRS_WTFOODVZL";
}

async function assertLiveIcgDatabaseIsAvailable(config: ServiceConfig, databaseName: string): Promise<void> {
  const rows = parseSqlRows(await runSql(config, "master", `
SELECT
  CASE WHEN DB_ID(N'${quoteSql(databaseName)}') IS NULL THEN 0 ELSE 1 END AS Existe,
  ISNULL(CONVERT(varchar(260), SERVERPROPERTY('InstanceDefaultDataPath')), '') AS DataPath;`));
  const exists = String(rows[0]?.Existe || "").trim() === "1";
  if (!exists) {
    throw new Error(`No se encontro la base ICG activa [${databaseName}] en SQL Server local. Verifica que SQL Server este encendido y que los archivos FRS_WTFOODVZL.mdf y FRS_WTFOODVZL_LOG.ldf esten adjuntos desde C:\\ICG\\Microsoft SQL Server\\MSSQL12.MSSQLSERVER\\MSSQL\\DATA. No se usara el backup como fuente diaria.`);
  }
}

function auditBackupConfig(config: ServiceConfig): ServiceConfig {
  return Object.assign({}, config, { icgLiveDatabaseName: "" });
}

export async function restoreIcgBackupForAudit(config: ServiceConfig): Promise<void> {
  if (String(config.icgLiveDatabaseName || "").trim()) return;
  await fs.access(config.icgBackupPath);
  await fs.mkdir(config.icgSqlDataDir, { recursive: true });
  const mdf = path.join(config.icgSqlDataDir, `${config.icgAuditDbName}.mdf`);
  const ldf = path.join(config.icgSqlDataDir, `${config.icgAuditDbName}_log.ldf`);
  const sql = `
IF DB_ID(N'${quoteSql(config.icgAuditDbName)}') IS NOT NULL
BEGIN
  ALTER DATABASE [${config.icgAuditDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE [${config.icgAuditDbName}];
END
RESTORE DATABASE [${config.icgAuditDbName}]
FROM DISK = N'${quoteSql(config.icgBackupPath)}'
WITH MOVE N'FRS_WTFOODVZL' TO N'${quoteSql(mdf)}',
     MOVE N'FRS_WTFOODVZL_log' TO N'${quoteSql(ldf)}',
     REPLACE, RECOVERY, STATS = 20;
ALTER DATABASE [${config.icgAuditDbName}] SET READ_ONLY WITH ROLLBACK IMMEDIATE;`;
  await runSql(config, "master", sql);
}

export async function readLatestBackupConsumption(config: ServiceConfig): Promise<{
  fecha: string;
  rows: IcgBackupConsumptionRow[];
  tableCounts: Record<string, number>;
  articles: AnyRecord[];
  references: AnyRecord[];
  stocks: AnyRecord[];
  salePrices: AnyRecord[];
  tiquetsConsumoRows: AnyRecord[];
  closures: AnyRecord[];
  previewReadOk: boolean;
  previewReadError: string;
}> {
  const databaseName = sourceDatabaseName(config);
  await assertLiveIcgDatabaseIsAvailable(config, databaseName);
  const latest = parseSqlRows(await runSql(config, databaseName, "SELECT CONVERT(varchar(10), CONVERT(date, GETDATE()), 120) AS Fecha;"))[0]?.Fecha;
  const closures: AnyRecord[] = [];
  const countSql = "SELECT t.name AS tableName, CAST(SUM(p.rows) AS int) AS rowsCount FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1) WHERE t.name IN ('ARTICULOS','REFERENCIAS','STOCKS','PRECIOSVENTA') GROUP BY t.name;";
  const articlesSql = `
SELECT
  CAST(CODARTICULO AS varchar(30)) AS CodArticulo,
  ISNULL(REFERENCIA,'') AS Referencia,
  ISNULL(DESCRIPCION,'') AS Descripcion,
  ISNULL(CAST(DPTO AS varchar(30)),'') AS Dpto,
  ISNULL(CAST(SECCION AS varchar(30)),'') AS Seccion,
  ISNULL(CAST(UNIDADES AS varchar(30)),'') AS Unidades,
  ISNULL(UNIDADMEDIDA,'') AS UnidadMedida,
  ISNULL(CAST(SECOMPRA AS varchar(10)),'') AS SeCompra,
  ISNULL(CAST(SEVENDE AS varchar(10)),'') AS SeVende,
  ISNULL(CAST(USASTOCKS AS varchar(10)),'') AS UsaStocks,
  ISNULL(CAST(STOCKMINIMO AS varchar(30)),'') AS StockMinimo,
  ISNULL(CAST(COSTEMEDIO AS varchar(30)),'') AS CosteMedio,
  ISNULL(CAST(ULTIMOCOSTE AS varchar(30)),'') AS UltimoCoste,
  ISNULL(CAST(SUSPENDIDO AS varchar(10)),'') AS Suspendido,
  ISNULL(CAST(DESCATALOGADO AS varchar(10)),'') AS Descatalogado,
  ISNULL(CONVERT(varchar(19),FECHAMODIFICADO,120),'') AS FechaModificado
FROM ARTICULOS
ORDER BY CODARTICULO;`;
  const referencesSql = `
SELECT
  ISNULL(REFERENCIA,'') AS REFERENCIA,
  ISNULL(CODIGO,'') AS CODIGO,
  ISNULL(CAST(TIPOREF AS varchar(30)),'') AS TIPOREF,
  ISNULL(CAST(CODPROVEEDOR AS varchar(30)),'') AS CODPROVEEDOR
FROM REFERENCIAS
ORDER BY REFERENCIA, CODIGO;`;
  const stocksSql = `
SELECT
  CAST(CODARTICULO AS varchar(30)) AS CODARTICULO,
  ISNULL(CODALMACEN,'') AS CODALMACEN,
  ISNULL(CAST(STOCK AS varchar(30)),'') AS STOCK,
  ISNULL(CAST(PEDIDO AS varchar(30)),'') AS PEDIDO,
  ISNULL(CAST(ASERVIR AS varchar(30)),'') AS ASERVIR,
  ISNULL(CAST(MINIMO AS varchar(30)),'') AS MINIMO,
  ISNULL(CONVERT(varchar(19),FECHAMODIFICADO,120),'') AS FECHAMODIFICADO
FROM STOCKS
ORDER BY CODARTICULO, CODALMACEN;`;
  const salePricesSql = `
IF OBJECT_ID('PRECIOSVENTA','U') IS NOT NULL
BEGIN
  SELECT
    CAST(CODARTICULO AS varchar(30)) AS CODARTICULO,
    CAST(CODARTICULO AS varchar(30)) AS CodArticulo,
    ISNULL(CAST(CODFORMATO AS varchar(30)),'') AS CODFORMATO,
    ISNULL(CAST(CODFORMATO AS varchar(30)),'') AS CodFormato,
    ISNULL(CAST(IDTARIFAV AS varchar(30)),'') AS IDTARIFAV,
    CASE WHEN IDTARIFAV = 1 THEN 'Precio Restaurante' WHEN IDTARIFAV = 2 THEN 'Precio APPS Delivery' ELSE '' END AS TarifaNombre,
    ISNULL(CAST(VALOR AS varchar(30)),'') AS VALOR,
    ISNULL(CAST(VALOR AS varchar(30)),'') AS Valor
  FROM PRECIOSVENTA
  WHERE IDTARIFAV IN (1,2)
    AND VALOR IS NOT NULL AND VALOR > 0
    AND (DESCATALOGADO IS NULL OR DESCATALOGADO = 0)
  ORDER BY CODARTICULO, IDTARIFAV, CODFORMATO;
END
ELSE
BEGIN
  SELECT TOP 0
    CAST('' AS varchar(30)) AS CODARTICULO,
    CAST('' AS varchar(30)) AS CodArticulo,
    CAST('' AS varchar(30)) AS CODFORMATO,
    CAST('' AS varchar(30)) AS CodFormato,
    CAST('' AS varchar(30)) AS IDTARIFAV,
    CAST('' AS varchar(40)) AS TarifaNombre,
    CAST('' AS varchar(30)) AS VALOR,
    CAST('' AS varchar(30)) AS Valor;
END`;
  const countRows = parseSqlRows(await runSql(config, databaseName, countSql));
  const articles = parseSqlRows(await runSql(config, databaseName, articlesSql));
  const references = await runSql(config, databaseName, referencesSql).then(parseSqlRows).catch(() => []);
  const stocks = await runSql(config, databaseName, stocksSql).then(parseSqlRows).catch(() => []);
  const salePrices = await runSql(config, databaseName, salePricesSql)
    .then((raw) => parseSqlRows(raw).filter((row) => ["1", "2"].includes(normalizar(row.IDTARIFAV || row.IDTarifaV || "")) && parseNumber(row.VALOR || row.Valor) > 0))
    .catch(() => []);
  let previewConsumptionRows: IcgBackupConsumptionRow[] = [];
  let previewReadOk = true;
  let previewReadError = "";
  try {
    previewConsumptionRows = await readRecentIcgConsumptionPreview(config, databaseName);
  } catch (error) {
    previewReadOk = false;
    previewReadError = error instanceof Error ? error.message : String(error);
  }
  const tiquetsConsumoRows: AnyRecord[] = previewConsumptionRows.map((line) => {
    const rowDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || latest || "";
    return consumptionRowFromBackupLine(line, rowDate);
  });
  if (!latest) {
    return {
      fecha: "",
      rows: previewConsumptionRows,
      tableCounts: Object.fromEntries(countRows.map((row) => [String(row.tableName), Math.round(parseNumber(row.rowsCount))])),
      articles,
      references,
      stocks,
      salePrices,
      tiquetsConsumoRows,
      closures,
      previewReadOk,
      previewReadError
    };
  }
  return {
    fecha: latest,
    rows: previewConsumptionRows,
    tableCounts: Object.fromEntries(countRows.map((row) => [String(row.tableName), Math.round(parseNumber(row.rowsCount))])),
    articles,
    references,
    stocks,
    salePrices,
    tiquetsConsumoRows,
    closures,
    previewReadOk,
    previewReadError
  };
}

function createBackupMovement(
  line: IcgBackupConsumptionRow,
  fecha: string,
  importKey: string,
  estado: SyncMovement["estado"],
  mensaje: string,
  productoWtf = "",
  cantidad = line.consumo,
  unidad = "Uni"
): SyncMovement {
  return {
    id: `icg-local-${importKey}`,
    movimientoIcgId: movementIcgIdFromLine(line, fecha),
    idempotencyKey: `icg-local-${importKey}`,
    fecha: icgEventIso(line, fecha),
    origen: "ICG FrontRest",
    destino: "Sistema Web",
    tipo: line.tipoMovimiento === "devolucion" || line.consumo < 0 ? "decomiso" : "salida",
    codigoProducto: line.codArticulo,
    nombreProducto: line.descripcion || `ICG ${line.codArticulo}`,
    cantidad,
    unidad,
    almacen: line.codAlmacen || "ICG",
    estado,
    mensaje,
    intentos: 0,
    referencia: line.referencia,
    raw: {
      importKey,
      movimientoIcgId: movementIcgIdFromLine(line, fecha),
      physicalSourceKey: icgStableConsumptionIdentity(line, fecha),
      fo: line.fo || "",
      serie: line.serie || "",
      numero: line.numero || "",
      n: line.n || "",
      numLinea: line.numLinea || "",
      codAlmacen: line.codAlmacen,
      codMacro: line.codMacro || "",
      productoIcg: line.descripcion,
      productoWtf: productoWtf || "",
      consumo: line.consumo,
      lineas: line.lineas,
      fechaHora: line.fechaHora || "",
      ticket: [line.fo, line.serie, line.numero, line.n, line.numLinea].filter(Boolean).join("-")
    }
  };
}

export function icgPhysicalConsumptionSourceKey(line: Partial<IcgBackupConsumptionRow>): string {
  return icgStableConsumptionIdentity(line);
}

export async function applyBackupConsumptionToFirestore(config: ServiceConfig, rowsToApply: IcgBackupConsumptionRow[], fecha: string, tableCounts: Record<string, number>, articles: AnyRecord[] = [], closures: AnyRecord[] = [], salePrices: AnyRecord[] = [], tiquetsConsumoRows: AnyRecord[] = []): Promise<IcgBackupSyncResult> {
  const result: IcgBackupSyncResult = {
    ok: false,
    backupPath: config.icgBackupPath,
    sourcePath: config.icgSqlDataPath,
    sourceMode: String(config.icgLiveDatabaseName || "").trim() ? "live-sql" : "backup",
    databaseName: sourceDatabaseName(config),
    fecha,
    totalLines: rowsToApply.length,
    matched: 0,
    applied: 0,
    skipped: 0,
    pending: 0,
    errors: [],
    message: "",
    tableCounts,
    movements: []
  };
  const appState = await readAppState(config);
  const icg = ensureIcgData(appState);
  const sourceConsumptionRows = tiquetsConsumoRows.length ? tiquetsConsumoRows : rowsToApply.map((line) => consumptionRowFromBackupLine(line, fecha));
  const cloudPause = await readIcgControlPause(config);
  if (cloudPause.paused) {
    icg.inventoryImpactPaused = true;
    icg.icgHostDiscountsPaused = true;
    icg.inventoryImpactPauseReason = cloudPause.reason || icg.inventoryImpactPauseReason || "Descuentos ICG pausados por auditoria. No se aplicaron salidas automaticas.";
  }
  if (icg.inventoryImpactPaused || icg.icgHostDiscountsPaused) {
    result.ok = true;
    result.skipped = rowsToApply.length;
    result.pending = rowsToApply.length;
    result.message = icg.inventoryImpactPauseReason || "Descuentos ICG pausados por auditoria. No se aplicaron salidas automaticas.";
    result.movements = rowsToApply.map((line) => {
      const eventDate = String(line.fechaHora || line.fecha || fecha).replace(" ", "T");
      const ticketIdentity = icgTicketIdentityFromLine(line);
      const pausedMovementDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || fecha;
      const movementId = movementIcgIdFromLine(line, pausedMovementDate);
      const importKey = quickHashText(["icg-paused", movementId, ticketIdentity, line.numLinea, line.codArticulo, line.referencia, line.codAlmacen].join("|"));
      return createBackupMovement(line, pausedMovementDate, importKey, "pendiente_revision", result.message);
    });
    return result;
  }
  mergeBackupArticlesIntoIcgData(icg, articles);
  mergeBackupTiquetsConsumoIntoIcgData(icg, sourceConsumptionRows, fecha);
  mergeBackupSalePricesIntoIcgData(icg, salePrices);
  const currentClosures = icg.datasets.CierresDiarios || { key: "CierresDiarios", label: "Cierres diarios", columns: CIERRES_DIARIOS_COLUMNS, rows: [] };
  if (closures.length) {
    icg.datasets.CierresDiarios = Object.assign({}, currentClosures, {
      columns: Array.from(new Set([...(currentClosures.columns || []), ...CIERRES_DIARIOS_COLUMNS])),
      rows: mergeClosureRows(currentClosures.rows || [], closures)
    });
  }
  const links = collectIcgBridgeRows(appState).filter(active);
  const appliedKeys = new Set((icg.appliedImports || []).map(String));
  const consumoRows: AnyRecord[] = icg.datasets.ConsumoMiseVentas.rows || [];
  const existingConsumptionKeys = new Set(consumoRows.map((row) => String(row.ImportKey || "")));
  const appliedConsumptionKeys = new Set(
    consumoRows
      .filter((row) => ["aplicado", "decomiso aplicado"].includes(normalizar(row.Estado || "")))
      .map((row) => String(row.ImportKey || ""))
      .filter(Boolean)
  );
  const appliedConsumptionAuditKeys = new Set(
    consumoRows
      .filter((row) => ["aplicado", "decomiso aplicado"].includes(normalizar(row.Estado || "")))
      .map((row) => String(row.IcgAuditKey || consumptionAuditKeyFromRow(row) || ""))
      .filter(Boolean)
  );
  const appliedConsumptionPhysicalKeys = new Set(
    (Array.isArray(icg.appliedPhysicalIcgKeys) ? icg.appliedPhysicalIcgKeys : []).map(String).filter(Boolean)
  );
  consumoRows
      .filter((row) => ["aplicado", "decomiso aplicado"].includes(normalizar(row.Estado || "")))
      .map((row) => String(row.PhysicalIcgKey || row.physicalIcgKey || consumptionPhysicalKeyFromRow(row) || ""))
      .filter(Boolean)
      .forEach((key) => appliedConsumptionPhysicalKeys.add(key));
  const appliedMovementTargets = new Set(
    consumoRows
      .filter((row) => ["aplicado", "decomiso aplicado"].includes(normalizar(row.Estado || "")))
      .map((row) => {
        const movementId = String(row.MovimientoICGId || row.movimientoIcgId || "");
        if (!movementId) return "";
        return [movementId, targetKey(row.targetKey || row.ModuloWTF || row.DestinoWTF || row.Modulo || ""), normalizar(bridgeWtfProduct(row))].join("|");
      })
      .filter(Boolean)
  );
  ["regSalidas", "barRegSalidas", "histSalidaRapida", "barHistSalidaRapida", "regDecomiso", "barRegDecomiso", "histDecomisoCocina"].forEach((historyKey) => {
    const historyRows = Array.isArray(appState[historyKey]) ? appState[historyKey] : [];
    historyRows.forEach((row: AnyRecord) => {
      [row?.ImportKey, row?.importKey, row?.LegacyImportKey, row?.legacyImportKey, row?.icgImportKey, row?.id, row?._id].forEach((key) => {
        const cleanKey = String(key || "").replace(/^icg-bak-decomiso-/, "").replace(/^icg-bak-/, "").replace(/^icg-/, "").trim();
        if (!cleanKey) return;
        appliedKeys.add(cleanKey);
        appliedConsumptionKeys.add(cleanKey);
      });
      const movementId = String(row?.MovimientoICGId || row?.movimientoIcgId || "");
      const product = normalizar(row?.producto || row?.ProductoWTF || row?.ProductoMise || "");
      const physicalKey = String(row?.PhysicalIcgKey || row?.physicalIcgKey || "").trim();
      if (physicalKey) appliedConsumptionPhysicalKeys.add(physicalKey);
      if (movementId && product) {
        const target = historyKey.includes("bar") ? historyKey.includes("Decomiso") ? "" : historyKey.includes("Reg") ? (row?.storageKey || "") : "barMiseAnPlace" : historyKey === "histSalidaRapida" || historyKey === "histDecomisoCocina" ? "miseAnPlace" : (row?.storageKey || "");
        appliedMovementTargets.add([movementId, targetKey(target || row?.ModuloWTF || row?.origen || ""), product].join("|"));
      }
    });
  });
  appliedConsumptionKeys.forEach((key) => appliedKeys.add(key));
  const legacyAppliedRemaining = new Map<string, number>();
  consumoRows.forEach((row) => {
    if (!["aplicado", "decomiso aplicado"].includes(normalizar(row.Estado || ""))) return;
    const rowTarget = targetKey(row.targetKey || row.ModuloWTF || row.DestinoWTF || row.Modulo || "");
    const key = consumptionAggregationKey(
      row.Fecha || row.FechaHora || "",
      bridgeCode(row),
      bridgeReference(row),
      row.CodAlmacen || "",
      rowTarget,
      bridgeWtfProduct(row),
      icgTicketIdentityFromConsumptionRow(row)
    );
    legacyAppliedRemaining.set(key, Number((parseNumber(legacyAppliedRemaining.get(key)) + Math.abs(parseNumber(row.CantidadDescontar || row.UnidadesVendidas || 0))).toFixed(4)));
  });
  const now = new Date().toISOString();
  const consumptionUpserts = new Map<string, AnyRecord>();
  function rememberConsumptionRow(row: AnyRecord): void {
    const key = String(row?.ImportKey || "");
    if (!key) return;
    consumptionUpserts.set(key, row);
    existingConsumptionKeys.add(key);
  }
  const queueMovementByIcg = new Map<string, SyncMovement>();
  const queueStatusRank: Record<SyncMovement["estado"], number> = {
    pendiente: 1,
    procesando: 1,
    aprobado: 1,
    esperando_conexion: 2,
    sincronizado: 3,
    pendiente_revision: 4,
    rechazado: 5,
    error: 6
  };
  function rememberIcgQueueMovement(line: IcgBackupConsumptionRow, estado: SyncMovement["estado"], mensaje: string): void {
    const queueMovementDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || fecha;
    const movementId = movementIcgIdFromLine(line, queueMovementDate);
    const queueKey = quickHashText(["icg-queue", movementId, icgTicketIdentityFromLine(line), line.codArticulo, line.codAlmacen].join("|"));
    const next = createBackupMovement(line, queueMovementDate, queueKey, estado, mensaje);
    const current = queueMovementByIcg.get(movementId);
    if (!current) {
      queueMovementByIcg.set(movementId, next);
      return;
    }
    if ((queueStatusRank[estado] || 0) > (queueStatusRank[current.estado] || 0)) {
      const previousMessage = String(current.mensaje || "").trim();
      next.mensaje = previousMessage && previousMessage !== mensaje ? `${mensaje} | ${previousMessage}` : mensaje;
      queueMovementByIcg.set(movementId, next);
      return;
    }
    if (mensaje && !String(current.mensaje || "").includes(mensaje)) {
      current.mensaje = [current.mensaje, mensaje].filter(Boolean).join(" | ");
    }
  }
  function appendHistoryRowOnce(historyKey: string, row: AnyRecord): void {
    appState[historyKey] = Array.isArray(appState[historyKey]) ? appState[historyKey] : [];
    const keys = [row?.ImportKey, row?.importKey, row?.LegacyImportKey, row?.legacyImportKey, row?.id, row?._id].map((key) => String(key || "").trim()).filter(Boolean);
    const movementId = String(row?.MovimientoICGId || row?.movimientoIcgId || "");
    const product = normalizar(row?.producto || row?.ProductoWTF || row?.ProductoMise || "");
    const physicalKey = String(row?.PhysicalIcgKey || row?.physicalIcgKey || "").trim();
    const exists = appState[historyKey].some((existing: AnyRecord) => {
      const existingKeys = [existing?.ImportKey, existing?.importKey, existing?.LegacyImportKey, existing?.legacyImportKey, existing?.id, existing?._id].map((key) => String(key || "").trim()).filter(Boolean);
      if (keys.some((key) => existingKeys.includes(key))) return true;
      if (physicalKey && physicalKey === String(existing?.PhysicalIcgKey || existing?.physicalIcgKey || "").trim()) return true;
      const existingMovementId = String(existing?.MovimientoICGId || existing?.movimientoIcgId || "");
      return movementId && existingMovementId === movementId && product && normalizar(existing?.producto || existing?.ProductoWTF || existing?.ProductoMise || "") === product;
    });
    if (!exists) appState[historyKey].push(row);
  }
  async function claimLedgerForImpact(
    line: IcgBackupConsumptionRow,
    physicalKey: string,
    importKey: string,
    movementId: string,
    target: string,
    producto: string,
    cantidad: number,
    unidad: string,
    tipoMovimiento: string
  ): Promise<{ claimed: boolean; error: string }> {
    try {
      const claimed = await createIcgLedgerClaim(config, {
        physicalIcgKey: physicalKey,
        importKey,
        movimientoIcgId: movementId,
        estado: "procesando",
        tipoMovimiento,
        fecha: line.fecha || fecha,
        fechaHora: line.fechaHora || line.fecha || fecha,
        ticketICG: icgTicketIdentityFromLine(line),
        fo: line.fo || "",
        serie: line.serie || "",
        numero: line.numero || "",
        n: line.n || "",
        numLinea: line.numLinea || "",
        codArticulo: line.codArticulo || "",
        referencia: line.referencia || "",
        productoICG: line.descripcion || "",
        codAlmacen: line.codAlmacen || "",
        moduloWTF: targetLabel(target),
        targetKey: target,
        productoWTF: producto,
        cantidadDescontar: cantidad,
        unidad,
        source: "WTF ICG Host",
        createdAt: now,
        updatedAt: now
      });
      return { claimed, error: "" };
    } catch (error) {
      return { claimed: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  for (const line of rowsToApply) {
    const eventDate = String(line.fechaHora || line.fecha || fecha).replace(" ", "T");
    const icgConsumptionDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || fecha;
    const ticketIdentity = icgTicketIdentityFromLine(line);
    const movementId = movementIcgIdFromLine(line, icgConsumptionDate);
    const isIcgReturn = line.tipoMovimiento === "devolucion" || line.consumo < 0;
    const matchedLinks = links.filter((row) => {
      const linkCode = normalizar(bridgeCode(row));
      const linkRef = normalizar(bridgeReference(row));
      return (linkCode && normalizar(line.codArticulo) === linkCode) || (linkRef && normalizar(line.referencia) === linkRef);
    });
    const pendingAuditKey = consumptionAuditKey(line, "", "", icgConsumptionDate);
    const pendingImportKey = quickHashText(["icg-bak", movementId, ticketIdentity, line.numLinea, line.codArticulo, line.referencia, line.codAlmacen].join("|"));
    if (!matchedLinks.length && (appliedKeys.has(pendingImportKey) || appliedConsumptionKeys.has(pendingImportKey) || appliedConsumptionAuditKeys.has(pendingAuditKey))) {
      result.skipped += 1;
      rememberIcgQueueMovement(line, "sincronizado", "Consumo ICG ya procesado anteriormente.");
      continue;
    }
    if (!matchedLinks.length) {
      result.pending += 1;
      rememberIcgQueueMovement(line, "pendiente_revision", "Sin vinculo WTF; requiere mapear ProductoMise/ProductoWTF.");
      const pendingRow = {
        Fecha: icgConsumptionDate,
        MovimientoICGId: movementId,
        ModuloWTF: "",
        ProductoWTF: "",
        ProductoMise: "",
        CodArticulo: line.codArticulo,
        Referencia: line.referencia,
        ProductoICG: line.descripcion,
        UnidadesVendidas: line.consumo,
        CantidadDescontar: line.consumo,
        Unidad: "Uni",
        Archivo: path.basename(config.icgBackupPath),
        ImportKey: pendingImportKey,
        IcgAuditKey: pendingAuditKey,
        Estado: "Sin vinculo",
        CodAlmacen: line.codAlmacen,
        FechaHora: line.fechaHora || line.fecha || fecha,
        Serie: line.serie || "",
        Numero: line.numero || "",
        TicketICG: ticketIdentity,
        NumLinea: line.numLinea || "",
        TipoMovimiento: isIcgReturn ? "Devolucion ICG / pendiente" : "Venta ICG / pendiente"
      };
      rememberConsumptionRow(pendingRow);
      continue;
    }
    for (const link of matchedLinks) {
      const target = targetKey(link.ModuloWTF || link.DestinoWTF || link.Modulo || "Mise an Place Cocina");
      const producto = bridgeWtfProduct(link);
      const auditKey = consumptionAuditKey(line, target, producto, icgConsumptionDate);
      const importKey = quickHashText(["icg-bak", movementId, target, producto].join("|"));
      const physicalKey = consumptionPhysicalKey(line, target, producto);
      const movementTargetKey = [movementId, target, normalizar(producto)].join("|");
      const qtyFactor = bridgeQuantity(link) || 1;
      const cantidad = Number((Math.abs(line.consumo) * qtyFactor).toFixed(4));
      const legacyKey = consumptionAggregationKey(icgConsumptionDate, line.codArticulo, line.referencia, line.codAlmacen, target, producto, ticketIdentity);
      const legacyRemaining = legacyAppliedRemaining.get(legacyKey) || 0;
      if (appliedKeys.has(importKey) || appliedConsumptionKeys.has(importKey) || appliedConsumptionAuditKeys.has(auditKey) || appliedConsumptionPhysicalKeys.has(physicalKey) || appliedMovementTargets.has(movementTargetKey) || legacyRemaining + 1e-9 >= cantidad) {
        if (!appliedKeys.has(importKey) && legacyRemaining) legacyAppliedRemaining.set(legacyKey, Number((legacyRemaining - cantidad).toFixed(4)));
        result.skipped += 1;
        rememberIcgQueueMovement(line, "sincronizado", "Consumo ICG ya procesado anteriormente.");
        continue;
      }
      if (!producto) {
        const message = `Vinculo sin ProductoWTF para CodArticulo ${line.codArticulo}.`;
        result.errors.push(message);
        rememberIcgQueueMovement(line, "error", message);
        continue;
      }
      const list: AnyRecord[] = Array.isArray(appState[target]) ? appState[target] : [];
      const item = list.find((row) => normalizar(targetProductName(row, target)) === normalizar(producto));
      const consumoRow: AnyRecord = {
        Fecha: icgConsumptionDate,
        MovimientoICGId: movementId,
        PhysicalIcgKey: physicalKey,
        Serie: line.serie || "",
        Numero: line.numero || "",
        ModuloWTF: targetLabel(target),
        targetKey: target,
        ProductoWTF: producto,
        ProductoMise: firstText(link, ["ProductoMise", "productoMise"]) || producto,
        CodArticulo: line.codArticulo,
        Referencia: line.referencia,
        ProductoICG: line.descripcion,
        UnidadesVendidas: line.consumo,
        CantidadDescontar: cantidad,
        Unidad: bridgeUnit(link, "Uni"),
        Archivo: path.basename(config.icgBackupPath),
        ImportKey: importKey,
        IcgAuditKey: auditKey,
        Estado: "Pendiente",
        CodAlmacen: line.codAlmacen,
        FechaHora: line.fechaHora || line.fecha || fecha,
        TicketICG: ticketIdentity,
        NumLinea: line.numLinea || "",
        TipoMovimiento: isIcgReturn ? "Devolucion ICG / decomiso automatico" : "Venta ICG"
      };
      result.matched += 1;
      if (!item) {
        consumoRow.Estado = "Producto WTF no encontrado";
        const message = `${producto} no existe en ${targetLabel(target)}.`;
        result.errors.push(message);
        rememberIcgQueueMovement(line, "error", message);
        rememberConsumptionRow(consumoRow);
        continue;
      }
      const existenciaAnterior = targetExistence(item, target);
      if (isIcgReturn) {
        const ledgerClaim = await claimLedgerForImpact(line, physicalKey, importKey, movementId, target, producto, cantidad, consumoRow.Unidad, "decomiso");
        if (!ledgerClaim.claimed) {
          if (ledgerClaim.error) {
            consumoRow.Estado = "Pendiente revision";
            consumoRow.MotivoRevision = ledgerClaim.error;
            result.pending += 1;
            result.errors.push(ledgerClaim.error);
            rememberIcgQueueMovement(line, "pendiente_revision", ledgerClaim.error);
            rememberConsumptionRow(consumoRow);
          } else {
            result.skipped += 1;
            rememberIcgQueueMovement(line, "sincronizado", "Movimiento ICG ya existe en ledger Firestore. No se descuenta nuevamente.");
          }
          appliedConsumptionPhysicalKeys.add(physicalKey);
          continue;
        }
        item.updatedAt = now;
        item.icgLastImportKey = importKey || item.icgLastImportKey || "";
        const existenciaNueva = existenciaAnterior;
        consumoRow.Estado = "Decomiso aplicado";
        consumoRow.ExistenciaActual = existenciaAnterior;
        consumoRow.ExistenciaNueva = existenciaNueva;
        appliedKeys.add(importKey);
        appliedConsumptionAuditKeys.add(auditKey);
        appliedConsumptionPhysicalKeys.add(physicalKey);
        appliedMovementTargets.add(movementTargetKey);
        result.applied += 1;
        rememberIcgQueueMovement(line, "sincronizado", "Devolucion ICG registrada como decomiso automatico en WTF Web.");
        rememberConsumptionRow(consumoRow);

        const historyKey = target === "barMiseAnPlace" || target === "miseAnPlace" ? "histDecomisoCocina" : target.includes("bar") ? "barRegDecomiso" : "regDecomiso";
        appendHistoryRowOnce(historyKey, {
          id: `icg-bak-decomiso-${importKey}`,
          fecha: eventDate,
          producto: targetProductName(item, target),
          medida: item.medida || consumoRow.Unidad || "Uni",
          cantidad,
          existenciaAnterior,
          existenciaNueva,
          usuario: "ICG FrontRest Backup",
          origen: "ICG FrontRest Backup",
          motivo: "Devolucion ICG registrada como decomiso automatico sin reponer inventario vendible",
          area: target.includes("bar") ? "BAR" : "COCINA",
          noAfectaExistencia: true,
          archivo: path.basename(config.icgBackupPath),
          codArticulo: line.codArticulo,
          codAlmacen: line.codAlmacen,
          importKey,
          physicalIcgKey: physicalKey,
          movimientoIcgId: movementId
        });
        try {
          await updateIcgLedgerStatus(config, physicalKey, {
            estado: "decomiso aplicado",
            existenciaAnterior,
            existenciaNueva,
            appliedAt: now,
            updatedAt: now
          });
        } catch (error) {
          result.errors.push(error instanceof Error ? error.message : String(error));
        }
        continue;
      }
      if (existenciaAnterior + 1e-9 < cantidad) {
        const deficit = Number((cantidad - existenciaAnterior).toFixed(4));
        const message = `${targetProductName(item, target)} no tiene existencia suficiente para descuento ICG. Disponible: ${Number(existenciaAnterior.toFixed(4))} ${item.medida || consumoRow.Unidad || ""}. Solicitado: ${Number(cantidad.toFixed(4))} ${consumoRow.Unidad || item.medida || ""}. Faltante: ${deficit}.`;
        consumoRow.Estado = "Stock insuficiente";
        consumoRow.ExistenciaActual = existenciaAnterior;
        consumoRow.ExistenciaNueva = existenciaAnterior;
        consumoRow.MotivoRevision = message;
        result.pending += 1;
        rememberIcgQueueMovement(line, "pendiente_revision", message);
        rememberConsumptionRow(consumoRow);
        continue;
      }
      const ledgerClaim = await claimLedgerForImpact(line, physicalKey, importKey, movementId, target, producto, cantidad, consumoRow.Unidad, "salida");
      if (!ledgerClaim.claimed) {
        if (ledgerClaim.error) {
          consumoRow.Estado = "Pendiente revision";
          consumoRow.ExistenciaActual = existenciaAnterior;
          consumoRow.ExistenciaNueva = existenciaAnterior;
          consumoRow.MotivoRevision = ledgerClaim.error;
          result.pending += 1;
          result.errors.push(ledgerClaim.error);
          rememberIcgQueueMovement(line, "pendiente_revision", ledgerClaim.error);
          rememberConsumptionRow(consumoRow);
        } else {
          result.skipped += 1;
          rememberIcgQueueMovement(line, "sincronizado", "Movimiento ICG ya existe en ledger Firestore. No se descuenta nuevamente.");
        }
        appliedConsumptionPhysicalKeys.add(physicalKey);
        continue;
      }
      applyTargetSalida(item, target, cantidad, now, importKey);
      const existenciaNueva = targetExistence(item, target);
      consumoRow.Estado = "Aplicado";
      consumoRow.ExistenciaActual = existenciaAnterior;
      consumoRow.ExistenciaNueva = existenciaNueva;
      appliedKeys.add(importKey);
      appliedConsumptionAuditKeys.add(auditKey);
      appliedConsumptionPhysicalKeys.add(physicalKey);
      appliedMovementTargets.add(movementTargetKey);
      result.applied += 1;
      rememberIcgQueueMovement(line, "sincronizado", "Descuento aplicado en WTF Web desde Base de Datos ICG Local.");
      rememberConsumptionRow(consumoRow);

      const historyKey = target === "barMiseAnPlace" ? "barHistSalidaRapida" : target === "miseAnPlace" ? "histSalidaRapida" : target.includes("bar") ? "barRegSalidas" : "regSalidas";
      appendHistoryRowOnce(historyKey, {
        id: `icg-bak-${importKey}`,
        fecha: eventDate,
        producto: targetProductName(item, target),
        medida: item.medida || consumoRow.Unidad || "Uni",
        cantidad,
        existenciaAnterior,
        existenciaNueva,
        usuario: "ICG FrontRest Backup",
        origen: "ICG FrontRest Backup",
        archivo: path.basename(config.icgBackupPath),
        codArticulo: line.codArticulo,
        codAlmacen: line.codAlmacen,
        importKey,
        physicalIcgKey: physicalKey,
        movimientoIcgId: movementId
      });
      try {
        await updateIcgLedgerStatus(config, physicalKey, {
          estado: "aplicado",
          existenciaAnterior,
          existenciaNueva,
          appliedAt: now,
          updatedAt: now
        });
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  const originalConsumptionKeys = new Set(consumoRows.map((row) => String(row.ImportKey || "")));
  const updatedConsumptionRows = consumoRows.map((row) => {
    const key = String(row.ImportKey || "");
    const upsert = key ? consumptionUpserts.get(key) : null;
    return upsert ? Object.assign({}, row, upsert) : row;
  });
  const insertedConsumptionRows = Array.from(consumptionUpserts.values()).filter((row) => !originalConsumptionKeys.has(String(row.ImportKey || "")));
  icg.datasets.ConsumoMiseVentas = Object.assign({}, icg.datasets.ConsumoMiseVentas, {
    columns: Array.from(new Set([...(icg.datasets.ConsumoMiseVentas.columns || []), ...DATASET_COLUMNS.ConsumoMiseVentas, "TipoMovimiento", "CodAlmacen"])),
    rows: insertedConsumptionRows.concat(updatedConsumptionRows)
  });
  result.movements = Array.from(queueMovementByIcg.values());
  icg.appliedImports = Array.from(appliedKeys);
  icg.appliedPhysicalIcgKeys = Array.from(appliedConsumptionPhysicalKeys);
  icg.processedBackupDates.unshift({ fecha, backupPath: config.icgBackupPath, processedAt: now, applied: result.applied, matched: result.matched, pending: result.pending, errors: result.errors });
  icg.sourceName = path.basename(config.icgBackupPath);
  icg.updatedAt = now;
  result.ok = result.errors.length === 0 || result.applied > 0 || result.pending > 0 || sourceConsumptionRows.length > 0;
  result.message = result.applied
    ? `Backup ICG aplicado: ${result.applied} descuentos. Pendientes para revision: ${result.pending}.`
    : `Backup ICG leido desde TIQUETSCONSUMO sin descuentos aplicados. Pendientes para revision: ${result.pending}.`;
  await writeAppState(config, appState, result);
  return result;
}

async function syncIcgCatalogToFirestore(config: ServiceConfig, data: Awaited<ReturnType<typeof readLatestBackupConsumption>>): Promise<IcgBackupSyncResult> {
  const appState = await readAppState(config);
  const icg = ensureIcgData(appState);
  mergeBackupArticlesIntoIcgData(icg, data.articles);
  mergeLookupRowsIntoIcgData(icg, "Referencias", data.references, ["REFERENCIA", "CODIGO"], "Codigos / referencias");
  mergeLookupRowsIntoIcgData(icg, "Stocks", data.stocks, ["CODARTICULO", "CODALMACEN"], "Stocks");
  mergeBackupSalePricesIntoIcgData(icg, data.salePrices);
  const now = new Date().toISOString();
  icg.sourceName = sourceDatabaseName(config);
  icg.updatedAt = now;
  const previewMessage = data.previewReadOk === false
    ? `No se pudo leer TIQUETSCONSUMO para la cola visible: ${data.previewReadError || "error no especificado"}. Se conserva la cola local anterior.`
    : data.rows.length
      ? `TIQUETSCONSUMO leido correctamente: ${data.rows.length} linea(s) ICG reciente(s) cargada(s) para vista previa.`
      : "TIQUETSCONSUMO leido correctamente, sin movimientos en el rango configurado.";
  const result: IcgBackupSyncResult = {
    ok: data.previewReadOk !== false,
    backupPath: config.icgBackupPath,
    sourcePath: config.icgSqlDataPath,
    sourceMode: "live-sql",
    databaseName: sourceDatabaseName(config),
    fecha: data.fecha || now.slice(0, 10),
    totalLines: data.rows.length,
    matched: 0,
    applied: 0,
    skipped: data.rows.length,
    pending: 0,
    errors: data.previewReadOk === false && data.previewReadError ? [data.previewReadError] : [],
    message: `Catalogos ICG actualizados desde ${sourceDatabaseName(config)}: ${data.articles.length} articulos, ${data.references.length} referencias, ${data.stocks.length} stocks y ${data.salePrices.length} precios. ${previewMessage} No se aplicaron salidas ni descuentos automaticos.`,
    tableCounts: data.tableCounts,
    preserveLocalIcgQueue: data.previewReadOk === false,
    previewReadOk: data.previewReadOk,
    previewReadError: data.previewReadError,
    movements: data.previewReadOk === false ? undefined : data.rows.map((line) => {
      const movementDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || data.fecha || now.slice(0, 10);
      const importKey = quickHashText(["icg-preview", movementIcgIdFromLine(line, movementDate), line.codAlmacen || ""].join("|"));
      return createBackupMovement(line, movementDate, importKey, "sincronizado", "Vista previa ICG local. No aplica salida ni descuento de inventario.");
    })
  };
  await writeAppState(config, appState, result);
  return result;
}

export async function syncIcgBackupConsumption(config: ServiceConfig): Promise<IcgBackupSyncResult> {
  const activeConfig = Object.assign({}, config, { icgLiveDatabaseName: sourceDatabaseName(config) });
  const data = await readLatestBackupConsumption(activeConfig);
  return syncIcgCatalogToFirestore(activeConfig, data);
}
