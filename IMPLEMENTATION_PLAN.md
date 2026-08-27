# Implementation Plan - WTF POS Ecosystem

## Objetivo inmediato

Construir el ecosistema WTF POS por fases, sin romper la Web.App actual ni mezclar ventas de prueba con datos reales.

## Fase 1 - Preparacion tecnica

1. Mantener el prompt maestro consolidado como referencia.
2. Crear documentos de inventario, gaps, arquitectura, datos, seguridad y pruebas.
3. Definir si la primera base sera:
   - Android nativo Kotlin; o
   - prototipo web/TypeScript aislado; o
   - Capacitor separado solo para piloto.
4. Crear workspace separado del sistema actual.

## Fase 2 - Vertical Slice 1

Flujo:

```text
Empleado
  -> Abrir turno
  -> POS
  -> Agregar producto
  -> Calcular impuestos
  -> Cobrar efectivo
  -> Guardar venta local
  -> Crear recibo
  -> Crear evento outbox
  -> Dashboard basico
```

Reglas:

- No conectar inventario real todavia.
- No conectar pagos reales todavia.
- No tocar ventas reales.
- Todo debe tener ids idempotentes.

## Fase 3 - Ordenes abiertas

- Crear orden.
- Guardar por mesa o cliente.
- Reabrir.
- Modificar.
- Cobrar.
- Mantener snapshot.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 4 - KDS virtual

- Crear protocolo.
- Simular ACK.
- Simular perdida de conexion.
- Simular reintentos sin duplicar comandas.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 5 - CDS virtual

- Mostrar carrito.
- Mostrar totales.
- Ocultar datos administrativos.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 6 - Backend/API

- Crear API transaccional minima.
- Sincronizar ventas desde outbox.
- Evitar escrituras remotas por cada toque.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 7 - Inventario WTF

- Crear puente POS -> WTF.
- Mapear productos POS a productos WTF.
- Aplicar descuentos solo cuando exista vinculo confirmado.
- Auditar todo.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8 - APKs

- WTF POS.
- WTF KDS.
- WTF CDS.

Estado: APKs demo generadas:

- `wtf-pos-ecosystem/android-pos-app`
- `wtf-pos-ecosystem/android-kds-app`
- `wtf-pos-ecosystem/android-cds-app`

## Fase 8A - UI POS local

- Pantalla operativa minima.
- Busqueda de productos.
- Carrito y cobro.
- Estado KDS/CDS.
- Estado de sincronizacion.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8B - Adaptadores virtuales

- Impresora virtual.
- Pago virtual.
- Fallos/reintentos.
- Comprobantes.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8C - Cierre de turno/caja

- Cierre X/Z virtual.
- Conteo de caja.
- Diferencias.
- Reporte de ventas.
- Auditoria de cierre.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8D - Usuarios/PIN POS

- PIN local.
- Permisos por rol.
- Auditoria de responsable.
- Bloqueos de acciones criticas.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8E - Anulaciones/devoluciones POS

- Anular venta.
- Devolucion parcial.
- Reverso de inventario.
- Auditoria de responsable.
- Bloqueo por permiso.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8F - Mesas/zonas y consumo

- Zonas.
- Mesas.
- Consumo local / llevar / delivery.
- Transferir mesa.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8G - Unir/separar cuentas

- Separar productos.
- Mover productos entre tickets.
- Unir tickets.
- Mantener impuestos correctos.
- Auditar responsable.

Estado: base local implementada en `wtf-pos-ecosystem`.

## Fase 8H - Configuracion avanzada POS

- Descuentos/promociones.
- Reglas por rol.
- Configuracion operativa por dispositivo.
- Preparacion para hardware real.

Estado: pendiente.

## Fase 8I - APK WTF KDS

- Pantalla de cocina.
- Recepcion de comandas.
- ACK/retry.
- Estados: recibido, preparando, listo, entregado.
- Persistencia local.

Estado: APK demo local implementada.

## Fase 8J - APK WTF CDS

- Pantalla de cliente.
- Carrito y totales.
- Estado de orden.
- Limpieza al cerrar venta.

Estado: APK demo local implementada.

## Fase 8K - Comunicacion local POS/KDS/CDS

- Descubrimiento o configuracion de servidor local.
- Sincronizacion entre tablets.
- ACK/retry entre dispositivos reales.
- Estado de orden compartido.
- Prueba con 2 o 3 dispositivos Android.

Estado: base local implementada con hub HTTP y APKs recompiladas.

## Fase 8L - Registro/configuracion de dispositivos

- Registrar cada tablet como POS, KDS o CDS.
- Guardar nombre del dispositivo.
- Configurar estacion de cocina.
- Descubrir o recordar URL del hub.
- Preparar monitoreo de conexion.

