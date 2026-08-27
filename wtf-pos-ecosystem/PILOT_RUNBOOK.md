# WTF POS Ecosystem - Runbook de piloto interno

Este paquete es un laboratorio local. No reemplaza ICG FrontRest, no toca inventario real y no debe conectarse a pagos reales sin completar el checklist de cutover.

## Modos

- Demo: datos simulados y perifericos virtuales.
- Piloto interno: prueba controlada con tablets, KDS, CDS, recibo virtual y conciliacion.
- Produccion: no habilitada en este paquete.

## Comandos

```bash
npm run check
npm test
npm run ui
npm run hub
```

## Flujo recomendado

1. Ejecutar `npm run check`.
2. Ejecutar `npm test`.
3. Abrir UI local con `npm run ui`.
4. Ejecutar diagnostico de perifericos.
5. Ejecutar piloto controlado.
6. Ejecutar conciliacion demo.
7. Revisar readiness de produccion.
8. Crear plan demo de cutover/rollback.

## Criterios para no avanzar

- Cualquier prueba automatizada falla.
- Readiness queda en `blocked` o `pending`.
- Conciliacion queda en `difference`.
- Impresora real no responde en laboratorio.
- No hay responsable de rollback.
- No hay ventana horaria definida.

## Rollback

Si ocurre un fallo durante piloto real supervisado:

1. Detener uso del POS piloto.
2. Volver a registrar ventas en ICG FrontRest.
3. Guardar copia del estado local POS.
4. Exportar auditoria y conciliacion.
5. Revisar inventario antes de reintentar.

## Regla de seguridad

El modo virtual es el valor por defecto. Cualquier impresora real debe requerir `realPrintingEnabled: true`, host, puerto y validacion previa.
