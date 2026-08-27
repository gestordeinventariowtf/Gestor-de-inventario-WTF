# Security - WTF POS Ecosystem

## Principios

- No guardar secretos en el repositorio.
- No guardar PIN en texto plano.
- No permitir dispositivos no autorizados.
- No permitir acciones criticas sin permiso.
- No ocultar auditoria.

## Acciones criticas

Requieren autorizacion:

- anular venta;
- devolver venta;
- modificar precio;
- aplicar descuento;
- abrir turno de otro usuario;
- cerrar turno de otro usuario;
- cambiar impuestos;
- cambiar comprobantes;
- autorizar dispositivos;
- borrar productos;
- reintentar eventos manualmente;
- modificar pagos.

## Auditoria

Guardar:

- usuario;
- dispositivo;
- accion;
- modulo;
- fecha/hora;
- antes;
- despues;
- motivo;
- resultado.

## Datos sensibles

No exponer:

- claves API;
- tokens;
- PIN;
- datos de pago sensibles;
- credenciales de Firebase;
- rutas internas innecesarias.
