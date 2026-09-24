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
  TiquetsLin: ["MovimientoICGId", "PhysicalIcgKey", "FO", "SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "UNIDADES", "CONSUMO", "PRECIO", "PRECIOIVA", "TIPOIVA", "PrecioRestaurante", "PrecioAppsDelivery", "CODVENDEDOR", "CODALMACEN", "FECHA", "HORA", "FECHAHORA", "DESCRIPCION", "REFERENCIA", "USASTOCKS", "Ticket"],
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
  ConsumoMiseVentas: ["Fecha", "Hora", "FechaHora", "MovimientoICGId", "PhysicalIcgKey", "IcgDecisionId", "Serie", "Numero", "N", "Ticket", "TicketICG", "NumLinea", "ModuloWTF", "ProductoWTF", "ProductoMise", "CodArticulo", "Referencia", "ProductoICG", "UnidadesVendidas", "CantidadDescontar", "Unidad", "PrecioRestaurante", "PrecioAppsDelivery", "ExistenciaActual", "ExistenciaNueva", "MotivoRevision", "statusLocked", "statusLockedAt", "decisionUpdatedAt", "decisionSource", "Archivo", "ImportKey", "IcgAuditKey", "FuenteSQL", "Estado"]
};

const CIERRES_DIARIOS_COLUMNS = ["Archivo", "FechaCierre", "Tickets", "Lineas", "VentaBruta", "VentaNeta", "Pagos", "Propina", "Estado", "Observacion"];
const FIREBASE_APP_STATE_SHARD_KEYS = [
  "regProduccion",
  "icgFrontRestData",
  "regSalidas",
  "recetasProduccion",
  "barRegSalidas",
  "barHistSalidaRapida",
  "systemLogs",
  "histSalidaRapida",
  "regEntradas",
  "barRegEntradas",
  "barHistEntradaRapida",
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

function lineText(line: Partial<IcgBackupConsumptionRow> | AnyRecord | undefined | null, keys: string[]): string {
  return firstText(line as AnyRecord, keys);
}

function lineFo(line: Partial<IcgBackupConsumptionRow> | AnyRecord): string {
  return lineText(line, ["fo", "FO"]);
}

function lineSerie(line: Partial<IcgBackupConsumptionRow> | AnyRecord): string {
  return lineText(line, ["serie", "SERIE", "Serie", "numSerie", "NUMSERIE", "NumSerie", "serieDoc", "SERIEDOC", "SerieDoc"]);
}

function lineNumero(line: Partial<IcgBackupConsumptionRow> | AnyRecord): string {
  return lineText(line, ["numero", "NUMERO", "Numero", "numDoc", "NUMDOC", "NumDoc", "numFactura", "NUMFACTURA", "NumFactura"]);
}

function lineN(line: Partial<IcgBackupConsumptionRow> | AnyRecord): string {
  return lineText(line, ["n", "N"]);
}

function lineNumLinea(line: Partial<IcgBackupConsumptionRow> | AnyRecord): string {
  return lineText(line, ["numLinea", "NUMLINEA", "NumLinea", "linea", "LINEA", "Linea"]);
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

function isIcgHistoricalNoApplyStatus(status: unknown): boolean {
  const normalizedStatus = normalizar(status);
  return normalizedStatus === "sin existencia / no aplicar" || normalizedStatus === "sin existencia" || normalizedStatus === "stock insuficiente";
}

function isIcgLockedDecisionStatus(status: unknown): boolean {
  const normalizedStatus = normalizar(status);
  return isIcgHistoricalNoApplyStatus(status) || normalizedStatus === "ya procesado";
}

function icgConsumptionDecisionId(row: AnyRecord): string {
  const existing = firstText(row, ["IcgDecisionId", "DecisionId", "decisionId"]);
  if (existing) return existing;
  const identity = [
    row.PhysicalIcgKey || row.physicalIcgKey || "",
    row.IcgAuditKey || "",
    row.ImportKey || "",
    row.MovimientoICGId || row.movimientoIcgId || "",
    row.Serie || row.SERIE || "",
    row.Numero || row.NUMERO || "",
    row.N || "",
    row.NumLinea || row.NUMLINEA || "",
    row.CodArticulo || row.CODARTICULO || "",
    row.Referencia || row.REFERENCIA || "",
    targetKey(row.targetKey || row.ModuloWTF || ""),
    normalizar(row.ProductoWTF || row.ProductoMise || row.Producto || "")
  ].map((value) => String(value || "").trim()).join("|");
  return identity.replace(/\|/g, "") ? `icg-decision-${quickHashText(identity)}` : "";
}

function stampIcgConsumptionDecision(row: AnyRecord, nowIso = ""): AnyRecord {
  if (!row || typeof row !== "object") return row;
  if (row.statusLocked !== true && !isIcgLockedDecisionStatus(row.Estado)) return row;
  const stampedAt = row.decisionUpdatedAt || row.statusLockedAt || row.reviewedAt || nowIso || row.FechaHora || row.Hora || row.Fecha || "";
  return Object.assign({}, row, {
    Estado: isIcgHistoricalNoApplyStatus(row.Estado) ? "Sin Existencia / No Aplicar" : row.Estado,
    IcgDecisionId: icgConsumptionDecisionId(row),
    statusLocked: true,
    statusLockedAt: row.statusLockedAt || stampedAt,
    decisionUpdatedAt: row.decisionUpdatedAt || stampedAt,
    decisionSource: row.decisionSource || "wtf-icg-host-historical-lock",
    MotivoRevision: row.MotivoRevision || (isIcgHistoricalNoApplyStatus(row.Estado) ? "Sin existencia al momento de la revision ICG." : ""),
    reviewedAt: row.reviewedAt || stampedAt
  });
}

function icgConsumptionDecisionKeys(row: AnyRecord): string[] {
  if (!row || typeof row !== "object") return [];
  const movementId = firstText(row, ["MovimientoICGId", "movimientoIcgId"]);
  const target = targetKey(row.targetKey || row.ModuloWTF || "");
  const product = normalizar(row.ProductoWTF || row.ProductoMise || "");
  return Array.from(new Set([
    icgConsumptionDecisionId(row),
    row.ImportKey,
    row.IcgAuditKey,
    row.PhysicalIcgKey || row.physicalIcgKey,
    movementId ? [movementId, target, product].join("|") : ""
  ].map((key) => String(key || "").trim()).filter(Boolean)));
}

function normalizeIcgDeletedTableRowKeys(input: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!input || typeof input !== "object") return out;
  Object.entries(input as AnyRecord).forEach(([tableKey, value]) => {
    const key = String(tableKey || "").trim();
    if (!key) return;
    const rows = Array.isArray(value) ? value : [];
    out[key] = Array.from(new Set(rows.map((item) => String(item || "").trim()).filter(Boolean)));
  });
  return out;
}

function canonicalDeletedTableKey(value: unknown): string {
  return normalizar(String(value == null ? "" : value).trim());
}

function deletedTableHash(value: unknown): string {
  return `fnv32-${quickHashText(canonicalDeletedTableKey(value))}`;
}

function getIcgTableRowDeletionKeys(tableKey: string, row: AnyRecord): string[] {
  if (!row || typeof row !== "object") return [];
  const normalizedTable = String(tableKey || "").trim();
  const rawKeys: string[] = [];
  const push = (value: unknown) => {
    const text = String(value == null ? "" : value).trim();
    if (text) rawKeys.push(text);
  };
  push(row._deletedKey);
  push(row._id);
  if (normalizedTable === "ConsumoMiseVentas") {
    icgConsumptionDecisionKeys(row).forEach(push);
    push(row.MovimientoICGId || row.movimientoIcgId || "");
    push(row.PhysicalIcgKey || row.physicalIcgKey || "");
    push(row.ImportKey || "");
    push(row.IcgAuditKey || "");
    push([
      row.TicketICG || row.Ticket || row.Factura || "",
      row.NumLinea || row.NUMLINEA || "",
      bridgeCode(row),
      firstText(row, ["CodAlmacen", "CODALMACEN"]),
      targetKey(row.targetKey || row.ModuloWTF || ""),
      normalizar(row.ProductoWTF || row.ProductoMise || "")
    ].join("|"));
  } else if (normalizedTable === "TiquetsLin") {
    push(row.MovimientoICGId || row.movimientoIcgId || "");
    push(row.PhysicalIcgKey || row.physicalIcgKey || "");
    push([
      row.FO || "",
      row.SERIE || row.Serie || "",
      row.NUMERO || row.Numero || "",
      row.N || "",
      row.NUMLINEA || row.NumLinea || "",
      row.CODARTICULO || row.CodArticulo || "",
      row.CODALMACEN || row.CodAlmacen || ""
    ].join("|"));
  } else if (normalizedTable === "CierresDiarios") {
    push(row.FechaCierre || row.Fecha || "");
    push([row.Archivo || "", row.FechaCierre || row.Fecha || ""].join("|"));
  } else {
    push(row.ImportKey || "");
    push(row.CodArticulo || row.CODARTICULO || row.Codigo || "");
    push(row.Referencia || row.REFERENCIA || "");
    push(row.Ticket || row.TicketICG || "");
    push(JSON.stringify(row));
  }
  return Array.from(new Set(rawKeys.map((key) => `${normalizedTable}::${deletedTableHash(key)}`)));
}

function isIcgTableRowDeleted(icg: AnyRecord, tableKey: string, row: AnyRecord): boolean {
  const deleted = normalizeIcgDeletedTableRowKeys(icg?.deletedTableRowKeys);
  const keys = new Set(deleted[String(tableKey || "").trim()] || []);
  if (!keys.size) return false;
  return getIcgTableRowDeletionKeys(tableKey, row).some((key) => keys.has(key));
}

function filterIcgDeletedRows(icg: AnyRecord, tableKey: string, rows: AnyRecord[]): AnyRecord[] {
  return (Array.isArray(rows) ? rows : []).filter((row) => !isIcgTableRowDeleted(icg, tableKey, row));
}

function decisionTime(row: AnyRecord): number {
  const raw = row?.decisionUpdatedAt || row?.statusLockedAt || row?.reviewedAt || row?._updatedAt || row?.updatedAt || row?.FechaHora || row?.Hora || row?.Fecha || "";
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
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
  return [lineFo(line), lineSerie(line), lineNumero(line), lineN(line)].map((part) => String(part || "").trim()).filter(Boolean).join("-");
}

function icgTicketDisplayFromLine(line: Partial<IcgBackupConsumptionRow>): string {
  return [lineSerie(line), lineNumero(line)].map((part) => String(part || "").trim()).filter(Boolean).join("-") || icgTicketIdentityFromLine(line);
}

function tiquetsLinPrimaryKey(line: Partial<IcgBackupConsumptionRow>): string {
  return [
    lineFo(line),
    lineSerie(line),
    lineNumero(line),
    lineN(line),
    lineNumLinea(line),
    line.codArticulo || ""
  ].map((part) => normalizar(part)).join("|");
}

function icgStableConsumptionIdentity(line: Partial<IcgBackupConsumptionRow>, fallbackDate = ""): string {
  return [
    "tiquetslin-v1",
    tiquetsLinPrimaryKey(line),
    line.codAlmacen || ""
  ].map((part) => normalizar(part)).join("|");
}

export function movementIcgIdFromLine(line: Partial<IcgBackupConsumptionRow>, fallbackDate = ""): string {
  const stableIdentity = icgStableConsumptionIdentity(line, fallbackDate);
  if (icgTicketIdentityFromLine(line) && lineNumLinea(line) && line.codArticulo) {
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
    "icg-physical-tiquetslin-v1",
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
    "icg-physical-tiquetslin-v1",
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

function icgLinkNameMatchesLine(line: Partial<IcgBackupConsumptionRow>, link: AnyRecord): boolean {
  const lineName = normalizar(line.descripcion || "");
  const linkName = normalizar(bridgeIcgProduct(link));
  if (!lineName || !linkName) return true;
  return lineName === linkName;
}

function icgLinkMatchesLine(line: Partial<IcgBackupConsumptionRow>, link: AnyRecord): boolean {
  const lineCode = normalizar(line.codArticulo || "");
  const lineRef = normalizar(line.referencia || "");
  const lineName = normalizar(line.descripcion || "");
  const linkCode = normalizar(bridgeCode(link));
  const linkRef = normalizar(bridgeReference(link));
  const linkName = normalizar(bridgeIcgProduct(link));
  const codeMatches = Boolean(lineCode && linkCode && lineCode === linkCode);
  const referenceMatches = Boolean(lineRef && linkRef && lineRef === linkRef);
  if ((codeMatches || referenceMatches) && icgLinkNameMatchesLine(line, link)) return true;
  if (!codeMatches && !referenceMatches && lineName && linkName && lineName === linkName) return true;
  return false;
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
  appState.icgFrontRestData.datasets.TiquetsLin = appState.icgFrontRestData.datasets.TiquetsLin || {
    key: "TiquetsLin",
    label: "TIQUETSLIN SQL",
    columns: DATASET_COLUMNS.TiquetsLin,
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
  appState.icgFrontRestData.deletedTableRowKeys = normalizeIcgDeletedTableRowKeys(appState.icgFrontRestData.deletedTableRowKeys);
  appState.icgFrontRestData.deletedTableRowsUpdatedAt = appState.icgFrontRestData.deletedTableRowsUpdatedAt || "";
  return appState.icgFrontRestData;
}

function mergeBackupArticlesIntoIcgData(icg: AnyRecord, articles: AnyRecord[]): void {
  if (!Array.isArray(articles) || !articles.length) return;
  const current = icg.datasets.Articulos || { key: "Articulos", label: "Articulos ICG", columns: DATASET_COLUMNS.Articulos, rows: [] };
  const existingRows = filterIcgDeletedRows(icg, "Articulos", Array.isArray(current.rows) ? current.rows : []);
  const byCode = new Map<string, AnyRecord>();
  existingRows.forEach((row: AnyRecord) => {
    const code = normalizar(row.CodArticulo || row.CODARTICULO || row.Codigo || "");
    if (code) byCode.set(code, row);
  });
  articles.forEach((row) => {
    if (isIcgTableRowDeleted(icg, "Articulos", row)) return;
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
  filterIcgDeletedRows(icg, key, Array.isArray(current.rows) ? current.rows : []).forEach((row: AnyRecord) => {
    const rowKey = keyFields.map((field) => normalizar(row[field] ?? "")).join("|");
    if (rowKey.replace(/\|/g, "")) byKey.set(rowKey, row);
  });
  rows.forEach((row) => {
    if (isIcgTableRowDeleted(icg, key, row)) return;
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
  const ticketDisplay = icgTicketDisplayFromLine(line);
  const sourcePhysicalKey = ["icg-consumo-source-v1", tiquetsLinPrimaryKey(line), line.codAlmacen || ""].map((part) => normalizar(part)).join("|");
  return {
    MovimientoICGId: movementIcgIdFromLine(line, fecha),
    PhysicalIcgKey: sourcePhysicalKey,
    FO: lineFo(line),
    SERIE: lineSerie(line),
    NUMERO: lineNumero(line),
    N: lineN(line),
    NUMLINEA: lineNumLinea(line),
    CODARTICULO: line.codArticulo || "",
    UNIDADES: line.consumo ?? "",
    CONSUMO: line.consumo ?? "",
    PRECIO: lineText(line, ["precio", "PRECIO", "Precio"]),
    PRECIOIVA: lineText(line, ["precioIva", "PRECIOIVA", "PrecioIva"]),
    TIPOIVA: lineText(line, ["tipoIva", "TIPOIVA", "TipoIva"]),
    CODVENDEDOR: lineText(line, ["codVendedor", "CODVENDEDOR", "CodVendedor"]),
    CODALMACEN: line.codAlmacen || "",
    CODMACRO: line.codMacro || "",
    PrecioRestaurante: lineText(line, ["precioRestaurante", "PrecioRestaurante", "PRECIORESTAURANTE"]),
    PrecioAppsDelivery: lineText(line, ["precioAppsDelivery", "PrecioAppsDelivery", "PRECIOAPPSDELIVERY"]),
    FECHA: line.fecha || fecha || "",
    HORA: line.fechaHora || line.fecha || fecha || "",
    FECHAHORA: line.fechaHora || line.fecha || fecha || "",
    DESCRIPCION: line.descripcion || "",
    REFERENCIA: line.referencia || "",
    USASTOCKS: "T",
    Ticket: ticketDisplay,
    TicketICG: ticketIcg,
    _source: "TIQUETSLIN SQL ICG",
    _updatedAt: new Date().toISOString()
  };
}

function isBillableTiquetsLinRow(row: AnyRecord): boolean {
  const nValue = normalizar(firstText(row, ["N", "n"]));
  return !nValue || nValue === "b";
}

function mergeBackupTiquetsLinIntoIcgData(icg: AnyRecord, sourceRows: AnyRecord[], fecha: string): void {
  if (!Array.isArray(sourceRows) || !sourceRows.length) return;
  const current = icg.datasets.TiquetsLin || { key: "TiquetsLin", label: "TIQUETSLIN SQL", columns: DATASET_COLUMNS.TiquetsLin, rows: [] };
  const existingRows = filterIcgDeletedRows(icg, "TiquetsLin", Array.isArray(current.rows) ? current.rows : []).filter(isBillableTiquetsLinRow);
  const byKey = new Map<string, AnyRecord>();
  existingRows.forEach((row: AnyRecord) => {
    const key = consumptionSourceRowKey(row);
    if (key.replace(/\|/g, "")) byKey.set(key, row);
  });
  sourceRows.forEach((row) => {
    if (!isBillableTiquetsLinRow(row)) return;
    if (isIcgTableRowDeleted(icg, "TiquetsLin", row)) return;
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
    const nextRow = Object.assign({}, byKey.get(key) || {}, consumptionRowFromBackupLine(line, rowDate), row);
    if (isIcgTableRowDeleted(icg, "TiquetsLin", nextRow)) return;
    byKey.set(key, nextRow);
  });
  const mergedRows = Array.from(byKey.values()).sort((a, b) => {
    const ticketA = [a.FECHA || "", a.FECHAHORA || "", a.SERIE || "", a.NUMERO || "", a.N || "", a.NUMLINEA || ""].join("|");
    const ticketB = [b.FECHA || "", b.FECHAHORA || "", b.SERIE || "", b.NUMERO || "", b.N || "", b.NUMLINEA || ""].join("|");
    return String(ticketB).localeCompare(String(ticketA), undefined, { numeric: true });
  });
  icg.datasets.TiquetsLin = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.TiquetsLin, "TicketICG", "_source", "_updatedAt"])),
    rows: mergedRows
  });
}

function mergePreviewConsumptionIntoIcgData(icg: AnyRecord, appState: AnyRecord, sourceRows: IcgBackupConsumptionRow[], fecha: string, config: ServiceConfig): number {
  if (!Array.isArray(sourceRows) || !sourceRows.length) return 0;
  const current = icg.datasets.ConsumoMiseVentas || { key: "ConsumoMiseVentas", label: "Consumo Mise ventas", columns: DATASET_COLUMNS.ConsumoMiseVentas, rows: [] };
  const existingRows = filterIcgDeletedRows(icg, "ConsumoMiseVentas", Array.isArray(current.rows) ? current.rows : []);
  const sourceMovementIds = new Set(sourceRows.map((line) => {
    const consumptionDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || fecha || new Date().toISOString().slice(0, 10);
    return movementIcgIdFromLine(line, consumptionDate);
  }).filter(Boolean));
  const byKey = new Map<string, AnyRecord>();
  existingRows.forEach((row: AnyRecord) => {
    const rowMovementId = String(row?.MovimientoICGId || row?.movimientoIcgId || "").trim();
    const finalized = ["aplicado", "decomiso aplicado"].includes(normalizar(row?.Estado || "")) || row?.statusLocked === true || isIcgLockedDecisionStatus(row?.Estado);
    if (!finalized && rowMovementId && sourceMovementIds.has(rowMovementId)) return;
    const key = String(row?.ImportKey || row?.IcgAuditKey || consumptionPhysicalKeyFromRow(row) || "").trim();
    if (key) byKey.set(key, stampIcgConsumptionDecision(row));
    icgConsumptionDecisionKeys(row).forEach((decisionKey) => byKey.set(decisionKey, stampIcgConsumptionDecision(row)));
  });
  const links = collectIcgBridgeRows(appState).filter(active);
  const sourceName = sourceDatabaseName(config);
  sourceRows.forEach((line) => {
    const consumptionDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || fecha || new Date().toISOString().slice(0, 10);
    const movementId = movementIcgIdFromLine(line, consumptionDate);
    const ticketIdentity = icgTicketIdentityFromLine(line);
    const ticketDisplay = icgTicketDisplayFromLine(line);
    const matchedLinks = links.filter((row) => icgLinkMatchesLine(line, row));
    const linksToWrite = matchedLinks.length ? matchedLinks : [null];
    linksToWrite.forEach((link) => {
      const target = link ? targetKey(link.ModuloWTF || link.DestinoWTF || link.Modulo || "Mise an Place Cocina") : "";
      const product = link ? bridgeWtfProduct(link) : "";
      const qtyFactor = link ? bridgeQuantity(link) || 1 : 1;
      const quantity = Number((Math.abs(parseNumber(line.consumo)) * qtyFactor).toFixed(4));
      const auditKey = consumptionAuditKey(line, target, product, consumptionDate);
      const physicalKey = link ? consumptionPhysicalKey(line, target, product) : "";
      const importKey = quickHashText(["icg-preview-consumo", movementId, ticketIdentity, line.numLinea, line.codArticulo, line.referencia, line.codAlmacen, target, product].join("|"));
      const existing = byKey.get(importKey) || byKey.get(auditKey) || (physicalKey ? byKey.get(physicalKey) : undefined) || {};
      const currentStatus = normalizar(existing.Estado || "");
      const keepStatus = existing.statusLocked === true || ["aplicado", "decomiso aplicado", "sin existencia / no aplicar", "ya procesado"].includes(currentStatus);
      const row: AnyRecord = stampIcgConsumptionDecision(Object.assign({}, existing, {
        _id: existing._id || `icg-preview-${importKey}`,
        Fecha: consumptionDate,
        Hora: line.fechaHora || line.fecha || consumptionDate,
        FechaHora: line.fechaHora || line.fecha || consumptionDate,
        MovimientoICGId: movementId,
        PhysicalIcgKey: physicalKey || existing.PhysicalIcgKey || "",
        Serie: lineSerie(line),
        Numero: lineNumero(line),
        N: lineN(line),
        Ticket: ticketDisplay,
        TicketICG: ticketIdentity,
        NumLinea: lineNumLinea(line),
        ModuloWTF: link ? targetLabel(target) : "",
        targetKey: target,
        ProductoWTF: product,
        ProductoMise: link ? firstText(link, ["ProductoMise", "productoMise"]) || product : "",
        CodArticulo: line.codArticulo || "",
        Referencia: line.referencia || "",
        CodAlmacen: line.codAlmacen || "",
        ProductoICG: line.descripcion || "",
        UnidadesVendidas: line.consumo,
        CantidadDescontar: quantity,
        Unidad: link ? bridgeUnit(link, "Uni") : "Uni",
        PrecioRestaurante: line.precioRestaurante || existing.PrecioRestaurante || "",
        PrecioAppsDelivery: line.precioAppsDelivery || existing.PrecioAppsDelivery || "",
        Archivo: sourceName,
        ImportKey: importKey,
        IcgAuditKey: auditKey,
        FuenteSQL: "TIQUETSLIN",
        Estado: keepStatus ? existing.Estado : link ? "Pendiente" : "Sin vinculo"
      }));
      if (isIcgTableRowDeleted(icg, "ConsumoMiseVentas", row)) return;
      byKey.set(importKey, row);
      if (row.IcgDecisionId) byKey.set(row.IcgDecisionId, row);
    });
  });
  const rowsOut = Array.from(new Map(Array.from(byKey.values()).map((row: AnyRecord) => [
    String(row?.ImportKey || row?.IcgDecisionId || row?.IcgAuditKey || row?.PhysicalIcgKey || row?._id || quickHashText(JSON.stringify(row))).trim(),
    row
  ])).values()).sort((a, b) => {
    const moment = String(b.FechaHora || b.Fecha || "").localeCompare(String(a.FechaHora || a.Fecha || ""));
    if (moment) return moment;
    const ticket = String(b.Ticket || b.TicketICG || "").localeCompare(String(a.Ticket || a.TicketICG || ""), undefined, { numeric: true });
    if (ticket) return ticket;
    return parseNumber(b.NumLinea || 0) - parseNumber(a.NumLinea || 0);
  });
  icg.datasets.ConsumoMiseVentas = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.ConsumoMiseVentas, "CodAlmacen"])),
    rows: rowsOut
  });
  return sourceRows.length;
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

