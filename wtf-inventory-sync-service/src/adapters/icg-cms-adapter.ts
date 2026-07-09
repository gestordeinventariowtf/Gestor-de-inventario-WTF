import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import MDBReader from "mdb-reader";
import type { CmsTicketLine } from "../core/types.js";

function asText(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "").trim();
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
}

function dateKey(value: unknown, fallback: string): string {
  const text = asText(value);
  if (!text) return fallback.slice(0, 10);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const latam = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (latam) return `${latam[3]}-${latam[2].padStart(2, "0")}-${latam[1].padStart(2, "0")}`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? fallback.slice(0, 10) : date.toISOString().slice(0, 10);
}

export async function findLatestCmsFile(cmsDir: string): Promise<string | null> {
  await fs.mkdir(cmsDir, { recursive: true });
  const entries = await fs.readdir(cmsDir, { withFileTypes: true });
  const files = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".cms")).map(async (entry) => {
    const filePath = path.join(cmsDir, entry.name);
    const stat = await fs.stat(filePath);
    return { filePath, mtimeMs: stat.mtimeMs };
  }));
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0]?.filePath || null;
}

export async function getCmsFingerprint(filePath: string): Promise<{ fingerprint: string; fileName: string; mtime: string; size: number }> {
  const buffer = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return {
    fingerprint: hash,
    fileName: path.basename(filePath),
    mtime: stat.mtime.toISOString(),
    size: stat.size
  };
}

export async function readCmsTicketLines(filePath: string): Promise<{ fingerprint: string; fileName: string; lines: CmsTicketLine[] }> {
  const compressed = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  const sourceFile = path.basename(filePath);
  const sourceMtime = stat.mtime.toISOString();
  const sourceHash = crypto.createHash("sha256").update(compressed).digest("hex");
  const inflated = inflateSync(compressed);
  const jetSignature = inflated.indexOf(Buffer.from("Standard Jet DB", "ascii"));
  if (jetSignature < 4) {
    return {
      fingerprint: sourceHash,
      fileName: sourceFile,
      lines: readWtfCmsTicketLines(inflated, sourceFile, filePath, sourceMtime, sourceHash)
    };
  }
  const reader = new MDBReader(inflated.subarray(jetSignature - 4));
  let table;
  try {
    table = reader.getTable("TiquetsLin");
  } catch {
    throw new Error(`El CMS ${sourceFile} no contiene la tabla TiquetsLin.`);
  }
  const columns = table.getColumnNames();
  const wanted = ["Serie", "Numero", "N", "NumLinea", "CodArticulo", "Descripcion", "Unidades", "Referencia", "HORA", "Fecha"].filter((col) => columns.includes(col));
  const rows = table.getData({ columns: wanted });
  const lines = rows.map((row: Record<string, unknown>, index: number): CmsTicketLine => ({
    id: `${sourceHash.slice(0, 12)}-${asText(row.Serie)}-${asText(row.Numero)}-${asText(row.N)}-${asText(row.NumLinea || index)}`,
    sourceFile,
    sourcePath: filePath,
    sourceMtime,
    sourceHash,
    fecha: dateKey(row.Fecha || row.HORA, sourceMtime),
    serie: asText(row.Serie),
    numero: asText(row.Numero),
    numLinea: asText(row.NumLinea || index),
    codArticulo: asText(row.CodArticulo),
    referencia: asText(row.Referencia),
    descripcion: asText(row.Descripcion),
    unidades: asNumber(row.Unidades)
  })).filter((line) => line.unidades > 0 && (line.codArticulo || line.referencia || line.descripcion));
  return { fingerprint: sourceHash, fileName: sourceFile, lines };
}

function readWtfCmsTicketLines(inflated: Buffer, sourceFile: string, filePath: string, sourceMtime: string, sourceHash: string): CmsTicketLine[] {
  let parsed: any;
  try {
    parsed = JSON.parse(inflated.toString("utf8"));
  } catch {
    throw new Error(`El CMS ${sourceFile} no contiene una base Jet ni un paquete WTF JSON valido.`);
  }
  const data = parsed && parsed.data ? parsed.data : parsed;
  if (!data || data.version !== "WTF_ICG_FRONTREST_BRIDGE_V1") {
    throw new Error(`El CMS ${sourceFile} no contiene una base Jet ni un paquete WTF reconocido.`);
  }
  const rows: Array<Record<string, unknown>> = data.datasets?.TiquetsLin?.rows || [];
  return rows.map((row, index): CmsTicketLine => ({
    id: `${sourceHash.slice(0, 12)}-${asText(row.Serie)}-${asText(row.Numero)}-${asText(row.N)}-${asText(row.NumLinea || index)}`,
    sourceFile,
    sourcePath: filePath,
    sourceMtime,
    sourceHash,
    fecha: dateKey(row.Fecha || row.HORA || row._fechaTicket || row._sourceDate, sourceMtime),
    serie: asText(row.Serie),
    numero: asText(row.Numero),
    numLinea: asText(row.NumLinea || index),
    codArticulo: asText(row.CodArticulo),
    referencia: asText(row.Referencia),
    descripcion: asText(row.Descripcion || row.ProductoICG || row.Nombre),
    unidades: asNumber(row.Unidades)
  })).filter((line) => line.unidades > 0 && (line.codArticulo || line.referencia || line.descripcion));
}
