import type { CmsImportResult, CmsTicketLine, ServiceConfig } from "../core/types.js";

type AnyRecord = Record<string, any>;

function encodeFirestoreValue(value: any): AnyRecord {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") {
    const fields: AnyRecord = {};
    Object.entries(value).forEach(([key, val]) => {
      fields[key] = encodeFirestoreValue(val);
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function decodeFirestoreValue(value: AnyRecord): any {
  if (!value || typeof value !== "object") return undefined;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) {
    const out: AnyRecord = {};
    Object.entries(value.mapValue.fields || {}).forEach(([key, val]) => {
      out[key] = decodeFirestoreValue(val as AnyRecord);
    });
    return out;
  }
  return undefined;
}

function normalizar(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
}

function active(row: AnyRecord): boolean {
  const value = normalizar(row.Activo == null ? "si" : row.Activo);
  return value !== "false" && value !== "no" && value !== "0" && value !== "inactivo";
}

function targetKey(value: unknown): "miseCocina" | "miseBar" {
  const key = normalizar(value || "");
  return key.includes("bar") ? "miseBar" : "miseCocina";
}

function quickHashText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function rows(appState: AnyRecord, tableKey: string): AnyRecord[] {
  return appState?.icgFrontRestData?.datasets?.[tableKey]?.rows || [];
}

function ensureIcgData(appState: AnyRecord): AnyRecord {
  appState.icgFrontRestData = appState.icgFrontRestData || {};
  appState.icgFrontRestData.datasets = appState.icgFrontRestData.datasets || {};
  appState.icgFrontRestData.datasets.ConsumoMiseVentas = appState.icgFrontRestData.datasets.ConsumoMiseVentas || {
    key: "ConsumoMiseVentas",
    label: "Consumo Mise ventas",
    columns: ["Fecha", "ModuloWTF", "ProductoWTF", "ProductoMise", "CodArticulo", "Referencia", "ProductoICG", "UnidadesVendidas", "CantidadDescontar", "Unidad", "Archivo", "ImportKey", "Estado"],
    rows: []
  };
  appState.icgFrontRestData.datasets.TiquetsLin = appState.icgFrontRestData.datasets.TiquetsLin || {
    key: "TiquetsLin",
    label: "Lineas vendidas",
    columns: ["Serie", "Numero", "NumLinea", "CodArticulo", "Descripcion", "Unidades", "Referencia", "HORA"],
    rows: []
  };
  appState.icgFrontRestData.appliedImports = Array.isArray(appState.icgFrontRestData.appliedImports) ? appState.icgFrontRestData.appliedImports : [];
  appState.icgFrontRestData.processedCmsFiles = Array.isArray(appState.icgFrontRestData.processedCmsFiles) ? appState.icgFrontRestData.processedCmsFiles : [];
  return appState.icgFrontRestData;
}

function documentUrl(config: ServiceConfig): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.firebaseProjectId)}/databases/(default)/documents/${encodeURIComponent(config.firebaseCollection)}/${encodeURIComponent(config.firebaseDocumentId)}`;
}

async function readAppState(config: ServiceConfig): Promise<AnyRecord> {
  const res = await fetch(documentUrl(config));
  if (!res.ok) throw new Error(`Firestore no permitio leer estado WTF (${res.status}).`);
  const doc = await res.json() as AnyRecord;
  return decodeFirestoreValue(doc.fields?.appState) || {};
}

async function writeAppState(config: ServiceConfig, appState: AnyRecord, result: CmsImportResult): Promise<void> {
  const payload = {
    fields: {
      appState: encodeFirestoreValue(appState),
      syncMeta: encodeFirestoreValue({
        clientId: "wtf-icg-host-local",
        clientTime: Date.now(),
        signature: quickHashText(JSON.stringify(appState)),
        reason: "icg-cms-auto-import"
      }),
      updatedBy: encodeFirestoreValue("icg-cms-auto-import"),
      updatedAtHost: encodeFirestoreValue(new Date().toISOString()),
      lastIcgCmsImport: encodeFirestoreValue(result)
    }
  };
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

export async function applyCmsLinesToFirestore(config: ServiceConfig, lines: CmsTicketLine[], fingerprint: string, fileName: string, filePath: string): Promise<CmsImportResult> {
  const result: CmsImportResult = { ok: false, filePath, fileName, fingerprint, totalLines: lines.length, matched: 0, applied: 0, skipped: 0, errors: [], message: "" };
  const appState = await readAppState(config);
  const icg = ensureIcgData(appState);
  const processedFiles = new Set((icg.processedCmsFiles || []).map((row: AnyRecord) => String(row.fingerprint || "")));
  if (processedFiles.has(fingerprint)) {
    result.ok = true;
    result.skipped = lines.length;
    result.message = "CMS ya procesado anteriormente; no se repitio.";
    return result;
  }

  const links = rows(appState, "VinculosMiseICG").filter(active);
  const appliedKeys = new Set((icg.appliedImports || []).map(String));
  const groups = new Map<string, AnyRecord>();
  for (const line of lines) {
    const link = links.find((row) => {
      const linkCode = normalizar(row.CodArticulo || row.Codigo || "");
      const linkRef = normalizar(row.Referencia || "");
      return linkCode && normalizar(line.codArticulo) === linkCode || linkRef && normalizar(line.referencia) === linkRef;
    });
    if (!link) {
      result.skipped += 1;
      continue;
    }
    const target = targetKey(link.ModuloWTF || link.DestinoWTF || link.Modulo || "Mise an Place Cocina");
    const producto = String(link.ProductoWTF || link.ProductoMise || "").trim();
    if (!producto) {
      result.errors.push(`Vinculo sin ProductoMise para CodArticulo ${line.codArticulo}.`);
      continue;
    }
    const qtyPerSale = parseNumber(link.CantidadPorVenta) || 1;
    const importKey = quickHashText([fingerprint, line.fecha, line.codArticulo, line.referencia, target, producto].join("|"));
    if (!groups.has(importKey)) {
      groups.set(importKey, {
        Fecha: line.fecha,
        ModuloWTF: target === "miseBar" ? "Mise an Place Bar" : "Mise an Place Cocina",
        targetKey: target,
        ProductoWTF: producto,
        ProductoMise: String(link.ProductoMise || producto),
        CodArticulo: line.codArticulo,
        Referencia: line.referencia,
        ProductoICG: line.descripcion,
        UnidadesVendidas: 0,
        CantidadDescontar: 0,
        Unidad: link.Unidad || link.Medida || "Uni",
        Archivo: fileName,
        ImportKey: importKey,
        Estado: "Pendiente"
      });
    }
    const group = groups.get(importKey)!;
    group.UnidadesVendidas += line.unidades;
    group.CantidadDescontar += line.unidades * qtyPerSale;
  }

  const now = new Date().toISOString();
  const consumoRows: AnyRecord[] = icg.datasets.ConsumoMiseVentas.rows || [];
  const ticketRows: AnyRecord[] = icg.datasets.TiquetsLin.rows || [];
  const ticketKeys = new Set(ticketRows.map((row) => String(row._id || "")));
  for (const line of lines) {
    if (!ticketKeys.has(line.id)) {
      ticketRows.unshift({
        _id: line.id,
        Serie: line.serie,
        Numero: line.numero,
        NumLinea: line.numLinea,
        CodArticulo: line.codArticulo,
        Descripcion: line.descripcion,
        Unidades: line.unidades,
        Referencia: line.referencia,
        HORA: line.fecha,
        _sourceFile: fileName,
        _sourceDate: line.sourceMtime
      });
    }
  }

  for (const group of groups.values()) {
    group.UnidadesVendidas = Number(group.UnidadesVendidas.toFixed(4));
    group.CantidadDescontar = Number(group.CantidadDescontar.toFixed(4));
    result.matched += 1;
    if (appliedKeys.has(group.ImportKey)) {
      group.Estado = "Aplicado";
      result.skipped += 1;
      continue;
    }
    const listKey = group.targetKey === "miseBar" ? "barMiseAnPlace" : "miseAnPlace";
    const list: AnyRecord[] = Array.isArray(appState[listKey]) ? appState[listKey] : [];
    const item = list.find((row) => normalizar(row.producto) === normalizar(group.ProductoWTF || group.ProductoMise));
    if (!item) {
      group.Estado = "Producto WTF no encontrado";
      result.errors.push(`${group.ProductoWTF} no existe en ${group.ModuloWTF}.`);
      continue;
    }
    const existenciaAnterior = parseNumber(item.existencia);
    if (group.CantidadDescontar > existenciaAnterior + 1e-9) {
      group.Estado = "Sin existencia";
      result.errors.push(`${item.producto} sin existencia suficiente. Disponible ${existenciaAnterior}, solicitado ${group.CantidadDescontar}.`);
      continue;
    }
    item.existencia = Number((existenciaAnterior - group.CantidadDescontar).toFixed(4));
    group.Estado = "Aplicado";
    group.ExistenciaActual = existenciaAnterior;
    group.ExistenciaNueva = item.existencia;
    appliedKeys.add(group.ImportKey);
    result.applied += 1;
    const historyKey = group.targetKey === "miseBar" ? "barHistSalidaRapida" : "histSalidaRapida";
    const historyFallback = group.targetKey === "miseBar" ? "barRegSalidas" : "histSalidaRapida";
    const targetHistoryKey = Array.isArray(appState[historyKey]) ? historyKey : historyFallback;
    appState[targetHistoryKey] = Array.isArray(appState[targetHistoryKey]) ? appState[targetHistoryKey] : [];
    appState[targetHistoryKey].push({
      id: `icg-cms-${group.ImportKey}`,
      fecha: now,
      producto: item.producto,
      medida: item.medida || group.Unidad || "Uni",
      cantidad: group.CantidadDescontar,
      existenciaAnterior,
      existenciaNueva: item.existencia,
      usuario: "ICG FrontRest CMS",
      origen: "ICG FrontRest CMS",
      archivo: fileName,
      codArticulo: group.CodArticulo,
      importKey: group.ImportKey
    });
  }

  icg.datasets.TiquetsLin.rows = ticketRows.slice(0, 5000);
  const existingConsumptionKeys = new Set(consumoRows.map((row) => String(row.ImportKey || "")));
  const newConsumption = Array.from(groups.values()).filter((row) => !existingConsumptionKeys.has(row.ImportKey));
  icg.datasets.ConsumoMiseVentas.rows = newConsumption.concat(consumoRows).slice(0, 5000);
  icg.appliedImports = Array.from(appliedKeys).slice(-5000);
  icg.processedCmsFiles.unshift({ fingerprint, fileName, filePath, processedAt: now, applied: result.applied, matched: result.matched, errors: result.errors });
  icg.processedCmsFiles = icg.processedCmsFiles.slice(0, 300);
  icg.sourceName = fileName;
  icg.updatedAt = now;
  result.ok = result.errors.length === 0 || result.applied > 0;
  result.message = result.applied ? `CMS aplicado: ${result.applied} salidas Mise.` : "CMS leido sin salidas aplicables.";
  await writeAppState(config, appState, result);
  return result;
}
