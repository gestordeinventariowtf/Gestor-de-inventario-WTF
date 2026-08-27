# Prompt Maestro WTF POS Ecosystem - Continuacion Final Controlada

## Proposito de este documento

Este prompt continua y ordena la especificacion del ecosistema WTF POS sin ejecutar implementacion todavia. Su objetivo es dejar un paquete completo, claro y accionable para que, cuando el administrador lo autorice expresamente, Codex pueda iniciar la construccion real sin improvisar, sin romper la Web.App actual y sin detenerse por limites de escritura o pasos demasiado grandes.

## Instruccion principal para Codex

Actua como Arquitecto Senior de Software, Ingeniero Android Senior, Ingeniero Backend, Ingeniero Frontend, Especialista POS, Especialista offline-first, Ingeniero de base de datos, QA, seguridad y UX/UI para restaurantes.

Tu trabajo en esta fase es:

1. Continuar refinando el prompt maestro.
2. Consolidar requisitos repetidos.
3. Separar lo que es obligatorio para V1, piloto y futuro.
4. Convertir el alcance en fases ejecutables.
5. Evitar crear codigo, archivos o cambios de repositorio hasta recibir autorizacion explicita de implementacion.

No ejecutes el proyecto.
No crees archivos tecnicos.
No instales dependencias.
No hagas deploy.
No hagas commit.

Solo prepara el paquete final de instrucciones.

## Regla de seguridad del sistema existente

El sistema actual de WTF ya contiene modulos productivos:

- Inventario Cocina.
- Cuarto Frio Cocina.
- Inventario Bar.
- Cuarto Frio Bar.
- Mise an Place.
- Produccion.
- Sharp de Limpieza.
- ICG FrontRest.
- ICG Host local.
- Finanzas.
- Recursos Humanos.
- Activos Operativos.
- Usuarios y Permisos.
- Firebase Hosting.
- Firestore.
- Firebase Storage.
- Firebase Functions.
- Android WebView/Capacitor existente.

El futuro WTF POS debe construirse sin destruir, sobrescribir ni contaminar estos modulos.

La integracion debe hacerse mediante contratos, adaptadores y sincronizacion controlada.

## Objetivo general del ecosistema WTF POS

Crear un sistema compuesto por:

1. WTF POS: punto de venta principal.
2. WTF KDS: pantalla de cocina.
3. WTF CDS: pantalla para clientes.
4. WTF Dashboard: administracion, reportes, configuracion y auditoria.
5. Backend/API transaccional.
6. Base de datos central.
7. Base de datos local/offline.
8. Sistema de sincronizacion.
9. Integracion con inventario WTF.
10. Integracion opcional de lectura con ICG FrontRest.
11. Impresion y dispositivos.
12. Auditoria y seguridad.

## Alcance por version

### V1 obligatoria

La primera version util debe resolver una venta real simple de principio a fin:

- login o identificacion de empleado;
- apertura de turno;
- pantalla POS;
- catalogo de productos;
- busqueda por nombre, SKU y codigo de barra;
- carrito;
- consumo aqui, para llevar, delivery y apps delivery;
- calculo de ITBIS y Ley segun tipo de consumo;
- pago en efectivo;
- recibo;
- orden guardada;
- persistencia local;
- outbox;
- sincronizacion por lote;
- reporte basico en Dashboard;
- auditoria basica.

### Piloto

El piloto debe agregar:

- pagos mixtos;
- tarjeta;
- transferencia;
- dolares;
- clientes;
- comprobantes;
- modificadores;
- descuentos;
- KDS funcional;
- CDS funcional;
- impresoras configurables;
- integracion inicial con inventario WTF;
- permisos por rol;
- dispositivos autorizados;
- reportes diarios confiables.

### Futuro

Queda para fases futuras:

- devoluciones avanzadas;
- conciliacion bancaria;
- integracion Verifone real;
- facturacion fiscal certificada si aplica;
- multiples sucursales simultaneas;
- auditoria avanzada con IA;
- inventario predictivo;
- loyalty;
- integraciones externas.

## Tecnologia recomendada

Si el repositorio no impone otra arquitectura mas conveniente:

### WTF POS, WTF KDS y WTF CDS

