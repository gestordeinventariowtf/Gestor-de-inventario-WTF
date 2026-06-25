#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

const TABLE_DEFS = {
  TiquetsCab: ["Serie", "Numero", "N", "NumFactura", "Fecha", "HoraIni", "HoraFin", "Mesa", "Sala", "Caja", "CodCliente", "CodVendedor", "TotalBruto", "TotalNeto", "Subtotal", "IVAINC", "Propina", "FechaAnulacion"],
  TiquetsLin: ["Serie", "Numero", "N", "NumLinea", "CodArticulo", "Descripcion", "Unidades", "Coste", "Precio", "PrecioIva", "TipoIva", "CodVendedor", "Referencia", "HORA"],
  TiquetsPag: ["Serie", "Numero", "N", "NumLinea", "CodFormapago", "CodMoneda", "Importe", "Importe2", "Entregado", "Cambio", "Propina", "Pendiente", "Estado", "AutCode", "NumTransaccion"],
  Articulos: ["CodArticulo", "Referencia", "Descripcion", "Dpto", "Seccion", "Unidades", "PCoste", "UnidadMedida", "SeCompra", "SeVende", "UsaStocks", "StockMinimo", "CosteMedio", "UltimoCoste", "Suspendido", "Descatalogado", "FechaModificado"],
  Referencias: ["Referencia", "Codigo", "TipoRef", "CodProveedor"],
  ComprasCab: ["Serie", "Numero", "N", "Fecha", "CodProveedor", "CodAlmacen", "SuFactura", "TotalBruto", "TotalNeto", "BaseImponible1", "CuotaIva1"],
  ComprasLin: ["Serie", "Numero", "N", "NumLinea", "CodArticulo", "Referencia", "Descripcion", "Unidades", "Precio", "Total", "CodAlmacen"],
  Moviments: ["ID", "CodAlmacenOrigen", "CodAlmacenDestino", "NumSerie", "CodArticulo", "Fecha", "Hora", "Tipo", "Unidades", "Precio", "SerieDoc", "NumDoc"],
  PreciosVenta: ["CodArticulo", "CodFormato", "IDTarifaV", "Valor", "Precio", "PrecioIva", "PrecioDefecto"],
  Clientes: ["CodCliente", "NombreComercial", "Nombrecliente", "Alias", "Telefono1", "Telefono2", "E_Mail", "CodVendedor", "CodFormaPago", "Estado", "NumTarjeta", "Descatalogado"],
  Proveedores: ["CodProveedor", "NomProveedor", "NomComercial", "Alias", "PersonaContacto", "Telefono1", "Telefono2", "Direccion1", "Poblacion"],
  PERSONAS: ["CODIGO", "NOMBRE", "APELLIDOS", "NIF", "DIRECCION", "EMAIL", "TELEFONO"]
};

const DATASET_LABELS = {
  TiquetsCab: "Ventas / Facturas",
  TiquetsLin: "Lineas vendidas",
  TiquetsPag: "Pagos",
  CierresDiarios: "Cierres diarios",
  ConsumoMiseVentas: "Consumo Mise ventas",
  VinculosMiseICG: "Vinculos Mise ICG",
  Articulos: "Articulos ICG",
  Referencias: "Codigos / referencias",
  ComprasCab: "Compras / Entradas",
  ComprasLin: "Lineas de compra",
  ComprasDiarias: "Compras diarias",
  Moviments: "Movimientos almacen",
  PreciosVenta: "Precios de venta",
  Clientes: "Clientes ICG",
  Proveedores: "Suplidores",
  PERSONAS: "Personas"
};

const EXTRA_DATASETS = {
  CierresDiarios: ["Archivo", "FechaCierre", "Tickets", "Lineas", "VentaBruta", "VentaNeta", "Pagos", "Propina", "Estado", "Observacion"],
  ComprasDiarias: ["Archivo", "Fecha", "Compras", "Lineas", "TotalBruto", "TotalNeto", "Estado"],
  VinculosMiseICG: ["ProductoMise", "CodArticulo", "Referencia", "ProductoICG", "Metodo", "CantidadPorVenta", "Unidad", "Activo", "Notas"],
  ConsumoMiseVentas: ["Fecha", "ProductoMise", "CodArticulo", "Referencia", "ProductoICG", "UnidadesVendidas", "CantidadDescontar", "Unidad", "Archivo", "Estado"]
};

