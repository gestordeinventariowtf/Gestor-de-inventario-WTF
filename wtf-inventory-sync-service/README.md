# WTF Inventory Sync Service

Servicio local para preparar la comunicacion entre ICG FrontRest PC y WTF Sistema Web.

Esta primera version es segura por diseno:

- No modifica ventas.
- No modifica pagos.
- No toca clientes.
- No escribe directamente en SQL Server.
- No aplica movimientos sin revision.
- Guarda cola y auditoria local.

## Que hace

1. Lee paquetes JSON exportados desde el modulo web `ICG Host`.
2. Guarda movimientos en una cola local.
3. Evita duplicados con clave de idempotencia.
4. Muestra un dashboard local en `http://127.0.0.1:8787`.
5. Permite aprobar o rechazar movimientos.
6. Exporta entradas web aprobadas a CSV para probar importacion en ICG.

## Instalacion local

Desde esta carpeta:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Si PowerShell bloquea `npm`, usa siempre `npm.cmd`.

## Uso

1. En el sistema web, entra al modulo `ICG Host`.
2. Pulsa `Exportar paquete`.
3. Coloca el archivo JSON descargado en:

```text
wtf-inventory-sync-service/data/inbox
```

4. Abre:

```text
http://127.0.0.1:8787
```

5. Pulsa `Sincronizar ahora`.
6. Revisa la cola.
7. Aprueba o rechaza movimientos.
8. Pulsa `Exportar entradas para ICG` para generar CSV local.

## Carpetas

- `data/inbox`: paquetes entrantes desde ICG Host.
- `data/outbox`: archivos preparados para ICG.
- `data/processed`: paquetes ya procesados.
- `logs`: logs de operacion.

## Instalacion como servicio Windows

Despues de validar manualmente:

```powershell
npm.cmd install
npm.cmd run build
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows-service.ps1
Start-Service WTFInventorySyncService
```

## Proxima fase

Antes de escritura real hacia ICG:

1. Confirmar si ICG acepta CSV, CMS o importacion nativa.
2. Auditar base SQL o estructura de archivos.
3. Probar solo con articulo `10034 AGUA`.
4. Validar backup de ICG.
5. Activar escritura solo con aprobacion administrativa.
