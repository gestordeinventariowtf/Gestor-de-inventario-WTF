import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [sourceProject, targetProject, ...secretNames] = process.argv.slice(2);

if (!sourceProject || !targetProject || !secretNames.length) {
  console.error("Usage: node tools/copy-firebase-secrets.mjs <sourceProject> <targetProject> <SECRET...>");
  process.exit(1);
}

function readFirebaseAccessToken() {
  const candidates = [
    path.join(os.homedir(), ".config", "configstore", "firebase-tools.json"),
    path.join(process.env.APPDATA || "", "firebase-tools.json")
  ].filter(Boolean);

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const token = config?.tokens?.access_token;
    if (token) return token;
  }
  throw new Error("No Firebase CLI access token found.");
}

const token = readFirebaseAccessToken();
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body?.error?.message || response.statusText;
    const error = new Error(`${response.status} ${message}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function ensureSecret(projectId, secretName) {
  const name = encodeURIComponent(secretName);
  try {
    await api(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${name}`);
    return "exists";
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  await api(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets?secretId=${name}`, {
    method: "POST",
    body: JSON.stringify({ replication: { automatic: {} } })
  });
  return "created";
}

async function copySecret(secretName) {
  const sourceVersion = await api(
    `https://secretmanager.googleapis.com/v1/projects/${sourceProject}/secrets/${encodeURIComponent(secretName)}/versions/latest:access`
  );
  const encodedData = sourceVersion?.payload?.data;
  if (!encodedData) throw new Error(`Secret ${secretName} has no payload.`);

  const state = await ensureSecret(targetProject, secretName);
  await api(`https://secretmanager.googleapis.com/v1/projects/${targetProject}/secrets/${encodeURIComponent(secretName)}:addVersion`, {
    method: "POST",
    body: JSON.stringify({ payload: { data: encodedData } })
  });

  return { secretName, state, copied: true };
}

const results = [];
for (const secretName of secretNames) {
  try {
    results.push(await copySecret(secretName));
  } catch (error) {
    results.push({
      secretName,
      copied: false,
      error: error.message
    });
  }
}

console.log(JSON.stringify({ sourceProject, targetProject, results }, null, 2));
