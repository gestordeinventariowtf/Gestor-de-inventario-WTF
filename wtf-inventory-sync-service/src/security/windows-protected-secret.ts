import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function encoded(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

export async function unprotectWindowsSecret(protectedValue: string): Promise<string> {
  if (!protectedValue) return "";
  if (process.platform !== "win32") throw new Error("La credencial protegida del Host solo puede abrirse en Windows.");
  const script = `$ErrorActionPreference='Stop'; $secure=ConvertTo-SecureString '${protectedValue.replace(/'/g, "''")}' ; $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded(script)], { windowsHide: true, timeout: 8000, maxBuffer: 64 * 1024 });
  return String(stdout || "").trim();
}

