param(
  [string]$InstallDir = "",
  [string]$TaskName = "WTF ICG Host",
  [int]$Port = 8787,
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (!$principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    $argsList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"")
    if ($InstallDir) { $argsList += @("-InstallDir", "`"$InstallDir`"") }
    $argsList += @("-TaskName", "`"$TaskName`"", "-Port", "$Port")
    if ($StartNow) { $argsList += "-StartNow" }
    Start-Process -FilePath "powershell.exe" -ArgumentList $argsList -Verb RunAs
    exit 0
  }
}

function Resolve-InstallDir {
  param([string]$Requested)
  if ($Requested) {
    return $Requested
  }
  $spanishProgramFiles = "C:\Archivos de programa"
  if (Test-Path $spanishProgramFiles) {
    return (Join-Path $spanishProgramFiles "WTF ICG Host")
  }
  $programFiles = $env:ProgramW6432
  if (!$programFiles) {
    $programFiles = $env:ProgramFiles
  }
  return (Join-Path $programFiles "WTF ICG Host")
}

function Resolve-HostExecutable {
  param([string]$InstalledRoot)
  $app = Join-Path $InstalledRoot "app\wtf-icg-host.exe"
  if (Test-Path $app) {
    return $app
  }
  $main = Join-Path $InstalledRoot "dist\main.js"
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($node -and (Test-Path $main)) {
    return "$($node.Source)|$main"
  }
  throw "No se encontro el ejecutable local de WTF ICG Host."
}

function Resolve-TrayExecutable {
  param([string]$InstalledRoot)
  $tray = Join-Path $InstalledRoot "app\wtf-icg-host-tray.exe"
  if (Test-Path $tray) {
    return $tray
  }
  return ""
}

function Set-EnvValue {
  param(
    [string]$Path,
    [string]$Name,
    [string]$Value
  )
  $line = "$Name=$Value"
  if (!(Test-Path $Path)) {
    $line | Set-Content -LiteralPath $Path -Encoding UTF8
    return
  }
  $lines = @(Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue)
  $found = $false
  $next = foreach ($existing in $lines) {
    if ($existing -match "^\s*$([regex]::Escape($Name))=") {
      $found = $true
      $line
    } else {
      $existing
    }
  }
  if (!$found) { $next += $line }
  $next | Set-Content -LiteralPath $Path -Encoding UTF8
}

Assert-Admin
$InstallDir = Resolve-InstallDir $InstallDir
$SourceRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $env:ProgramData "WTF ICG Host"
$LogDir = Join-Path $DataDir "logs"

New-Item -ItemType Directory -Force -Path $InstallDir, $DataDir, $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "data\inbox"), (Join-Path $DataDir "data\outbox"), (Join-Path $DataDir "data\processed"), (Join-Path $DataDir "data\quarantine") | Out-Null