- Android Kotlin.
- Jetpack Compose.
- Room/SQLite.
- Coroutines.
- StateFlow.
- WorkManager para sincronizacion.
- Android Keystore.
- Impresion por adapter.
- LAN/WebSocket local para KDS/CDS cuando aplique.

### Dashboard

- Web.App con TypeScript/React o integracion dentro del Dashboard WTF actual si conviene.
- Firebase Hosting solo para interfaz.
- Backend transaccional separado para ventas si el volumen lo requiere.

### Backend/API

- TypeScript.
- Modular monolith inicialmente.
- API REST para administracion.
- WebSocket o canal realtime para eventos operativos.
- Base central transaccional.

### Base de datos

- Local POS: SQLite/Room.
- Central: PostgreSQL o alternativa transaccional equivalente.
- Firestore solo para datos adecuados a realtime/dashboard/notificaciones, evitando usarlo como cola de escritura por cada evento de interfaz.

## Regla para Firebase y costos

Firebase puede utilizarse, pero debe evitarse un diseno que dispare costos o limites:

- no guardar cada cambio temporal de carrito en Firestore;
- no guardar cada tecla o busqueda;
- no subir snapshots completos si solo cambio una venta;
- no duplicar documentos por cada reintento;
- no usar Realtime Database abierto para datos criticos;
- no guardar fotos o recibos pesados como base64 dentro de documentos;
- usar Storage para archivos;
- usar Functions solo para procesos que realmente requieran backend.

El POS debe operar localmente y sincronizar eventos compactos.

## Principios no negociables

Priorizar:

1. Integridad financiera.
2. No perdida de ventas.
3. No duplicacion de pagos.
4. Seguridad.
5. Exactitud fiscal.
6. Continuidad operacional.
7. Trazabilidad.
8. Rendimiento.
9. UX.
10. Estetica.

Nunca sacrificar integridad para que una demo parezca funcionar.

## Regla contra limites de escritura

El sistema no debe depender de escribir en la nube por cada toque, tecla, movimiento de interfaz o cambio temporal.

Para evitar limites de escritura:

1. Usar base local/offline para operaciones del POS.
2. Usar outbox local para eventos pendientes.
3. Agrupar escrituras por lote.
4. Aplicar debounce en cambios no criticos.
5. Usar ids idempotentes para ventas, pagos, eventos y movimientos.
6. Confirmar escritura local antes de sincronizar remoto.
7. Evitar escrituras redundantes de snapshots completos.
8. Sincronizar deltas/eventos, no pantallas completas.
9. Separar datos criticos de datos visuales.
10. Implementar reintentos con control de duplicados.

Todo evento sincronizable debe tener:

- `eventId`
- `aggregateId`
- `type`
- `createdAt`
- `sourceDeviceId`
- `idempotencyKey`
- `schemaVersion`
- `payload`
- `status`
- `attempts`
- `nextRetryAt`
- `lastError`

La sincronizacion debe soportar:

- batch size configurable;
- backoff progresivo;
- reintentos;
- pausa cuando no hay red;
- confirmacion remota;
- estado visible para soporte;
- no bloquear ventas por error remoto.

## Regla de no ejecucion hasta autorizacion

Mientras este prompt se esta creando o perfeccionando:

- Codex no debe implementar.
- Codex no debe crear proyectos.
- Codex no debe modificar la Web.App.
- Codex no debe modificar Android.
- Codex no debe tocar Firebase.
- Codex no debe hacer commit.
- Codex no debe hacer deploy.

La implementacion solo inicia cuando el usuario indique claramente:

`Procede a implementar el WTF POS Ecosystem`

o una instruccion equivalente.

## Fase 0 - Preparacion del prompt

Objetivo:

Dejar el paquete listo para construir.

Debe contener:

1. Alcance V1.
2. Alcance piloto.
3. Alcance futuro.
4. Arquitectura propuesta.
5. Modelo de datos.
6. Flujos criticos.
7. Seguridad.
8. Sincronizacion.
9. Hardware.
10. Pruebas.
11. Criterios de aceptacion.
12. Orden de implementacion.
13. Riesgos.
14. Lo que no se debe hacer.

