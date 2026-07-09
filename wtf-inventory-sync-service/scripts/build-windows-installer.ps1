param(
  [string]$OutputDir = ".\release",
  [string]$PackageName = "WTF-ICG-Host-Setup",
  [switch]$BuildSelfExtractingExe
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Release = Join-Path $Root $OutputDir
$Payload = Join-Path $Release "payload"
$IExpressPayload = Join-Path $Release "iexpress-payload"
$ZipPath = Join-Path $Release "$PackageName.zip"
$ExePath = Join-Path $Release "$PackageName.exe"
$InnerZipPath = Join-Path $Release "$PackageName-payload.zip"

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

Set-Location $Root
npm.cmd install
npm.cmd run build
npx.cmd @yao-pkg/pkg dist/main.js --targets node22-win-x64 --output release/app/wtf-icg-host.exe

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
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-app.ps1" -StartNow
echo.
pause
"@ | Set-Content -LiteralPath $SetupCmd -Encoding ASCII

$ReadmeInstall = Join-Path $Payload "LEEME-INSTALACION.txt"
@"
WTF ICG Host - Instalador local

1. Extrae este paquete en la PC donde esta ICG FrontRest.
2. Clic derecho sobre INSTALAR-WTF-ICG-HOST.cmd.
3. Selecciona Ejecutar como administrador.
4. El sistema quedara activo automaticamente al iniciar Windows.
5. Abre el panel desde el acceso del escritorio: Abrir Panel WTF ICG Host.

Panel local:
http://127.0.0.1:8787

Carpetas de operacion:
C:\ProgramData\WTF ICG Host\data\inbox
C:\ProgramData\WTF ICG Host\data\outbox
C:\ProgramData\WTF ICG Host\data\processed
C:\ProgramData\WTF ICG Host\data\quarantine
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

$IExpress = Join-Path $env:WINDIR "System32\iexpress.exe"
if ($BuildSelfExtractingExe -and (Test-Path $IExpress)) {
  $IExpressWork = Join-Path $env:TEMP "wtf-icg-host-iexpress"
  $ShortPayload = Join-Path $IExpressWork "payload"
  $ShortExe = Join-Path $IExpressWork "$PackageName.exe"
  if (Test-Path $IExpressWork) {
    Remove-Item -LiteralPath $IExpressWork -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $ShortPayload | Out-Null
  Copy-Item -LiteralPath $InnerZipPath -Destination (Join-Path $ShortPayload "payload.zip") -Force
  $ExeSetupCmd = Join-Path $ShortPayload "setup.cmd"
  @"
@echo off
setlocal
set TARGET=%TEMP%\WTF-ICG-Host-Setup-%RANDOM%%RANDOM%
mkdir "%TARGET%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0payload.zip' -DestinationPath '%TARGET%' -Force"
call "%TARGET%\INSTALAR-WTF-ICG-HOST.cmd"
endlocal
"@ | Set-Content -LiteralPath $ExeSetupCmd -Encoding ASCII

  $SedPath = Join-Path $IExpressWork "$PackageName.sed"
  $ExeFiles = Get-ChildItem -Path $ShortPayload -File
  $FileList = ($ExeFiles | ForEach-Object { "$($_.Name)=" }) -join "`r`n"
  @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=WTF ICG Host fue instalado.
TargetName=$ShortExe
FriendlyName=WTF ICG Host Setup
AppLaunched=setup.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=setup.cmd
UserQuietInstCmd=setup.cmd
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$ShortPayload
[SourceFiles0]
%FILELIST%
"@.Replace("%FILELIST%", $FileList) | Set-Content -LiteralPath $SedPath -Encoding ASCII

  try {
    & $IExpress /N /Q $SedPath | Out-Null
    if (Test-Path $ShortExe) {
      Copy-Item -LiteralPath $ShortExe -Destination $ExePath -Force
    }
  } catch {
    Write-Warning "No se pudo generar el .exe con IExpress. El .zip instalable si fue generado."
  }
}

Write-Host "Paquete generado:" -ForegroundColor Green
Write-Host $ZipPath
if (Test-Path $ExePath) {
  Write-Host $ExePath
}
