@echo off
setlocal
set TARGET=%TEMP%\WTF-ICG-Host-Setup-%RANDOM%%RANDOM%
mkdir "%TARGET%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0payload.zip' -DestinationPath '%TARGET%' -Force"
call "%TARGET%\INSTALAR-WTF-ICG-HOST.cmd"
endlocal