Tambien debe contener una lista de preguntas pendientes solo cuando sean realmente necesarias. No detenerse por preguntas que puedan resolverse con supuestos conservadores documentados.

## Fase 1 - Auditoria antes de implementar

Cuando se autorice implementar, la primera accion sera auditar:

- estructura del repositorio;
- tecnologias existentes;
- Web.App actual;
- Firebase;
- Firestore;
- Functions;
- Storage;
- Android WebView existente;
- servicio local ICG Host;
- datos de inventario;
- datos de productos ICG;
- autenticacion;
- permisos;
- historial de sincronizacion;
- posibles conflictos.

Resultado esperado:

- `PROJECT_INVENTORY.md`
- `GAP_ANALYSIS.md`
- `IMPLEMENTATION_PLAN.md`
- `IMPLEMENTATION_STATUS.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- `TESTING.md`
- `ROADMAP.md`

Pero crear documentos no significa terminar.

## Fase 2 - Primer corte funcional

Primer vertical slice:

```text
Empleado inicia sesion
  -> Abre turno
  -> Entra al POS
  -> Agrega producto
  -> Calcula impuestos
  -> Cobra en efectivo
  -> Guarda venta local
  -> Genera recibo
  -> Crea evento outbox
  -> Sincroniza por lote
  -> Refleja venta en Dashboard
