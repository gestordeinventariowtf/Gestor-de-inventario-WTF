# Guia simple para operador

## Objetivo

Usar ICG Host como puente entre ventas/entradas y el inventario sin perder control.

## Flujo diario recomendado

1. Abrir el sistema WTF Web.
2. Entrar a `ICG Host`.
3. Exportar paquete.
4. Poner el paquete en `data/inbox`.
5. Abrir `http://127.0.0.1:8787`.
6. Pulsar `Sincronizar ahora`.
7. Revisar movimientos pendientes.
8. Aprobar solo lo que este correcto.
9. Exportar entradas para ICG si aplica.

## Estados

- `pendiente_revision`: revisar antes de aplicar.
- `aprobado`: listo para exportar o sincronizar.
- `rechazado`: no se usara.
- `error`: requiere soporte.
- `esperando_conexion`: se reintentara luego.

## Regla de seguridad

Si no estas seguro, no apruebes el movimiento. Dejelo pendiente y consulte con administracion.
