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
  TiquetsLin: ["FO", "SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "DESCRIPCION", "UNIDADES", "PRECIO", "PRECIOIVA", "TOTAL", "REFERENCIA", "HORA", "FECHA"],
  TicketLin: ["FO", "SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "DESCRIPCION", "UNIDADES", "PRECIO", "PRECIOIVA", "TOTAL", "REFERENCIA", "HORA", "FECHA", "TicketICG", "MovimientoICGId"],
  TiquetsConsumo: ["MovimientoICGId", "FO", "SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "CONSUMO", "CODALMACEN", "CODMACRO"],
  Articulos: ["CodArticulo", "Referencia", "Descripcion", "Dpto", "Seccion", "Unidades", "PrecioVentaSinImpuestos", "UnidadMedida", "SeCompra", "SeVende", "UsaStocks", "StockMinimo", "CosteMedio", "UltimoCoste", "Suspendido", "Descatalogado", "FechaModificado"],
  Referencias: ["REFERENCIA", "CODIGO", "TIPOREF", "CODPROVEEDOR"],
  Kits: ["CODARTICULO", "LINEAKIT", "CODARTKIT", "REFERENCIA", "DESCRIPCIOKIT", "REFERENCIAKIT", "UNIDADES", "PRECIOUNIDAD", "TOTALLINEA"],
  Moviments: ["ID", "CODALMACENORIGEN", "CODALMACENDESTINO", "NUMSERIE", "CODARTICULO", "FECHA", "HORA", "TIPO", "UNIDADES", "SERIEDOC", "NUMDOC"],
  Stocks: ["CODARTICULO", "CODALMACEN", "STOCK", "PEDIDO", "ASERVIR", "MINIMO", "FECHAMODIFICADO"],
  ComprasCab: ["SERIE", "NUMERO", "N", "FECHA", "CODPROVEEDOR", "CODALMACEN", "SUFACTURA", "TOTALBRUTO", "TOTALNETO"],
  ComprasLin: ["SERIE", "NUMERO", "N", "NUMLINEA", "CODARTICULO", "REFERENCIA", "DESCRIPCION", "UDSTOTAL", "PRECIO", "TOTAL", "CODALMACEN"],
  PreciosVenta: ["CODARTICULO", "CodArticulo", "Referencia", "Descripcion", "CODFORMATO", "CodFormato", "IDTARIFAV", "VALOR", "Valor", "PRECIOVENTA", "PrecioVenta", "PRECIO", "Precio", "PVP", "PrecioDefecto", "_source", "_updatedAt"],
  Proveedores: ["CODPROVEEDOR", "NOMPROVEEDOR", "NOMCOMERCIAL", "ALIAS", "TELEFONO1", "TELEFONO2", "E_MAIL"],
  Clientes: ["CODCLIENTE", "NOMBRECOMERCIAL", "NOMBRECLIENTE", "ALIAS", "TELEFONO1", "TELEFONO2", "E_MAIL", "ESTADO", "NUMTARJETA"],
  ConsumoMiseVentas: ["Fecha", "MovimientoICGId", "TicketICG", "FechaHora", "NumLinea", "ModuloWTF", "ProductoWTF", "ProductoMise", "CodArticulo", "Referencia", "ProductoICG", "UnidadesVendidas", "CantidadDescontar", "Unidad", "ExistenciaActual", "ExistenciaNueva", "MotivoRevision", "Archivo", "ImportKey", "IcgAuditKey", "Estado"]
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

function movementIcgIdFromLine(line: Partial<IcgBackupConsumptionRow>, fallbackDate = ""): string {
  const existing = String(line.movimientoIcgId || "").trim();
  if (existing) return existing;
  return quickHashText([
    "icg-line",
    String(line.fecha || fallbackDate || "").slice(0, 10),
    line.fechaHora || "",
    line.fo || "",
    line.serie || "",
    line.numero || "",
    line.n || "",
    line.numLinea || "",
    line.codArticulo || "",
    line.referencia || "",
    line.codAlmacen || "",
    line.consumo || ""
  ].join("|"));
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

function consumptionAuditKey(line: Partial<IcgBackupConsumptionRow>, target: string, product: string, fecha: string): string {
  return [
    normalizar(movementIcgIdFromLine(line, fecha)),
    normalizar(String(line.fecha || line.fechaHora || fecha || "").slice(0, 10)),
    normalizar(icgTicketIdentityFromLine(line)),
    normalizar(line.numLinea || ""),
    normalizar(line.fechaHora || ""),
    normalizar(line.codArticulo || ""),
    normalizar(line.referencia || ""),
    targetKey(target),
    normalizar(product)
  ].join("|");
}

function consumptionAuditKeyFromRow(row: AnyRecord): string {
  return [
    normalizar(firstText(row, ["MovimientoICGId", "movimientoIcgId", "MovementICGId"])),
    normalizar(String(row.Fecha || row.FechaHora || "").slice(0, 10)),
    normalizar(firstText(row, ["TicketICG", "Ticket", "TicketKey", "Factura"])),
    normalizar(firstText(row, ["NumLinea", "NUMLINEA"])),
    normalizar(firstText(row, ["FechaHora", "Hora", "HORA"])),
    normalizar(bridgeCode(row)),
    normalizar(bridgeReference(row)),
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
  appState.icgFrontRestData.datasets.TiquetsLin = appState.icgFrontRestData.datasets.TiquetsLin || {
    key: "TiquetsLin",
    label: "Lineas tickets",
    columns: DATASET_COLUMNS.TiquetsLin,
    rows: []
  };
  appState.icgFrontRestData.datasets.TicketLin = appState.icgFrontRestData.datasets.TicketLin || {
    key: "TicketLin",
    label: "TICKETLIN SQL",
    columns: DATASET_COLUMNS.TicketLin,
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

function mergeBackupTicketLinesIntoIcgData(icg: AnyRecord, ticketLines: AnyRecord[]): void {
  if (!Array.isArray(ticketLines) || !ticketLines.length) return;
  const current = icg.datasets.TiquetsLin || { key: "TiquetsLin", label: "Lineas tickets", columns: DATASET_COLUMNS.TiquetsLin, rows: [] };
  const currentSql = icg.datasets.TicketLin || { key: "TicketLin", label: "TICKETLIN SQL", columns: DATASET_COLUMNS.TicketLin, rows: [] };
  const existingRows = Array.isArray(current.rows) ? current.rows : [];
  const existingSqlRows = Array.isArray(currentSql.rows) ? currentSql.rows : [];
  const byKey = new Map<string, AnyRecord>();
  function rowKey(row: AnyRecord): string {
    return [
      firstText(row, ["FO", "fo"]),
      firstText(row, ["SERIE", "Serie", "serie"]),
      firstText(row, ["NUMERO", "Numero", "numero"]),
      firstText(row, ["N", "n"]),
      firstText(row, ["NUMLINEA", "NumLinea", "numLinea"]),
      firstText(row, ["CODARTICULO", "CodArticulo", "codArticulo"]),
      firstText(row, ["HORA", "Hora", "fechaHora"])
    ].map((value) => normalizar(value)).join("|");
  }
  existingRows.forEach((row: AnyRecord) => {
    const key = rowKey(row);
    if (key.replace(/\|/g, "")) byKey.set(key, row);
  });
  existingSqlRows.forEach((row: AnyRecord) => {
    const key = rowKey(row);
    if (key.replace(/\|/g, "")) byKey.set(key, row);
  });
  ticketLines.forEach((row) => {
    const key = rowKey(row);
    if (!key.replace(/\|/g, "")) return;
    const ticketIcg = icgTicketIdentityFromLine({
      fo: firstText(row, ["FO", "fo"]),
      serie: firstText(row, ["SERIE", "Serie", "serie"]),
      numero: firstText(row, ["NUMERO", "Numero", "numero"]),
      n: firstText(row, ["N", "n"])
    });
    const movementId = movementIcgIdFromLine({
      fo: firstText(row, ["FO", "fo"]),
      serie: firstText(row, ["SERIE", "Serie", "serie"]),
      numero: firstText(row, ["NUMERO", "Numero", "numero"]),
      n: firstText(row, ["N", "n"]),
      numLinea: firstText(row, ["NUMLINEA", "NumLinea", "numLinea"]),
      codArticulo: firstText(row, ["CODARTICULO", "CodArticulo", "codArticulo"]),
      referencia: firstText(row, ["REFERENCIA", "Referencia", "referencia"]),
      fechaHora: firstText(row, ["HORA", "Hora", "fechaHora"]),
      fecha: firstText(row, ["FECHA", "Fecha", "fecha"])
    }, firstText(row, ["FECHA", "Fecha", "fecha"]));
    byKey.set(key, Object.assign({}, byKey.get(key) || {}, row, {
      TicketICG: ticketIcg,
      MovimientoICGId: movementId,
      _source: "TICKETLIN SQL ICG",
      _updatedAt: new Date().toISOString()
    }));
  });
  const mergedRows = Array.from(byKey.values()).sort((a, b) => {
    const ticketA = [a.FECHA || "", a.SERIE || "", a.NUMERO || "", a.N || "", a.NUMLINEA || ""].join("|");
    const ticketB = [b.FECHA || "", b.SERIE || "", b.NUMERO || "", b.N || "", b.NUMLINEA || ""].join("|");
    return String(ticketB).localeCompare(String(ticketA), undefined, { numeric: true });
  });
  icg.datasets.TiquetsLin = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.TiquetsLin, "TicketICG", "MovimientoICGId"])),
    rows: mergedRows
  });
  icg.datasets.TicketLin = Object.assign({}, currentSql, {
    columns: Array.from(new Set([...(currentSql.columns || []), ...DATASET_COLUMNS.TicketLin])),
    rows: mergedRows
  });
  const articles = icg.datasets.Articulos;
  if (!articles || !Array.isArray(articles.rows)) return;
  const latestPriceByCode = new Map<string, number>();
  ticketLines.forEach((row) => {
    const code = normalizar(bridgeCode(row));
    const price = parseNumber(row.PRECIO ?? row.Precio);
    if (code && price > 0) latestPriceByCode.set(code, price);
  });
  articles.rows = articles.rows.map((row: AnyRecord) => {
    const code = normalizar(bridgeCode(row));
    const price = code ? latestPriceByCode.get(code) : 0;
    if (!(price && price > 0) || parseNumber(row.PrecioVentaSinImpuestos || row.PrecioVenta || row.PRECIOVENTA) > 0) return row;
    return Object.assign({}, row, {
      PrecioVentaSinImpuestos: price,
      PrecioVenta: price,
      PRECIOVENTA: price,
      Precio: price,
      PRECIO: price,
      _salePriceSource: "TICKETLIN SQL ICG",
      _salePriceUpdatedAt: new Date().toISOString()
    });
  });
  articles.columns = Array.from(new Set((articles.columns || []).map((column: string) => column === "PCoste" ? "PrecioVentaSinImpuestos" : column).concat(["PrecioVentaSinImpuestos", "PrecioVenta", "PRECIOVENTA", "Precio", "PRECIO"])));
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
    const key = [
      row.CodArticulo || row.CODARTICULO || "",
      row.CodFormato || row.CODFORMATO || "",
      row.IDTarifaV || row.IDTARIFAV || ""
    ].map((value) => normalizar(value)).join("|");
    if (!key.replace(/\|/g, "")) return;
    byKey.set(key, Object.assign({}, byKey.get(key) || {}, row, {
      _source: row._source || "PRECIOSVENTA SQL ICG",
      _updatedAt: new Date().toISOString()
    }));
  });
  icg.datasets.PreciosVenta = Object.assign({}, current, {
    columns: Array.from(new Set([...(current.columns || []), ...DATASET_COLUMNS.PreciosVenta, "CodArticulo", "CodFormato", "Valor", "PrecioVenta", "PRECIOVENTA", "Precio", "PRECIO", "PVP", "PrecioDefecto", "_source", "_updatedAt"])),
    rows: Array.from(byKey.values()).sort((a, b) => String(a.CodArticulo || a.CODARTICULO || "").localeCompare(String(b.CodArticulo || b.CODARTICULO || ""), undefined, { numeric: true }))
  });

  const bestPriceByCode = new Map<string, number>();
  Array.from(byKey.values()).forEach((row) => {
    const code = normalizar(bridgeCode(row));
    const price = parseNumber(row.VALOR ?? row.Valor ?? row.Precio ?? row.PRECIO ?? row.PrecioVenta ?? row.PRECIOVENTA);
    if (!code || !(price > 0)) return;
    const previous = bestPriceByCode.get(code) || 0;
    if (price > previous) bestPriceByCode.set(code, price);
  });
  const articles = icg.datasets.Articulos;
  if (!articles || !Array.isArray(articles.rows)) return;
  articles.rows = articles.rows.map((row: AnyRecord) => {
    const code = normalizar(bridgeCode(row));
    const price = code ? bestPriceByCode.get(code) : 0;
    if (!(price && price > 0)) return row;
    return Object.assign({}, row, {
      PrecioVentaSinImpuestos: price,
      PrecioVenta: price,
      PRECIOVENTA: price,
      Precio: price,
      PRECIO: price,
      PVP: price,
      _salePriceSource: "PRECIOSVENTA SQL ICG",
      _salePriceUpdatedAt: new Date().toISOString()
    });
  });
  articles.columns = Array.from(new Set((articles.columns || []).map((column: string) => column === "PCoste" ? "PrecioVentaSinImpuestos" : column).concat(["PrecioVentaSinImpuestos", "PrecioVenta", "PRECIOVENTA", "Precio", "PRECIO", "PVP"])));
}

