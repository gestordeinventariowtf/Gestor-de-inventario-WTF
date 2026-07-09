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
7. Expone una API local protegida con `WTF_API_KEY`.
8. Mueve paquetes procesados a `data/processed` y fallidos a `data/quarantine`.
9. Genera manifiesto de auditoria por cada exportacion hacia ICG.
10. Lee automaticamente el ultimo `.cms` de `C:\ICG EXPORTACION`.
11. Descuenta Mise an Place en la web por `CodArticulo` usando vinculos activos.
12. Registra cada descuento como Historial de Salida Rapida Mise y evita duplicados por archivo CMS.

## Instalacion local

Desde esta carpeta:

```powershell
npm.cmd install
Copy-Item .env.example .env
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

El servicio tambien revisa la carpeta de entrada cada `WTF_POLL_SECONDS` segundos.

## Carpetas

- `data/inbox`: paquetes entrantes desde ICG Host.
- `data/outbox`: archivos preparados para ICG.
- `data/processed`: paquetes ya procesados.
- `data/quarantine`: paquetes que no pudieron procesarse.
- `logs`: logs de operacion.
- `C:\ICG EXPORTACION`: carpeta observada para tomar el ultimo CMS generado por ICG FrontRest despues del cierre Z.

## Importacion automatica CMS ICG -> Mise

El servicio revisa `ICG_CMS_DIR` cada `WTF_POLL_SECONDS` segundos. Cuando detecta el ultimo `.cms` no procesado:

1. Abre la tabla `TiquetsLin`.
2. Busca cada `CodArticulo` en `VinculosMiseICG`.
3. Calcula `UnidadesVendidas * CantidadPorVenta`.
4. Descuenta solo productos encontrados en Mise an Place.
5. Agrega un registro al Historial de Salida Rapida.
6. Guarda la huella del CMS para que no se repita.

Los productos sin vinculo o sin existencia quedan en auditoria y no se descuentan.

## API local

Ver contrato completo en:

```text
API_LOCAL.md
```

Endpoints principales:

- `GET /api/health`
- `GET /api/state`
- `POST /api/ingest-package`
- `POST /api/sync-now`
- `POST /api/sync-latest-cms`
- `POST /api/movement-state`
- `POST /api/movement-state-batch`
- `POST /api/export-icg`

Si `WTF_API_KEY` tiene valor, las llamadas API deben enviar:

```http
X-WTF-API-Key: tu-clave
```

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

## Arquitectura recomendada para produccion

1. Mantener `WTF_MODE=manual` hasta completar pruebas.
2. Procesar ventas de ICG como cola `ICG -> Web`.
3. Procesar entradas WTF como cola `Web -> ICG`.
4. Aprobar movimientos desde el panel local.
5. Exportar CSV/manifiesto para pruebas de ICG.
6. Activar SQL Server solo lectura cuando se confirme la base real.
7. Activar escritura real solamente con backup, usuario restringido y bitacora.