async function loadMdbReader() {
  try {
    return (await import("mdb-reader")).default;
  } catch (firstError) {
    const fallback = resolve("tmp", "cms_tools", "node_modules", "mdb-reader", "lib", "node", "index.js");
    if (existsSync(fallback)) return (await import(pathToFileURL(fallback).href)).default;
    throw new Error("No se encontro mdb-reader. Ejecuta: npm install");
  }
}

function usage() {
  return [
    "Uso:",
    "  node tools/icg-cms-extractor.mjs --input-dir \"E:\\CMS\\Nueva carpeta\" --out cms_audit/icg_frontrest_cms_extract_2026-06-23.json",
    "  node tools/icg-cms-extractor.mjs --out salida.json archivo1.CMS archivo2.CMS"
  ].join("\n");
}

function parseArgs(argv) {
  const args = { files: [], out: "cms_audit/icg_frontrest_cms_extract.json", inputDir: "" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") args.out = argv[++i] || args.out;
    else if (arg === "--input-dir") args.inputDir = argv[++i] || "";
    else if (arg === "--help" || arg === "-h") args.help = true;
    else args.files.push(arg);
  }
  if (args.inputDir) {
    const dir = resolve(args.inputDir);
    const fromDir = readdirSync(dir).filter((name) => extname(name).toLowerCase() === ".cms").map((name) => join(dir, name));
    args.files.push(...fromDir);
  }
  args.files = Array.from(new Set(args.files.map((file) => resolve(file))));
  return args;
}

function toPlainValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
  return value;
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const num = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(num) ? num : 0;
}

function dateKey(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? text.slice(0, 10) : d.toISOString().slice(0, 10);
}

function ticketKey(row) {
  return [row.Serie || "", row.Numero || "", row.N || ""].join("|");
}

function makeDataset(key, rows = []) {
  return {
    key,
    label: DATASET_LABELS[key] || key,
    columns: TABLE_DEFS[key] || EXTRA_DATASETS[key] || [],
    rows
  };
}

function getRows(reader, tableName, sourceFile, sourceMtime) {
  let table;
  try {
    table = reader.getTable(tableName);
  } catch {
    return { rows: [], rowCount: 0, columns: [] };
  }
  const columnNames = table.getColumnNames();
  const selected = (TABLE_DEFS[tableName] || columnNames).filter((name) => columnNames.includes(name));
  const rawRows = table.getData({ columns: selected });
  const rows = rawRows.map((row, index) => {
    const plain = {};
    selected.forEach((col) => {
      plain[col] = toPlainValue(row[col]);
    });
    plain._id = `${sourceFile}-${tableName}-${index}`;
    plain._sourceFile = sourceFile;
    plain._sourceDate = sourceMtime;
    return plain;
  });
  return { rows, rowCount: table.rowCount, columns: columnNames };
}

function addTicketDates(datasets) {
  const ticketDates = new Map();
  datasets.TiquetsCab.rows.forEach((row) => {
    ticketDates.set(ticketKey(row), dateKey(row.Fecha));
  });
  ["TiquetsLin", "TiquetsPag"].forEach((key) => {
    datasets[key].rows = datasets[key].rows.map((row) => Object.assign({}, row, { _fechaTicket: ticketDates.get(ticketKey(row)) || "" }));
  });
}

function addPurchaseDates(datasets) {
  const purchaseDates = new Map();
  datasets.ComprasCab.rows.forEach((row) => {
    purchaseDates.set(ticketKey(row), dateKey(row.Fecha));
  });
  datasets.ComprasLin.rows = datasets.ComprasLin.rows.map((row) => Object.assign({}, row, { _fechaCompra: purchaseDates.get(ticketKey(row)) || "" }));
}