function salePriceRowsFromTicketLines(ticketLines: AnyRecord[]): AnyRecord[] {
  const byCode = new Map<string, AnyRecord>();
  (Array.isArray(ticketLines) ? ticketLines : []).forEach((row) => {
    const code = firstText(row, ["CODARTICULO", "CodArticulo", "Codigo", "CODIGO"]);
    if (!code) return;
    const price = parseNumber(firstText(row, ["PRECIO", "Precio", "PRECIOIVA", "PrecioIva"]));
    if (!(price > 0)) return;
    const key = normalizar(code);
    const currentPrice = parseNumber(byCode.get(key)?.Valor || byCode.get(key)?.VALOR || 0);
    if (currentPrice > 0 && currentPrice >= price) return;
    byCode.set(key, {
      CODARTICULO: code,
      CodArticulo: code,
      CODFORMATO: "",
      CodFormato: "",
      IDTARIFAV: "TICKETLIN",
      VALOR: price,
      Valor: price,
      PRECIO: price,
      Precio: price,
      PRECIOVENTA: price,
      PrecioVenta: price,
      PVP: price,
      Referencia: firstText(row, ["REFERENCIA", "Referencia"]),
      Descripcion: firstText(row, ["DESCRIPCION", "Descripcion"]),
      PrecioDefecto: "Si",
      _source: "TICKETLIN SQL ICG",
      _updatedAt: new Date().toISOString()
    });
  });
  return Array.from(byCode.values());
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

async function resolveIcgTicketLineTable(config: ServiceConfig, databaseName: string): Promise<string> {
  const sql = "SELECT CASE WHEN OBJECT_ID('dbo.TICKETLIN','U') IS NOT NULL THEN 'TICKETLIN' WHEN OBJECT_ID('dbo.TIQUETSLIN','U') IS NOT NULL THEN 'TIQUETSLIN' ELSE '' END AS TableName;";
  const row = parseSqlRows(await runSql(config, databaseName, sql))[0] || {};
  const tableName = String(row.TableName || "").trim().toUpperCase();
  if (tableName === "TICKETLIN") return "TICKETLIN";
  if (tableName === "TIQUETSLIN") return "TIQUETSLIN";
  throw new Error("No se encontro dbo.TICKETLIN ni dbo.TIQUETSLIN en la Base de Datos ICG Local.");
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

async function readBackupDailyClosures(config: ServiceConfig, databaseName: string, ticketLineTable: string): Promise<AnyRecord[]> {
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
  FROM ${ticketLineTable}
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

function sourceDatabaseName(config: ServiceConfig): string {
  return String(config.icgLiveDatabaseName || "").trim() || config.icgAuditDbName;
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
  salePrices: AnyRecord[];
  ticketLines: AnyRecord[];
  closures: AnyRecord[];
}> {
  const databaseName = sourceDatabaseName(config);
  const ticketLineTable = await resolveIcgTicketLineTable(config, databaseName);
  const latest = parseSqlRows(await runSql(config, databaseName, "SELECT CONVERT(varchar(10), MAX(Fecha), 120) AS Fecha FROM (SELECT MAX(CONVERT(date,c.FECHA)) AS Fecha FROM TIQUETSCONSUMO tc JOIN TIQUETSCAB c ON c.FO=tc.FO AND c.SERIE=tc.SERIE AND c.NUMERO=tc.NUMERO AND c.N=tc.N WHERE (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101') UNION ALL SELECT MAX(CONVERT(date,FECHA)) AS Fecha FROM TIQUETSCAB WHERE (FECHAANULACION IS NULL OR FECHAANULACION <= '19000101')) q;"))[0]?.Fecha;
  const closures = await readBackupDailyClosures(config, databaseName, ticketLineTable).catch(() => []);
  const countSql = "SELECT t.name AS tableName, CAST(SUM(p.rows) AS int) AS rowsCount FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1) WHERE t.name IN ('TIQUETSCAB','TICKETLIN','TIQUETSLIN','TIQUETSCONSUMO','ARTICULOS','REFERENCIAS','KITS','STOCKS','MOVIMENTS','PRECIOSVENTA') GROUP BY t.name;";
  const articlesSql = `
SELECT
  CAST(CODARTICULO AS varchar(30)) AS CodArticulo,
  ISNULL(REFERENCIA,'') AS Referencia,
  ISNULL(DESCRIPCION,'') AS Descripcion,
  ISNULL(CAST(DPTO AS varchar(30)),'') AS Dpto,
  ISNULL(CAST(SECCION AS varchar(30)),'') AS Seccion,
  ISNULL(CAST(UNIDADES AS varchar(30)),'') AS Unidades,
  '' AS PrecioVentaSinImpuestos,
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
  const salePricesSql = `
IF OBJECT_ID('PRECIOSVENTA','U') IS NOT NULL
BEGIN
  SELECT
    CAST(CODARTICULO AS varchar(30)) AS CODARTICULO,
    CAST(CODARTICULO AS varchar(30)) AS CodArticulo,
    ISNULL(CAST(CODFORMATO AS varchar(30)),'') AS CODFORMATO,
    ISNULL(CAST(CODFORMATO AS varchar(30)),'') AS CodFormato,
    ISNULL(CAST(IDTARIFAV AS varchar(30)),'') AS IDTARIFAV,
    ISNULL(CAST(VALOR AS varchar(30)),'') AS VALOR,
    ISNULL(CAST(VALOR AS varchar(30)),'') AS Valor
  FROM PRECIOSVENTA
  WHERE VALOR IS NOT NULL AND VALOR > 0
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
    CAST('' AS varchar(30)) AS VALOR,
    CAST('' AS varchar(30)) AS Valor;
END`;
  const lookbackDays = Math.max(1, Math.round(config.icgConsumptionLookbackDays || 30));
  const ticketLinesSql = `
DECLARE @hasta date=ISNULL(TRY_CONVERT(date,'${quoteSql(latest || "")}'), CONVERT(date, GETDATE()));
DECLARE @desde date=DATEADD(day, -(${lookbackDays} - 1), @hasta);
SELECT
  CAST(l.FO AS varchar(30)) AS FO,
  CAST(l.SERIE AS varchar(30)) AS SERIE,
  CAST(l.NUMERO AS varchar(30)) AS NUMERO,
  CAST(l.N AS varchar(30)) AS N,
  CAST(l.NUMLINEA AS varchar(30)) AS NUMLINEA,
  CAST(l.CODARTICULO AS varchar(30)) AS CODARTICULO,
  ISNULL(a.DESCRIPCION, ISNULL(l.DESCRIPCION,'')) AS DESCRIPCION,
  ISNULL(CAST(l.UNIDADES AS varchar(30)),'') AS UNIDADES,
  ISNULL(CAST(l.PRECIO AS varchar(30)),'') AS PRECIO,
  ISNULL(CAST(l.PRECIOIVA AS varchar(30)),'') AS PRECIOIVA,
  ISNULL(CAST(l.TOTAL AS varchar(30)),'') AS TOTAL,
  ISNULL(a.REFERENCIA,'') AS REFERENCIA,
  ISNULL(CONVERT(varchar(19), DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS time), COALESCE(TRY_CONVERT(time,l.HORA), TRY_CONVERT(time,c.HORAFIN), TRY_CONVERT(time,c.HORAINI), CAST('00:00:00' AS time))), CONVERT(datetime, CONVERT(date,c.FECHA))), 120),'') AS HORA,
  CONVERT(varchar(10), CONVERT(date,c.FECHA), 120) AS FECHA
FROM ${ticketLineTable} l
JOIN TIQUETSCAB c ON c.FO=l.FO AND c.SERIE=l.SERIE AND c.NUMERO=l.NUMERO AND c.N=l.N
LEFT JOIN ARTICULOS a ON a.CODARTICULO=l.CODARTICULO
WHERE CONVERT(date,c.FECHA) >= @desde AND CONVERT(date,c.FECHA) <= @hasta
  AND (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101')
ORDER BY c.FECHA DESC,l.SERIE,l.NUMERO,l.N,l.NUMLINEA;`;
  const countRows = parseSqlRows(await runSql(config, databaseName, countSql));
  const articles = parseSqlRows(await runSql(config, databaseName, articlesSql));
  const salePrices = await runSql(config, databaseName, salePricesSql)
    .then((raw) => parseSqlRows(raw).filter((row) => parseNumber(row.VALOR || row.Valor || row.PRECIO || row.Precio || row.PRECIOVENTA || row.PrecioVenta) > 0))
    .catch(() => []);
  const ticketLines = parseSqlRows(await runSql(config, databaseName, ticketLinesSql));
  if (!latest) {
    return {
      fecha: "",
      rows: [],
      tableCounts: Object.fromEntries(countRows.map((row) => [String(row.tableName), Math.round(parseNumber(row.rowsCount))])),
      articles,
      salePrices,
      ticketLines,
      closures
    };
  }
  const dataSql = `
DECLARE @hasta date='${quoteSql(latest)}';
DECLARE @desde date=DATEADD(day, -(${lookbackDays} - 1), @hasta);
SELECT
  CONVERT(varchar(10), CONVERT(date,c.FECHA), 120) AS fecha,
  CONVERT(varchar(19), DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS time), COALESCE(TRY_CONVERT(time,l.HORA), TRY_CONVERT(time,c.HORAFIN), TRY_CONVERT(time,c.HORAINI), CAST('00:00:00' AS time))), CONVERT(datetime, CONVERT(date,c.FECHA))), 120) AS fechaHora,
  CAST(tc.FO AS varchar(30)) AS fo,
  CAST(tc.SERIE AS varchar(30)) AS serie,
  CAST(tc.NUMERO AS varchar(30)) AS numero,
  CAST(tc.N AS varchar(30)) AS n,
  CAST(tc.NUMLINEA AS varchar(30)) AS numLinea,
  CAST(tc.CODARTICULO AS varchar(30)) AS codArticulo,
  ISNULL(a.REFERENCIA,'') AS referencia,
  ISNULL(a.DESCRIPCION,'') AS descripcion,
  ISNULL(tc.CODALMACEN,'') AS codAlmacen,
  CAST(tc.CONSUMO AS decimal(18,4)) AS consumo,
  CAST(1 AS int) AS lineas
