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

Tambien genera un archivo `.manifest.json` con auditoria del lote exportado.

## Regla critica

Esta API no escribe directamente en ICG FrontRest ni SQL Server. La escritura real debe activarse solo despues de:

1. Backup de ICG.
2. Prueba con un articulo controlado.
3. Confirmacion del formato que ICG acepta.
4. Aprobacion administrativa.
