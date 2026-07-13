param(
  [string]$InstallDir = "",
  [string]$TaskName = "WTF ICG Host"
)

$ErrorActionPreference = "Stop"

function Resolve-InstallDir {
  param([string]$Requested)
  if ($Requested) { return $Requested }
  $spanishProgramFiles = "C:\Archivos de programa"
  if (Test-Path (Join-Path $spanishProgramFiles "WTF ICG Host")) {
    return (Join-Path $spanishProgramFiles "WTF ICG Host")
  }
  return (Join-Path $env:ProgramFiles "WTF ICG Host")
}

$InstallDir = Resolve-InstallDir $InstallDir

Get-Process -Name "wtf-icg-host-tray" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "wtf-icg-host" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$RunKey = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
if (Test-Path $RunKey) {
  Remove-ItemProperty -Path $RunKey -Name $TaskName -ErrorAction SilentlyContinue
}

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
