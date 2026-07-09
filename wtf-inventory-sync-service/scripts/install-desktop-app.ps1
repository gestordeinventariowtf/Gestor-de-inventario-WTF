param(
  [string]$InstallDir = "$env:ProgramFiles\WTF ICG Host",
  [string]$TaskName = "WTF ICG Host",
  [int]$Port = 8787,
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (!$principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    throw "Ejecuta este instalador como Administrador."
  }
}

function Resolve-Node {
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if (!$node) {
    throw "Node.js no esta instalado. Instala Node.js LTS y vuelve a ejecutar el instalador."
  }
  return $node.Source
}

Assert-Admin
$NodePath = Resolve-Node
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
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
  } else {
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  }
}

$EnvPath = Join-Path $InstallDir ".env"
if (!(Test-Path $EnvPath)) {
  @"
WTF_HOST_PORT=$Port
WTF_WEB_APP_URL=https://gestor-de-inventario-wtf-prod-2026.web.app
WTF_API_KEY=
WTF_BRANCH=principal
WTF_DEFAULT_WAREHOUSE=1
WTF_MODE=manual
WTF_POLL_SECONDS=30
WTF_DATA_DIR=$DataDir\data
ICG_EXPORT_DIR=$DataDir\data\inbox
ICG_IMPORT_DIR=$DataDir\data\outbox
WTF_PROCESSED_DIR=$DataDir\data\processed
WTF_QUARANTINE_DIR=$DataDir\data\quarantine
ICG_SQL_ENABLED=false
ICG_SQL_CONNECTION_STRING=Server=localhost;Database=ICGFrontRest;Trusted_Connection=True;TrustServerCertificate=True
"@ | Set-Content -LiteralPath $EnvPath -Encoding UTF8
}

$RunScript = Join-Path $InstallDir "run-host.ps1"
@"
`$ErrorActionPreference = "Stop"
Set-Location "$InstallDir"
`$env:WTF_DATA_DIR = "$DataDir\data"
`$env:ICG_EXPORT_DIR = "$DataDir\data\inbox"
`$env:ICG_IMPORT_DIR = "$DataDir\data\outbox"
`$env:WTF_PROCESSED_DIR = "$DataDir\data\processed"
`$env:WTF_QUARANTINE_DIR = "$DataDir\data\quarantine"
& "$NodePath" "$InstallDir\dist\main.js" *> "$LogDir\host-runtime.log"
"@ | Set-Content -LiteralPath $RunScript -Encoding UTF8

$OpenDashboard = Join-Path $InstallDir "Abrir Panel WTF ICG Host.cmd"
@"
@echo off
start "" "http://127.0.0.1:$Port"
"@ | Set-Content -LiteralPath $OpenDashboard -Encoding ASCII

$StartHost = Join-Path $InstallDir "Iniciar WTF ICG Host.cmd"
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$RunScript"
"@ | Set-Content -LiteralPath $StartHost -Encoding ASCII

$Uninstall = Join-Path $InstallDir "Desinstalar WTF ICG Host.cmd"
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$InstallDir\scripts\uninstall-desktop-app.ps1"
pause
"@ | Set-Content -LiteralPath $Uninstall -Encoding ASCII

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$RunScript`""
$Triggers = @(
  New-ScheduledTaskTrigger -AtStartup,
  New-ScheduledTaskTrigger -AtLogOn
)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 365) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$Task = New-ScheduledTask -Action $Action -Trigger $Triggers -Settings $Settings -Principal $Principal -Description "Sincronizador local WTF Web con ICG FrontRest"
Register-ScheduledTask -TaskName $TaskName -InputObject $Task -Force | Out-Null

$Desktop = [Environment]::GetFolderPath("CommonDesktopDirectory")
Copy-Item -LiteralPath $OpenDashboard -Destination (Join-Path $Desktop "Abrir Panel WTF ICG Host.cmd") -Force

if ($StartNow) {
  Start-ScheduledTask -TaskName $TaskName
}

Write-Host ""
Write-Host "WTF ICG Host instalado correctamente." -ForegroundColor Green
Write-Host "Panel local: http://127.0.0.1:$Port"
Write-Host "Carpeta de entrada: $(Join-Path $DataDir "data\inbox")"
Write-Host "Carpeta de salida:  $(Join-Path $DataDir "data\outbox")"
