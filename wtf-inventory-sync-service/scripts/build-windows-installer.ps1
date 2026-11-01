param(
  [string]$OutputDir = ".\release",
  [string]$PackageName = "WTF-ICG-Host-Setup",
  [switch]$BuildSelfExtractingExe,
  [string]$WebAppUrl = "https://gestor-de-inventario-wtf-29056.web.app",
  [string]$IcgLiveDatabaseName = "",
  [string]$IcgSqlDataDir = "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA",
  [string]$IcgBackupPath = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Release = Join-Path $Root $OutputDir
$Payload = Join-Path $Release "payload"
$IExpressPayload = Join-Path $Release "iexpress-payload"
$ZipPath = Join-Path $Release "$PackageName.zip"
$ExePath = Join-Path $Release "$PackageName.exe"
$InnerZipPath = Join-Path $Release "$PackageName-payload.zip"
$PackageTools = Join-Path $Root ".package-tools"
$PackageNodeVersion = "v22.11.0"
$PackageNodeDir = Join-Path $PackageTools "node-$PackageNodeVersion-win-x64"
$PackageNodeExe = Join-Path $PackageNodeDir "node.exe"
$PackageNpmCmd = Join-Path $PackageNodeDir "npm.cmd"
$PackageNpxCmd = Join-Path $PackageNodeDir "npx.cmd"

function Compress-WithRetry {
  param(
    [string]$SourceGlob,
    [string]$Destination
  )
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      if (Test-Path $Destination) {
        Remove-Item -LiteralPath $Destination -Force
      }
      $sourceDirectory = Split-Path -Parent $SourceGlob
      $sourceItems = @(Get-ChildItem -LiteralPath $sourceDirectory -Force)
      if (!$sourceItems.Count) {
        throw "No hay archivos para comprimir en $sourceDirectory."
      }
      Compress-Archive -Path $sourceItems.FullName -DestinationPath $Destination -Force
      if (!(Test-Path $Destination) -or (Get-Item $Destination).Length -le 0) {
        throw "La compresion produjo un archivo vacio."
      }
      return
    } catch {
      if ($attempt -eq 5) {
        throw
      }
      Start-Sleep -Seconds (2 * $attempt)
    }
  }
}

