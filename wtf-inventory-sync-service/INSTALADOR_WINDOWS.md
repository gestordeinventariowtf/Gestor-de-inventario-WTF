# Instalacion Windows - WTF ICG Host

El instalador deja el servicio local activo en segundo plano y disponible en:

```text
http://127.0.0.1:8787
```

## Requisitos

- Windows con acceso a la base local de ICG FrontRest.
- Permiso de lectura sobre la ruta SQL/local database configurada.
- Conexion a internet para sincronizar con WTF Sistema Web.

## Funcionamiento

- Inicia con Windows si se activa desde el icono de bandeja.
- Lee la Base de Datos ICG Local automaticamente cada cierto intervalo.
- Permite forzar la lectura con el boton `Procesar Base de Datos ICG Local`.
- No envia datos hacia ICG FrontRest.

## Rutas principales

```text
C:\Archivos de programa\WTF ICG Host
C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\FRS_WTFOODVZL
C:\ICG\BACKUP\FRS_WTFOODVZL.BAK_1
```
