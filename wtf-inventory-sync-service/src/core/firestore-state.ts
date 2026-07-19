import { deflateSync, inflateSync } from "node:zlib";

type AnyRecord = Record<string, any>;

export function encodeFirestoreValue(value: any): AnyRecord {
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

export function decodeFirestoreValue(value: AnyRecord): any {
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

export function decodeFirestoreAppState(fields: AnyRecord | undefined): AnyRecord {
  const compressed = decodeFirestoreValue(fields?.appStateCompressed);
  if (compressed) {
    try {
      const json = inflateSync(Buffer.from(String(compressed), "base64")).toString("utf8");
      return JSON.parse(json);
    } catch {
      // Fallback to legacy appState below.
    }
  }
  return decodeFirestoreValue(fields?.appState) || {};
}

export function encodeCompressedAppState(appState: AnyRecord): {
  compressed: string;
  jsonBytes: number;
  compressedBytes: number;
} {
  const json = JSON.stringify(appState || {});
  const compressed = deflateSync(Buffer.from(json, "utf8"), { level: 6 }).toString("base64");
  return {
    compressed,
    jsonBytes: Buffer.byteLength(json, "utf8"),
    compressedBytes: Buffer.byteLength(compressed, "utf8")
  };
}
