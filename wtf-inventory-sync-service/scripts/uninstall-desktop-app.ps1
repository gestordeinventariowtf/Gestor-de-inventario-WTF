param(
  [string]$InstallDir = "$env:ProgramFiles\WTF ICG Host",
  [string]$TaskName = "WTF ICG Host"
)

$ErrorActionPreference = "Stop"

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$Desktop = [Environment]::GetFolderPath("CommonDesktopDirectory")
$Shortcut = Join-Path $Desktop "Abrir Panel WTF ICG Host.cmd"
if (Test-Path $Shortcut) {
  Remove-Item -LiteralPath $Shortcut -Force
}

if (Test-Path $InstallDir) {
  Remove-Item -LiteralPath $InstallDir -Recurse -Force
}

Write-Host "WTF ICG Host fue desinstalado. Los datos de operacion en ProgramData se conservan para auditoria." -ForegroundColor Green