FROM TIQUETSCONSUMO tc
JOIN TIQUETSCAB c ON c.FO=tc.FO AND c.SERIE=tc.SERIE AND c.NUMERO=tc.NUMERO AND c.N=tc.N
LEFT JOIN ${ticketLineTable} l ON l.FO=tc.FO AND l.SERIE=tc.SERIE AND l.NUMERO=tc.NUMERO AND l.N=tc.N AND l.NUMLINEA=tc.NUMLINEA
LEFT JOIN ARTICULOS a ON a.CODARTICULO=tc.CODARTICULO
WHERE CONVERT(date,c.FECHA) >= @desde AND CONVERT(date,c.FECHA) <= @hasta AND (c.FECHAANULACION IS NULL OR c.FECHAANULACION <= '19000101')
  AND ISNULL(tc.CONSUMO,0) > 0
ORDER BY c.FECHA, fechaHora, tc.FO,tc.SERIE,tc.NUMERO,tc.N,tc.NUMLINEA,tc.CODARTICULO,tc.CODALMACEN;`;
  const sqlRows = parseSqlRows(await runSql(config, databaseName, dataSql));
  return {
    fecha: latest,
    rows: sqlRows.map((row) => {
      const mapped = {
      fecha: String(row.fecha || latest),
      fechaHora: String(row.fechaHora || ""),
      fo: String(row.fo || ""),
      serie: String(row.serie || ""),
      numero: String(row.numero || ""),
      n: String(row.n || ""),
      numLinea: String(row.numLinea || ""),
      tipoMovimiento: (parseNumber(row.consumo) < 0 ? "devolucion" : "venta") as "devolucion" | "venta",
      codArticulo: String(row.codArticulo || ""),
      referencia: String(row.referencia || ""),
      descripcion: String(row.descripcion || ""),
      codAlmacen: String(row.codAlmacen || ""),
      consumo: parseNumber(row.consumo),
      lineas: Math.round(parseNumber(row.lineas))
      };
      return Object.assign(mapped, {
        movimientoIcgId: movementIcgIdFromLine(mapped, latest)
      });
    }).filter((row) => row.consumo > 0 && row.codArticulo),
    tableCounts: Object.fromEntries(countRows.map((row) => [String(row.tableName), Math.round(parseNumber(row.rowsCount))])),
    articles,
    salePrices,
    ticketLines,
    closures
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
    nombreProducto: productoWtf || line.descripcion || `ICG ${line.codArticulo}`,
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
      codAlmacen: line.codAlmacen,
      productoIcg: line.descripcion,
      consumo: line.consumo,
      lineas: line.lineas,
      fechaHora: line.fechaHora || "",
      ticket: [line.fo, line.serie, line.numero, line.n, line.numLinea].filter(Boolean).join("-")
    }
  };
}

function ticketLineToConsumptionIdentity(row: AnyRecord): Partial<IcgBackupConsumptionRow> {
  return {
    fecha: firstText(row, ["FECHA", "Fecha", "fecha"]),
    fechaHora: firstText(row, ["HORA", "Hora", "fechaHora"]),
    fo: firstText(row, ["FO", "fo"]),
    serie: firstText(row, ["SERIE", "Serie", "serie"]),
    numero: firstText(row, ["NUMERO", "Numero", "numero"]),
    n: firstText(row, ["N", "n"]),
    numLinea: firstText(row, ["NUMLINEA", "NumLinea", "numLinea"]),
    codArticulo: firstText(row, ["CODARTICULO", "CodArticulo", "codArticulo"]),
    referencia: firstText(row, ["REFERENCIA", "Referencia", "referencia"]),
    descripcion: firstText(row, ["DESCRIPCION", "Descripcion", "descripcion"])
  };
}

function createTicketLineMovement(row: AnyRecord, fallbackDate: string): SyncMovement | null {
  const line = ticketLineToConsumptionIdentity(row);
  const code = String(line.codArticulo || "").trim();
  const movementId = movementIcgIdFromLine(line, fallbackDate);
  if (!code || !movementId) return null;
  const ticketIdentity = icgTicketIdentityFromLine(line);
  const importKey = quickHashText(["icg-ticketlin", movementId].join("|"));
  const cantidad = Math.abs(parseNumber(firstText(row, ["UNIDADES", "Unidades", "unidades"])));
  const precio = parseNumber(firstText(row, ["PRECIOIVA", "PrecioIva", "PRECIO", "Precio"]));
  const total = parseNumber(firstText(row, ["TOTAL", "Total"]));
  return {
    id: `icg-ticketlin-${importKey}`,
    movimientoIcgId: movementId,
    idempotencyKey: `icg-ticketlin-${importKey}`,
    fecha: String(line.fechaHora || line.fecha || fallbackDate || new Date().toISOString()).replace(" ", "T"),
    origen: "ICG FrontRest",
    destino: "Sistema Web",
    tipo: "salida",
    codigoProducto: code,
    nombreProducto: line.descripcion || `ICG ${code}`,
    cantidad: cantidad || 0,
    unidad: "Uni",
    almacen: "TICKETLIN",
    estado: "sincronizado",
    mensaje: "Linea vendida recibida desde TICKETLIN. Informativa: no genera descuento por si sola.",
    intentos: 0,
    referencia: line.referencia || "",
    raw: {
      importKey,
      movimientoIcgId: movementId,
      ticket: ticketIdentity,
      fo: line.fo || "",
      serie: line.serie || "",
      numero: line.numero || "",
      n: line.n || "",
      numLinea: line.numLinea || "",
      fechaHora: line.fechaHora || "",
      precio,
      total
    }
  };
}

function icgPhysicalLineKey(line: Partial<IcgBackupConsumptionRow>): string {
  return [
    line.fo || "",
    line.serie || "",
    line.numero || "",
    line.n || "",
    line.numLinea || "",
    line.codArticulo || "",
    String(line.fechaHora || line.fecha || "").slice(0, 19)
  ].map((part) => normalizar(part)).join("|");
}

function ticketLineMovementsForHost(ticketLines: AnyRecord[], rowsToApply: IcgBackupConsumptionRow[], fallbackDate: string): SyncMovement[] {
  const consumedLineKeys = new Set((Array.isArray(rowsToApply) ? rowsToApply : []).map(icgPhysicalLineKey).filter((key) => key.replace(/\|/g, "")));
  const byId = new Map<string, SyncMovement>();
  (Array.isArray(ticketLines) ? ticketLines : []).forEach((row) => {
    const line = ticketLineToConsumptionIdentity(row);
    const lineKey = icgPhysicalLineKey(line);
    if (lineKey && consumedLineKeys.has(lineKey)) return;
    const movement = createTicketLineMovement(row, fallbackDate);
    if (!movement || !movement.movimientoIcgId) return;
    byId.set(movement.movimientoIcgId, movement);
  });
  return Array.from(byId.values());
}

export async function applyBackupConsumptionToFirestore(config: ServiceConfig, rowsToApply: IcgBackupConsumptionRow[], fecha: string, tableCounts: Record<string, number>, articles: AnyRecord[] = [], closures: AnyRecord[] = [], salePrices: AnyRecord[] = [], ticketLines: AnyRecord[] = []): Promise<IcgBackupSyncResult> {
  const result: IcgBackupSyncResult = {
    ok: false,
    backupPath: config.icgBackupPath,
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
  const ticketLineHostMovements = ticketLineMovementsForHost(ticketLines, rowsToApply, fecha);
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
      const movementId = movementIcgIdFromLine(line, fecha);
      const importKey = quickHashText(["icg-paused", movementId, eventDate, ticketIdentity, line.codArticulo, line.referencia, line.codAlmacen].join("|"));
      return createBackupMovement(line, fecha, importKey, "pendiente_revision", result.message);
    }).concat(ticketLineHostMovements);
    return result;
  }
  mergeBackupArticlesIntoIcgData(icg, articles);
  mergeBackupTicketLinesIntoIcgData(icg, ticketLines);
  mergeBackupSalePricesIntoIcgData(icg, salePriceRowsFromTicketLines(ticketLines).concat(salePrices));
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
  function appendHistoryRowOnce(historyKey: string, row: AnyRecord): void {
    appState[historyKey] = Array.isArray(appState[historyKey]) ? appState[historyKey] : [];
    const keys = [row?.ImportKey, row?.importKey, row?.LegacyImportKey, row?.legacyImportKey, row?.id, row?._id].map((key) => String(key || "").trim()).filter(Boolean);
    const movementId = String(row?.MovimientoICGId || row?.movimientoIcgId || "");
    const product = normalizar(row?.producto || row?.ProductoWTF || row?.ProductoMise || "");
    const exists = appState[historyKey].some((existing: AnyRecord) => {
      const existingKeys = [existing?.ImportKey, existing?.importKey, existing?.LegacyImportKey, existing?.legacyImportKey, existing?.id, existing?._id].map((key) => String(key || "").trim()).filter(Boolean);
      if (keys.some((key) => existingKeys.includes(key))) return true;
      const existingMovementId = String(existing?.MovimientoICGId || existing?.movimientoIcgId || "");
      return movementId && existingMovementId === movementId && product && normalizar(existing?.producto || existing?.ProductoWTF || existing?.ProductoMise || "") === product;
    });
    if (!exists) appState[historyKey].push(row);
  }

  for (const line of rowsToApply) {
    const eventDate = String(line.fechaHora || line.fecha || fecha).replace(" ", "T");
    const ticketIdentity = icgTicketIdentityFromLine(line);
    const movementId = movementIcgIdFromLine(line, fecha);
    const isIcgReturn = line.tipoMovimiento === "devolucion" || line.consumo < 0;
    const matchedLinks = links.filter((row) => {
      const linkCode = normalizar(bridgeCode(row));
      const linkRef = normalizar(bridgeReference(row));
      return (linkCode && normalizar(line.codArticulo) === linkCode) || (linkRef && normalizar(line.referencia) === linkRef);
    });
    const pendingAuditKey = consumptionAuditKey(line, "", "", fecha);
    const pendingImportKey = quickHashText(["icg-bak", movementId, eventDate, ticketIdentity, line.numLinea, line.codArticulo, line.referencia, line.codAlmacen].join("|"));
    if (!matchedLinks.length && (appliedKeys.has(pendingImportKey) || appliedConsumptionKeys.has(pendingImportKey) || appliedConsumptionAuditKeys.has(pendingAuditKey))) {
      result.skipped += 1;
      result.movements?.push(createBackupMovement(line, fecha, pendingImportKey, "sincronizado", "Consumo ICG ya procesado anteriormente."));
      continue;
    }
    if (!matchedLinks.length) {
      result.pending += 1;
      result.movements?.push(createBackupMovement(line, fecha, pendingImportKey, "pendiente_revision", "Sin vinculo WTF; requiere mapear ProductoMise/ProductoWTF."));
      const pendingRow = {
        Fecha: fecha,
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
      const auditKey = consumptionAuditKey(line, target, producto, fecha);
      const importKey = quickHashText(["icg-bak", movementId, target, producto].join("|"));
      const movementTargetKey = [movementId, target, normalizar(producto)].join("|");
      const qtyFactor = bridgeQuantity(link) || 1;
      const cantidad = Number((Math.abs(line.consumo) * qtyFactor).toFixed(4));
      const legacyKey = consumptionAggregationKey(line.fecha || fecha, line.codArticulo, line.referencia, line.codAlmacen, target, producto, ticketIdentity);
      const legacyRemaining = legacyAppliedRemaining.get(legacyKey) || 0;
      if (appliedKeys.has(importKey) || appliedConsumptionKeys.has(importKey) || appliedConsumptionAuditKeys.has(auditKey) || appliedMovementTargets.has(movementTargetKey) || legacyRemaining + 1e-9 >= cantidad) {
        if (!appliedKeys.has(importKey) && legacyRemaining) legacyAppliedRemaining.set(legacyKey, Number((legacyRemaining - cantidad).toFixed(4)));
        result.skipped += 1;
        result.movements?.push(createBackupMovement(line, fecha, importKey, "sincronizado", "Consumo ICG ya procesado anteriormente.", producto));
        continue;
      }
      if (!producto) {
        const message = `Vinculo sin ProductoWTF para CodArticulo ${line.codArticulo}.`;
        result.errors.push(message);
        result.movements?.push(createBackupMovement(line, fecha, importKey, "error", message));
        continue;
      }
      const list: AnyRecord[] = Array.isArray(appState[target]) ? appState[target] : [];
      const item = list.find((row) => normalizar(targetProductName(row, target)) === normalizar(producto));
      const consumoRow: AnyRecord = {
        Fecha: fecha,
        MovimientoICGId: movementId,
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
        result.movements?.push(createBackupMovement(line, fecha, importKey, "error", message, producto, cantidad, consumoRow.Unidad));
        rememberConsumptionRow(consumoRow);
        continue;
      }
      const existenciaAnterior = targetExistence(item, target);
      if (isIcgReturn) {
        item.updatedAt = now;
        item.icgLastImportKey = importKey || item.icgLastImportKey || "";
        const existenciaNueva = existenciaAnterior;
        consumoRow.Estado = "Decomiso aplicado";
        consumoRow.ExistenciaActual = existenciaAnterior;
        consumoRow.ExistenciaNueva = existenciaNueva;
        appliedKeys.add(importKey);
        appliedConsumptionAuditKeys.add(auditKey);
        appliedMovementTargets.add(movementTargetKey);
        result.applied += 1;
        result.movements?.push(createBackupMovement(line, fecha, importKey, "sincronizado", "Devolucion ICG registrada como decomiso automatico en WTF Web.", targetProductName(item, target), cantidad, consumoRow.Unidad));
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
          movimientoIcgId: movementId
        });
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
        result.movements?.push(createBackupMovement(line, fecha, importKey, "pendiente_revision", message, targetProductName(item, target), cantidad, consumoRow.Unidad));
        rememberConsumptionRow(consumoRow);
        continue;
      }
      applyTargetSalida(item, target, cantidad, now, importKey);
      const existenciaNueva = targetExistence(item, target);
      consumoRow.Estado = "Aplicado";
      consumoRow.ExistenciaActual = existenciaAnterior;
      consumoRow.ExistenciaNueva = existenciaNueva;
      appliedKeys.add(importKey);
      appliedConsumptionAuditKeys.add(auditKey);
      appliedMovementTargets.add(movementTargetKey);
      result.applied += 1;
      result.movements?.push(createBackupMovement(line, fecha, importKey, "sincronizado", "Descuento aplicado en WTF Web desde Base de Datos ICG Local.", targetProductName(item, target), cantidad, consumoRow.Unidad));
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
        movimientoIcgId: movementId
      });
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
  icg.appliedImports = Array.from(appliedKeys);
  icg.processedBackupDates.unshift({ fecha, backupPath: config.icgBackupPath, processedAt: now, applied: result.applied, matched: result.matched, pending: result.pending, errors: result.errors });
  icg.sourceName = path.basename(config.icgBackupPath);
  icg.updatedAt = now;
  if (ticketLineHostMovements.length) {
    result.movements = (result.movements || []).concat(ticketLineHostMovements);
  }
  result.ok = result.errors.length === 0 || result.applied > 0 || result.pending > 0 || ticketLineHostMovements.length > 0;
  result.message = result.applied
    ? `Backup ICG aplicado: ${result.applied} descuentos. Pendientes para revision: ${result.pending}.`
    : ticketLineHostMovements.length
      ? `Datos ICG actualizados: ${ticketLineHostMovements.length} lineas TICKETLIN recibidas para auditoria. No generaron descuentos automaticos.`
    : `Backup ICG leido sin descuentos aplicados. Pendientes para revision: ${result.pending}.`;
  await writeAppState(config, appState, result);
  return result;
}

export async function syncIcgBackupConsumption(config: ServiceConfig): Promise<IcgBackupSyncResult> {
  if (!config.autoApplyIcgBackup) {
    return {
      ok: true,
      backupPath: config.icgBackupPath,
      databaseName: sourceDatabaseName(config),
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      pending: 0,
      errors: [],
      message: "Sincronizacion de backup ICG desactivada."
    };
  }
  let activeConfig = config;
  let data: Awaited<ReturnType<typeof readLatestBackupConsumption>>;
  try {
    await restoreIcgBackupForAudit(activeConfig);
    data = await readLatestBackupConsumption(activeConfig);
  } catch (error) {
    if (!String(config.icgLiveDatabaseName || "").trim()) throw error;
    activeConfig = auditBackupConfig(config);
    await restoreIcgBackupForAudit(activeConfig);
    data = await readLatestBackupConsumption(activeConfig);
  }
  if (!data.fecha || !data.rows.length) {
    if (data.closures.length || data.articles.length || data.salePrices.length || data.ticketLines.length) {
      const fecha = data.fecha || String(data.closures[0]?.FechaCierre || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
      const result = await applyBackupConsumptionToFirestore(activeConfig, [], fecha, data.tableCounts, data.articles, data.closures, data.salePrices, data.ticketLines);
      result.message = data.ticketLines.length
        ? `Datos ICG actualizados desde Base de Datos Local. Se recibieron ${data.ticketLines.length} lineas TICKETLIN; no se encontraron consumos nuevos para aplicar.`
        : "Datos ICG actualizados desde Base de Datos Local. No se encontraron consumos para aplicar.";
      return result;
    }
    return {
      ok: true,
      backupPath: activeConfig.icgBackupPath,
      databaseName: sourceDatabaseName(activeConfig),
      totalLines: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      pending: 0,
      errors: [],
      message: "Backup ICG restaurado, pero no contiene consumos para aplicar.",
      tableCounts: data.tableCounts
    };
  }
  return applyBackupConsumptionToFirestore(activeConfig, data.rows, data.fecha, data.tableCounts, data.articles, data.closures, data.salePrices, data.ticketLines);
}
