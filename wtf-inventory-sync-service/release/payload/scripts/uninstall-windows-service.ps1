param(
  [string]$ServiceName = "WTFInventorySyncService"
)

$Existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (!$Existing) {
  Write-Host "El servicio no existe."
  exit 0
}

Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue
sc.exe delete $ServiceName | Out-Null
Write-Host "Servicio eliminado: $ServiceName" -ForegroundColor Green
