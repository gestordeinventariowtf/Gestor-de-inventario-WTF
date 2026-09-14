import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sourceProject = process.argv[2] || "gestor-de-inventario-wtf-29056";
const targetProject = process.argv[3] || "gestor-wtf";
const database = "(default)";
const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const token = JSON.parse(fs.readFileSync(configPath, "utf8")).tokens?.access_token;

if (!token) {
  throw new Error("No se encontro access_token de Firebase CLI.");
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};

function base(project) {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/${encodeURIComponent(database)}/documents`;
}

function targetDocUrl(sourceName) {
  const prefix = `projects/${sourceProject}/databases/${database}/documents/`;
  const relative = sourceName.startsWith(prefix) ? sourceName.slice(prefix.length) : sourceName.split("/documents/")[1];
  return `${base(targetProject)}/${relative}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }
  return data;
}

async function listCollectionIds(parentName) {
  const url = `https://firestore.googleapis.com/v1/${parentName}:listCollectionIds`;
  const ids = [];
  let pageToken = "";
  do {
    const data = await requestJson(url, {
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
    const data = await requestJson(`${parentPath}/${collectionId}?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`);
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return docs;
}

async function copyDocument(doc) {
  await requestJson(targetDocUrl(doc.name), {
    method: "PATCH",
    body: JSON.stringify({ fields: doc.fields || {} })
  });
}

async function copyCollections(parentPath, parentName) {
  const collectionIds = await listCollectionIds(parentName);
  let copied = 0;
  for (const collectionId of collectionIds) {
    const docs = await listDocuments(parentPath, collectionId);
    for (const doc of docs) {
      await copyDocument(doc);
      copied += 1;
      copied += await copyCollections(`${base(sourceProject)}/${doc.name.split("/documents/")[1]}`, doc.name);
    }
  }
  return copied;
}

const rootName = `projects/${sourceProject}/databases/${database}/documents`;
const copied = await copyCollections(base(sourceProject), rootName);
console.log(JSON.stringify({ ok: true, sourceProject, targetProject, copiedDocuments: copied }, null, 2));
