# Architecture - WTF POS Ecosystem

## Principio

El POS debe ser offline-first y transaccional.

La Web.App actual no debe convertirse en el motor de venta en caja. Debe actuar como dashboard, administracion o integracion cuando corresponda.

## Arquitectura conceptual

```text
WTF POS
  Local DB
  POS Core
  Outbox/Inbox
  Printer Adapter
  KDS/CDS Adapter
      |
      v
Backend/API
      |
      v
Central DB
      |
      v
WTF Dashboard / Web.App
      |
      v
Inventario WTF / Reportes / Notificaciones
```

## Separacion de responsabilidades

### POS

- Venta.
- Turno.
- Carrito.
- Cobro.
- Recibo.
- Persistencia local.
- Outbox.

### KDS

- Recepcion de comandas.
- ACK.
- Estado de preparacion.
- Historial.

### CDS

- Vista cliente.
- Totales.
- Mensaje final.

### Backend/API

- Recepcion idempotente.
- Validacion de eventos por lote.
- Aplicacion transaccional todo-o-nada.
- Persistencia central.
- Reportes.
- Configuracion.
- Sincronizacion.

### Dashboard

- Administracion.
- Reportes.
- Catalogo.
- Configuracion.
- Auditoria.

## Politica de integracion con Firebase

Firebase puede seguir sirviendo:

- Hosting.
- Notificaciones.
- Dashboard realtime cuando sea razonable.
- Storage para archivos.

No debe ser usado como cola por cada accion de interfaz.

## Politica de sincronizacion

- Escritura local primero.
- Outbox durable.
- Batch remoto.
- Idempotencia.
- Retry con backoff.
- No bloquear ventas por latencia cloud.