function salePricesByArticleCode(salePrices: AnyRecord[]): Map<string, { restaurant?: string; apps?: string }> {
  const byCode = new Map<string, { restaurant?: string; apps?: string; restaurantFormat?: number; appsFormat?: number }>();
  if (!Array.isArray(salePrices)) return byCode;
  salePrices.forEach((row) => {
    const code = normalizar(bridgeCode(row));
    const tariff = normalizar(row.IDTARIFAV || row.IDTarifaV || "");
    const price = parseNumber(row.VALOR ?? row.Valor);
    const format = parseNumber(row.CODFORMATO || row.CodFormato);
    if (!code || !(price > 0) || (tariff !== "1" && tariff !== "2")) return;
    const current = byCode.get(code) || {};
    const value = String(row.VALOR ?? row.Valor ?? price);
    if (tariff === "1" && (current.restaurant === undefined || format < (current.restaurantFormat ?? Number.MAX_SAFE_INTEGER))) {
      current.restaurant = value;
      current.restaurantFormat = format;
    }
    if (tariff === "2" && (current.apps === undefined || format < (current.appsFormat ?? Number.MAX_SAFE_INTEGER))) {
      current.apps = value;
      current.appsFormat = format;
    }
    byCode.set(code, current);
  });
  return byCode as Map<string, { restaurant?: string; apps?: string }>;
}

