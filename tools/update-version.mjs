import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

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

if (process.argv.includes("--stage")) {
  safeExec("git add version.json");
}

console.log(`Version actualizada: ${buildId}`);
