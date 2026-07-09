@echo off
title Instalador WTF ICG Host
echo.
echo Instalando WTF ICG Host...
echo Este instalador debe ejecutarse como Administrador.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-app.ps1" -StartNow
echo.
pause
