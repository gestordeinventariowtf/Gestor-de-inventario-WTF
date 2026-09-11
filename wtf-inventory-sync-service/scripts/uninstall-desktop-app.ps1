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
    Start-Process -FilePath "powershell.exe" -ArgumentList $argsList -Verb RunAs -WindowStyle Hidden
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

function Stop-WtfIcgHostProcesses {
  param([string]$Path)

  Get-Process -Name "wtf-icg-host-tray" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Get-Process -Name "wtf-icg-host" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

  $normalizedPath = [IO.Path]::GetFullPath($Path).TrimEnd('\')
  $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $name = [string]$_.Name
    $commandLine = [string]$_.CommandLine
    $executablePath = [string]$_.ExecutablePath
    (
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

function Remove-DirectoryWithRetry {
  param([string]$Path)
  if (!(Test-Path $Path)) { return }
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      Remove-Item -LiteralPath $Path -Recurse -Force
      return
    } catch {
      Stop-WtfIcgHostProcesses -Path $Path
      Start-Sleep -Milliseconds 750
      if ($attempt -eq 3) {
        throw "No se pudo eliminar '$Path'. Cierra cualquier ventana del WTF ICG Host y ejecuta el desinstalador como administrador. Detalle: $($_.Exception.Message)"
      }
    }
  }
}

Assert-Admin
$InstallDir = Resolve-InstallDir $InstallDir

Stop-WtfIcgHostProcesses -Path $InstallDir

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

Write-Host "WTF ICG Host fue desinstalado y la carpeta de instalacion fue eliminada por completo." -ForegroundColor Green
