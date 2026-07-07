param(
  [string]$ServiceName = "WTFInventorySyncService",
  [string]$DisplayName = "WTF Inventory Sync Service"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Node = (Get-Command node.exe).Source
$Main = Join-Path $Root "dist\main.js"

if (!(Test-Path $Main)) {
  Write-Host "Primero ejecuta: npm.cmd install y npm.cmd run build" -ForegroundColor Yellow
  exit 1
}

$Existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($Existing) {
  Write-Host "El servicio ya existe. Detenlo o eliminalo antes de reinstalar." -ForegroundColor Yellow
  exit 1
}

$BinPath = "`"$Node`" `"$Main`""
New-Service -Name $ServiceName -DisplayName $DisplayName -BinaryPathName $BinPath -StartupType Automatic
Write-Host "Servicio instalado: $DisplayName" -ForegroundColor Green
Write-Host "Iniciar: Start-Service $ServiceName"