```

Este corte debe funcionar antes de agregar funciones complejas.

### Reglas del primer corte

- No conectar todavia inventario real si no hay idempotencia probada.
- No conectar pagos reales si no hay control de duplicados.
- No declarar KDS/CDS listos si solo existen pantallas simuladas.
- No reemplazar la Web.App actual.
- No usar datos de produccion para pruebas destructivas.

## Fase 2.1 - Login de empleado y turno

El POS debe iniciar con identificacion de empleado.

Debe soportar:

- correo y contrasena;
- PIN de 4 a 6 digitos;
- biometria cuando el dispositivo lo permita;
- bloqueo por intentos fallidos;
- auditoria de inicio/cierre;
- apertura de turno;
- caja inicial;
- entradas y salidas de efectivo de caja;
- cierre de turno;
- resumen de turno.

El turno debe guardar:

- `shiftId`;
- `deviceId`;
- `employeeId`;
- `openedAt`;
- `closedAt`;
- `openingCash`;
- `closingCash`;
- `cashMovements`;
- `status`;
- `syncStatus`.

No permitir ventas sin turno abierto salvo modo emergencia documentado.

## Fase 2.2 - Catalogo y articulos

El catalogo debe soportar:

- productos;
- categorias;
- modificadores;
- descuentos;
- precios por tipo de consumo;
- productos activos/inactivos;
- SKU;
- codigo de barra;
- imagen opcional;
- impuesto aplicable;
- disponibilidad;
- vinculo con inventario WTF cuando aplique.

La busqueda debe:

- aceptar nombre parcial;
- ignorar mayusculas/minusculas;
- manejar acentos;
- buscar SKU;
- buscar codigo de barra;
- permitir scanner HID;
- permitir camara;
- resolver todo mediante una sola abstraccion `BarcodeLookupService` o equivalente.

Si el producto no esta sincronizado, no inventarlo. Debe mostrar mensaje claro y permitir sincronizar catalogo.

## Fase 3 - Ordenes guardadas y mesas

Debe permitir:

- crear orden abierta;
- asignar mesa o nombre;
- guardar sin cobrar;
- reabrir;
- modificar;
- cobrar;
- conservar historial;
- evitar duplicados.

Las ordenes abiertas deben guardar snapshot de:

- precios;
- impuestos;
- productos;
- modificadores;
- descuentos;
- empleado;
- dispositivo;
- hora de creacion;
- ultima modificacion.

Si se cambia precio, impuesto o producto mientras una orden esta abierta, no modificar silenciosamente la orden existente. Debe existir accion explicita para actualizar precios/impuestos con autorizacion cuando corresponda.

## Fase 3.1 - Cobro y recibo

La pantalla de cobro debe mostrar:

- subtotal;
- ITBIS;
- Ley;
- descuentos;
- total;
- metodo de pago;
- monto recibido;
- cambio.

Despues de cobrar debe mostrar:

- venta confirmada;
- nueva venta;
- ordenes guardadas;
- opcion de imprimir o reenviar recibo.

El recibo debe incluir:

- nombre del negocio;
- sucursal;
- numero de turno/ticket;
- fecha y hora;
- empleado;
- productos;
- cantidades;
- modificadores;
- impuestos;
- descuentos;
- total;
- metodo de pago;
- mensaje de agradecimiento.

No duplicar recibo ni pago por doble toque.

## Fase 4 - KDS

WTF KDS debe recibir comandas desde WTF POS.

Debe mostrar:

- turno;
- ticket;
- hora;
- tiempo transcurrido;
- mesa o cliente;
- tipo de consumo;
- productos;
- cantidades;
- modificadores;
- comentarios.

Debe permitir:

- marcar recibido;
- despachar;
- recuperar comando retirada por error;
- historial;
- colores por tiempo;
- parpadeo cuando se exceda el limite critico.

### Emparejamiento KDS

La APK WTF KDS debe tener pantalla inicial con:

- nombre del dispositivo;
- IP local;
- puerto;
- instrucciones guiadas;
- boton para volver a mostrar instrucciones;
- estado de conexion.

Desde WTF POS se debe poder registrar una pantalla de cocina indicando:

- nombre;
- IP;
- puerto;
- grupo de categorias;
- prioridad;
- estado.

KDS debe confirmar recepcion con ACK. Si POS no recibe ACK, debe reintentar sin duplicar comanda.

## Fase 5 - CDS

WTF CDS debe mostrar al cliente:

- productos seleccionados;
- precios;
- subtotal;
- impuestos;
- total;
- mensaje final de agradecimiento.

No debe mostrar:

- metodos de pago internos;
- informacion administrativa;
- datos sensibles.

### Emparejamiento CDS

La APK WTF CDS debe tener pantalla inicial similar a KDS:

- IP local;
- instrucciones;
- codigo o clave de emparejamiento;
- estado.

El POS debe enviar al CDS solo el snapshot visible para cliente.

CDS debe mostrar:

- carrito actual;
- cambios en tiempo razonable;
- total;
- pantalla final "Gracias por su compra WTFLover".

No debe permitir control administrativo ni manipulacion de venta.

## Fase 6 - Dashboard

Dashboard debe incluir:

- ventas diarias;
- ventas por articulo;
- ventas por categoria;
- ventas por empleado;
- ventas por metodo de pago;
- recibos;
- turnos;
- descuentos;
- impuestos;
- modificadores;
- dispositivos;
- reportes;
- configuracion.

Debe integrarse con la Web.App actual solo cuando haya contratos estables.

### Reportes minimos

Dashboard debe mostrar:

- ventas por dia;
- ventas por articulo;
- ventas por categoria;
- ventas por empleado;
- ventas por metodo de pago;
- impuestos;
- descuentos;
- recibos;
- turnos;
- caja;
- productos mas vendidos;
- productos anulados o devueltos;
- dispositivos conectados;
- errores de sincronizacion.

Cada reporte debe permitir filtrar por:

- fecha;
- turno;
- empleado;
- dispositivo;
- sucursal;
- metodo de pago;
- categoria.

## Fase 6.1 - Configuracion del Dashboard

Debe permitir configurar:

- sucursales;
- impuestos;
- tipos de consumo;
- comprobantes;
- recibos;
- impresoras;
- pantallas KDS;
- pantallas CDS;
- metodos de pago;
- roles;
- dispositivos POS autorizados;
- catalogo;
- categorias;
- modificadores;
- descuentos;
- clientes.

## Fase 7 - Inventario WTF

La integracion con inventario debe ser idempotente.

Una venta POS no debe descontar inventario dos veces.

Debe existir:

- mapping producto POS -> producto WTF;
- cantidad por venta;
- unidad;
- conversion;
- auditoria;
- reverso controlado;
- cola de movimientos.

### Puente POS -> Inventario WTF

Cada producto POS puede afectar uno o varios productos WTF.

Ejemplo:

- Producto vendido: Camarofongo.
- Descuentos WTF:
  - Camarones.
  - Bechamel.
  - Platano o base correspondiente si aplica.

Debe permitir multiples vinculos por producto vendido.

Cada vinculo debe tener:

- producto POS/ICG;
- producto WTF;
- area WTF;
- ubicacion WTF;
- cantidad por venta;
- unidad origen;
- unidad destino;
- conversion;
- activo/inactivo;
- fecha de actualizacion;
- usuario responsable.

Si un producto POS vendido no tiene vinculo, debe aparecer en alerta de mapeo pendiente, pero no debe inventar descuento.

## Fase 7.1 - Reversos

Toda salida generada por POS debe poder rastrearse.

Si una venta se anula o se revierte:

- generar evento de reverso;
- no borrar historiales fisicamente;
- restaurar inventario solo si el evento original habia sido aplicado;
- mantener auditoria;
- evitar doble reverso.

## Fase 8 - Fiscalidad e impuestos

Debe soportar:

- ITBIS;
- Ley 10%;
- consumo aqui;
- para llevar;
- delivery;
- apps delivery;
- precio con impuestos incluidos;
- precio mas impuestos;
- comprobantes B01/B02/E31/E32 cuando aplique.

Toda venta debe guardar snapshot fiscal.

### Tipos de consumo

Debe soportar:

- Comer aqui.
- Para llevar.
- Delivery.
- Apps Delivery.

Cada tipo puede tener:

- precio diferente;
- impuestos diferentes;
- politica de inclusion de impuestos;
- impresion diferente;
- envio a KDS diferente si aplica.

### Comprobantes

Debe permitir configurar secuencias separadas:

- consumidor final;
- credito fiscal;
- electronicos si aplica.

No afirmar cumplimiento fiscal certificado hasta validar con normativa, hardware/proveedor y pruebas reales.

## Fase 9 - Pagos

V1:

- efectivo.

Piloto:

- tarjeta;
- transferencia;
- dolares;
- pago mixto.

Futuro:

- devoluciones;
- pagos parciales;
- conciliacion;
- integraciones reales.

### Reglas de pagos

Cada intento de pago debe guardar:

- `paymentAttemptId`;
- `saleId`;
- metodo;
- monto;
- estado;
- hora;
- respuesta del proveedor si aplica;
- idempotency key.

Estados sugeridos:

- `created`;
- `processing`;
- `approved`;
- `declined`;
- `timeout`;
- `unknown`;
- `voided`;
- `refunded`.

No repetir automaticamente un cargo con estado `unknown` sin politica segura.

## Fase 10 - Hardware

No afirmar compatibilidad universal.

Para cada hardware registrar:

- fabricante;
- modelo;
- conexion;
- resultado;
- limitaciones;
- estado de validacion.

Si no hay hardware fisico:

- crear interfaces;
- adapters;
- simuladores;
- tests;
- marcar `HARDWARE_VALIDATION_PENDING`.

### Impresoras

Debe existir:

- `PrinterAdapter`;
- `VirtualPrinterAdapter`;
- cola de impresion;
- retry;
- preview;
- prueba de conexion;
- historial de trabajos.

No bloquear venta si falla impresion despues de pago aprobado. Debe permitir reimprimir desde historial.

### Scanner

Debe soportar:

- scanner USB/HID;
- camara;
- entrada manual.

Los tres deben terminar en el mismo servicio de resolucion de codigos.

## Fase 11 - Seguridad

Debe incluir:

- roles;
- permisos;
- PIN;
- biometria cuando aplique;
- dispositivos autorizados;
- auditoria;
- cierre de sesion;
- proteccion de acciones criticas;
- no exponer secretos;
- logs sin datos sensibles.

### Acciones criticas

Requieren permiso:

- anular venta;
- devolver;
- abrir gaveta manualmente;
- aplicar descuento manual;
- cambiar precio;
- cerrar turno de otro usuario;
- eliminar producto;
- modificar impuesto;
- modificar secuencia de comprobantes;
- autorizar dispositivo;
- reenviar sincronizacion fallida.

## Fase 11.1 - Auditoria

Todo movimiento critico debe guardar:

- usuario;
- dispositivo;
- fecha/hora;
- modulo;
- accion;
- antes;
- despues;
- motivo si aplica;
- referencia de venta/turno/producto;
- resultado.

Los logs tecnicos no deben mezclarse con auditoria de negocio.

## Fase 12 - Pruebas obligatorias

Probar:

- venta efectivo exacto;
- venta efectivo mayor;
- cambio;
- efectivo menor al total;
- impuestos;
- producto archivado;
- cambio de precio durante orden abierta;
- orden guardada;
- reintento de outbox;
- duplicado de evento;
- perdida de conexion;
- reinicio del dispositivo;
- sincronizacion posterior;
- KDS ACK;
- KDS reconexion;
- CDS reconexion;
- recibo;
- reportes.

### Pruebas adicionales por sincronizacion

Probar:

- 100 ventas offline;
- reinicio de app antes de sincronizar;
- reinicio de dispositivo;
- red intermitente;
- reintento duplicado;
- evento ya aplicado remoto;
- batch parcial;
- fallo de backend;
- cola corrupta recuperable;
- reloj del dispositivo incorrecto;
- dos dispositivos vendiendo simultaneamente.

### Pruebas de rendimiento

Probar:

- catalogo grande;
- busqueda rapida;
- carrito con muchos productos;
- KDS con muchas comandas;
- Dashboard con rango amplio;
- cierre de turno con muchas ventas.

## Fase 13 - UX/UI

La interfaz debe ser simple para cajeros y operarios.

### POS

Pantalla principal:

- categorias visibles;
- productos grandes y tocables;
- carrito claro;
- total siempre visible;
- botones Guardar y Cobrar;
- tipo de consumo visible;
- cliente opcional;
- busqueda rapida;
- scanner sin friccion.

### KDS

Debe ser legible desde distancia:

- tarjetas grandes;
- colores por tiempo;
- botones claros;
- sin texto pequeno innecesario;
- historial accesible.

### CDS

Debe ser limpio:

- producto;
- cantidad;
- precio;
- total;
- mensaje de marca.

## Fase 14 - Documentacion final obligatoria

Cuando se implemente, se deben generar:

- `PROJECT_INVENTORY.md`
- `GAP_ANALYSIS.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `OFFLINE_ARCHITECTURE.md`
- `SYNC_PROTOCOL.md`
- `SECURITY.md`
- `FISCAL.md`
- `HARDWARE_MATRIX.md`
- `TESTING.md`
- `OPERATIONS_RUNBOOK.md`
- `FINAL_STATUS_REPORT.md`