function attachSalePricesToConsumptionRows(rows: IcgBackupConsumptionRow[], salePrices: AnyRecord[]): IcgBackupConsumptionRow[] {
  const byCode = salePricesByArticleCode(salePrices);
  if (!rows.length || !byCode.size) return rows;
  return rows.map((line) => {
    const prices = byCode.get(normalizar(line.codArticulo || (line as AnyRecord).CODARTICULO || ""));
    if (!prices) return line;
    return Object.assign({}, line, {
      precioRestaurante: prices.restaurant || line.precioRestaurante || "",
      precioAppsDelivery: prices.apps || line.precioAppsDelivery || ""
    });
  });
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
      Observacion: row.Observacion || "Generado desde TIQUETSCAB, TIQUETSLIN y pagos de la base local."
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
    AND CONVERT(date,c.FECHA) >= '20260914'
),
lineas AS (
  SELECT SERIE,NUMERO,N,COUNT(NUMLINEA) AS Lineas
  FROM TIQUETSLIN
  GROUP BY SERIE,NUMERO,N
),
daily AS (
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
LEFT JOIN lineas l ON l.SERIE=c.SERIE AND l.NUMERO=c.NUMERO AND l.N=c.N
${paymentsJoin}
GROUP BY c.FechaCierre
)
SELECT *
FROM daily
ORDER BY FechaCierre DESC;`;
  return normalizeIcgClosureRows(parseSqlRows(await runSql(config, databaseName, sql)), databaseName);
}

async function readRecentIcgConsumptionPreview(config: ServiceConfig, databaseName: string): Promise<IcgBackupConsumptionRow[]> {
  const sql = `
