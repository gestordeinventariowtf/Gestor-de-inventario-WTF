# WTF ICG Host para Windows

Este paquete convierte el sincronizador local en una aplicacion instalable para la PC donde esta ICG FrontRest.

## Que instala

- Aplicacion local en `C:\Program Files\WTF ICG Host`.
- Datos operativos en `C:\ProgramData\WTF ICG Host`.
- Tarea automatica de Windows llamada `WTF ICG Host`.
- Acceso en el escritorio para abrir el panel local.
- Carpetas auditables:
  - `data\inbox`: paquetes entrantes.
  - `data\outbox`: archivos preparados para ICG.
  - `data\processed`: paquetes procesados.
  - `data\quarantine`: paquetes rechazados por error.

## Generar instalador

Desde esta carpeta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-installer.ps1
```

El instalador queda en:

```text
release\WTF-ICG-Host-Setup.zip
```

Si Windows permite usar IExpress, tambien se intentara crear:

```text
release\WTF-ICG-Host-Setup.exe
```

## Instalar en la PC de ICG

1. Extrae el `.zip` o ejecuta el `.exe` generado.
2. Ejecuta `INSTALAR-WTF-ICG-HOST.cmd` como Administrador.
3. Abre el panel:

```text
http://127.0.0.1:8787
```

## Operacion segura

El sistema queda automatico para leer paquetes, crear cola y preparar archivos. La escritura directa contra ICG/SQL Server sigue bloqueada hasta confirmar el esquema real de ICG y hacer prueba controlada con backup.
