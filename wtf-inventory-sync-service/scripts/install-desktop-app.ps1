param(
  [string]$InstallDir = "",
  [string]$TaskName = "WTF ICG Host",
  [int]$Port = 8787,
  [string]$ActivationFile = "",
  [string]$WebAppUrl = "https://gestor-de-inventario-wtf-29056.web.app",
  [string]$IcgLiveDatabaseName = "FRS_WTFOODVZL",
  [string]$IcgSqlDataDir = "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA",
  [string]$IcgBackupPath = "C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1",
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
    if ($ActivationFile) { $argsList += @("-ActivationFile", "`"$ActivationFile`"") }
    $argsList += @("-WebAppUrl", "`"$WebAppUrl`"", "-IcgLiveDatabaseName", "`"$IcgLiveDatabaseName`"", "-IcgSqlDataDir", "`"$IcgSqlDataDir`"", "-IcgBackupPath", "`"$IcgBackupPath`"")
    if ($StartNow) { $argsList += "-StartNow" }
    Start-Process -FilePath "powershell.exe" -ArgumentList $argsList -Verb RunAs -WindowStyle Hidden
    exit 0
  }
}

function Resolve-InstallDir {
  param([string]$Requested)
  if ($Requested) {
    return $Requested
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

function Stop-WtfIcgHostProcesses {
  param([string]$Path)

  Get-Process -Name "wtf-icg-host-tray" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Get-Process -Name "wtf-icg-host" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

  $normalizedPath = [IO.Path]::GetFullPath($Path).TrimEnd('\')
  $currentProcessId = $PID
  $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $name = [string]$_.Name
    $commandLine = [string]$_.CommandLine
    $executablePath = [string]$_.ExecutablePath
    $_.ProcessId -ne $currentProcessId -and (
      $name -ieq "node.exe" -or
      $name -ieq "powershell.exe" -or
      $name -ieq "cmd.exe"
    ) -and (
      $commandLine -like "*WTF ICG Host*" -or
      $commandLine -like "*wtf-icg-host*" -or
      $commandLine -like "*dist\main.js*" -or
      $executablePath -like "$normalizedPath*"
    )
  }

  foreach ($process in $processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}

function Ensure-DataAccessLinks {
  param(
    [string]$InstalledRoot,
    [string]$OperationalDataRoot
  )

  $DataPath = Join-Path $OperationalDataRoot "data"
  $InstallDataPath = Join-Path $InstalledRoot "data"
  if (!(Test-Path $DataPath)) {
    New-Item -ItemType Directory -Force -Path $DataPath | Out-Null
  }

  if (Test-Path $InstallDataPath) {
    $item = Get-Item -LiteralPath $InstallDataPath -Force
    $isLink = (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
    if (!$isLink) {
      $backupPath = Join-Path $InstalledRoot ("data-respaldo-instalador-" + (Get-Date -Format "yyyyMMddHHmmss"))
      Move-Item -LiteralPath $InstallDataPath -Destination $backupPath -Force
    } else {
      Remove-Item -LiteralPath $InstallDataPath -Force
    }
  }

  try {
    New-Item -ItemType Junction -Path $InstallDataPath -Target $DataPath -Force | Out-Null
  } catch {
    $openDataCmd = Join-Path $InstalledRoot "Abrir Carpeta Data WTF ICG Host.cmd"
    @"
@echo off
start "" "$DataPath"
"@ | Set-Content -LiteralPath $openDataCmd -Encoding ASCII
  }

  $openDataCmd = Join-Path $InstalledRoot "Abrir Carpeta Data WTF ICG Host.cmd"
  @"
@echo off
start "" "$DataPath"
"@ | Set-Content -LiteralPath $openDataCmd -Encoding ASCII
}

Assert-Admin
$InstallDir = Resolve-InstallDir $InstallDir
$SourceRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $env:ProgramData "WTF ICG Host"
$LogDir = Join-Path $DataDir "logs"
$AuditSqlDataDir = "C:\ICG\BACKUP\WTF_AUDIT_SQL"

if ($IcgSqlDataDir -notmatch '^[A-Za-z]:\\|^\\\\') {
  $IcgSqlDataDir = "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA"
}

$activation = $null
if ($ActivationFile -and (Test-Path -LiteralPath $ActivationFile)) {
  try {
    $activation = Get-Content -LiteralPath $ActivationFile -Raw -ErrorAction Stop | ConvertFrom-Json
    if (-not $activation.terminalId -or -not $activation.credentialProtected) {
      throw "La activacion no contiene una identidad tecnica valida."
    }
  } catch {
    throw "No se pudo leer la activacion tecnica: $($_.Exception.Message)"
  }
}

New-Item -ItemType Directory -Force -Path $InstallDir, $DataDir, $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "data\inbox"), (Join-Path $DataDir "data\outbox"), (Join-Path $DataDir "data\processed"), (Join-Path $DataDir "data\quarantine") | Out-Null
Stop-WtfIcgHostProcesses -Path $InstallDir

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

Ensure-DataAccessLinks -InstalledRoot $InstallDir -OperationalDataRoot $DataDir

$HostExecutable = Resolve-HostExecutable $InstallDir
$TrayExecutable = Resolve-TrayExecutable $InstallDir
$ConfiguratorExecutable = Join-Path $InstallDir "app\WTF ICG Host Configurador.exe"
$QueueManagerExecutable = Join-Path $InstallDir "app\WTF ICG Host Gestor de Cola.exe"
$EnvPath = Join-Path $InstallDir ".env"
if (!(Test-Path $EnvPath)) {
  @"
WTF_HOST_PORT=$Port
WTF_WEB_APP_URL=$WebAppUrl
WTF_FIREBASE_PROJECT_ID=gestor-de-inventario-wtf-29056
WTF_FIREBASE_COLLECTION=wtfSistema
WTF_FIREBASE_DOCUMENT_ID=estadoGeneral
WTF_AUTO_APPLY_ICG_BACKUP=false
WTF_API_KEY=
WTF_BRANCH=principal
WTF_DEFAULT_WAREHOUSE=1
WTF_MODE=automatico
WTF_POLL_SECONDS=30
WTF_DATA_DIR=$DataDir\data
ICG_EXPORT_DIR=$DataDir\data\inbox
ICG_IMPORT_DIR=$DataDir\data\outbox
WTF_PROCESSED_DIR=$DataDir\data\processed
WTF_QUARANTINE_DIR=$DataDir\data\quarantine
ICG_BACKUP_PATH=$IcgBackupPath
ICG_SQL_SERVER=localhost
ICG_LIVE_DATABASE_NAME=$IcgLiveDatabaseName
ICG_SQL_DATA_PATH=$IcgSqlDataDir
ICG_AUDIT_DB_NAME=
ICG_SQL_DATA_DIR=$AuditSqlDataDir
ICG_BACKUP_POLL_SECONDS=30
ICG_CONSUMPTION_LOOKBACK_DAYS=30
ICG_CONSUMPTION_FROM_DATE=2026-10-29
ICG_SQL_ENABLED=true
ICG_SQL_CONNECTION_STRING=Server=localhost;Database=$IcgLiveDatabaseName;Trusted_Connection=True;TrustServerCertificate=True
WTF_HOST_IDENTITY_MODE=technical
WTF_HOST_SYNC_ENDPOINT=https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfHostFirestoreGateway
WTF_TERMINAL_ID=
WTF_TERMINAL_SECRET_PROTECTED=
"@ | Set-Content -LiteralPath $EnvPath -Encoding UTF8
}

Set-EnvValue -Path $EnvPath -Name "WTF_AUTO_APPLY_ICG_BACKUP" -Value "false"
Set-EnvValue -Path $EnvPath -Name "WTF_MODE" -Value "automatico"
Set-EnvValue -Path $EnvPath -Name "WTF_HOST_PORT" -Value "$Port"
Set-EnvValue -Path $EnvPath -Name "WTF_WEB_APP_URL" -Value $WebAppUrl
Set-EnvValue -Path $EnvPath -Name "WTF_FIREBASE_PROJECT_ID" -Value "gestor-de-inventario-wtf-29056"
Set-EnvValue -Path $EnvPath -Name "ICG_BACKUP_PATH" -Value $IcgBackupPath
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_SERVER" -Value "localhost"
Set-EnvValue -Path $EnvPath -Name "ICG_LIVE_DATABASE_NAME" -Value $IcgLiveDatabaseName
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_DATA_PATH" -Value $IcgSqlDataDir
Set-EnvValue -Path $EnvPath -Name "ICG_AUDIT_DB_NAME" -Value ""
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_DATA_DIR" -Value $AuditSqlDataDir
Set-EnvValue -Path $EnvPath -Name "ICG_BACKUP_POLL_SECONDS" -Value "30"
Set-EnvValue -Path $EnvPath -Name "ICG_CONSUMPTION_LOOKBACK_DAYS" -Value "30"
Set-EnvValue -Path $EnvPath -Name "ICG_CONSUMPTION_FROM_DATE" -Value "2026-10-29"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_ENABLED" -Value "true"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_CONNECTION_STRING" -Value "Server=localhost;Database=$IcgLiveDatabaseName;Trusted_Connection=True;TrustServerCertificate=True"
Set-EnvValue -Path $EnvPath -Name "WTF_HOST_IDENTITY_MODE" -Value "technical"
Set-EnvValue -Path $EnvPath -Name "WTF_HOST_SYNC_ENDPOINT" -Value "https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfHostFirestoreGateway"
if ($activation) {
  Set-EnvValue -Path $EnvPath -Name "WTF_TERMINAL_ID" -Value ([string]$activation.terminalId)
  Set-EnvValue -Path $EnvPath -Name "WTF_TERMINAL_SECRET_PROTECTED" -Value ([string]$activation.credentialProtected)
  Remove-Item -LiteralPath $ActivationFile -Force -ErrorAction SilentlyContinue
}

# El configurador vive en la raiz de la instalacion para que el usuario pueda
# cambiar la base de pruebas o la del negocio sin generar otro instalador.
if (Test-Path -LiteralPath $ConfiguratorExecutable) {
  Copy-Item -LiteralPath $ConfiguratorExecutable -Destination (Join-Path $InstallDir "WTF ICG Host Configurador.exe") -Force
}
if (Test-Path -LiteralPath $QueueManagerExecutable) {
  Copy-Item -LiteralPath $QueueManagerExecutable -Destination (Join-Path $InstallDir "WTF ICG Host Gestor de Cola.exe") -Force
}

$RunScript = Join-Path $InstallDir "run-host.ps1"
@"
`$ErrorActionPreference = "Stop"
Set-Location "$InstallDir"
`$env:WTF_DATA_DIR = "$DataDir\data"
`$env:ICG_BACKUP_PATH = "$IcgBackupPath"
`$env:ICG_SQL_SERVER = "localhost"
`$env:ICG_LIVE_DATABASE_NAME = "$IcgLiveDatabaseName"
`$env:ICG_SQL_DATA_PATH = "$IcgSqlDataDir"
`$env:ICG_AUDIT_DB_NAME = ""
`$env:ICG_SQL_DATA_DIR = "$AuditSqlDataDir"
`$env:ICG_BACKUP_POLL_SECONDS = "30"
`$env:ICG_CONSUMPTION_LOOKBACK_DAYS = "30"
`$env:ICG_CONSUMPTION_FROM_DATE = "2026-10-29"
`$env:ICG_SQL_CONNECTION_STRING = "Server=localhost;Database=$IcgLiveDatabaseName;Trusted_Connection=True;TrustServerCertificate=True"
`$env:WTF_AUTO_APPLY_ICG_BACKUP = "false"
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
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$InstallDir\scripts\uninstall-desktop-app.ps1""'"
exit /b 0
"@ | Set-Content -LiteralPath $Uninstall -Encoding ASCII

$StartupTarget = if ($TrayExecutable) { $TrayExecutable } else { "powershell.exe" }
$StartupCommand = if ($TrayExecutable) { "`"$TrayExecutable`"" } else { "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$RunScript`"" }
$RunKey = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
New-Item -Path $RunKey -Force | Out-Null
New-ItemProperty -Path $RunKey -Name $TaskName -Value $StartupCommand -PropertyType String -Force | Out-Null

$oldTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($oldTask) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

try {
  $TaskAction = if ($TrayExecutable) {
    New-ScheduledTaskAction -Execute $TrayExecutable -WorkingDirectory (Split-Path -Parent $TrayExecutable)
  } else {
    New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$RunScript`"" -WorkingDirectory $InstallDir
  }
  $TaskTrigger = New-ScheduledTaskTrigger -AtLogOn
  $TaskPrincipal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Highest
  $TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 365)
  Register-ScheduledTask -TaskName $TaskName -Action $TaskAction -Trigger $TaskTrigger -Principal $TaskPrincipal -Settings $TaskSettings -Description "Inicia WTF ICG Host automaticamente al iniciar Windows." -Force | Out-Null
} catch {
  Write-Warning "No se pudo registrar la tarea de inicio de Windows. Se conserva el inicio por registro. Detalle: $($_.Exception.Message)"
}

$CommonStartup = [Environment]::GetFolderPath("CommonStartup")
if ($CommonStartup) {
  $StartupShortcut = Join-Path $CommonStartup "WTF ICG Host.cmd"
  @"
@echo off
start "" $StartupCommand
"@ | Set-Content -LiteralPath $StartupShortcut -Encoding ASCII
}

if ($StartNow) {
  if ($TrayExecutable) {
    $serviceProcess = Start-Process -FilePath $HostExecutable -WorkingDirectory $InstallDir -WindowStyle Hidden -PassThru
    Start-Sleep -Milliseconds 800
    $trayProcess = Start-Process -FilePath $TrayExecutable -WorkingDirectory (Split-Path -Parent $TrayExecutable) -WindowStyle Hidden -PassThru
    Start-Sleep -Milliseconds 1200
    try {
      $health = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5
      if ($health.StatusCode -ne 200) { Write-Warning "El panel local respondio con HTTP $($health.StatusCode)." }
    } catch {
      Write-Warning "El servicio se inicio, pero el panel local aun no responde. Revise C:\ProgramData\WTF ICG Host\logs\tray.log y host-runtime.log."
    }
  } else {
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", $RunScript) -WindowStyle Hidden
  }
}

Write-Host ""
Write-Host "WTF ICG Host instalado correctamente." -ForegroundColor Green
Write-Host "Inicio automatico registrado en Windows: $StartupTarget"
Write-Host "Panel local: http://127.0.0.1:$Port"
Write-Host "Configurador: $(Join-Path $InstallDir 'WTF ICG Host Configurador.exe')"
Write-Host "Carpeta de entrada: $(Join-Path $DataDir "data\inbox")"
Write-Host "Carpeta de salida:  $(Join-Path $DataDir "data\outbox")"
