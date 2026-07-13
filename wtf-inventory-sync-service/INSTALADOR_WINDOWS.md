# WTF ICG Host para Windows

Este paquete convierte el sincronizador local en una aplicacion instalable para la PC donde esta ICG FrontRest.

## Que instala

- Aplicacion local en `C:\Archivos de programa\WTF ICG Host` cuando esa ruta exista, o en `C:\Program Files\WTF ICG Host`.
- Ejecutable local `wtf-icg-host.exe`, sin depender de Node.js instalado.
- Ejecutable de bandeja `wtf-icg-host-tray.exe` para operar oculto.
- Datos operativos en `C:\ProgramData\WTF ICG Host`.
- Inicio automatico de Windows llamado `WTF ICG Host`, visible en MSConfig/Administrador de tareas.
- Panel local oculto hasta abrir `http://127.0.0.1:8787` o usar el icono de bandeja.
- Carpetas auditables:
  - `C:\ICG EXPORTACION`: carpeta donde ICG FrontRest deja los CMS de cierre.
  - `data\inbox`: paquetes entrantes.
  - `data\outbox`: archivos preparados para ICG.
  - `data\processed`: paquetes procesados.
  - `data\quarantine`: paquetes rechazados por error.

## Generar instalador

Desde esta carpeta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-installer.ps1
```

El instalador oficial queda en:

```text
release\WTF-ICG-Host-Setup.zip
```

El `.zip` es el recomendado porque evita fallos de IExpress y funciona en Windows en espanol. Para instalar:

1. Clic derecho sobre el `.zip`.
2. Selecciona `Extraer todo`.
3. Abre la carpeta extraida.
4. Ejecuta `INSTALAR-WTF-ICG-HOST.cmd`.

Si se necesita intentar crear un `.exe` autoextraible, usa:

```text
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-installer.ps1 -BuildSelfExtractingExe
```

## Instalar en la PC de ICG

1. Extrae el `.zip`.
2. Ejecuta `INSTALAR-WTF-ICG-HOST.cmd`. Windows pedira permiso de Administrador si hace falta.
3. El sistema queda activo en la bandeja de Windows. Si deseas auditar movimientos, abre:

```text
http://127.0.0.1:8787
```

## Operacion segura

El sistema queda automatico para leer el ultimo `.cms` de `C:\ICG EXPORTACION`, aplicar consumos vinculados por `CodArticulo` contra Mise an Place y registrar el Historial de Salida Rapida en la web. Tambien exporta entradas aprobadas hacia la carpeta local configurada para ICG. Todo queda oculto salvo el icono de bandeja y el panel local bajo demanda.
