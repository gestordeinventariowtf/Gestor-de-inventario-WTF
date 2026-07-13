# API local WTF Inventory Sync Service

Base local:

```text
http://127.0.0.1:8787
```

Si `WTF_API_KEY` esta configurado, enviar:

```http
X-WTF-API-Key: cambie-esta-clave-local
```

## Endpoints

### Salud

```http
GET /api/health
```

No modifica datos. Confirma que el servicio esta arriba.

### Estado general

```http
GET /api/state
```

Devuelve movimientos, mapeos, auditoria, metricas y configuracion publica.

### Importar paquete ICG Host

```http
POST /api/ingest-package
Content-Type: application/json
```

Body: el JSON exportado desde el modulo web `ICG Host`.

El servicio guarda movimientos en cola local, evita duplicados por idempotencia y deja todo en `pendiente_revision` o `error`.

### Escanear carpeta de entrada

```http
POST /api/sync-now
```

Lee archivos `.json` en `data/inbox`, los procesa, mueve exitosos a `data/processed` y fallidos a `data/quarantine`.

### Leer ultimo CMS ICG

```http
POST /api/sync-latest-cms
```

Lee el `.cms` mas reciente de `ICG_CMS_DIR`, valida que la huella del archivo no haya sido usada, busca `CodArticulo` en `VinculosMiseICG`, descuenta Mise an Place en la web y registra Historial de Salida Rapida.

### Importar CMS manual

```http
POST /api/import-cms-file
Content-Type: application/json
```

```json
{
  "fileName": "CIERRE_Z_20260709.cms",
  "base64": "contenido-del-archivo-en-base64"
}
```

Es la misma accion disponible desde el boton `Importar CMS manual` del panel `http://127.0.0.1:8787`. Guarda una copia local en `data/manual-cms`, valida duplicados por huella del archivo y aplica las salidas de Mise an Place solo una vez.

### Procesar Backup ICG

```http
POST /api/sync-icg-backup
```

Restaura en modo auditoria el backup configurado en `ICG_BACKUP_PATH`, lee consumos de `TIQUETSCONSUMO`, busca vinculos activos por `CodArticulo` o referencia y aplica salidas en el sistema web. Los consumos sin vinculo quedan pendientes para emparejar y el servicio guarda una clave por cierre/articulo/almacen para no duplicar descuentos.

### Cambiar estado de un movimiento

```http
POST /api/movement-state
Content-Type: application/json
```

```json
{
  "id": "web-icg-...",
  "estado": "aprobado",
  "mensaje": "Revisado por administracion"
}
```

Estados permitidos:

```text
pendiente
pendiente_revision
aprobado
procesando
sincronizado
rechazado
error
esperando_conexion
```

### Cambiar estado por lote

```http
POST /api/movement-state-batch
Content-Type: application/json
```

```json
{
  "ids": ["web-icg-1", "web-icg-2"],
  "estado": "aprobado",
  "mensaje": "Lote revisado"
}
```

### Exportar entradas para ICG

```http
POST /api/export-icg
```

Genera un CSV en `data/outbox` con movimientos aprobados cuyo destino sea `ICG FrontRest`.
En modo automatico (`WTF_MODE=automatico` y `WTF_AUTO_EXPORT_ICG=true`) este proceso se ejecuta solo cada ciclo de sincronizacion.

Tambien genera un archivo `.manifest.json` con auditoria del lote exportado.

## Regla critica

Esta API no escribe directamente en SQL Server. Para ventas ICG -> Web usa lectura de `.cms` o backup SQL restaurado en una base de auditoria; para Web -> ICG la importacion nativa dependera de que ICG FrontRest tome el archivo generado en la carpeta configurada.

1. Backup de ICG.
2. Prueba con un articulo controlado.
3. Confirmacion del formato que ICG acepta.
4. Aprobacion administrativa.
