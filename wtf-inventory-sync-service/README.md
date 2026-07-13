# WTF Inventory Sync Service

Servicio local para preparar la comunicacion entre ICG FrontRest PC y WTF Sistema Web.

Esta version trabaja como host local automatico y oculto:

- No modifica ventas.
- No modifica pagos.
- No toca clientes.
- No escribe directamente en SQL Server.
- Aplica automaticamente el CMS de ICG hacia Mise an Place cuando hay vinculos por CodArticulo.
- Exporta automaticamente entradas aprobadas hacia la carpeta local de ICG.
- Guarda cola y auditoria local.
- Queda visible solo como icono en la bandeja de Windows.

## Que hace

1. Lee paquetes JSON exportados desde el modulo web `ICG Host`.
2. Guarda movimientos en una cola local.
3. Evita duplicados con clave de idempotencia.
4. Mantiene oculto el dashboard local hasta que abras `http://127.0.0.1:8787`.
5. Procesa movimientos automaticamente en `WTF_MODE=automatico`.
6. Exporta entradas web aprobadas a CSV para importacion local en ICG.
7. Expone una API local protegida con `WTF_API_KEY`.
8. Mueve paquetes procesados a `data/processed` y fallidos a `data/quarantine`.
9. Genera manifiesto de auditoria por cada exportacion hacia ICG.
10. Lee automaticamente el ultimo `.cms` de `C:\ICG EXPORTACION`.
11. Descuenta Mise an Place en la web por `CodArticulo` usando vinculos activos.
12. Registra cada descuento como Historial de Salida Rapida Mise y evita duplicados por archivo CMS.
13. Permite importar manualmente un `.cms` desde el panel local cuando necesites procesar un cierre especifico.
14. Restaura el backup diario `C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1` en una base de auditoria local y aplica consumos reales de ICG por `TIQUETSCONSUMO`.

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

5. El servicio procesa automaticamente los archivos y no abre ventanas.
6. Si deseas auditar movimientos, abre `http://127.0.0.1:8787`.
7. El icono de bandeja permite abrir panel, reiniciar servicio o sincronizar CMS al instante.
8. Para cargar un documento puntual, usa `Importar CMS manual`, selecciona el `.cms` y el sistema lo procesa con el mismo control de duplicados.

El servicio tambien revisa la carpeta de entrada cada `WTF_POLL_SECONDS` segundos.

## Carpetas

- `data/inbox`: paquetes entrantes desde ICG Host.
- `data/outbox`: archivos preparados para ICG.
- `data/processed`: paquetes ya procesados.
- `data/quarantine`: paquetes que no pudieron procesarse.
- `data/manual-cms`: respaldo local de documentos `.cms` importados manualmente desde el panel.
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
- `POST /api/import-cms-file`
- `POST /api/sync-icg-backup`
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

## Importacion automatica Backup SQL ICG -> Web

El servicio puede leer el backup diario de ICG sin modificar la base original:

1. Toma `ICG_BACKUP_PATH`, por defecto `C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1`.
2. Restaura una copia temporal en `WTF_AUDIT_FRS_WTFOODVZL`.
3. Lee ventas no anuladas desde `TIQUETSCONSUMO` y `TIQUETSCAB`.
4. Agrupa por `CodArticulo`, referencia y almacen.
5. Busca vinculos activos en `VinculosMiseICG`.
6. Descuenta en Mise an Place, Inventario Bar u otro destino WTF segun el vinculo.
7. Guarda `ImportKey` para que un mismo cierre no descuente dos veces.
8. Deja sin descontar los productos que no tengan vinculo, visibles como pendientes en `Consumo Mise ventas`.

## Arquitectura recomendada para produccion

1. Usar `WTF_MODE=automatico` para operacion sin aprobaciones manuales.
2. Procesar ventas de ICG como cola `ICG -> Web`.
3. Procesar entradas WTF como cola `Web -> ICG`.
4. Aprobar movimientos desde el panel local.
5. Exportar CSV/manifiesto para pruebas de ICG.
6. Activar SQL Server solo lectura cuando se confirme la base real.
7. Activar escritura real solamente con backup, usuario restringido y bitacora.