## Fase 15 - Entregables reales

Cuando corresponda, entregar:

- APK WTF POS;
- APK WTF KDS;
- APK WTF CDS;
- Dashboard desplegado;
- backend desplegado;
- migrations;
- reglas de seguridad;
- matriz de hardware;
- guia de instalacion;
- guia operativa;
- reporte de pruebas.

## Fase 16 - Lo que Codex no debe hacer

Codex no debe:

- declarar listo algo no probado;
- borrar datos de produccion;
- mezclar ventas de prueba con ventas reales;
- conectar pagos reales sin sandbox/pruebas;
- asumir compatibilidad fiscal;
- asumir compatibilidad universal de impresoras;
- crear productos inventados;
- duplicar descuentos de inventario;
- hacer deploy sin autorizacion;
- hacer commit sin autorizacion;
- modificar la Web.App actual si no es necesario;
- usar Firestore como dumping de eventos por cada tecla;
- guardar secretos en archivos versionados.

## Fase 17 - Estrategia para continuar el prompt sin limites

Si el prompt completo se vuelve demasiado grande, dividirlo en paquetes:

1. `PROMPT_WTF_POS_CORE.md`
2. `PROMPT_WTF_POS_ANDROID.md`
3. `PROMPT_WTF_KDS.md`
4. `PROMPT_WTF_CDS.md`
5. `PROMPT_WTF_DASHBOARD.md`
6. `PROMPT_WTF_BACKEND_API.md`
7. `PROMPT_WTF_SYNC_OFFLINE.md`
8. `PROMPT_WTF_INVENTORY_BRIDGE.md`
9. `PROMPT_WTF_SECURITY_AUDIT.md`
10. `PROMPT_WTF_TESTING_QA.md`
11. `PROMPT_WTF_DEPLOYMENT_OPERATIONS.md`
12. `PROMPT_WTF_FINAL_ACCEPTANCE.md`

