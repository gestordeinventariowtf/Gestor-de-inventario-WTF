import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function safeExec(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (_) {
    return "";
  }
}

const now = new Date();
const timestamp = now.toISOString();
const previousCommit = safeExec("git rev-parse --short HEAD");
const branch = safeExec("git rev-parse --abbrev-ref HEAD");
const buildId = `${timestamp.replace(/[-:.TZ]/g, "").slice(0, 14)}-${previousCommit || "local"}`;

const payload = {
  buildId,
  updatedAt: timestamp,
  branch,
  previousCommit
};

writeFileSync("version.json", JSON.stringify(payload, null, 2) + "\n", "utf8");
try {
  const indexPath = "index.html";
  const indexHtml = readFileSync(indexPath, "utf8");
  const versionScript = `<script>window.WTF_APP_VERSION = "${buildId}";</script>`;
  const nextIndexHtml = indexHtml.includes("window.WTF_APP_VERSION")
    ? indexHtml.replace(/<script>window\.WTF_APP_VERSION = "[^"]*";<\/script>/, versionScript)
    : indexHtml.replace('<script src="./firebase-config.js"></script>', `<script src="./firebase-config.js"></script>\n  ${versionScript}`);
  if (nextIndexHtml !== indexHtml) writeFileSync(indexPath, nextIndexHtml, "utf8");
} catch (error) {
  console.warn(`No se pudo actualizar WTF_APP_VERSION en index.html: ${error && error.message ? error.message : error}`);
}

if (process.argv.includes("--stage")) {
  safeExec("git add version.json index.html");
}

console.log(`Version actualizada: ${buildId}`);