function Get-CSharpCompiler {
  $candidates = @(
    (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
    (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  $cmd = Get-Command csc.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw "No se encontro csc.exe para compilar la aplicacion de bandeja."
}

function Get-NodeMajor {
  param([string]$NodeExe)
  if (!(Test-Path $NodeExe)) { return 0 }
  $version = (& $NodeExe -v 2>$null)
  if ($LASTEXITCODE -ne 0 -or !$version) { return 0 }
  $text = [string]$version
  if ($text.StartsWith("v")) { $text = $text.Substring(1) }
  $major = $text.Split(".")[0]
  return [int]$major
}

function Ensure-PackagingNode {
  if ((Get-NodeMajor $PackageNodeExe) -eq 22 -and (Test-Path $PackageNpmCmd) -and (Test-Path $PackageNpxCmd)) {
    return
  }

  New-Item -ItemType Directory -Force -Path $PackageTools | Out-Null
  $zipName = "node-$PackageNodeVersion-win-x64.zip"
  $zipPath = Join-Path $PackageTools $zipName
  $url = "https://nodejs.org/dist/$PackageNodeVersion/$zipName"

  Write-Host "Preparando Node 22 portable para empaquetar el Host..." -ForegroundColor Cyan
  if (Test-Path $PackageNodeDir) {
    Remove-Item -LiteralPath $PackageNodeDir -Recurse -Force
  }

  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  for ($attempt = 1; $attempt -le 4; $attempt++) {
    if (Test-Path $zipPath) {
      Remove-Item -LiteralPath $zipPath -Force
    }
    try {
      $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
      if ($curl) {
        & $curl.Source -L --fail --retry 3 --retry-delay 2 -o $zipPath $url
        if ($LASTEXITCODE -ne 0) {
          throw "curl no pudo descargar Node 22."
        }
      } else {
        Invoke-WebRequest -Uri $url -OutFile $zipPath
      }
      break
    } catch {
      if ($attempt -eq 4) {
        throw
      }
      Start-Sleep -Seconds (2 * $attempt)
    }
  }

  Expand-Archive -LiteralPath $zipPath -DestinationPath $PackageTools -Force

  if ((Get-NodeMajor $PackageNodeExe) -ne 22 -or !(Test-Path $PackageNpmCmd) -or !(Test-Path $PackageNpxCmd)) {
    throw "No se pudo preparar Node 22 portable para generar el instalador."
  }
}

function Invoke-PackagingCommand {
  param(
    [string]$Command,
    [string[]]$Arguments
  )
  Ensure-PackagingNode
  $oldPath = $env:PATH
  try {
    $env:PATH = "$PackageNodeDir;$oldPath"
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Fallo el comando de empaquetado: $Command $($Arguments -join ' ')"
    }
  } finally {
    $env:PATH = $oldPath
  }
}

function Build-TrayApp {
  param([string]$OutputPath)
  $source = Join-Path $Root "scripts\tray\WtfIcgHostTray.cs"
  if (!(Test-Path $source)) {
    throw "No se encontro el codigo fuente de la aplicacion de bandeja."
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  $csc = Get-CSharpCompiler
  & $csc /nologo /target:winexe /platform:x64 /out:$OutputPath /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll $source
  if ($LASTEXITCODE -ne 0 -or !(Test-Path $OutputPath)) {
    throw "No se pudo compilar WTF ICG Host Tray."
  }
}

function Build-ConfiguratorApp {
  param([string]$OutputPath)
  $source = Join-Path $Root "scripts\configurator\WtfIcgHostConfigurator.cs"
  if (!(Test-Path $source)) { throw "No se encontro el configurador del Host." }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  $csc = Get-CSharpCompiler
  & $csc /nologo /target:winexe /platform:x64 /out:$OutputPath /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll $source
  if ($LASTEXITCODE -ne 0 -or !(Test-Path $OutputPath)) { throw "No se pudo compilar el configurador WTF ICG Host." }
}

function Build-QueueManagerApp {
  param([string]$OutputPath)
  $source = Join-Path $Root "scripts\queue-manager\WtfIcgHostQueueManager.cs"
  if (!(Test-Path $source)) { throw "No se encontro el gestor de cola del Host." }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  $csc = Get-CSharpCompiler
  & $csc /nologo /target:winexe /platform:x64 /out:$OutputPath /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll $source
  if ($LASTEXITCODE -ne 0 -or !(Test-Path $OutputPath)) { throw "No se pudo compilar el gestor de cola WTF ICG Host." }
}

function Build-SelfExtractingInstallerFallback {
  param(
    [string]$ZipSource,
    [string]$OutputPath
  )
  $fallbackWork = Join-Path $env:TEMP "wtf-icg-host-installer-fallback"
  if (Test-Path $fallbackWork) {
    Remove-Item -LiteralPath $fallbackWork -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $fallbackWork | Out-Null
  $payloadResource = Join-Path $fallbackWork "payload.zip"
  $sourcePath = Join-Path $fallbackWork "WtfIcgHostSetup.cs"
  Copy-Item -LiteralPath $ZipSource -Destination $payloadResource -Force
  @"
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

class WtfIcgHostSetup {
  const string ClaimEndpoint = "https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfClaimHostActivation";

  [STAThread]
  static int Main() {
    try {
      string target = Path.Combine(Path.GetTempPath(), "WTF-ICG-Host-Setup-" + Guid.NewGuid().ToString("N"));
      Directory.CreateDirectory(target);
      string zipPath = Path.Combine(target, "payload.zip");
      using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip")) {
        if (input == null) throw new Exception("No se encontro payload.zip dentro del instalador.");
        using (FileStream output = File.Create(zipPath)) input.CopyTo(output);
      }
      ZipFile.ExtractToDirectory(zipPath, target);
      string setup = Path.Combine(target, "INSTALAR-WTF-ICG-HOST.cmd");
      if (!File.Exists(setup)) throw new Exception("No se encontro INSTALAR-WTF-ICG-HOST.cmd.");
      Process proc = Process.Start(new ProcessStartInfo {
        FileName = setup,
        WorkingDirectory = target,
        UseShellExecute = true
      });
      return 0;
    } catch (Exception ex) {
      Console.Error.WriteLine(ex.Message);
      try { MessageBox.Show(ex.Message, "Activacion WTF ICG Host", MessageBoxButtons.OK, MessageBoxIcon.Error); } catch {}
      return 1;
    }
  }

  static bool Activate(string activationFile) {
    Application.EnableVisualStyles();
    Application.SetCompatibleTextRenderingDefault(false);
    using (var form = new ActivationForm(activationFile)) return form.ShowDialog() == DialogResult.OK;
  }

  static string DeviceId() {
    try {
      using (var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey("SOFTWARE\\Microsoft\\Cryptography")) {
        string value = key == null ? "" : Convert.ToString(key.GetValue("MachineGuid"));
        if (!String.IsNullOrWhiteSpace(value)) return value;
      }
    } catch {}
    return Environment.MachineName + "|" + Environment.UserName;
  }

  static string JsonEscape(string value) { return (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n"); }

  static string Extract(string json, string name) {
    Match match = Regex.Match(json ?? "", "\\\"" + Regex.Escape(name) + "\\\"\\s*:\\s*\\\"(?<v>(?:\\\\.|[^\\\"])*)\\\"", RegexOptions.IgnoreCase);
    return match.Success ? Regex.Unescape(match.Groups["v"].Value) : "";
  }

  static string ProtectForWindows(string secret) {
    var psi = new ProcessStartInfo { FileName = "powershell.exe", Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"$s=[Console]::In.ReadToEnd(); ConvertFrom-SecureString (ConvertTo-SecureString $s -AsPlainText -Force)\"", UseShellExecute = false, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
    using (var process = Process.Start(psi)) {
      process.StandardInput.Write(secret ?? ""); process.StandardInput.Close();
      string output = process.StandardOutput.ReadToEnd().Trim(); string error = process.StandardError.ReadToEnd().Trim(); process.WaitForExit();
      if (process.ExitCode != 0 || String.IsNullOrWhiteSpace(output)) throw new Exception("No se pudo proteger la credencial tecnica en Windows. " + error);
      return output;
    }
  }

  static string Claim(string terminalId, string activationCode) {
    string body = "{\"terminalId\":\"" + JsonEscape(terminalId) + "\",\"activationCode\":\"" + JsonEscape(activationCode) + "\",\"deviceId\":\"" + JsonEscape(DeviceId()) + "\"}";
    using (var client = new HttpClient()) using (var content = new StringContent(body, Encoding.UTF8, "application/json")) {
      client.Timeout = TimeSpan.FromSeconds(30);
      HttpResponseMessage response = client.PostAsync(ClaimEndpoint, content).GetAwaiter().GetResult();
      string json = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
      if (!response.IsSuccessStatusCode) throw new Exception(Extract(json, "error") ?? "La activacion fue rechazada por el servidor.");
      string credential = Extract(json, "credential"); string returnedTerminal = Extract(json, "terminalId");
      if (String.IsNullOrWhiteSpace(credential) || !String.Equals(returnedTerminal, terminalId, StringComparison.Ordinal)) throw new Exception("La respuesta de activacion no es valida.");
      return credential;
    }
  }

  sealed class ActivationForm : Form {
    readonly string activationFile; readonly TextBox terminal = new TextBox(); readonly TextBox code = new TextBox(); readonly Button activate = new Button(); readonly Label status = new Label();
    public ActivationForm(string file) {
      activationFile = file; Text = "Activacion WTF ICG Host"; Width = 520; Height = 285; StartPosition = FormStartPosition.CenterScreen; FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false; MinimizeBox = false;
      var title = new Label { Text = "Activar WTF ICG Host", Left = 24, Top = 18, Width = 450, Font = new System.Drawing.Font("Segoe UI", 15, System.Drawing.FontStyle.Bold) };
      var info = new Label { Text = "Antes de instalar, introduce el Terminal ID y la credencial de un solo uso generada en Finanzas > Control Horario.", Left = 24, Top = 52, Width = 455, Height = 42 };
      var l1 = new Label { Text = "Terminal ID", Left = 24, Top = 105, Width = 120 }; terminal.Left = 150; terminal.Top = 101; terminal.Width = 320;
      var l2 = new Label { Text = "Credencial de un solo uso", Left = 24, Top = 145, Width = 120 }; code.Left = 150; code.Top = 141; code.Width = 320; code.UseSystemPasswordChar = true;
      activate.Text = "Activar y continuar"; activate.Left = 150; activate.Top = 185; activate.Width = 160; activate.Height = 30; activate.Click += async (s, e) => await Submit();
      status.Left = 24; status.Top = 225; status.Width = 450; status.Height = 30; status.ForeColor = System.Drawing.Color.DarkSlateGray;
      Controls.AddRange(new Control[] { title, info, l1, terminal, l2, code, activate, status }); AcceptButton = activate;
    }
    async Task Submit() {
      string terminalId = terminal.Text.Trim(); string activationCode = code.Text.Trim(); if (String.IsNullOrWhiteSpace(terminalId) || String.IsNullOrWhiteSpace(activationCode)) { status.Text = "Completa ambos campos."; return; }
      activate.Enabled = false; terminal.Enabled = false; code.Enabled = false; status.Text = "Validando activacion...";
      try {
        string credential = await Task.Run(() => Claim(terminalId, activationCode)); string protectedCredential = await Task.Run(() => ProtectForWindows(credential));
        File.WriteAllText(activationFile, "{\"terminalId\":\"" + JsonEscape(terminalId) + "\",\"credentialProtected\":\"" + JsonEscape(protectedCredential) + "\",\"endpoint\":\"https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfHostFirestoreGateway\"}", Encoding.UTF8);
        DialogResult = DialogResult.OK; Close();
      } catch (Exception ex) { status.Text = ex.Message; activate.Enabled = true; terminal.Enabled = true; code.Enabled = true; code.Clear(); }
    }
  }
}
"@ | Set-Content -LiteralPath $sourcePath -Encoding ASCII
  $csc = Get-CSharpCompiler
  $compilerArgs = @(
    "/nologo",
    "/target:exe",
    "/platform:x64",
    "/resource:$payloadResource,payload.zip",
    "/reference:System.dll",
    "/reference:System.Core.dll",
    "/reference:System.IO.Compression.dll",
    "/reference:System.IO.Compression.FileSystem.dll",
    "/reference:System.Net.Http.dll",
    "/reference:System.Windows.Forms.dll",
    "/reference:System.Drawing.dll"
  )
  & $csc @compilerArgs "/out:$OutputPath" $sourcePath
  if ($LASTEXITCODE -ne 0 -or !(Test-Path $OutputPath)) {
    $fallbackOutput = Join-Path (Split-Path -Parent $OutputPath) (([IO.Path]::GetFileNameWithoutExtension($OutputPath)) + "-actualizado.exe")
    Write-Warning "No se pudo sobrescribir $OutputPath. Se generara $fallbackOutput."
    & $csc @compilerArgs "/out:$fallbackOutput" $sourcePath
    if ($LASTEXITCODE -ne 0 -or !(Test-Path $fallbackOutput)) {
      throw "No se pudo generar el instalador .exe alternativo."
    }
  }
}

function Build-HostLauncher {
  param([string]$OutputPath)
  $launcherWork = Join-Path $env:TEMP "wtf-icg-host-launcher"
  if (Test-Path $launcherWork) {
    Remove-Item -LiteralPath $launcherWork -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $launcherWork | Out-Null
  $sourcePath = Join-Path $launcherWork "WtfIcgHostLauncher.cs"
  @"
using System;
using System.Diagnostics;
using System.IO;

class WtfIcgHostLauncher {
  static int Main(string[] args) {
    try {
      string appDir = AppDomain.CurrentDomain.BaseDirectory;
      string installRoot = Directory.GetParent(appDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)).FullName;
      string node = Path.Combine(appDir, "node", "node.exe");
      string main = Path.Combine(installRoot, "dist", "main.js");
      if (!File.Exists(node)) throw new Exception("No se encontro el runtime Node portable del Host.");
      if (!File.Exists(main)) throw new Exception("No se encontro dist\\main.js del Host.");

      string escapedMain = "\"" + main.Replace("\"", "\\\"") + "\"";
      string extraArgs = args == null || args.Length == 0 ? "" : " " + string.Join(" ", Array.ConvertAll(args, EscapeArg));
      var proc = Process.Start(new ProcessStartInfo {
        FileName = node,
        Arguments = escapedMain + extraArgs,
        WorkingDirectory = installRoot,
        UseShellExecute = false,
        CreateNoWindow = true,
        WindowStyle = ProcessWindowStyle.Hidden
      });
      if (proc == null) return 1;
      proc.WaitForExit();
      return proc.ExitCode;
    } catch (Exception ex) {
      File.AppendAllText(Path.Combine(Path.GetTempPath(), "wtf-icg-host-launcher-error.log"), DateTime.Now.ToString("s") + " " + ex.Message + Environment.NewLine);
      return 1;
    }
  }

  static string EscapeArg(string value) {
    if (String.IsNullOrEmpty(value)) return "\"\"";
    return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
  }
}
"@ | Set-Content -LiteralPath $sourcePath -Encoding ASCII
  $csc = Get-CSharpCompiler
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  & $csc /nologo /target:winexe /platform:x64 /out:$OutputPath /reference:System.dll /reference:System.Core.dll $sourcePath
  if ($LASTEXITCODE -ne 0 -or !(Test-Path $OutputPath)) {
    throw "No se pudo compilar el lanzador WTF ICG Host."
  }
}

function Copy-PackagingNodeRuntime {
  param([string]$Destination)
  Ensure-PackagingNode
  if (Test-Path $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Copy-Item -LiteralPath (Join-Path $PackageNodeDir "node.exe") -Destination (Join-Path $Destination "node.exe") -Force
}

Set-Location $Root
Invoke-PackagingCommand -Command $PackageNpmCmd -Arguments @("install")
Invoke-PackagingCommand -Command $PackageNpmCmd -Arguments @("run", "build")
Build-HostLauncher -OutputPath (Join-Path $Release "app\wtf-icg-host.exe")
Copy-PackagingNodeRuntime -Destination (Join-Path $Release "app\node")
Build-TrayApp -OutputPath (Join-Path $Release "app\wtf-icg-host-tray.exe")
Build-ConfiguratorApp -OutputPath (Join-Path $Release "app\WTF ICG Host Configurador.exe")
Build-QueueManagerApp -OutputPath (Join-Path $Release "app\WTF ICG Host Gestor de Cola.exe")

if (Test-Path $Payload) {
  Remove-Item -LiteralPath $Payload -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Payload | Out-Null

$items = @(
  "dist",
  "scripts",
  "package.json",
  "package-lock.json",
  ".env.example",
  "README.md",
  "API_LOCAL.md",
  "OPERACION_SIMPLE.md",
  "CONFIGURADOR_HOST.md"
)

foreach ($item in $items) {
  $source = Join-Path $Root $item
  if (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $Payload $item) -Recurse -Force
  }
}

$appSource = Join-Path $Release "app"
if (Test-Path $appSource) {
  Copy-Item -LiteralPath $appSource -Destination (Join-Path $Payload "app") -Recurse -Force
}

$dotenvSource = Join-Path $Root "node_modules\dotenv"
$dotenvTarget = Join-Path $Payload "node_modules\dotenv"
if (Test-Path $dotenvSource) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dotenvTarget) | Out-Null
  Copy-Item -LiteralPath $dotenvSource -Destination $dotenvTarget -Recurse -Force
}

$SetupCmd = Join-Path $Payload "INSTALAR-WTF-ICG-HOST.cmd"
$ActivationScript = Join-Path $Payload "scripts\activate-host.ps1"
@'
param(
  [Parameter(Mandatory=$true)][string]$ActivationFile
)

$ErrorActionPreference = "Stop"
$endpoint = "https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfClaimHostActivation"

function Get-DeviceId {
  try {
    $machineGuid = (Get-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name MachineGuid -ErrorAction Stop).MachineGuid
    if ($machineGuid) { return [string]$machineGuid }
  } catch {}
  return "$env:COMPUTERNAME|$env:USERNAME"
}

try {
  Write-Host ""
  Write-Host "Activacion tecnica de WTF ICG Host" -ForegroundColor Cyan
  Write-Host "La credencial se utiliza una sola vez y no se guarda en texto plano." -ForegroundColor DarkGray
  $terminalId = (Read-Host "Terminal ID").Trim()
  $secureCode = Read-Host "Credencial de activacion de un solo uso" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureCode)
  try { $activationCode = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  if ([string]::IsNullOrWhiteSpace($terminalId) -or [string]::IsNullOrWhiteSpace($activationCode)) { throw "Debes completar el Terminal ID y la credencial de un solo uso." }

  $body = @{ terminalId=$terminalId; activationCode=$activationCode; deviceId=(Get-DeviceId) } | ConvertTo-Json -Compress
  $response = Invoke-RestMethod -Uri $endpoint -Method Post -ContentType "application/json" -Body $body -TimeoutSec 30
  if (-not $response.ok -or [string]::IsNullOrWhiteSpace([string]$response.credential)) { throw "El servidor rechazo la activacion." }

  $protected = ConvertTo-SecureString -String ([string]$response.credential) -AsPlainText -Force | ConvertFrom-SecureString
  $activation = @{ terminalId=$terminalId; credentialProtected=$protected; endpoint="https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfHostFirestoreGateway" } | ConvertTo-Json -Compress
  Set-Content -LiteralPath $ActivationFile -Value $activation -Encoding UTF8
  $activationCode = $null
  Write-Host "Activacion confirmada. Continuando la instalacion..." -ForegroundColor Green
  exit 0
} catch {
  Write-Host "Activacion no completada: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
'@ | Set-Content -LiteralPath $ActivationScript -Encoding UTF8
@"
@echo off
title Instalador WTF ICG Host
echo.
echo Activacion inicial requerida antes de instalar WTF ICG Host.
echo Windows solicitara permiso de Administrador si hace falta.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\activate-host.ps1" -ActivationFile "%~dp0activation.json"
if errorlevel 1 (
  echo.
  echo La activacion fallo. No se continuara la instalacion.
  pause
  exit /b 1
)
  set "DB_NAME="
  set /p "DB_INPUT=Nombre exacto de la base SQL (obligatorio): "
  if not "%DB_INPUT%"=="" set "DB_NAME=%DB_INPUT%"
if "%DB_NAME%"=="" (
  echo.
  echo Debes escribir el nombre exacto de la base SQL antes de continuar.
  pause
  exit /b 1
)
set "SQL_DATA_DIR=$IcgSqlDataDir"
set /p "SQL_PATH_INPUT=Ruta de datos SQL [$IcgSqlDataDir]: "
if not "%SQL_PATH_INPUT%"=="" set "SQL_DATA_DIR=%SQL_PATH_INPUT%"
  set "BACKUP_PATH=C:\ICG\BACKUP\%DB_NAME%.BAK_1"
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-app.ps1" -ActivationFile "%~dp0activation.json" -StartNow -WebAppUrl "$WebAppUrl" -IcgLiveDatabaseName "%DB_NAME%" -IcgSqlDataDir "%SQL_DATA_DIR%" -IcgBackupPath "%BACKUP_PATH%"
echo.
pause
"@ | Set-Content -LiteralPath $SetupCmd -Encoding ASCII

$ReadmeInstall = Join-Path $Payload "LEEME-INSTALACION.txt"
@"
WTF ICG Host - Instalador local

1. Extrae este paquete en la PC donde esta ICG FrontRest.
2. Ejecuta el archivo WTF-ICG-Host-Setup.exe como administrador.
3. El CMD solicitara el Terminal ID y la credencial de un solo uso generada en Finanzas > Control Horario.
4. La activacion se consume una sola vez y se protege en Windows; luego continua la instalacion automaticamente.
5. El sistema quedara activo automaticamente al iniciar Windows.
6. El icono de bandeja permite abrir opciones, reiniciar servicio o ver el panel.
6. El panel no se abre solo; puedes abrirlo manualmente en:

Panel local:
http://127.0.0.1:8787

Carpetas de operacion:
C:\ProgramData\WTF ICG Host\data\inbox
C:\ProgramData\WTF ICG Host\data\outbox
C:\ProgramData\WTF ICG Host\data\processed
C:\ProgramData\WTF ICG Host\data\quarantine

Acceso visible:
C:\Program Files\WTF ICG Host\data
C:\Program Files\WTF ICG Host\Abrir Carpeta Data WTF ICG Host.cmd
"@ | Set-Content -LiteralPath $ReadmeInstall -Encoding UTF8

New-Item -ItemType Directory -Force -Path $Release | Out-Null
if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}
Compress-WithRetry -SourceGlob (Join-Path $Payload "*") -Destination $ZipPath
if (Test-Path $InnerZipPath) {
  Remove-Item -LiteralPath $InnerZipPath -Force
}
Compress-WithRetry -SourceGlob (Join-Path $Payload "*") -Destination $InnerZipPath

if ($BuildSelfExtractingExe) {
  Build-SelfExtractingInstallerFallback -ZipSource $InnerZipPath -OutputPath $ExePath
}

Write-Host "Paquete generado:" -ForegroundColor Green
Write-Host $ZipPath
if (Test-Path $ExePath) {
  Write-Host $ExePath
}
