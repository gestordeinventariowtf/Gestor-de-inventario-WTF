# WTF ICG Host

Servicio local para leer la Base de Datos ICG FrontRest y sincronizar la informacion util hacia WTF Sistema Web.

## Funcionamiento actual

- Lee la base local de ICG FrontRest en modo lectura.
- Actualiza catalogos, referencias, stocks y precios desde la base activa `FRS_WTFOODVZL`.
- Alimenta el modulo ICG FrontRest de la web con informacion de catalogo.
- No lee `TIQUETSCONSUMO` desde el boton de actualizacion de articulos.
- No aplica descuentos automaticos ni genera salidas de inventario desde este flujo.
- Permite refrescar manualmente desde `http://127.0.0.1:8787`.
- No envia informacion al sistema de facturacion ICG FrontRest.
- No importa ni exporta documentos de intercambio.

## Panel local

Abrir:

```text
http://127.0.0.1:8787
```

Accion principal:

```text
Actualizar Articulos ICG
```

## Variables principales

```text
ICG_LIVE_DATABASE_NAME=FRS_WTFOODVZL
ICG_SQL_DATA_PATH=C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA
ICG_SQL_CONNECTION_STRING=Server=localhost;Database=FRS_WTFOODVZL;Trusted_Connection=True;TrustServerCertificate=True
WTF_AUTO_APPLY_ICG_BACKUP=false
ICG_BACKUP_POLL_SECONDS=30
ICG_CONSUMPTION_LOOKBACK_DAYS=30
ICG_SQL_ENABLED=true
```

La carpeta `DATA` debe contener los archivos de la base activa, normalmente `FRS_WTFOODVZL` y `FRS_WTFOODVZL_LOG`. El Host lee la base ya montada en SQL Server por nombre (`FRS_WTFOODVZL`); no debe depender de una carpeta backup para actualizar articulos.