IF OBJECT_ID('TIQUETSLIN','U') IS NOT NULL
BEGIN
  WITH consumo AS (
    SELECT
      ISNULL(CAST(c.FO AS varchar(30)),'') AS FO,
      ISNULL(CAST(COALESCE(NULLIF(CAST(tl.SERIE AS varchar(30)),''), CAST(c.SERIE AS varchar(30))) AS varchar(30)),'') AS SERIE,
      ISNULL(CAST(COALESCE(NULLIF(CAST(tl.NUMERO AS varchar(30)),''), CAST(c.NUMERO AS varchar(30))) AS varchar(30)),'') AS NUMERO,
      ISNULL(CAST(COALESCE(NULLIF(CAST(tl.N AS varchar(30)),''), CAST(c.N AS varchar(30))) AS varchar(30)),'') AS N,
      ISNULL(CAST(tl.NUMLINEA AS varchar(30)),'') AS NUMLINEA,
      ISNULL(CAST(tl.CODARTICULO AS varchar(30)),'') AS CODARTICULO,
      CAST('' AS varchar(30)) AS CODALMACEN,
      MIN(COALESCE(TRY_CONVERT(datetime, tl.HORA), TRY_CONVERT(datetime, c.HORAFIN), TRY_CONVERT(datetime, c.FECHA))) AS FECHAHORA,
      SUM(ISNULL(tl.UNIDADES,0)) AS CONSUMO,
      SUM(ISNULL(tl.UNIDADES,0)) AS UNIDADES,
      MAX(ISNULL(CAST(tl.PRECIO AS varchar(30)),'')) AS PRECIO,
      MAX(ISNULL(CAST(tl.PRECIOIVA AS varchar(30)),'')) AS PRECIOIVA,
      MAX(ISNULL(CAST(tl.TIPOIVA AS varchar(30)),'')) AS TIPOIVA,
      MAX(ISNULL(CAST(tl.CODVENDEDOR AS varchar(30)),'')) AS CODVENDEDOR,
      MAX(ISNULL(NULLIF(tl.DESCRIPCION,''), ISNULL(a.DESCRIPCION,''))) AS DESCRIPCION,
      MAX(ISNULL(NULLIF(tl.REFERENCIA,''), ISNULL(a.REFERENCIA,''))) AS REFERENCIA,
      MAX(ISNULL(CAST(a.USASTOCKS AS varchar(10)),'')) AS USASTOCKS
    FROM TIQUETSLIN tl
    LEFT JOIN TIQUETSCAB c ON c.SERIE=tl.SERIE AND c.NUMERO=tl.NUMERO AND c.N=tl.N
    LEFT JOIN ARTICULOS a ON CAST(a.CODARTICULO AS varchar(30)) = CAST(tl.CODARTICULO AS varchar(30))
    WHERE (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101')
      AND UPPER(LTRIM(RTRIM(CAST(COALESCE(NULLIF(CAST(tl.N AS varchar(30)),''), CAST(c.N AS varchar(30))) AS varchar(30))))) = 'B'
      AND CONVERT(date,c.FECHA) >= '20260914'
    GROUP BY
      c.FO,
      COALESCE(NULLIF(CAST(tl.SERIE AS varchar(30)),''), CAST(c.SERIE AS varchar(30))),
      COALESCE(NULLIF(CAST(tl.NUMERO AS varchar(30)),''), CAST(c.NUMERO AS varchar(30))),
      COALESCE(NULLIF(CAST(tl.N AS varchar(30)),''), CAST(c.N AS varchar(30))),
      tl.NUMLINEA, tl.CODARTICULO
  )
  SELECT
    FO,
    SERIE,
    NUMERO,
    N,
    NUMLINEA,
    CODARTICULO,
    ISNULL(CAST(UNIDADES AS varchar(30)),'') AS UNIDADES,
    ISNULL(CAST(CONSUMO AS varchar(30)),'') AS CONSUMO,
    CODALMACEN,
    CAST('' AS varchar(30)) AS CODMACRO,
    ISNULL(CONVERT(varchar(10),FECHAHORA,120),'') AS FECHA,
    ISNULL(CONVERT(varchar(19),FECHAHORA,120),'') AS HORA,
    ISNULL(CONVERT(varchar(19),FECHAHORA,120),'') AS FECHAHORA,
    PRECIO,
    PRECIOIVA,
    TIPOIVA,
    CODVENDEDOR,
    DESCRIPCION,
    REFERENCIA,
    USASTOCKS
  FROM consumo
  WHERE ISNULL(CONSUMO,0) <> 0
  ORDER BY FECHAHORA DESC, SERIE DESC, NUMERO DESC, N DESC, NUMLINEA DESC, CODARTICULO DESC;
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
    CAST('' AS varchar(30)) AS UNIDADES,
    CAST('' AS varchar(30)) AS CONSUMO,
    CAST('' AS varchar(30)) AS CODALMACEN,
    CAST('' AS varchar(30)) AS CODMACRO,
    CAST('' AS varchar(30)) AS FECHA,
    CAST('' AS varchar(30)) AS HORA,
    CAST('' AS varchar(30)) AS FECHAHORA,
    CAST('' AS varchar(30)) AS PRECIO,
    CAST('' AS varchar(30)) AS PRECIOIVA,
    CAST('' AS varchar(30)) AS TIPOIVA,
    CAST('' AS varchar(30)) AS CODVENDEDOR,
    CAST('' AS varchar(120)) AS DESCRIPCION,
    CAST('' AS varchar(60)) AS REFERENCIA,
    CAST('' AS varchar(10)) AS USASTOCKS;
END`;
  return parseSqlRows(await runSql(config, databaseName, sql)).map((row) => {
    const consumo = parseNumber(row.CONSUMO);
    const tipoMovimiento: IcgBackupConsumptionRow["tipoMovimiento"] = consumo < 0 ? "devolucion" : "venta";
    const fechaHora = firstText(row, ["HORA", "Hora", "FECHAHORA", "FechaHora"]);
    return {
      fecha: firstText(row, ["FECHA", "Fecha"]),
      fechaHora,
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
      precio: firstText(row, ["PRECIO", "Precio"]),
      precioIva: firstText(row, ["PRECIOIVA", "PrecioIva"]),
      tipoIva: firstText(row, ["TIPOIVA", "TipoIva"]),
      codVendedor: firstText(row, ["CODVENDEDOR", "CodVendedor"]),
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
  if (!String(config.icgAuditDbName || "").trim()) {
    throw new Error("La restauracion audit del backup ICG esta desactivada. El Host debe leer directamente la base SQL local configurada en ICG_LIVE_DATABASE_NAME.");
  }
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
  tiquetsLinRows: AnyRecord[];
  closures: AnyRecord[];
  previewReadOk: boolean;
  previewReadError: string;
}> {
  const databaseName = sourceDatabaseName(config);
  await assertLiveIcgDatabaseIsAvailable(config, databaseName);
  const latest = parseSqlRows(await runSql(config, databaseName, "SELECT CONVERT(varchar(10), CONVERT(date, GETDATE()), 120) AS Fecha;"))[0]?.Fecha;
  let closures: AnyRecord[] = [];
  const countSql = "SELECT t.name AS tableName, CAST(SUM(p.rows) AS int) AS rowsCount FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1) WHERE t.name IN ('ARTICULOS','REFERENCIAS','STOCKS','PRECIOSVENTA','TIQUETSLIN') GROUP BY t.name;";
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
    ISNULL(CAST(CODFORMATO AS varchar(30)),'') AS CODFORMATO,
    ISNULL(CAST(IDTARIFAV AS varchar(30)),'') AS IDTARIFAV,
    CASE WHEN IDTARIFAV = 1 THEN 'Precio Restaurante' WHEN IDTARIFAV = 2 THEN 'Precio APPS Delivery' ELSE '' END AS TarifaNombre,
    ISNULL(CAST(VALOR AS varchar(30)),'') AS VALOR,
    ISNULL(CAST(VALOR AS varchar(30)),'') AS Valor
  FROM PRECIOSVENTA
  WHERE IDTARIFAV IN (1,2)
    AND VALOR IS NOT NULL AND VALOR > 0
    AND (DESCATALOGADO IS NULL OR DESCATALOGADO = 0)
  ORDER BY CAST(CODARTICULO AS varchar(30)), IDTARIFAV, CODFORMATO;
END
ELSE
BEGIN
  SELECT TOP 0
    CAST('' AS varchar(30)) AS CODARTICULO,
    CAST('' AS varchar(30)) AS CODFORMATO,
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
  closures = await readBackupDailyClosures(config, databaseName).catch(() => []);
  let previewConsumptionRows: IcgBackupConsumptionRow[] = [];
  let previewReadOk = true;
  let previewReadError = "";
  try {
    previewConsumptionRows = await readRecentIcgConsumptionPreview(config, databaseName);
  } catch (error) {
    previewReadOk = false;
    previewReadError = error instanceof Error ? error.message : String(error);
  }
  previewConsumptionRows = attachSalePricesToConsumptionRows(previewConsumptionRows, salePrices);
  const tiquetsLinRows: AnyRecord[] = previewConsumptionRows.map((line) => {
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
      tiquetsLinRows,
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
    tiquetsLinRows,
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
    precioRestaurante: line.precioRestaurante || "",
    precioAppsDelivery: line.precioAppsDelivery || "",
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
      PrecioRestaurante: line.precioRestaurante || "",
      PrecioAppsDelivery: line.precioAppsDelivery || "",
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

export async function applyBackupConsumptionToFirestore(config: ServiceConfig, rowsToApply: IcgBackupConsumptionRow[], fecha: string, tableCounts: Record<string, number>, articles: AnyRecord[] = [], closures: AnyRecord[] = [], salePrices: AnyRecord[] = [], tiquetsLinRows: AnyRecord[] = []): Promise<IcgBackupSyncResult> {
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
  const pricedRowsToApply = attachSalePricesToConsumptionRows(rowsToApply, salePrices);
  const sourceConsumptionRows = tiquetsLinRows.length
    ? attachSalePricesToConsumptionRows(tiquetsLinRows as IcgBackupConsumptionRow[], salePrices)
    : pricedRowsToApply.map((line) => consumptionRowFromBackupLine(line, fecha));
  const cloudPause = await readIcgControlPause(config);
  if (cloudPause.paused) {
    icg.inventoryImpactPaused = true;
    icg.icgHostDiscountsPaused = true;
    icg.inventoryImpactPauseReason = cloudPause.reason || icg.inventoryImpactPauseReason || "Descuentos ICG pausados por auditoria. No se aplicaron salidas automaticas.";
  }
  if (icg.inventoryImpactPaused || icg.icgHostDiscountsPaused) {
    result.ok = true;
    result.skipped = pricedRowsToApply.length;
    result.pending = pricedRowsToApply.length;
    result.message = icg.inventoryImpactPauseReason || "Descuentos ICG pausados por auditoria. No se aplicaron salidas automaticas.";
    result.movements = pricedRowsToApply.map((line) => {
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
  mergeBackupTiquetsLinIntoIcgData(icg, sourceConsumptionRows, fecha);
  mergeBackupSalePricesIntoIcgData(icg, salePrices);
  const currentClosures = icg.datasets.CierresDiarios || { key: "CierresDiarios", label: "Cierres diarios", columns: CIERRES_DIARIOS_COLUMNS, rows: [] };
  const visibleClosures = filterIcgDeletedRows(icg, "CierresDiarios", closures);
  if (visibleClosures.length) {
    icg.datasets.CierresDiarios = Object.assign({}, currentClosures, {
      columns: Array.from(new Set([...(currentClosures.columns || []), ...CIERRES_DIARIOS_COLUMNS])),
      rows: visibleClosures
    });
  } else if (closures.length) {
    icg.datasets.CierresDiarios = Object.assign({}, currentClosures, {
      columns: Array.from(new Set([...(currentClosures.columns || []), ...CIERRES_DIARIOS_COLUMNS])),
      rows: filterIcgDeletedRows(icg, "CierresDiarios", Array.isArray(currentClosures.rows) ? currentClosures.rows : [])
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
    consumptionUpserts.set(key, stampIcgConsumptionDecision(row, now));
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

  for (const line of pricedRowsToApply) {
    const eventDate = String(line.fechaHora || line.fecha || fecha).replace(" ", "T");
    const icgConsumptionDate = line.fecha || String(line.fechaHora || "").slice(0, 10) || fecha;
    const ticketIdentity = icgTicketIdentityFromLine(line);
    const ticketDisplay = icgTicketDisplayFromLine(line);
    const movementId = movementIcgIdFromLine(line, icgConsumptionDate);
    const isIcgReturn = line.tipoMovimiento === "devolucion" || line.consumo < 0;
    const matchedLinks = links.filter((row) => icgLinkMatchesLine(line, row));
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
        Hora: line.fechaHora || line.fecha || fecha,
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
        PrecioRestaurante: line.precioRestaurante || "",
        PrecioAppsDelivery: line.precioAppsDelivery || "",
        Archivo: path.basename(config.icgBackupPath),
        ImportKey: pendingImportKey,
        IcgAuditKey: pendingAuditKey,
        FuenteSQL: "TIQUETSLIN",
        Estado: "Sin vinculo",
        CodAlmacen: line.codAlmacen,
        FechaHora: line.fechaHora || line.fecha || fecha,
        Serie: lineSerie(line),
        Numero: lineNumero(line),
        N: lineN(line),
        Ticket: ticketDisplay,
        TicketICG: ticketIdentity,
        NumLinea: lineNumLinea(line),
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
        Hora: line.fechaHora || line.fecha || fecha,
        MovimientoICGId: movementId,
        PhysicalIcgKey: physicalKey,
        Serie: lineSerie(line),
        Numero: lineNumero(line),
        N: lineN(line),
        Ticket: ticketDisplay,
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
        PrecioRestaurante: line.precioRestaurante || "",
        PrecioAppsDelivery: line.precioAppsDelivery || "",
        Archivo: path.basename(config.icgBackupPath),
        ImportKey: importKey,
        IcgAuditKey: auditKey,
        FuenteSQL: "TIQUETSLIN",
        Estado: "Pendiente",
        CodAlmacen: line.codAlmacen,
        FechaHora: line.fechaHora || line.fecha || fecha,
        TicketICG: ticketIdentity,
        NumLinea: lineNumLinea(line),
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
        consumoRow.Estado = "Sin Existencia / No Aplicar";
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
    : `Backup ICG leido desde TIQUETSLIN sin descuentos aplicados. Pendientes para revision: ${result.pending}.`;
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
  const visibleClosures = filterIcgDeletedRows(icg, "CierresDiarios", data.closures);
  if (visibleClosures.length) {
    const currentClosures = icg.datasets.CierresDiarios || { key: "CierresDiarios", label: "Cierres diarios", columns: CIERRES_DIARIOS_COLUMNS, rows: [] };
    icg.datasets.CierresDiarios = Object.assign({}, currentClosures, {
      columns: Array.from(new Set([...(currentClosures.columns || []), ...CIERRES_DIARIOS_COLUMNS])),
      rows: visibleClosures
    });
  } else if (data.closures.length) {
    const currentClosures = icg.datasets.CierresDiarios || { key: "CierresDiarios", label: "Cierres diarios", columns: CIERRES_DIARIOS_COLUMNS, rows: [] };
    icg.datasets.CierresDiarios = Object.assign({}, currentClosures, {
      columns: Array.from(new Set([...(currentClosures.columns || []), ...CIERRES_DIARIOS_COLUMNS])),
      rows: filterIcgDeletedRows(icg, "CierresDiarios", Array.isArray(currentClosures.rows) ? currentClosures.rows : [])
    });
  }
  if (data.previewReadOk !== false) {
    mergeBackupTiquetsLinIntoIcgData(icg, data.tiquetsLinRows, data.fecha || new Date().toISOString().slice(0, 10));
    mergePreviewConsumptionIntoIcgData(icg, appState, data.rows, data.fecha || new Date().toISOString().slice(0, 10), config);
  }
  const now = new Date().toISOString();
  icg.sourceName = sourceDatabaseName(config);
  icg.updatedAt = now;
  const previewMessage = data.previewReadOk === false
    ? `No se pudo leer TIQUETSLIN para la cola visible: ${data.previewReadError || "error no especificado"}. Se conserva la cola local anterior.`
    : data.rows.length
      ? `TIQUETSLIN leido correctamente: ${data.rows.length} linea(s) ICG historica(s) cargada(s) para vista previa.`
      : "TIQUETSLIN leido correctamente, sin movimientos disponibles.";
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

