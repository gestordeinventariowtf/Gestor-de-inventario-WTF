import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [
  projectId,
  oldProjectId = "gestor-de-inventario-wtf-29056",
  newProjectId = "gestor-de-inventario-wtf-2d070",
  oldHosting = "gestor-de-inventario-wtf-prod-2026.web.app",
  newHosting = "gestor-inventario-wtf.web.app"
] = process.argv.slice(2);

if (!projectId) {
  console.error("Usage: node tools/rewrite-firestore-project-refs.mjs <projectId> [oldProjectId] [newProjectId] [oldHosting] [newHosting]");
  process.exit(1);
}

const database = "(default)";
const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const token = JSON.parse(fs.readFileSync(configPath, "utf8")).tokens?.access_token;

if (!token) throw new Error("No se encontro access_token de Firebase CLI.");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};

function base(project) {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/${encodeURIComponent(database)}/documents`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  return data;
}

async function listCollectionIds(parentName) {
  const ids = [];
  let pageToken = "";
  do {
    const data = await requestJson(`https://firestore.googleapis.com/v1/${parentName}:listCollectionIds`, {
      method: "POST",
      body: JSON.stringify({ pageSize: 100, pageToken })
    });
    ids.push(...(data.collectionIds || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return ids;
}

async function listDocuments(parentPath, collectionId) {
  const docs = [];
  let pageToken = "";
  do {
    const url = `${parentPath}/${collectionId}?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const data = await requestJson(url);
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return docs;
}

function rewriteValue(value) {
  if (!value || typeof value !== "object") return { value, changed: false };
  if (typeof value.stringValue === "string") {
    const rewritten = value.stringValue
      .split(oldProjectId).join(newProjectId)
      .split(oldHosting).join(newHosting);
    return { value: { ...value, stringValue: rewritten }, changed: rewritten !== value.stringValue };
  }
  if (value.mapValue?.fields) {
    const result = rewriteFields(value.mapValue.fields);
    return { value: { ...value, mapValue: { ...value.mapValue, fields: result.fields } }, changed: result.changed };
  }
  if (Array.isArray(value.arrayValue?.values)) {
    let changed = false;
    const values = value.arrayValue.values.map((item) => {
      const result = rewriteValue(item);
      changed ||= result.changed;
      return result.value;
    });
    return { value: { ...value, arrayValue: { ...value.arrayValue, values } }, changed };
  }
  return { value, changed: false };
}

function rewriteFields(fields = {}) {
  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(fields)) {
    const result = rewriteValue(value);
    changed ||= result.changed;
    next[key] = result.value;
  }
  return { fields: next, changed };
}

async function rewriteDocument(doc) {
  const result = rewriteFields(doc.fields || {});
  if (!result.changed) return false;
  await requestJson(`https://firestore.googleapis.com/v1/${doc.name}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: result.fields })
  });
  return true;
}

async function walk(parentPath, parentName) {
  const collectionIds = await listCollectionIds(parentName);
  let visited = 0;
  let changed = 0;
  for (const collectionId of collectionIds) {
    const docs = await listDocuments(parentPath, collectionId);
    for (const doc of docs) {
      visited += 1;
      if (await rewriteDocument(doc)) changed += 1;
      const relative = doc.name.split("/documents/")[1];
      const child = await walk(`${base(projectId)}/${relative}`, doc.name);
      visited += child.visited;
      changed += child.changed;
    }
  }
  return { visited, changed };
}

const result = await walk(base(projectId), `projects/${projectId}/databases/${database}/documents`);
console.log(JSON.stringify({ ok: true, projectId, ...result }, null, 2));
