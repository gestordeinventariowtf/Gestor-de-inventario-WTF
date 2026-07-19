param(
  [string]$InstallDir = "",
  [string]$TaskName = "WTF ICG Host"
)

$ErrorActionPreference = "Stop"

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (!$principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    $argsList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"")
    if ($InstallDir) { $argsList += @("-InstallDir", "`"$InstallDir`"") }
    $argsList += @("-TaskName", "`"$TaskName`"")
    Start-Process -FilePath "powershell.exe" -ArgumentList $argsList -Verb RunAs
    exit 0
  }
}

function Resolve-InstallDir {
  param([string]$Requested)
  if ($Requested) { return $Requested }
  $spanishProgramFiles = "C:\Archivos de programa"
  if (Test-Path (Join-Path $spanishProgramFiles "WTF ICG Host")) {
    return (Join-Path $spanishProgramFiles "WTF ICG Host")
  }
  return (Join-Path $env:ProgramFiles "WTF ICG Host")
}

function Remove-DirectoryWithRetry {
  param([string]$Path)
  if (!(Test-Path $Path)) { return }
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      Remove-Item -LiteralPath $Path -Recurse -Force
      return
    } catch {
      Get-Process -Name "wtf-icg-host-tray" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
      Get-Process -Name "wtf-icg-host" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
      Start-Sleep -Seconds (2 * $attempt)
      if ($attempt -eq 5) {
        throw "No se pudo eliminar '$Path'. Cierra cualquier ventana del WTF ICG Host y ejecuta el desinstalador como administrador. Detalle: $($_.Exception.Message)"
      }
    }
  }
}

Assert-Admin
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
  Remove-DirectoryWithRetry -Path $InstallDir
}

Write-Host "WTF ICG Host fue desinstalado. Los datos de operacion en ProgramData se conservan para auditoria." -ForegroundColor Green