Cada paquete debe tener:

- objetivo;
- alcance;
- fuera de alcance;
- entidades;
- flujos;
- reglas de negocio;
- errores esperados;
- pruebas;
- criterios de aceptacion;
- dependencias;
- riesgos.

Ningun paquete debe contradecir otro.

## Fase 18 - Preguntas pendientes para completar antes de implementar

Estas preguntas no bloquean la continuacion del prompt, pero si deben resolverse antes de produccion:

1. Cuales impresoras fisicas se usaran exactamente.
2. Cuales tablets se usaran para KDS.
3. Cuales pantallas/tablets se usaran para CDS.
4. Si el POS reemplazara o convivira con ICG FrontRest.
5. Si se requiere comprobante fiscal certificado desde V1.
6. Si pagos con tarjeta seran manuales o integrados a proveedor.
7. Si se usara backend propio, Firebase extendido o servidor local.
8. Si habra una o varias sucursales en V1.
9. Si las ventas POS deben descontar inventario en tiempo real o por cierre.
10. Si el inventario WTF sera la fuente maestra del costo.
11. Politica de devoluciones.
12. Politica de anulaciones.
13. Politica de descuentos.
14. Roles exactos de empleados.
15. Formato final del recibo.

## Fase 19 - Criterio de preparacion del prompt

