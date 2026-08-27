# Testing - WTF POS Ecosystem

## Pruebas V1

- abrir turno;
- catalogo por nombre/SKU/barcode;
- venta efectivo exacto;
- venta efectivo mayor;
- efectivo menor al total;
- calculo ITBIS;
- calculo Ley;
- orden abierta;
- reabrir orden;
- cobrar orden;
- recibo;
- persistencia local;
- reinicio app;
- outbox pendiente;
- reintento outbox;
- idempotencia.

Estado actual: 56 pruebas automatizadas pasando en `wtf-pos-ecosystem`.

## Pruebas KDS

- envio comanda;
- ACK;
- ACK perdido;
- retry;
- no duplicar comanda;
- despachar;
- recuperar comanda retirada.

Estado KDS V1: pruebas locales cubren creacion de comanda, ACK, timeout, retry, deduplicacion y despacho de multiples comandas pendientes.

## Pruebas CDS

- mostrar carrito;
- actualizar cambios;
- mostrar total;
- ocultar datos internos;
- reconectar.

Estado CDS V1: pruebas locales cubren snapshot seguro, actualizacion de carrito/totales, bloqueo contra snapshots viejos, limpieza al cerrar y estado hold.

## Pruebas Backend/API

- aplicar venta desde outbox;
- no duplicar eventos repetidos;
- rechazar lote invalido sin guardar parcialmente;
- marcar outbox como enviado;
- conservar snapshot CDS mas reciente.

Estado Backend/API V1: pruebas locales cubren recepcion transaccional por lote, idempotencia, rollback de lote invalido y sincronizacion desde outbox.

## Pruebas de inventario

- venta con vinculo;
- venta sin vinculo;
- multiples productos WTF por producto POS;
- conversion de unidades;
- no duplicar descuento;
- reverso.

Estado Inventario V1: pruebas locales cubren conversion de unidades, multiples descuentos por producto POS, alerta por falta de mapeo, ledger idempotente y recepcion de impactos en backend virtual.

## Pruebas UI POS

- iniciar motor UI;
- agregar producto;
- actualizar CDS;
- enviar KDS;
- cobrar efectivo;
- generar impacto de inventario;
- mostrar alerta cuando falta puente;
- sincronizar backend virtual.

Estado UI POS V1: pruebas locales cubren flujo operativo minimo de punta a punta.

## Pruebas de pagos e impresion

- pago virtual aprobado;
- pago virtual rechazado;
- bloquear cierre si pago falla;
- crear recibo imprimible;
- imprimir recibo;
- retry si impresora falla;
- no perder recibo pendiente.

Estado Pagos/Impresion V1: pruebas locales cubren aprobacion, rechazo, impresion y reintento.

## Pruebas de cierre de turno

- reporte Z balanceado;
- reporte Z con diferencia;
- efectivo esperado;
- cierre local;
- sincronizacion de cierre al backend virtual;
- cierre desde UI POS local.

Estado Cierre V1: pruebas locales cubren conteo, diferencia, cierre y sincronizacion.

## Pruebas de usuarios/PIN POS

- autenticar PIN;
- no guardar PIN plano;
- rechazar PIN incorrecto;
- validar permisos;
- bloquear cierre sin permiso;
- registrar auditoria con actor.

Estado Usuarios/PIN V1: pruebas locales cubren autenticacion, permisos y auditoria.

## Pruebas de anulaciones/devoluciones

- anular venta sin borrar original;
- devolucion parcial por linea;
- motivo obligatorio;
- bloqueo sin permiso;
- reverso de inventario;
- auditoria de responsable.

Estado Reversos V1: pruebas locales cubren anulacion, devolucion parcial, permisos, auditoria y reverso de inventario.

## Pruebas de mesas/zonas

- transferir ticket entre mesas;
- bloquear mesa ocupada;
- cambiar a para llevar;
- limpiar mesa al cambiar consumo;
- transferir desde UI POS;
- auditar cambio de consumo.

Estado Mesas/Zonas V1: pruebas locales cubren transferencia, disponibilidad y opciones de consumo.

## Pruebas de caos

- sin internet;
- cierre app;
- reinicio dispositivo;
- backend caido;
- reloj incorrecto;
- doble toque cobrar;
- pago desconocido;
- impresora fallando.