$exclude = @("data", "logs", "release", ".git", "node_modules\.cache")
Get-ChildItem -Path $SourceRoot -Force | Where-Object {
  $name = $_.Name
  -not ($exclude | Where-Object { $name -like $_ })
} | ForEach-Object {
  $target = Join-Path $InstallDir $_.Name
  if (!(([System.IO.Path]::GetFullPath($_.FullName).TrimEnd('\')) -ieq ([System.IO.Path]::GetFullPath($target).TrimEnd('\')))) {
    if ($_.PSIsContainer) {
      if (Test-Path $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
      }
      Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $target -Force
    }
  }
}

$HostExecutable = Resolve-HostExecutable $InstallDir
$TrayExecutable = Resolve-TrayExecutable $InstallDir
$EnvPath = Join-Path $InstallDir ".env"
if (!(Test-Path $EnvPath)) {
  @"
WTF_HOST_PORT=$Port
WTF_WEB_APP_URL=https://gestor-de-inventario-wtf-prod-2026.web.app
WTF_FIREBASE_PROJECT_ID=gestor-de-inventario-wtf-29056
WTF_FIREBASE_COLLECTION=wtfSistema
WTF_FIREBASE_DOCUMENT_ID=estadoGeneral
WTF_AUTO_APPLY_ICG_CMS=true
WTF_AUTO_APPLY_ICG_BACKUP=true
WTF_AUTO_EXPORT_ICG=true
WTF_API_KEY=
WTF_BRANCH=principal
WTF_DEFAULT_WAREHOUSE=1
WTF_MODE=automatico
WTF_POLL_SECONDS=30
WTF_DATA_DIR=$DataDir\data
ICG_CMS_DIR=C:\ICG EXPORTACION
ICG_EXPORT_DIR=$DataDir\data\inbox
ICG_IMPORT_DIR=$DataDir\data\outbox
WTF_PROCESSED_DIR=$DataDir\data\processed
WTF_QUARANTINE_DIR=$DataDir\data\quarantine
ICG_BACKUP_PATH=C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1
ICG_SQL_SERVER=localhost
ICG_LIVE_DATABASE_NAME=FRS_WTFOODVZL
ICG_SQL_DATA_PATH=C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\FRS_WTFOODVZL
ICG_AUDIT_DB_NAME=WTF_AUDIT_FRS_WTFOODVZL
ICG_SQL_DATA_DIR=C:\ICG\BACKUP\WTF_AUDIT_SQL
ICG_BACKUP_POLL_SECONDS=1800
ICG_SQL_ENABLED=true
ICG_SQL_CONNECTION_STRING=Server=localhost;Database=ICGFrontRest;Trusted_Connection=True;TrustServerCertificate=True
"@ | Set-Content -LiteralPath $EnvPath -Encoding UTF8
}

Set-EnvValue -Path $EnvPath -Name "WTF_AUTO_APPLY_ICG_CMS" -Value "true"
Set-EnvValue -Path $EnvPath -Name "WTF_AUTO_APPLY_ICG_BACKUP" -Value "true"
Set-EnvValue -Path $EnvPath -Name "WTF_AUTO_EXPORT_ICG" -Value "true"
Set-EnvValue -Path $EnvPath -Name "WTF_MODE" -Value "automatico"
Set-EnvValue -Path $EnvPath -Name "WTF_HOST_PORT" -Value "$Port"
Set-EnvValue -Path $EnvPath -Name "ICG_CMS_DIR" -Value "C:\ICG EXPORTACION"
Set-EnvValue -Path $EnvPath -Name "ICG_BACKUP_PATH" -Value "C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_SERVER" -Value "localhost"
Set-EnvValue -Path $EnvPath -Name "ICG_LIVE_DATABASE_NAME" -Value "FRS_WTFOODVZL"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_DATA_PATH" -Value "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\FRS_WTFOODVZL"
Set-EnvValue -Path $EnvPath -Name "ICG_AUDIT_DB_NAME" -Value "WTF_AUDIT_FRS_WTFOODVZL"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_DATA_DIR" -Value "C:\ICG\BACKUP\WTF_AUDIT_SQL"
Set-EnvValue -Path $EnvPath -Name "ICG_BACKUP_POLL_SECONDS" -Value "1800"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_ENABLED" -Value "true"

$RunScript = Join-Path $InstallDir "run-host.ps1"
@"
`$ErrorActionPreference = "Stop"
Set-Location "$InstallDir"
`$env:WTF_DATA_DIR = "$DataDir\data"
`$env:ICG_CMS_DIR = "C:\ICG EXPORTACION"
`$env:ICG_BACKUP_PATH = "C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1"
`$env:ICG_SQL_SERVER = "localhost"
`$env:ICG_LIVE_DATABASE_NAME = "FRS_WTFOODVZL"
`$env:ICG_SQL_DATA_PATH = "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\FRS_WTFOODVZL"
`$env:ICG_AUDIT_DB_NAME = "WTF_AUDIT_FRS_WTFOODVZL"
`$env:ICG_SQL_DATA_DIR = "C:\ICG\BACKUP\WTF_AUDIT_SQL"
`$env:ICG_BACKUP_POLL_SECONDS = "1800"
`$env:WTF_AUTO_APPLY_ICG_BACKUP = "true"
`$env:ICG_SQL_ENABLED = "true"
`$env:ICG_EXPORT_DIR = "$DataDir\data\inbox"
`$env:ICG_IMPORT_DIR = "$DataDir\data\outbox"
`$env:WTF_PROCESSED_DIR = "$DataDir\data\processed"
`$env:WTF_QUARANTINE_DIR = "$DataDir\data\quarantine"
`$hostExecutable = "$HostExecutable"
if (`$hostExecutable.Contains("|")) {
  `$parts = `$hostExecutable.Split("|", 2)
  & `$parts[0] `$parts[1] *> "$LogDir\host-runtime.log"
} else {
  & `$hostExecutable *> "$LogDir\host-runtime.log"
}
"@ | Set-Content -LiteralPath $RunScript -Encoding UTF8

$OpenDashboard = Join-Path $InstallDir "Abrir Panel WTF ICG Host.cmd"
@"
@echo off
start "" "http://127.0.0.1:$Port"
"@ | Set-Content -LiteralPath $OpenDashboard -Encoding ASCII

$StartHost = Join-Path $InstallDir "Iniciar WTF ICG Host.cmd"
if ($TrayExecutable) {
@"
@echo off
start "" "$TrayExecutable"
"@ | Set-Content -LiteralPath $StartHost -Encoding ASCII
} else {
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$RunScript"
"@ | Set-Content -LiteralPath $StartHost -Encoding ASCII
}

$Uninstall = Join-Path $InstallDir "Desinstalar WTF ICG Host.cmd"
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$InstallDir\scripts\uninstall-desktop-app.ps1"
pause
"@ | Set-Content -LiteralPath $Uninstall -Encoding ASCII

$StartupTarget = if ($TrayExecutable) { $TrayExecutable } else { "powershell.exe" }
$StartupCommand = if ($TrayExecutable) { "`"$TrayExecutable`"" } else { "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$RunScript`"" }
$RunKey = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
New-Item -Path $RunKey -Force | Out-Null
New-ItemProperty -Path $RunKey -Name $TaskName -Value $StartupCommand -PropertyType String -Force | Out-Null

$oldTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($oldTask) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

if ($StartNow) {
  if ($TrayExecutable) {
    Start-Process -FilePath $TrayExecutable -WindowStyle Hidden
  } else {
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", $RunScript) -WindowStyle Hidden
  }
}

Write-Host ""
Write-Host "WTF ICG Host instalado correctamente." -ForegroundColor Green
Write-Host "Inicio automatico registrado en Windows: $StartupTarget"
Write-Host "Panel local: http://127.0.0.1:$Port"
Write-Host "Carpeta de entrada: $(Join-Path $DataDir "data\inbox")"
Write-Host "Carpeta de salida:  $(Join-Path $DataDir "data\outbox")"