El prompt maestro se considera listo para pasar a implementacion solo si:

- explica que se va a construir;
- explica que no se va a construir todavia;
- define el primer corte funcional;
- protege el sistema actual;
- define sincronizacion offline;
- evita limites de escritura;
- define pruebas;
- define aceptacion;
- define entregables;
- define como continuar si se interrumpe;
- tiene una instruccion clara de no implementar hasta autorizacion.

## Fase 20 - Instruccion para la siguiente respuesta de Codex mientras se redacta

Si el usuario dice:

`continua con el prompt`

Codex debe:

1. seguir ampliando este documento;
2. mejorar claridad;
3. agregar detalles faltantes;
4. ordenar fases;
5. eliminar contradicciones;
6. no implementar codigo;
7. no ejecutar comandos de build;
8. no hacer deploy;
9. no hacer commit.

## Fase 21 - Instruccion para cuando el usuario pida implementar

Si el usuario dice:

`Procede a implementar el WTF POS Ecosystem usando el prompt maestro final`

Codex debe:

1. auditar repositorio;
2. confirmar estado del sistema actual;
3. crear plan operativo;
4. empezar por vertical slice 1;
5. ejecutar pruebas;
6. documentar estado;
7. no declarar produccion hasta evidencia real.

## Cierre de esta continuacion

Este documento continua el Prompt Maestro WTF POS Ecosystem y mantiene la regla principal:

**Por ahora se esta creando el paquete completo del prompt. No se implementa hasta orden explicita.**

## Criterio de aceptacion V1

No clasificar como listo hasta demostrar:

1. una venta completa;
2. persistencia local;
3. recibo;
4. outbox;
5. sincronizacion idempotente;
6. dashboard basico;
7. pruebas pasando;
8. documentacion actualizada;
9. sin perdida de datos;
10. sin duplicacion de pagos.

## Clasificacion final

Al finalizar una fase, clasificar:

- `NOT_READY`
- `READY_FOR_INTERNAL_TEST`
- `READY_FOR_PILOT`
- `READY_FOR_PRODUCTION`

No exagerar el estado.

## Instruccion de continuidad

Si no se puede completar todo en una sola sesion:

1. detenerse en un punto estable;
2. dejar documentado que se hizo;
3. dejar documentado que falta;
4. no inventar resultados;
5. no hacer deploy incompleto;
6. no hacer commit si el usuario no lo pidio;
7. preservar todo el progreso.

## Comando futuro para iniciar implementacion

Cuando este prompt este aprobado, el usuario podra decir:

`Procede a implementar el WTF POS Ecosystem usando el prompt maestro final.`

Solo entonces Codex debe pasar de documentacion a ejecucion real.
