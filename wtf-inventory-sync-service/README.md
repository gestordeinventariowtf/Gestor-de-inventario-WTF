# WTF ICG Host

Servicio local para leer la Base de Datos ICG FrontRest y sincronizar la informacion util hacia WTF Sistema Web.

## Funcionamiento actual

- Lee la base local de ICG FrontRest en modo lectura.
- Procesa ventas, cierres diarios, articulos y consumos desde SQL/local database.
- Alimenta el modulo ICG FrontRest de la web.
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
Procesar Base de Datos ICG Local
```

## Variables principales

```text
ICG_LIVE_DATABASE_NAME=FRS_WTFOODVZL
ICG_SQL_DATA_PATH=C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\FRS_WTFOODVZL
ICG_BACKUP_PATH=C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1
ICG_BACKUP_POLL_SECONDS=1800
ICG_SQL_ENABLED=true
```
