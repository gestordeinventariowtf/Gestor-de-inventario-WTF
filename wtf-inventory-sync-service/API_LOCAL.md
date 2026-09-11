# API Local WTF ICG Host

Base:

```text
http://127.0.0.1:8787
```

## Estado

```text
GET /api/state
```

Devuelve movimientos, registros, configuracion publica y metricas locales.

## Salud

```text
GET /api/health
```

Confirma que el servicio local esta activo.

## Sincronizar todo

```text
POST /api/refresh-all
```

Ejecuta la lectura de la Base de Datos ICG Local y actualiza la web.

## Actualizar Articulos ICG

```text
POST /api/sync-icg-backup
```

Lee la base local activa `FRS_WTFOODVZL` y sincroniza hacia WTF Sistema Web solamente:

- `ARTICULOS`
- `REFERENCIAS`
- `STOCKS`
- `PRECIOSVENTA`

Este endpoint no lee `TIQUETSCONSUMO`, no calcula consumos, no genera salidas y no aplica descuentos automaticos.

## Notas de seguridad

- El servicio escucha solo en `127.0.0.1`.
- La integracion actual no escribe en SQL Server ICG.
- La integracion actual no envia informacion hacia ICG FrontRest.
