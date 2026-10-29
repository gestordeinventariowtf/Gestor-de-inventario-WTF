@echo off
setlocal
set "PROJECT_DIR=%~dp0"
start "WTF Sistema - pruebas locales" powershell.exe -NoLogo -NoExit -ExecutionPolicy Bypass -File "%PROJECT_DIR%tools\abrir-wtf-local.ps1" -ProjectDir "%PROJECT_DIR%." -CheckHost -CheckPorts
endlocal
