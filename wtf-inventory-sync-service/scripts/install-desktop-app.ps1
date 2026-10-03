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

function Backup-EnvConfig {
  param(
    [string]$EnvPath,
    [string]$DataRoot,
    [string]$LiveDatabaseName,
    [string]$AuditDatabaseName,
    [string]$SqlDataDir
  )
  $backupDir = Join-Path $DataRoot "env-backups"
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $stamp = Get-Date -Format "yyyyMMddHHmmss"
  if (Test-Path -LiteralPath $EnvPath) {
    Copy-Item -LiteralPath $EnvPath -Destination (Join-Path $backupDir (".env.backup-" + $stamp)) -Force
  }
  $auditReferencePath = Join-Path $backupDir (".env.audit-reference-" + $stamp)
  @"
# Respaldo informativo de configuracion audit ICG.
# Este archivo NO activa auditoria ni crea bases MDF/LDF.
# Se conserva solo como referencia historica, igual que las pruebas con DBFREST.
ICG_LIVE_DATABASE_NAME=$LiveDatabaseName
ICG_AUDIT_DB_NAME=$AuditDatabaseName
ICG_SQL_DATA_DIR=$SqlDataDir
ICG_SQL_DATA_PATH=$SqlDataDir
"@ | Set-Content -LiteralPath $auditReferencePath -Encoding UTF8
}

