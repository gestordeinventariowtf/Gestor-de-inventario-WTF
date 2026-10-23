param(
  [string]$OutputDir = ".\release",
  [string]$PackageName = "WTF-ICG-Host-Setup",
  [switch]$BuildSelfExtractingExe,
  [string]$WebAppUrl = "https://gestor-de-inventario-wtf-29056.web.app",
  [string]$IcgLiveDatabaseName = "DBFREST",
  [string]$IcgSqlDataDir = "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA",
  [string]$IcgBackupPath = "C:\ICG\BACKUP\DBFREST.BAK_1"
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
      Compress-Archive -Path $SourceGlob -DestinationPath $Destination -Force
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
using System.Reflection;

class WtfIcgHostSetup {
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
      return 1;
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
    "/reference:System.IO.Compression.FileSystem.dll"
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
  "OPERACION_SIMPLE.md"
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
@"
@echo off
title Instalador WTF ICG Host
echo.
echo Instalando WTF ICG Host...
echo Windows solicitara permiso de Administrador si hace falta.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-app.ps1" -StartNow -WebAppUrl "$WebAppUrl" -IcgLiveDatabaseName "$IcgLiveDatabaseName" -IcgSqlDataDir "$IcgSqlDataDir" -IcgBackupPath "$IcgBackupPath"
echo.
pause
"@ | Set-Content -LiteralPath $SetupCmd -Encoding ASCII

$ReadmeInstall = Join-Path $Payload "LEEME-INSTALACION.txt"
@"
WTF ICG Host - Instalador con activacion de un solo uso

1. En la Web.App abre Finanzas > Control Horario y genera una activacion para la terminal activa.
2. Ejecuta este instalador como administrador en la PC donde esta ICG FrontRest.
3. En la primera pantalla introduce el TerminalID y el codigo temporal.
4. El codigo expira en 10 minutos y se invalida despues de utilizarse.
5. El instalador protege la identidad tecnica y continua automaticamente.
6. No copies contrasenas ni edites el .env.
7. El sistema quedara activo automaticamente al iniciar Windows.
5. El icono de bandeja permite abrir opciones, reiniciar servicio o ver el panel.
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