function buildClosureRows(sourceFile, sourceMtime, datasets, tableCounts) {
  const tickets = datasets.TiquetsCab.rows.filter((row) => !(row.FechaAnulacion || row.Anulado || row.Cancelado));
  if (!tickets.length) {
    return [{
      _id: `${sourceFile}-cierre-sin-tickets`,
      Archivo: sourceFile,
      FechaCierre: dateKey(sourceMtime),
      Tickets: 0,
      Lineas: datasets.TiquetsLin.rows.length,
      VentaBruta: 0,
      VentaNeta: 0,
      Pagos: 0,
      Propina: 0,
      Estado: "Sin tickets",
      Observacion: "El CMS abrio correctamente, pero TiquetsCab/TiquetsLin/TiquetsPag no traen filas de venta.",
      _tableCounts: tableCounts
    }];
  }
  const groups = new Map();
  tickets.forEach((row) => {
    const key = dateKey(row.Fecha) || dateKey(sourceMtime);
    if (!groups.has(key)) {
      groups.set(key, { _id: `${sourceFile}-cierre-${key}`, Archivo: sourceFile, FechaCierre: key, Tickets: 0, Lineas: 0, VentaBruta: 0, VentaNeta: 0, Pagos: 0, Propina: 0, Estado: "Calculado desde tickets", Observacion: "" });
    }
    const group = groups.get(key);
    group.Tickets += 1;
    group.VentaBruta += parseNumber(row.TotalBruto || row.Subtotal);
    group.VentaNeta += parseNumber(row.TotalNeto);
    group.Propina += parseNumber(row.Propina);
  });
  datasets.TiquetsLin.rows.forEach((row) => {
    const key = row._fechaTicket || dateKey(sourceMtime);
    if (groups.has(key)) groups.get(key).Lineas += 1;
  });
  datasets.TiquetsPag.rows.forEach((row) => {
    const key = row._fechaTicket || dateKey(sourceMtime);
    if (groups.has(key)) groups.get(key).Pagos += parseNumber(row.Importe || row.Importe2);
  });
  return Array.from(groups.values()).map((row) => Object.assign({}, row, {
    VentaBruta: Number(row.VentaBruta.toFixed(2)),
    VentaNeta: Number(row.VentaNeta.toFixed(2)),
    Pagos: Number(row.Pagos.toFixed(2)),
    Propina: Number(row.Propina.toFixed(2))
  }));
}

function buildPurchaseRows(sourceFile, datasets) {
  const groups = new Map();
  datasets.ComprasCab.rows.forEach((row) => {
    const key = dateKey(row.Fecha) || "Sin fecha";
    if (!groups.has(key)) groups.set(key, { _id: `${sourceFile}-compras-${key}`, Archivo: sourceFile, Fecha: key, Compras: 0, Lineas: 0, TotalBruto: 0, TotalNeto: 0, Estado: "Calculado desde compras" });
    const group = groups.get(key);
    group.Compras += 1;
    group.TotalBruto += parseNumber(row.TotalBruto);
    group.TotalNeto += parseNumber(row.TotalNeto);
  });
  datasets.ComprasLin.rows.forEach((row) => {
    const key = row._fechaCompra || "";
    if (groups.has(key)) groups.get(key).Lineas += 1;
  });
  return Array.from(groups.values()).map((row) => Object.assign({}, row, {
    TotalBruto: Number(row.TotalBruto.toFixed(2)),
    TotalNeto: Number(row.TotalNeto.toFixed(2))
  }));
}

function uniqueRows(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    map.set(key || JSON.stringify(row), row);
  });
  return Array.from(map.values());
}

function rowKeyForTable(tableName, row) {
  const partsByTable = {
    Articulos: ["CodArticulo", "Referencia"],
    Referencias: ["Referencia", "Codigo"],
    PreciosVenta: ["CodArticulo", "CodFormato", "IDTarifaV", "Valor"],
    Clientes: ["CodCliente"],
    Proveedores: ["CodProveedor"],
    ComprasCab: ["Serie", "Numero", "N", "Fecha", "TotalNeto"],
    ComprasLin: ["Serie", "Numero", "N", "NumLinea", "CodArticulo", "Total"],
    Moviments: ["ID"],
    TiquetsCab: ["Serie", "Numero", "N", "Fecha", "TotalNeto"],
    TiquetsLin: ["Serie", "Numero", "N", "NumLinea", "CodArticulo", "Unidades"],
    TiquetsPag: ["Serie", "Numero", "N", "NumLinea", "Importe", "CodFormapago"]
  };
  const fields = partsByTable[tableName] || ["_id"];
  return fields.map((field) => row[field] ?? "").join("|");
}