Estado: base local implementada con registro, deviceId y heartbeat.

## Fase 8M - Emparejamiento y descubrimiento del hub

- Mostrar QR/codigo corto desde el hub.
- Permitir emparejar tablets sin escribir IP manual.
- Recordar ultimo hub usado.
- Mostrar estado conectado/desconectado mas claro.
- Preparar modo kiosco/tablet dedicada.

Estado: base local implementada con pantalla del hub, QR, codigo corto, lector QR en APKs y fallback por pegado manual.

## Fase 8N - Modo kiosco y monitoreo de conexion

- Pantalla de estado por dispositivo.
- Alertas si POS/KDS/CDS pierde hub.
- Ultimo heartbeat visible.
- Reconexion manual.
- Preparar tablets dedicadas para operacion real.

Estado: base local implementada con monitoreo por heartbeat, estados online/warning/offline, panel del hub, estado visible en APKs y boton de modo kiosco.

## Fase 8O - Configuracion operativa avanzada POS

- Descuentos y promociones.
- Reglas por rol.
- Configuracion por dispositivo.
- Politicas de impresora/pago por estacion.
- Preparacion para hardware real.

Estado: base local implementada con promociones, limites por rol, auditoria de descuentos, perfil por dispositivo y hardware virtual visible.

## Fase 8P - Politicas y conectores de hardware

- Mapeo de impresoras por estacion.
- Cola por impresora.
- Simulacion ESC/POS.
- Proveedor de pago configurable.
- Caida/reintento por periferico.
- Matriz de hardware antes de integrar equipos reales.

Estado: base local implementada con politica de impresora/pago, cola por impresora, comandos ESC/POS simulados y pruebas de perifericos.

## Fase 8Q - Matriz de hardware y diagnostico

- Listado de perifericos por estacion.
- Prueba de impresion por impresora.
- Prueba de pago por proveedor.
- Estado y ultimo error por periferico.
- Checklist de compatibilidad antes de equipo real.

Estado: base local implementada con matriz de hardware, diagnostico de impresora/pago, endpoint local, panel visual y auditoria.

## Fase 8R - Piloto operativo controlado

- Checklist guiado de prueba por dispositivo.
- Simular venta completa POS -> KDS -> CDS.
- Validar recibo, pago virtual, cierre Z y auditoria.
- Registrar resultado de prueba por equipo.
- Preparar validacion de una impresora real sin afectar operacion real.

Estado: base local implementada con flujo piloto completo, bitacora, evento, backend virtual, UI local y pruebas automatizadas.

## Fase 8S - Laboratorio de hardware real

- Preparar adaptador real de impresora ESC/POS por red/USB.
- Mantener modo virtual como respaldo obligatorio.
- Probar conexion antes de imprimir.
- Registrar errores por periferico.
- Bloquear impresion real si no hay ACK/respuesta.
- No habilitar hardware real por defecto.

Estado: base local implementada con adaptador ESC/POS por red, bloqueo seguro, plan de laboratorio y pruebas TCP locales.

## Fase 9A - Piloto interno con conciliacion

- Comparar ventas POS piloto contra referencia externa/ICG.
- Detectar diferencias de tickets.
- Detectar diferencias de total.
- Detectar diferencias de impuestos.
- Detectar diferencias de movimientos de inventario esperados.
- Generar reporte de conciliacion antes de produccion.

Estado: base local implementada con conciliacion, endpoint, panel, backend virtual, auditoria y pruebas.

## Fase 9B - Readiness para produccion

- Unificar estado de hardware.
- Unificar estado de piloto.
- Unificar estado de conciliacion.
- Mostrar bloqueos pendientes.
- Crear criterios de salida antes de usar datos reales.
- Mostrar siguiente accion recomendada.

Estado: base local implementada con calculo de readiness, endpoint, panel visual y pruebas automatizadas.

## Fase 9C - Cutover y rollback operativo

- Checklist formal para pasar de piloto a uso real.
- Checklist formal para volver atras.
- Definir responsables.
- Definir ventana horaria de cambio.
- Validar respaldo local antes del cambio.
- Validar criterio de detener POS piloto y volver a ICG.

Estado: base local implementada con plan formal, rollback, colecciones, endpoint, UI local, auditoria y pruebas.

## Fase 9D - Empaquetado de piloto interno

- Crear guia de ejecucion local.
- Separar claramente demo, piloto y produccion.
- Documentar comandos de prueba.
- Documentar datos demo.
- Documentar reporte esperado.
- Evitar activacion accidental de produccion real.

Estado: base local implementada con runbook, comando `pilot:verify` y verificacion integrada.