function Get-PackagedEnvValue {
  param(
    [string]$Path,
    [string]$Name
  )
  if (!(Test-Path $Path)) {
    return ""
  }
  $line = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue | Where-Object {
    $_ -match "^\s*$([regex]::Escape($Name))="
  } | Select-Object -First 1
  if (!$line) {
    return ""
  }
  return [string]($line -replace "^\s*$([regex]::Escape($Name))=", "")
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

function Optimize-WtfHostQueue {
  param([string]$QueuePath)
  if (!(Test-Path -LiteralPath $QueuePath)) {
    return
  }
  try {
    $item = Get-Item -LiteralPath $QueuePath -ErrorAction Stop
    if ($item.Length -lt 1048576) {
      return
    }
    $backupPath = $QueuePath + ".backup-optimizacion-" + (Get-Date -Format "yyyyMMddHHmmss")
    Copy-Item -LiteralPath $QueuePath -Destination $backupPath -Force
    $data = Get-Content -LiteralPath $QueuePath -Raw -ErrorAction Stop | ConvertFrom-Json
    $audit = @()
    if ($data.audit) {
      $audit = @($data.audit | Select-Object -First 1000 | ForEach-Object {
        $entry = [ordered]@{}
        foreach ($prop in $_.PSObject.Properties) {
          if ($prop.Name -in @("movements", "rows", "rawRows")) {
            if ($prop.Value -is [System.Array]) {
              $entry[$prop.Name + "Count"] = $prop.Value.Count
            }
          } else {
            $entry[$prop.Name] = $prop.Value
          }
        }
        [pscustomobject]$entry
      })
    }
    $clean = [ordered]@{
      movements = @($data.movements)
      mappings = @($data.mappings)
      audit = $audit
    }
    $clean | ConvertTo-Json -Depth 80 | Set-Content -LiteralPath $QueuePath -Encoding UTF8
  } catch {
    $optLog = Join-Path (Split-Path -Parent $QueuePath) "queue-optimizacion-error.log"
    $backupPath = $QueuePath + ".corrupt-" + (Get-Date -Format "yyyyMMddHHmmss")
    try {
      Copy-Item -LiteralPath $QueuePath -Destination $backupPath -Force
      $clean = [ordered]@{
        movements = @()
        mappings = @()
        audit = @([ordered]@{
          fecha = (Get-Date -Format "s")
          accion = "queue_corrupt_recovered_by_installer"
          mensaje = $_.Exception.Message
          backupPath = $backupPath
        })
      }
      $clean | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $QueuePath -Encoding UTF8
      ("queue.json estaba corrupto. Se respaldo y se creo una cola limpia: " + $backupPath) | Set-Content -LiteralPath $optLog -Encoding UTF8
    } catch {
      ("No se pudo optimizar ni recuperar queue.json: " + $_.Exception.Message) | Set-Content -LiteralPath $optLog -Encoding UTF8
    }
  }
}

Assert-Admin
$InstallDir = Resolve-InstallDir $InstallDir
$SourceRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $env:ProgramData "WTF ICG Host"
$LogDir = Join-Path $DataDir "logs"

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
Optimize-WtfHostQueue -QueuePath (Join-Path $DataDir "data\queue.json")

$HostExecutable = Resolve-HostExecutable $InstallDir
$TrayExecutable = Resolve-TrayExecutable $InstallDir
$EnvPath = Join-Path $InstallDir ".env"
$PackagedEnvPath = Join-Path $SourceRoot ".env"
$PackagedApiKey = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_API_KEY"
$PackagedFirebaseApiKey = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_FIREBASE_API_KEY"
$PackagedFirebaseAuthEmail = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_FIREBASE_AUTH_EMAIL"
$PackagedFirebaseAuthPassword = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_FIREBASE_AUTH_PASSWORD"
$PackagedHostIdentityMode = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_HOST_IDENTITY_MODE"
$PackagedHostSyncEndpoint = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_HOST_SYNC_ENDPOINT"
$PackagedTerminalId = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_TERMINAL_ID"
$PackagedTerminalSecretProtected = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_TERMINAL_SECRET_PROTECTED"
$PackagedTerminalSecret = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "WTF_TERMINAL_SECRET"
if ($PackagedTerminalSecret -and !$PackagedTerminalSecretProtected) {
  $PackagedTerminalSecretProtected = ConvertFrom-SecureString (ConvertTo-SecureString $PackagedTerminalSecret -AsPlainText -Force)
}
$PackagedLiveDatabaseName = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "ICG_LIVE_DATABASE_NAME"
if (!$PackagedLiveDatabaseName) { $PackagedLiveDatabaseName = "FRS_WTFOODVZL" }
$PackagedSqlDataPath = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "ICG_SQL_DATA_PATH"
if (!$PackagedSqlDataPath) { $PackagedSqlDataPath = "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA" }
$PackagedSqlConnectionString = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "ICG_SQL_CONNECTION_STRING"
if (!$PackagedSqlConnectionString) { $PackagedSqlConnectionString = "Server=localhost;Database=$PackagedLiveDatabaseName;Trusted_Connection=True;TrustServerCertificate=True" }
$PackagedBackupPath = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "ICG_BACKUP_PATH"
if (!$PackagedBackupPath) { $PackagedBackupPath = "C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1" }
$PackagedAuditDatabaseName = Get-PackagedEnvValue -Path $PackagedEnvPath -Name "ICG_AUDIT_DB_NAME"
Backup-EnvConfig -EnvPath $EnvPath -DataRoot $DataDir -LiveDatabaseName $PackagedLiveDatabaseName -AuditDatabaseName $PackagedAuditDatabaseName -SqlDataDir $PackagedSqlDataPath
if (!(Test-Path $EnvPath)) {
  @"
WTF_HOST_PORT=$Port
WTF_WEB_APP_URL=https://gestor-de-inventario-wtf-prod-2026.web.app
WTF_FIREBASE_PROJECT_ID=gestor-de-inventario-wtf-29056
WTF_FIREBASE_COLLECTION=wtfSistema
WTF_FIREBASE_DOCUMENT_ID=estadoGeneral
WTF_AUTO_APPLY_ICG_BACKUP=false
WTF_API_KEY=$PackagedApiKey
WTF_FIREBASE_API_KEY=$PackagedFirebaseApiKey
WTF_FIREBASE_AUTH_EMAIL=$PackagedFirebaseAuthEmail
WTF_FIREBASE_AUTH_PASSWORD=$PackagedFirebaseAuthPassword
WTF_HOST_IDENTITY_MODE=$PackagedHostIdentityMode
WTF_HOST_SYNC_ENDPOINT=$PackagedHostSyncEndpoint
WTF_TERMINAL_ID=$PackagedTerminalId
WTF_TERMINAL_SECRET_PROTECTED=$PackagedTerminalSecretProtected
WTF_BRANCH=principal
WTF_DEFAULT_WAREHOUSE=1
WTF_MODE=automatico
WTF_POLL_SECONDS=30
WTF_DATA_DIR=$DataDir\data
ICG_EXPORT_DIR=$DataDir\data\inbox
ICG_IMPORT_DIR=$DataDir\data\outbox
WTF_PROCESSED_DIR=$DataDir\data\processed
WTF_QUARANTINE_DIR=$DataDir\data\quarantine
ICG_BACKUP_PATH=$PackagedBackupPath
ICG_SQL_SERVER=localhost
ICG_LIVE_DATABASE_NAME=$PackagedLiveDatabaseName
ICG_SQL_DATA_PATH=$PackagedSqlDataPath
ICG_AUDIT_DB_NAME=
ICG_SQL_DATA_DIR=C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA
ICG_BACKUP_POLL_SECONDS=30
ICG_CONSUMPTION_LOOKBACK_DAYS=30
ICG_SQL_ENABLED=true
ICG_SQL_CONNECTION_STRING=$PackagedSqlConnectionString
"@ | Set-Content -LiteralPath $EnvPath -Encoding UTF8
}

Set-EnvValue -Path $EnvPath -Name "WTF_AUTO_APPLY_ICG_BACKUP" -Value "false"
if ($PackagedApiKey) {
  Set-EnvValue -Path $EnvPath -Name "WTF_API_KEY" -Value $PackagedApiKey
}
if ($PackagedFirebaseApiKey) {
  Set-EnvValue -Path $EnvPath -Name "WTF_FIREBASE_API_KEY" -Value $PackagedFirebaseApiKey
}
if ($PackagedFirebaseAuthEmail) {
  Set-EnvValue -Path $EnvPath -Name "WTF_FIREBASE_AUTH_EMAIL" -Value $PackagedFirebaseAuthEmail
}
if ($PackagedFirebaseAuthPassword) {
  Set-EnvValue -Path $EnvPath -Name "WTF_FIREBASE_AUTH_PASSWORD" -Value $PackagedFirebaseAuthPassword
}
if ($PackagedHostIdentityMode) { Set-EnvValue -Path $EnvPath -Name "WTF_HOST_IDENTITY_MODE" -Value $PackagedHostIdentityMode }
if ($PackagedHostSyncEndpoint) { Set-EnvValue -Path $EnvPath -Name "WTF_HOST_SYNC_ENDPOINT" -Value $PackagedHostSyncEndpoint }
if ($PackagedTerminalId) { Set-EnvValue -Path $EnvPath -Name "WTF_TERMINAL_ID" -Value $PackagedTerminalId }
if ($PackagedTerminalSecretProtected) { Set-EnvValue -Path $EnvPath -Name "WTF_TERMINAL_SECRET_PROTECTED" -Value $PackagedTerminalSecretProtected }
Set-EnvValue -Path $EnvPath -Name "WTF_TERMINAL_SECRET" -Value ""
$InstalledTerminalId = Get-PackagedEnvValue -Path $EnvPath -Name "WTF_TERMINAL_ID"
if (!$InstalledTerminalId) {
  $InstalledTerminalId = "term_" + ([Guid]::NewGuid().ToString("N"))
  Set-EnvValue -Path $EnvPath -Name "WTF_TERMINAL_ID" -Value $InstalledTerminalId
}
Set-EnvValue -Path $EnvPath -Name "WTF_MODE" -Value "automatico"
Set-EnvValue -Path $EnvPath -Name "WTF_HOST_PORT" -Value "$Port"
Set-EnvValue -Path $EnvPath -Name "ICG_BACKUP_PATH" -Value $PackagedBackupPath
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_SERVER" -Value "localhost"
Set-EnvValue -Path $EnvPath -Name "ICG_LIVE_DATABASE_NAME" -Value $PackagedLiveDatabaseName
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_DATA_PATH" -Value $PackagedSqlDataPath
Set-EnvValue -Path $EnvPath -Name "ICG_AUDIT_DB_NAME" -Value ""
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_DATA_DIR" -Value "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA"
Set-EnvValue -Path $EnvPath -Name "ICG_BACKUP_POLL_SECONDS" -Value "30"
Set-EnvValue -Path $EnvPath -Name "ICG_CONSUMPTION_LOOKBACK_DAYS" -Value "30"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_ENABLED" -Value "true"
Set-EnvValue -Path $EnvPath -Name "ICG_SQL_CONNECTION_STRING" -Value $PackagedSqlConnectionString

$RunScript = Join-Path $InstallDir "run-host.ps1"
@"
`$ErrorActionPreference = "Stop"
Set-Location "$InstallDir"
`$env:WTF_DATA_DIR = "$DataDir\data"
`$env:ICG_BACKUP_PATH = "$PackagedBackupPath"
`$env:ICG_SQL_SERVER = "localhost"
`$env:ICG_LIVE_DATABASE_NAME = "$PackagedLiveDatabaseName"
`$env:ICG_SQL_DATA_PATH = "$PackagedSqlDataPath"
`$env:ICG_AUDIT_DB_NAME = ""
`$env:ICG_SQL_DATA_DIR = "C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA"
`$env:ICG_BACKUP_POLL_SECONDS = "30"
`$env:ICG_CONSUMPTION_LOOKBACK_DAYS = "30"
`$env:ICG_SQL_CONNECTION_STRING = "$PackagedSqlConnectionString"
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

$OpenDashboardWait = Join-Path $InstallDir "Abrir Panel WTF ICG Host.ps1"
@"
`$ErrorActionPreference = "SilentlyContinue"
`$PanelUrl = "http://127.0.0.1:$Port"
`$TrayExecutable = "$TrayExecutable"
`$RunScript = "$RunScript"

if (`$TrayExecutable -and (Test-Path -LiteralPath `$TrayExecutable)) {
  Start-Process -FilePath `$TrayExecutable -WindowStyle Hidden | Out-Null
} elseif (Test-Path -LiteralPath `$RunScript) {
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""`$RunScript""" -WindowStyle Hidden | Out-Null
}

Start-Process `$PanelUrl
"@ | Set-Content -LiteralPath $OpenDashboardWait -Encoding UTF8

$OpenDashboard = Join-Path $InstallDir "Abrir Panel WTF ICG Host.cmd"
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$OpenDashboardWait"
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

$DiagnosticScript = Join-Path $InstallDir "Diagnostico WTF ICG Host.ps1"
@"
`$ErrorActionPreference = "SilentlyContinue"
`$InstallDir = "$InstallDir"
`$DataDir = "$DataDir"
`$LogDir = "$LogDir"
`$Port = $Port
`$PanelUrl = "http://127.0.0.1:$Port"
`$HealthUrl = "`$PanelUrl/api/health"
`$OutputPath = Join-Path `$LogDir "diagnostico-host.txt"
New-Item -ItemType Directory -Force -Path `$LogDir | Out-Null

function Add-Line {
  param([string]`$Text)
  `$Text | Add-Content -LiteralPath `$OutputPath -Encoding UTF8
}

if (Test-Path -LiteralPath `$OutputPath) {
  Remove-Item -LiteralPath `$OutputPath -Force
}

Add-Line "=== WTF ICG Host - Diagnostico ==="
Add-Line ("Fecha: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Add-Line ("Instalacion: " + `$InstallDir)
Add-Line ("Datos: " + `$DataDir)
Add-Line ("Panel: " + `$PanelUrl)
Add-Line ""

Add-Line "== Archivos principales =="
foreach (`$file in @(
  (Join-Path `$InstallDir "app\wtf-icg-host.exe"),
  (Join-Path `$InstallDir "app\wtf-icg-host-tray.exe"),
  (Join-Path `$InstallDir "run-host.ps1"),
  (Join-Path `$InstallDir ".env")
)) {
  `$item = Get-Item -LiteralPath `$file -ErrorAction SilentlyContinue
  if (`$item) {
    Add-Line ("OK " + `$item.FullName + " | " + `$item.Length + " bytes | " + `$item.LastWriteTime)
  } else {
    Add-Line ("FALTA " + `$file)
  }
}
Add-Line ""

Add-Line "== Puerto local =="
`$connections = Get-NetTCPConnection -LocalPort `$Port -State Listen -ErrorAction SilentlyContinue
if (`$connections) {
  foreach (`$connection in `$connections) {
    `$proc = Get-Process -Id `$connection.OwningProcess -ErrorAction SilentlyContinue
    `$procName = "desconocido"
    `$procPath = ""
    if (`$proc) {
      `$procName = `$proc.ProcessName
      `$procPath = [string]`$proc.Path
    }
    Add-Line ("Puerto " + `$Port + " ocupado por PID " + `$connection.OwningProcess + " " + `$procName + " " + `$procPath)
  }
} else {
  Add-Line ("Puerto " + `$Port + " sin listener activo en este momento.")
}
Add-Line ""

Add-Line "== Respuesta del panel =="
try {
  `$response = Invoke-WebRequest -Uri `$HealthUrl -UseBasicParsing -TimeoutSec 5
  Add-Line ("Panel responde HTTP " + `$response.StatusCode)
  Add-Line (`$response.Content)
} catch {
  Add-Line ("Panel NO responde: " + `$_.Exception.Message)
}
Add-Line ""

Add-Line "== Configuracion relevante =="
`$envPath = Join-Path `$InstallDir ".env"
if (Test-Path -LiteralPath `$envPath) {
  Get-Content -LiteralPath `$envPath | Where-Object {
    `$_ -match "^(WTF_HOST_PORT|WTF_WEB_APP_URL|WTF_FIREBASE_PROJECT_ID|WTF_AUTO_APPLY_ICG_BACKUP|WTF_MODE|ICG_LIVE_DATABASE_NAME|ICG_SQL_DATA_PATH|ICG_AUDIT_DB_NAME|ICG_SQL_DATA_DIR|ICG_BACKUP_POLL_SECONDS|ICG_CONSUMPTION_LOOKBACK_DAYS|ICG_SQL_ENABLED|ICG_SQL_CONNECTION_STRING)="
  } | ForEach-Object { Add-Line `$_ }
} else {
  Add-Line "No se encontro .env"
}
Add-Line ""

Add-Line "== Ultimos logs =="
foreach (`$log in @((Join-Path `$LogDir "host-runtime.log"), (Join-Path `$LogDir "application.log"), (Join-Path `$LogDir "icg.log"))) {
  Add-Line ("--- " + `$log + " ---")
  if (Test-Path -LiteralPath `$log) {
    Get-Content -LiteralPath `$log -Tail 80 | ForEach-Object { Add-Line `$_ }
  } else {
    Add-Line "No existe."
  }
}

Write-Host "Diagnostico generado en: `$OutputPath"
"@ | Set-Content -LiteralPath $DiagnosticScript -Encoding UTF8

$DiagnosticCmd = Join-Path $InstallDir "Diagnostico WTF ICG Host.cmd"
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$DiagnosticScript"
pause
"@ | Set-Content -LiteralPath $DiagnosticCmd -Encoding ASCII

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
    Start-Process -FilePath $TrayExecutable
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