function buildMergedPurchaseRows(datasets) {
  const groups = new Map();
  datasets.ComprasCab.rows.forEach((row) => {
    const key = dateKey(row.Fecha) || "Sin fecha";
    if (!groups.has(key)) groups.set(key, { _id: `compras-${key}`, Archivo: row._sourceFile || "", Fecha: key, Compras: 0, Lineas: 0, TotalBruto: 0, TotalNeto: 0, Estado: "Consolidado sin duplicados" });
    const group = groups.get(key);
    group.Compras += 1;
    group.TotalBruto += parseNumber(row.TotalBruto);
    group.TotalNeto += parseNumber(row.TotalNeto);
    if (!group.Archivo && row._sourceFile) group.Archivo = row._sourceFile;
  });
  datasets.ComprasLin.rows.forEach((row) => {
    const key = row._fechaCompra || "";
    if (groups.has(key)) groups.get(key).Lineas += 1;
  });
  return Array.from(groups.values()).map((row) => Object.assign({}, row, {
    TotalBruto: Number(row.TotalBruto.toFixed(2)),
    TotalNeto: Number(row.TotalNeto.toFixed(2))
  }));
}

function parseCms(readerCtor, file) {
  const sourceFile = basename(file);
  const sourceMtime = statSync(file).mtime.toISOString();
  const compressed = readFileSync(file);
  const inflated = inflateSync(compressed);
  const jetSignature = inflated.indexOf(Buffer.from("Standard Jet DB", "ascii"));
  if (jetSignature < 4) throw new Error(`No se encontro Standard Jet DB en ${sourceFile}`);
  const dbStart = jetSignature - 4;
  const reader = new readerCtor(inflated.subarray(dbStart));
  const tableCounts = {};
  const tableColumns = {};
  const datasets = {};
  Object.keys(TABLE_DEFS).forEach((tableName) => {
    const result = getRows(reader, tableName, sourceFile, sourceMtime);
    tableCounts[tableName] = result.rowCount;
    tableColumns[tableName] = result.columns;
    datasets[tableName] = makeDataset(tableName, result.rows);
  });
  addTicketDates(datasets);
  addPurchaseDates(datasets);
  return {
    sourceFile,
    sourceMtime,
    compressedSize: compressed.length,
    decompressedSize: inflated.length,
    dbStart,
    tableCounts,
    tableColumns,
    datasets,
    closures: buildClosureRows(sourceFile, sourceMtime, datasets, tableCounts),
    purchases: buildPurchaseRows(sourceFile, datasets)
  };
}

function mergeResults(results) {
  const datasets = {};
  Object.keys(TABLE_DEFS).forEach((key) => {
    datasets[key] = makeDataset(key, uniqueRows(results.flatMap((result) => result.datasets[key].rows), (row) => rowKeyForTable(key, row)));
  });
  Object.keys(EXTRA_DATASETS).forEach((key) => {
    datasets[key] = makeDataset(key, []);
  });
  datasets.CierresDiarios.rows = results.flatMap((result) => result.closures);
  datasets.ComprasDiarias.rows = buildMergedPurchaseRows(datasets);
  return {
    version: "WTF_ICG_FRONTREST_BRIDGE_V1",
    sourceName: `CMS extract ${new Date().toISOString().slice(0, 10)}`,
    updatedAt: new Date().toISOString(),
    audit: {
      status: "CMS leidos con mdb-reader",
      originalSize: results.reduce((sum, result) => sum + result.compressedSize, 0),
      decompressedSize: results.reduce((sum, result) => sum + result.decompressedSize, 0),
      foundTables: Object.keys(TABLE_DEFS).filter((tableName) => results.some((result) => (result.tableCounts[tableName] || 0) > 0)),
      foundFields: Array.from(new Set(Object.values(TABLE_DEFS).flat())),
      cmsFiles: results.map((result) => ({
        archivo: result.sourceFile,
        modificado: result.sourceMtime,
        originalSize: result.compressedSize,
        decompressedSize: result.decompressedSize,
        dbStart: result.dbStart,
        tableCounts: result.tableCounts
      })),
      notes: [
        "Los importes de venta solo se calculan cuando el CMS trae filas en TiquetsCab.",
        "En los CMS sin tickets se crea un cierre con Estado=Sin tickets para dejar evidencia de lectura.",
        "Los vinculos Mise ICG deben validarse por CodArticulo o Referencia antes de automatizar descuentos."
      ]
    },
    datasets
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.files.length) {
  console.log(usage());
  process.exit(args.help ? 0 : 1);
}

const MDBReader = await loadMdbReader();
const results = [];
for (const file of args.files) {
  try {
    results.push(parseCms(MDBReader, file));
    console.log(`OK ${basename(file)}`);
  } catch (error) {
    console.error(`ERROR ${basename(file)}: ${error.message}`);
  }
}
const payload = mergeResults(results);
const outPath = resolve(args.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log(`Generado ${outPath}`);