## Fase 9E - Guia de tablets APK y hub

- Documentar instalacion de APK POS/KDS/CDS demo.
- Documentar emparejamiento con hub local.
- Documentar verificacion de heartbeat.
- Documentar prueba POS -> KDS -> CDS.
- Registrar resultado por dispositivo.

Estado: base local implementada con guia, endpoint de validacion por tablet, panel de hub y pruebas.

## Fase 9F - Reporte final de piloto interno

- Consolidar hardware.
- Consolidar tablets validadas.
- Consolidar piloto operativo.
- Consolidar conciliacion.
- Consolidar readiness.
- Consolidar cutover/rollback.
- Generar resumen exportable antes de produccion real.

Estado: base local implementada con dominio, colecciones, backend virtual, endpoint, panel visual, auditoria y pruebas.

## Fase 9G - Paquete de evidencias exportable

- Exportar reporte final de piloto.
- Exportar readiness.
- Exportar cutover/rollback.
- Exportar conciliacion.
- Exportar validaciones de tablets.
- Exportar auditoria relevante.
- Generar un archivo legible para revision administrativa antes de produccion real.

Estado: base local implementada con dominio, colecciones, backend virtual, endpoint, panel visual, descarga JSON/HTML, auditoria y pruebas.

## Fase 10A - Preparacion de produccion controlada

- Crear checklist de aprobacion administrativa.
- Separar modo demo, modo piloto y modo produccion.
- Agregar bandera explicita para impedir activacion accidental.
- Definir criterios para primer turno real supervisado.
- Mantener rollback obligatorio.
- Mantener ICG disponible como respaldo.

Estado: base local implementada con dominio, colecciones, backend virtual, endpoint, panel visual, auditoria y pruebas.

## Fase 10B - Primer turno real supervisado en modo sombra

- Ejecutar ventas paralelas sin reemplazar ICG.
- Registrar diferencias contra ICG.
- Registrar incidentes del turno.
- Medir estabilidad de POS, KDS, CDS y hub.
- Confirmar que rollback inmediato siga disponible.
- No activar pagos reales ni impresoras reales todavia.

Estado: base local implementada con dominio, colecciones, backend virtual, endpoint, panel visual, auditoria y pruebas.

## Fase 10C - Decision post-turno sombra

- Evaluar resultado del turno sombra.
- Autorizar repetir sombra, bloquear avance o pasar a laboratorio real.
- Exigir cero diferencias criticas.
- Exigir incidentes cerrados.
- Mantener ICG como sistema principal.

Estado: base local implementada con dominio, colecciones, backend virtual, endpoint, panel visual, auditoria y pruebas.

## Fase 10D - Laboratorio real controlado de hardware/pagos

- Ejecutar pruebas reales aisladas.
- No afectar ventas reales.
- No reemplazar ICG.
- Validar impresora real.
- Validar pago real o simulado certificado.
- Registrar errores y reintentos.

Estado: implementado dentro de la cadena `operational-stage`.

## Fase 10E - Criterios de activacion limitada

- Definir alcance limitado.
- Confirmar responsables.
- Confirmar evidencia.
- Mantener ICG como sistema principal.

Estado: implementado dentro de la cadena `operational-stage`.

## Fase 10F - Monitoreo operativo controlado

- Registrar estabilidad operativa.
- Revisar POS, KDS, CDS y hub.
- Bloquear avance si falta evidencia.

Estado: implementado dentro de la cadena `operational-stage`.

## Fase 10G - Ensayo backup/restore y rollback

- Validar restauracion.
- Validar reversa operativa.
- No afectar ventas reales.

Estado: implementado dentro de la cadena `operational-stage`.

## Fase 10H - Firma de entrenamiento del equipo

- Registrar aprobacion de entrenamiento.
- Exigir evidencia.
- Dejar auditoria.

Estado: implementado dentro de la cadena `operational-stage`.

## Fase 10I - Decision final Go/No-Go

- Autorizar o bloquear avance.
- Exigir cadena completa.
- Mantener evidencia.

Estado: implementado dentro de la cadena `operational-stage`.

## Fase 10J - Paquete de entrega operativa

- Cerrar paquete de entrega.
- Registrar evidencia final.
- Marcar `implementation_ready_for_controlled_rollout`.

Estado: implementado dentro de la cadena `operational-stage`.

## Fase 9 - Piloto interno

- Probar sin reemplazar ICG FrontRest.
- Validar ventas paralelas.
- Comparar reportes.
- Validar inventario.

## Fase 10 - Produccion

Solo si:

- pruebas criticas pasan;
- hardware validado;
- pagos/fiscalidad definidos;
- backup/restore probado;
- usuarios entrenados;
- plan de rollback listo.
