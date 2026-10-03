import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function encoded(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

export async function unprotectWindowsSecret(protectedValue: string): Promise<string> {
  if (!protectedValue) return "";
  if (process.platform !== "win32") throw new Error("La credencial protegida del Host solo puede abrirse en Windows.");
  const script = `$ErrorActionPreference='Stop'; Import-Module Microsoft.PowerShell.Security -ErrorAction Stop; $secure=ConvertTo-SecureString '${protectedValue.replace(/'/g, "''")}' ; $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }`;
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const cleanModulePath = [
    `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\Modules`,
    `${programFiles}\\WindowsPowerShell\\Modules`,
    `${programFilesX86}\\WindowsPowerShell\\Modules`
  ].join(";");
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded(script)], {
    windowsHide: true,
    timeout: 8000,
    maxBuffer: 64 * 1024,
    env: { ...process.env, PSModulePath: cleanModulePath }
  });
  return String(stdout || "").trim();
}

