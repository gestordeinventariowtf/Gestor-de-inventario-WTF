

<!-- PARTE 1 | attachment=24d3bde7-6493-4d3e-a2ef-8c93dff949ff | rango=1-63 -->

WTF POS ECOSYSTEM
PROMPT MAESTRO CONSOLIDADO
Especificación funcional, técnica, operacional, de seguridad, QA y ejecución
1. MISIÓN
Actúa simultáneamente como:
- Arquitecto Senior de Software.
- Ingeniero Android Senior.
- Ingeniero Backend.
- Ingeniero Frontend.
- Especialista en sistemas POS.
- Especialista en sistemas distribuidos/offline-first.
- Ingeniero de bases de datos.
- Ingeniero DevOps.
- Ingeniero QA.
- Especialista en seguridad.
- Diseñador UX/UI especializado en sistemas de restaurante.
Tu objetivo es construir, no solamente diseñar, el ecosistema:
WTF POS Ecosystem
compuesto por:
1. WTF POS — aplicación principal de Punto de Venta.
2. WTF KDS — APK independiente para Pantalla de Cocina.
3. WTF CDS — APK independiente para Pantalla para Clientes.
4. WTF Dashboard — Web.App administrativa y de reportes.
5. Backend/API.
6. Base de datos central.
7. Persistencia local/offline.
8. Sincronización.
9. Impresión.
10. Administración de dispositivos.
El sistema debe estar preparado para WTF – What's That Food! y diseñado para operar un restaurante real.
2. PRINCIPIOS NO NEGOCIABLES
Prioriza en este orden:
1. Integridad financiera.
2. No pérdida de ventas.
3. No duplicación de pagos.
4. Seguridad.
5. Exactitud fiscal.
6. Continuidad operacional.
7. Trazabilidad.
8. Rendimiento.
9. UX.
10. Estética.
Nunca sacrifiques integridad para que una demo simplemente “parezca funcionar”.
3. REGLAS PARA TRABAJAR SOBRE EL REPOSITORIO
Antes de programar:
1. inspecciona completamente el repositorio;
2. identifica stack y arquitectura;
3. identifica aplicaciones existentes;
4. identifica backend;
5. identifica bases de datos;
6. identifica autenticación;
7. identifica inventario WTF existente;
8. identifica servicios de sincronización;
9. identifica tests;
10. identifica código reutilizable.
No reinicialices un proyecto existente sin necesidad.
No destruyas funcionalidades WTF que ya funcionen.
Si existe una Web.App, Firebase, SQL, API, inventario o autenticación, analiza primero si debe reutilizarse.
4. GAP ANALYSIS
Clasifica los requisitos en:
- EXISTING_AND_VALID
- EXISTING_NEEDS_CHANGE
- MISSING
- BLOCKED_EXTERNAL
- FUTURE_SCOPE
Crea:
IMPLEMENTATION_PLAN.md
IMPLEMENTATION_STATUS.md
REQUIREMENTS_TRACEABILITY.md
ARCHITECTURE.md
DATA_MODEL.md
Pero no termines la tarea después de generar documentación.
Después comienza la implementación.
5. ARQUITECTURA GENERAL
Arquitectura conceptual:
                         WTF Dashboard
                              │
                              ▼
                        Backend / API
                              │
                         Central DB
                              │
                        Cloud Sync
                              │
                              ▼
                           WTF POS
                      Local DB + Outbox
                       /       |       \
                      /        |        \
                     ▼         ▼         ▼
                 WTF KDS    WTF CDS   Printers
                    │
              Kitchen Workflow
WTF POS debe poder seguir operando localmente durante interrupciones razonables de Internet.
WTF KDS/CDS deben poder comunicarse con POS mediante LAN cuando estén en la misma red y la infraestructura local continúe disponible.
6. TECNOLOGÍAS
Si el repositorio no posee ya una arquitectura adecuada, considerar:
Android
Kotlin + Jetpack Compose.
Room/SQLite.
ViewModel + StateFlow.
Coroutines.
Android Keystore.
Dashboard
TypeScript.
React/Next.js o equivalente estable.
Backend
TypeScript + NestJS o arquitectura equivalente.
Preferir inicialmente un Modular Monolith bien estructurado.
Database
PostgreSQL para transacciones centrales.
API
REST para operaciones administrativas.
WebSocket/realtime para eventos que lo necesiten.
Offline
Outbox/Inbox + idempotencia.
Estas tecnologías son recomendaciones. No reescribas una arquitectura existente estable únicamente para utilizarlas.
7. IDENTIDAD DEL PRODUCTO
Aplicaciones:
WTF POS
WTF KDS
Pantalla de Cocina
WTF CDS
Pantalla para Clientes
WTF Dashboard
Marca:
WTF – What's That Food!
Paleta inicial:
- #432210
- #FB7000
- #F4EFC1
- #88AA00
Utilizar design tokens semánticos.
No sacrificar legibilidad por branding.
8. WTF POS — APLICACIÓN PRINCIPAL
Crear APK Android:
WTF POS
Diseñada prioritariamente para tablet/terminal táctil, pero adaptable a móvil y con arquitectura preparada para PC.
9. NAVEGACIÓN WTF POS
Utilizar menú lateral oculto/drawer.
Como mínimo:
- Ventas
- Recibos
- Turnos
- Artículos
- Configuración
Artículos
Subopciones:
- Artículos
- Categorías
- Modificadores
- Descuentos
10. PANTALLA PRINCIPAL DE VENTAS
Debe priorizar:
- modalidades;
- categorías;
- productos;
- búsqueda;
- código de barras;
- cliente;
- carrito;
- Guardar;
- Cobrar.
No sobrecargar la pantalla con funciones administrativas.
11. MODALIDADES DE CONSUMO
Soportar como defaults:
Comer aquí
Para llevar
Delivery
Apps Delivery
Deben ser administrables desde Dashboard.
Guardar siempre la modalidad en la venta.
12. CANAL DE VENTA
Separar conceptualmente:
DiningOption
de:
SalesChannel
Ejemplo:
DiningOption:
Apps Delivery.
SalesChannel:
Uber Eats.
Esto permitirá agregar plataformas sin crear una modalidad diferente por cada aplicación.
13. CLIENTES EN POS
Botón:
Seleccionar cliente
Permitir:
- buscar;
- seleccionar;
- cambiar;
- quitar;
- crear cliente rápido según permisos.
No mostrar datos sensibles innecesarios.
14. CARRITO
Cada línea debe soportar:
- producto;
- cantidad;
- precio;
- modificadores;
- comentarios;
- descuentos;
- impuestos;
- total.
Los cálculos deben actualizarse inmediatamente.
15. ARTÍCULOS
Campos mínimos:
- Nombre
- Nombre corto
- Descripción
- SKU
- Código de barras
- Categoría
- Precio regular
- Precio Apps Delivery
- Impuestos
- Modificadores
- Inventariable
- Stock mínimo
- Imagen
- Disponibilidad
- Cocina/estación
Archivar en vez de eliminar cuando exista historial.
16. CATEGORÍAS
Permitir:
- crear;
- editar;
- ordenar;
- archivar;
- asignar artículos;
- asignar destinos de cocina.
17. MODIFICADORES
Crear:
ModifierGroup
y
ModifierOption
Cada grupo puede definir:
- obligatorio/opcional;
- mínimo;
- máximo;
- selección única/múltiple;
- cantidad;
- orden.
Ejemplos:
Punto de carne.
Tipo de acompañante.
Extras.
18. MODIFICADORES EN POS
Cuando un producto tenga modificadores obligatorios:
abrir modal automáticamente.
Mostrar precio actualizado.
Botones:
Cancelar
Agregar — RD$X
No permitir agregar una línea inválida.
19. COMENTARIOS
Campo:
Instrucciones especiales
Debe poder aparecer:
- KDS;
- kitchen printer;
- recibo cuando configuración lo permita.
20. CÓDIGO DE BARRAS
Configuración:
Utilizar cámara para escanear códigos de barras
ON/OFF.
Soportar:
- cámara;
- lector HID/USB cuando corresponda;
- entrada manual.
Si código desconocido:
Artículo no encontrado
No crear un artículo automáticamente.
21. CONFIGURACIÓN GENERAL WTF POS
Incluir:
Cámara
Utilizar cámara para escanear códigos de barras.
Modo oscuro
Opciones:
- Usar ajuste del dispositivo
- Activado
- Desactivado
Distribución de artículos
Al seleccionarla abrir modal central.
Opciones:
- Cuadrícula
- Lista
Mostrar preview correspondiente al tipo de dispositivo.
Botones:
Cancelar
Aceptar
Idioma
Integrarse con los ajustes de idioma por aplicación del sistema operativo cuando estén disponibles.
22. OPEN TICKETS / ÓRDENES GUARDADAS
Cuando esté activo:
permitir:
- Guardar orden;
- reabrir;
- editar;
- volver a guardar;
- cobrar.
Una orden guardada no es una nueva venta.
Debe conservar el mismo ID.
23. MESAS
Si Tickets Abiertos predefinidos están activos:
permitir crear manualmente:
- Mesa 1
- Mesa 2
- Barra 1
- VIP
No autonumerar obligatoriamente.
Una mesa ocupada debe reflejar el ticket activo.
24. GUARDAR ORDEN
Cuando el usuario pulse:
Guardar
debe:
1. validar;
2. persistir;
3. generar número de turno cuando corresponda;
4. enviar únicamente los eventos necesarios a cocina;
5. quedar disponible en Órdenes Guardadas.
25. MODIFICACIÓN DESPUÉS DE ENVIAR A COCINA
No reenviar toda la orden.
Ejemplo:
3 Burger → 4 Burger.
Enviar:
AGREGADO: 1 × Burger
Si se elimina:
enviar cancelación/delta.
Utilizar revisions/event IDs.
26. COBRAR
Botón principal:
Cobrar
Pantalla de pago debe mostrar:
- subtotal;
- descuentos;
- impuestos/cargos;
- total;
- saldo.
Después seleccionar método.
27. MÉTODOS DE PAGO
Administrables.
Tipos iniciales:
- Efectivo
- Tarjeta manual
- Transferencia
- Apps Delivery
- Personalizados
No codificar lógica según nombre textual.
Utilizar PaymentMethod.type.
28. EFECTIVO
Solicitar monto recibido.
Calcular cambio exactamente.
Afectar turno/gaveta.
29. TARJETA MANUAL
Registrar pago realizado en terminal externa.
No afirmar que WTF POS procesa la tarjeta si no existe integración real.
30. PAGO DIVIDIDO
Arquitectura preparada y preferiblemente implementada para dividir total entre varios métodos.
La suma debe coincidir exactamente.
31. PROTECCIÓN CONTRA DOBLE COBRO
Obligatoria.
Utilizar:
- PaymentAttempt ID;
- idempotency key;
- estado persistido;
- botón bloqueado durante procesamiento;
- validación backend.
Un timeout no significa automáticamente que el pago falló.
Estado:
UNKNOWN/PENDING_CONFIRMATION
cuando corresponda.
32. PANTALLA POST-PAGO
Después de completar:
Cobrado
Mostrar:
Monto Total: RD$X
Botones:
Nueva Venta
Órdenes Guardadas
33. NUEVA VENTA
Debe:
- cerrar contexto anterior;
- crear nueva sesión;
- limpiar carrito;
- limpiar WTF CDS;
- volver a POS.
34. NÚMERO DE TURNO
Crear numeración de turno/pedido.
Debe poder aparecer:
- KDS;
- recibo;
- CDS opcionalmente;
- búsquedas/reportes.
No utilizarlo como ID interno.
35. RECIBOS
Módulo:
Recibos
Buscar por:
- número;
- turno;
- NCF;
- cliente;
- fecha;
- total.
Detalle:
- artículos;
- modificadores;
- impuestos;
- descuentos;
- pagos;
- cliente;
- empleado;
- fecha;
- fiscal.
Acciones autorizadas:
- reimprimir;
- devolver;
- anular cuando corresponda;
- copia digital futura.
36. RECIBO HISTÓRICO
Guardar snapshot.
Una reimpresión histórica no debe utilizar precios actuales.
37. CONFIGURACIÓN DEL RECIBO
WTF Dashboard:
- logo;
- empresa;
- RNC;
- dirección;
- teléfono;
- SKU;
- modificadores;
- comentarios;
- modalidad;
- empleado;
- mesa;
- turno;
- subtotal;
- descuentos;
- impuestos;
- total;
- pagos;
- cambio;
- pie;
- QR;
- idioma.
38. IMPRESORAS
Soportar arquitectura mediante adapters.
Tipos:
- LAN/Ethernet ESC/POS
- Bluetooth cuando corresponda
- USB cuando corresponda
- Virtual Printer para desarrollo
No afirmar compatibilidad universal.
39. PRINT QUEUE
Toda impresión debe generar un PrintJob persistente.
Estados:
- PENDING
- PRINTING
- PRINTED
- FAILED
Una falla de impresión no debe borrar/revertir una venta completada.
40. WTF KDS — APK
Crear APK independiente:
WTF KDS
Pantalla de Cocina
Debe poder ejecutarse en una tablet Android independiente.
41. WTF KDS — PRIMER INICIO
Mostrar:
- WTF KDS
- Pantalla de Cocina
- estado de red
- IP actual
- botón de instrucciones
- botón para comenzar configuración
42. IP KDS
Mostrar la IP actual del dispositivo.
La IP ayuda a localizar el dispositivo.
NO es su identidad ni mecanismo de autorización.
43. INSTRUCCIONES GUIADAS KDS
Mostrar con imágenes reales/demostrativas:
1. Mantenga WTF KDS abierto.
2. Abra WTF POS.
3. Configuración.
4. Impresoras/Pantallas de cocina.
5. Agregar WTF KDS.
6. Buscar dispositivo o introducir IP.
7. Confirmar pairing.
8. Enviar comanda de prueba.
44. PAIRING KDS
Preferir:
- discovery NSD/mDNS;
- pairing code/nonce;
- autenticación;
- device ID.
Mantener IP manual como fallback.
Después de pairing:
ocultar onboarding normal.
45. CONFIGURACIÓN INTERNA KDS
Módulo:
Conexión
Mostrar:
- nombre;
- IP;
- sucursal;
- estación;
- device ID parcial;
- POS autorizados;
- estado.
46. KDS COMO DESTINO DE COCINA
Desde WTF POS/Dashboard:
Configuración → Cocina/Impresoras → Agregar WTF KDS.
Debe poder asignarse como destino igual que una impresora, pero conservando su tipo de dispositivo.
47. KITCHEN ROUTING
Crear grupos/estaciones.
Ejemplo:
- Cocina
- Bar
- Fritura
Relacionarlos con categorías/productos.
Una orden comercial puede generar varias comandas de estación.
48. KDS — TARJETA DE COMANDA
Mostrar:
- número de turno;
- ticket;
- modalidad;
- hora;
- cronómetro;
- artículos;
- cantidades;
- modificadores;
- comentarios.
Priorizar legibilidad.
49. KDS TIMER
Defaults exactos:
<10 minutos
Normal.
≥10 minutos
Amarillo.
≥20 minutos
Rojo.
≥30 minutos
Rojo parpadeante + texto crítico.
Umbrales configurables posteriormente.
50. KDS LAYOUT
Visualización mediante cuadros/tarjetas.
Con muchas comandas:
- paginación;
- swipe/scroll;
- reorganización automática.
Al cerrar comandas:
disminuir páginas automáticamente.
51. KDS DESPACHAR
Acción clara:
Despachar
No eliminar físicamente.
Mover a historial.
52. KDS HISTORIAL
Mostrar pedidos completados.
Permitir:
Restaurar
si se despachó por error.
Registrar auditoría.
53. KDS OFFLINE
Comandas activas deben persistir localmente.
Si KDS pierde conexión:
mantenerlas.
Al reconectar:
reconciliar.
54. KDS IDEMPOTENCY
Cada KitchenEvent debe tener ID único.
Si POS reenvía por pérdida de ACK:
KDS no duplica la comanda.
55. WTF CDS — APK
Crear APK independiente:
WTF CDS
Pantalla para Clientes
56. WTF CDS — PAIRING
Mismo concepto de:
- IP;
- discovery;
- pairing;
- device identity.
Normalmente:
1 POS → 1 CDS.
57. WTF CDS — PROPÓSITO
Mostrar únicamente información relacionada con la compra actual.
No mostrar controles internos del POS.
58. WTF CDS — DURANTE LA VENTA
Mostrar:
- nombre del artículo;
- cantidad;
- precio;
- modificadores relevantes;
- descuentos;
- subtotal;
- impuestos;
- total.
59. WTF CDS — PRIVACIDAD
No mostrar:
- PIN;
- costos;
- márgenes;
- permisos;
- configuración;
- caja;
- información interna de pagos;
- IDs internos.
60. WTF CDS — SESSION ISOLATION
Cada venta debe utilizar displaySessionId.
CDS Caja 1 nunca debe mostrar la orden de Caja 2.
61. WTF CDS — COBRO
Mientras el cajero selecciona pago:
CDS puede mostrar:
Total a pagar: RD$X
No mostrar botones de métodos de pago.
62. WTF CDS — FINAL
Después de pago:
¡Gracias por su compra, WTFLover!
Después regresar a idle.
63. WTF DASHBOARD
Crear Web.App responsive:
WTF Dashboard
Debe funcionar en:
- desktop

<!-- PARTE 2 | attachment=aaff9c1a-84f3-4271-96f3-25d3b4d243fd | rango=1-12 -->

Continúo exactamente desde el 131 del mismo Prompt Maestro consolidado.
:

WTF POS, WTF KDS y WTF CDS deben utilizar un sistema de emparejamiento seguro.
La IP sirve para localizar el dispositivo en la red local.
La autorización debe depender de:
- deviceId;
- credencial de dispositivo;
- pairing;
- sucursal;
- permisos/scopes.
No confiar en un dispositivo únicamente porque responde desde una IP conocida.
Cuando sea técnicamente apropiado utilizar:
- Android NSD;
- mDNS;
- mecanismo equivalente.
Permitir descubrir automáticamente:
- WTF KDS;
- WTF CDS.
Mantener siempre:
Introducir IP manualmente
como fallback.
Al emparejar:
generar código/nonce temporal.
Debe:
- expirar;
- ser de un solo uso;
- tener intentos limitados;
- no convertirse en secreto permanente.
Puede implementarse adicionalmente.
El QR puede contener:
- deviceId;
- endpoint;
- pairing nonce temporal.
Nunca una credencial permanente.
Después del pairing generar credenciales seguras.
Guardar claves locales mediante mecanismos oficiales como Android Keystore cuando corresponda.
WTF KDS:
solo permisos necesarios para cocina.
WTF CDS:
solo permisos necesarios para display.
WTF POS:
permisos operacionales correspondientes.
Principio:
Least Privilege
Registrar conectividad mediante heartbeat.
No crear un AuditLog permanente por cada heartbeat.
Dashboard debe poder mostrar:
- Online;
- Degraded;
- Offline;
- última conexión;
- versión.
Registrar:
- appVersion;
- buildNumber;
- protocolVersion;
- schemaVersion cuando corresponda.
Cada dispositivo debe indicar qué versión de configuración utiliza.
Dashboard puede mostrar:
Configuración desactualizada
cuando corresponda.
Dashboard puede publicar configuración.
Estados por dispositivo:
- PENDING
- DOWNLOADED
- APPLIED
- FAILED
No asumir que publicar significa que todos los dispositivos ya aplicaron el cambio.
Si una configuración descargada es inválida:
no reemplazar la última configuración válida.
Registrar error.
Configuraciones críticas deben versionarse.
Especialmente:
- impuestos;
- precios;
- permisos;
- cocina;
- fiscal.
Para configuraciones críticas considerar:
Los cambios no deben afectar dispositivos hasta publicación.
Antes de publicar un cambio sensible mostrar diferencias.
Ejemplo:
```
ITBIS
18% → 16%

Apps Delivery Price
RD$650 → RD$690
```
Registrar:
- quién;
- qué;
- before;
- after;
- cuándo;
- sucursal.
Restaurar una versión anterior creando una nueva versión basada en ella.
No borrar historial.
WTF POS debe utilizar un modelo:
Una venta no debe depender de una conexión constante al cloud cuando la operación y las reglas configuradas permitan trabajar offline.
Persistir como mínimo:
- configuración;
- catálogo;
- permisos offline necesarios;
- empleados autorizados necesarios;
- turno;
- drafts;
- tickets abiertos;
- ventas;
- pagos;
- recibos;
- eventos de cocina;
- print jobs;
- outbox;
- estado de sincronización.
Persistir:
- identidad;
- pairing;
- configuración;
- comandas activas;
- historial reciente;
- eventos;
- sync state.
Persistir:
- identidad;
- pairing;
- configuración;
- assets;
- preferencias.
No necesita conservar historial financiero completo.
Toda operación que deba sincronizarse debe persistirse primero.
Ejemplo:
```
Sale
 ↓
Local DB Transaction
 ↓
Outbox Event
 ↓
Commit
 ↓
Async Sync
```
No crear una venta únicamente en memoria esperando que Internet funcione.
Los receptores de eventos deben poder reconocer IDs ya procesados.
Especialmente:
- backend sync;
- KDS;
- inventory events;
- payment webhooks futuros.
Generar IDs globalmente únicos desde el origen.
Preferir UUID o estrategia equivalente.
No utilizar IDs temporales que luego deban reemplazarse.
Operaciones críticas deben tener idempotency keys.
Especialmente:
- completar venta;
- pagos;
- devoluciones;
- sincronización;
- kitchen events;
- fiscal.
No prometer entrega física “exactly once” en una red distribuida.
Utilizar:
at-least-once delivery + idempotencia
para lograr un efecto lógico único.
Cada operación pendiente debe registrar:
- operationId;
- type;
- entityId;
- createdAt;
- attempts;
- lastError;
- status.
Ejemplo:
- PENDING
- PROCESSING
- SYNCED
- RETRY
- FAILED
- CONFLICT
Utilizar exponential backoff + jitter.
No realizar loops agresivos.
Diferenciar.
Ejemplo:
HTTP 500:
posiblemente retry.
HTTP 400:
corregir payload/configuración; no retry infinito.
Si se sincronizan 10 operaciones y 8 funcionan:
no volver a enviar eternamente las 8 correctas.
Procesar estados individualmente.
Respetar dependencias entre entidades.
Ejemplo:
Customer creado offline
↓
Sale asociada.
Los IDs globales deben permitir resolver correctamente la relación.
Además de createdAt del dispositivo guardar:
serverReceivedAt
cuando corresponda.
Una venta puede registrar:
createdOffline = true
para diagnóstico.
No tratarla automáticamente como menos válida.
Mostrar discretamente:
No mostrar detalles técnicos al cajero salvo problema.
Configuración/Diagnóstico puede mostrar:
- operación;
- intentos;
- error;
- última sincronización.
Agregar acción administrativa:
Sincronizar ahora
No debe borrar información.
Distinguir:
de:
Si WAN está caída pero router/LAN continúa:
POS ↔ KDS/CDS/printers locales deben continuar cuando la arquitectura/hardware lo permita.
Si el router deja de funcionar:
la comunicación LAN puede perderse.
POS puede continuar únicamente con capacidades locales del propio dispositivo.
Documentar claramente esta diferencia.
Sin servidor local/edge, dos POS completamente offline no pueden garantizar conocimiento instantáneo mutuo de:
- stock;
- secuencias centrales;
- cambios de permisos;
- tickets compartidos.
No ocultar esta limitación.
Diseñar para reconciliación segura.
Preparar posibilidad futura:
```
Cloud
  │
WTF Edge
  │
 ├── POS
 ├── POS
 ├── KDS
 └── CDS
```
No es requisito de v1.
Completar una venta local debe ser atómico.
Conceptualmente:
```
BEGIN
  Validate Order
  Create Sale
  Create SaleLines
  Create Payments
  Create Receipt Snapshot
  Create Inventory Events
  Create Outbox Events
  Mark Order Completed
COMMIT
```
Si falla:
ROLLBACK.
No ejecutar side effects no transaccionales dentro del commit principal cuando puedan bloquearlo.
Después del commit:
- impresión;
- email;
- cloud sync;
- analytics;
pueden procesarse de forma independiente.
Pagos externos requieren tratamiento especial.
Persistir primero:
PaymentAttempt
Después llamar al provider.
Estados:
- CREATED
- PROCESSING
- SUCCEEDED
- FAILED
- UNKNOWN
Conceptualmente:
```
PaymentAttempt
      ↓
Provider
  ┌───┼────┐
  ▼   ▼    ▼
 OK  FAIL UNKNOWN
 │          │
 ▼          ▼
Finalize  Reconcile
```
No volver a cobrar automáticamente cuando el estado sea UNKNOWN.
Crear proceso para consultar pagos pendientes/desconocidos.
Dashboard debe mostrar incidencias de pago que requieren revisión.
Puede completarse localmente sin proveedor externo.
Utilizar ledger.
Crear:
InventoryMovement
Tipos iniciales:
- OPENING_BALANCE
- PURCHASE
- SALE
- RETURN
- WASTE
- ADJUSTMENT
- TRANSFER_IN
- TRANSFER_OUT
Stock actual puede calcularse:
```
SUM(InventoryMovement.quantity)
```
Puede mantenerse snapshot optimizado, pero debe poder reconciliarse con el ledger.
El mismo evento de venta no puede descontar inventario dos veces.
Guardar referencia:
- saleId;
- eventId.
Unique constraint cuando corresponda.
No asumir que producto vendido = ingrediente.
Ejemplo:
WTF Burger:
- carne;
- pan;
- queso;
- salsa.
Preparar arquitectura para recetas/BOM.
Puede ser fase posterior si el inventario actual todavía no trabaja con recetas.
Pero el modelo no debe impedir agregarlas.
Para Tickets Abiertos enviados a cocina puede existir concepto de:
ReservedStock
o equivalente.
No descontar dos veces al cobrar.
Cada artículo inventariable puede tener:
minimumStock
Cuando:
stock <= minimumStock
generar alerta según configuración.
Permitir:
- Dashboard;
- email futuro/configurable.
Preferir resumen diario para múltiples artículos.
Configurable:
No advertir.
Advertir pero permitir.
Impedir sin autorización.
El POS offline utiliza último stock conocido.
Reconocer que puede quedar desactualizado frente a otras cajas offline.
Después sincronizar:
no borrar una venta válida porque haya producido stock negativo.
Generar alerta/reconciliación.
Separar:
stock
de:
availableForSale.
Un producto puede tener inventario y estar manualmente:
Agotado
por razones operacionales.
Usuario autorizado puede:
Marcar como agotado
por sucursal.
Marcar disponible
Registrar auditoría.
Centralizar reglas de destino.
Entrada:
- producto;
- categoría;
- overrides;
- sucursal.
Salida:
- estaciones/destinos.
Una venta puede generar múltiples:
KitchenOrder
según estación.
Crear eventos como:
- CREATED
- ITEM_ADDED
- ITEM_CHANGED
- ITEM_VOIDED
- PRIORITY_CHANGED
- READY
- DISPATCHED
- RESTORED
No es obligatorio implementar Event Sourcing completo para todo el POS.
Mensajes realtime deben incluir:
- protocolVersion;
- messageId;
- messageType;
- senderDeviceId;
- sentAt;
- payload.
KDS responde:
- ACCEPTED
- DUPLICATE
- REJECTED
- UNSUPPORTED_VERSION
El ACK debe enviarse después de persistir durablemente el evento cuando corresponda.
Utilizar backoff.
Al reconectar:
- handshake;
- versiones;
- replay/snapshot;
- dedup.
No depender únicamente de timestamps.
Utilizar:
- revision;
- sequence;
- event IDs.
Escenario:
CANCEL llega antes que CREATE.
El protocolo debe poder manejarlo mediante:
- sequence;
- buffering;
- replay;
- snapshot.
Probar:
- cancelar vs ready;
- modificar vs dispatch;
- restore vs server update.
No sobrescribir silenciosamente estados incompatibles.
Permitir:
Nueva → Despachar.
Opcional:
Nueva → Preparando → Lista → Despachada.
Configurable por estación.
Permitir marcar prioridad con permiso.
Mostrar indicador visual.
Nueva comanda puede emitir sonido configurable.
No modificar volumen global arbitrariamente.
Optimizar para tablet dedicada.
Configuración protegida mediante PIN/gesto administrativo.
Mantener pantalla activa durante operación cuando la configuración/dispositivo lo permita.
Al reiniciar:
recuperar comandas activas desde almacenamiento.
Cronómetros deben calcularse usando timestamps.
No reiniciarlos en cero.
CDS recibe snapshots/deltas de una DisplaySession.
Nunca obtiene acceso general a ventas.
Campos:
- displaySessionId;
- posDeviceId;
- orderId opcional;
- state;
- items;
- totals;
- updatedAt.
Cuando reconecta:
solicitar snapshot actual.
No intentar reconstruir toda la orden únicamente a partir de eventos perdidos.
Si pierde conexión durante una venta:
no mostrar indefinidamente un total antiguo como definitivo.
Mostrar estado discreto/reconectar.
Cuando no hay venta:
mostrar branding WTF.
Preparar opcionalmente:
- promociones;
- imágenes;
- QR;
sin afectar el flujo transaccional.
Contenido promocional puede administrarse desde Dashboard en una fase posterior.
Debe detenerse/ocultarse cuando comience una venta.
Debe ser el elemento monetario más destacado.
Obligatorio:
```
POS Total
=
CDS Total
=
Receipt Total
=
Payment Total
=
Dashboard Transaction Total
```
Nunca permitir discrepancias por cálculos independientes.
Una SaleLine debe guardar información suficiente para conservar:
- nombre;
- precio;
- categoría;
- modificadores;
- impuestos;
- descuentos.
Cambiar catálogo mañana no cambia ayer.
Guardar nombre/tipo usado.
Conservar referencia + información histórica necesaria.
Conservar datos fiscales relevantes cuando corresponda.
Guardar:
- nombre;
- rate;
- base;
- amount;
- incluido/adicional.
Guardar datos necesarios para reproducir el recibo histórico.
Después de COMPLETED:
no editar directamente:
- totales;
- líneas;
- pagos.
Utilizar:
- refund;
- void;
- adjustment;
según corresponda.
Crear flujo separado.
Permitir:
- total;
- parcial;
- artículos específicos.
No permitir devolver más de lo vendido/devolvible.
Preguntar/configurar si el artículo vuelve a inventario.
No asumir siempre.
Diferenciar de devolución.
Una venta completada no debe simplemente convertirse en borrada.
Registrar:
- motivo;
- usuario;
- autorización;
- fecha.
Descuento 100% o mecanismo equivalente debe quedar auditado.
No ocultar el valor original.
Registrar aperturas sin venta cuando hardware lo permita.
Permiso específico.
Normalmente controlado mediante impresora ESC/POS.
Configurar:
- auto-open on cash;
- manual open permission;
- pulse settings cuando sean necesarios.
Crear AuditLog append-only.
Campos mínimos:
- organizationId;
- branchId;
- userId;
- deviceId;
- action;


Continúo exactamente desde el 229 del mismo Prompt Maestro consolidado.
:

Crear AuditLog append-only.
Campos mínimos:
- organizationId;
- branchId;
- userId;
- deviceId;
- action;
- entityType;
- entityId;
- timestamp;
- reason cuando corresponda;
- before/after o diff sanitizado cuando sea apropiado;
- correlationId.
La auditoría no debe depender únicamente de logs técnicos.
Como mínimo:
- login/logout relevante;
- intentos fallidos significativos;
- apertura/cierre de turno;
- movimientos manuales de caja;
- descuentos restringidos;
- cambios manuales de precio;
- anulaciones;
- devoluciones;
- reimpresiones;
- cambios de impuestos;
- cambios de secuencias fiscales;
- cambios de roles/permisos;
- alta/baja de empleados;
- autorización/revocación de dispositivos;
- cambios críticos de configuración;
- restauración de comandas KDS.
No registrar cada toque normal de pantalla.
No permitir edición desde Dashboard.
Si existe una corrección:
crear un nuevo evento.
Acceso a auditoría debe tener permiso específico.
Exportar auditoría puede requerir permiso adicional.
Separar:
de:
Un dispositivo autorizado no significa que cualquier persona pueda vender.
El Dashboard administrativo debe utilizar credenciales más fuertes que el PIN rápido de caja.
Preferir:
- email/usuario;
- contraseña segura;
- sesiones seguras;
- MFA futuro/recomendado.
El POS puede utilizar:
- selección de empleado;
- PIN;
- biometría según dispositivo/política.
No reutilizar el PIN de caja como contraseña administrativa.
Utilizar algoritmo moderno apropiado como:
- Argon2id;
- bcrypt;
- scrypt;
según stack.
Nunca almacenar contraseñas en texto plano.
Para web:
- cookies HttpOnly/Secure/SameSite cuando corresponda;
- expiración;
- revocación;
- protección CSRF cuando aplique.
No guardar secretos de larga duración de forma insegura.
Permitir:
- cerrar una sesión;
- cerrar todas;
- revocar dispositivo.
Si permisos cambian:
actualizar/invalidate la sesión de forma razonable.
No permitir privilegios antiguos indefinidamente.
Un empleado solo puede operar en sucursales autorizadas.
Todas las consultas deben estar scoped correctamente.
Un usuario de otra organización no puede acceder cambiando IDs/URLs.
Crear pruebas específicas de tenant escape.
Validar autorización sobre cada objeto.
Especialmente:
- recibos;
- clientes;
- empleados;
- ventas;
- exports;
- dispositivos;
- reportes.
UUID no sustituye autorización.
Validar server-side:
- IDs;
- enums;
- cantidades;
- dinero;
- fechas;
- archivos;
- strings;
- permisos.
No confiar en frontend/APK.
Aceptar únicamente campos permitidos por endpoint.
Un payload no puede convertirse a sí mismo en administrador.
Backend debe rechazar/recalcular intentos como:
```
Price configured: RD$500
Client payload: RD$5
```
No aceptar que un cliente manipulado envíe impuestos arbitrarios.
No aceptar descuentos fuera de permisos.
No aceptar una venta de RD$1,000 como pagada con RD$100.
Utilizar queries parametrizadas/ORM seguro.
Nunca concatenar input.
Sanitizar/escapar:
- productos;
- comentarios;
- clientes;
- configuraciones.
Especialmente en WTF Dashboard.
Configurar únicamente orígenes autorizados.
Dashboard production debe utilizar controles apropiados:
- HSTS;
- CSP;
- X-Content-Type-Options;
- Referrer-Policy;
- frame protection.
Aplicar especialmente a:
- login;
- PIN;
- pairing;
- password reset;
- endpoints sensibles.
Los límites de sync deben ser compatibles con operación normal.
Nunca guardar en repositorio:
- passwords;
- API keys;
- private keys;
- keystores;
- client secrets;
- certificados privados.
Crear:
.env.example
sin valores reales.
Todo lo enviado al navegador debe considerarse público.
No poner secretos en variables frontend.
No hardcodear secretos permanentes en APK.
Asumir que una APK puede inspeccionarse.
Utilizar para proteger claves/tokens locales cuando corresponda.
Proteger información local mediante mecanismos apropiados.
Si se utiliza cifrado de DB:
la clave no puede estar hardcodeada en la APK.
Nunca registrar:
- PIN;
- contraseña;
- access token;
- refresh token;
- CVV;
- número completo de tarjeta;
- secrets.
Minimizar PII en logs.
Mantener WTF POS fuera del manejo directo de datos sensibles de tarjeta cuando sea posible.
Preferir terminal/proveedor certificado.
La cámara de barcode nunca debe utilizarse para capturar tarjetas.
Para importaciones/imágenes:
- límite de tamaño;
- MIME;
- extensión;
- nombre sanitizado;
- almacenamiento seguro.
No ejecutar archivos cargados.
Al exportar CSV proteger celdas potencialmente interpretables como fórmulas maliciosas.
Eliminar EXIF innecesario, especialmente ubicación, cuando se procesen imágenes de productos.
Revisar permisos.
Solicitar únicamente los necesarios.
No exportar Activities/Services/Receivers innecesariamente.
Cloud production debe utilizar HTTPS/TLS.
No desactivar validación TLS para “hacerlo funcionar”.
Si la comunicación LAN requiere una excepción técnica:
limitarla estrictamente.
Preferir autenticación/cifrado apropiado.
No habilitar cleartext global para todo Internet.
Asumir que un dispositivo extraño puede conectarse al mismo Wi-Fi.
Por eso:
discovery ≠ trust.
Pairing sigue siendo obligatorio.
Mensajes críticos deben incluir:
- messageId;
- nonce/sequence cuando corresponda;
- timestamp/expiración;
- autenticación.
Un mensaje capturado no debe poder reutilizarse indefinidamente.
Comandos como:
- lock;
- revoke;
- sync;
- config update;
deben tener:
- commandId;
- targetDeviceId;
- issuedAt;
- expiresAt;
- autenticación.
Dispositivo responde:
- RECEIVED
- APPLIED
- FAILED
Prohibido dejar:
- master PIN;
- contraseña universal;
- hidden admin account;
- universal token;
- debug endpoint productivo.
Solo dev/staging.
No producción.
Clasificar:
branding.
catálogo/configuración.
ventas/clientes.
password hashes/tokens/keys.
Aplicar controles adecuados.
Crear:
PRIVACY_DATA_MAP.md
Documentar:
- qué datos;
- dónde;
- para qué;
- qué dispositivo recibe qué subset.
WTF CDS debe recibir únicamente información necesaria para mostrar la compra.
KDS recibe información operacional de cocina.
No enviar datos financieros/PII innecesarios.
No mostrar RNC/teléfono completo en pantallas públicas salvo necesidad explícita.
Definir política de retención según requisitos empresariales, contables y legales aplicables.
No inventar períodos legales.
Preparar procedimiento para anonimizar PII cuando sea legalmente apropiado sin destruir documentos fiscales que deban conservarse.
Configurar backups del backend/DB antes de producción.
Deben protegerse y restringirse.
Un backup no se considera validado hasta haber probado restauración en ambiente seguro.
Crear:
DISASTER_RECOVERY.md
Cubrir:
- DB perdida;
- servidor caído;
- dispositivo perdido;
- credencial comprometida;
- corrupción;
- cloud outage.
Crear:
BUSINESS_CONTINUITY.md
Cubrir:
Un fallo de CDS no debe impedir cobrar.
Un fallo de impresora no debe borrar venta.
Un fallo temporal de cloud no debe detener innecesariamente ventas locales.
Un fallo de KDS debe activar fallback/alerta.
Si una operación crítica no puede realizarse de manera segura:
bloquear esa operación específica y explicar.
No corromper datos para continuar.
Crear catálogo de errores.
Categorías:
- validation;
- authentication;
- authorization;
- conflict;
- unavailable;
- timeout;
- unknown;
- internal.
Prefijos sugeridos:
- POS-
- PAY-
- KDS-
- CDS-
- PRN-
- SYNC-
- INV-
- FISC-
- AUTH-
Separar mensaje humano del detalle técnico.
Ejemplo:
Pantalla de cocina desconectada. Intentando reconectar.
KDS-CONNECTION-TIMEOUT
Nunca mostrar:
Cobrado
si el estado del pago es desconocido.
Nunca mostrar:
Sincronizado
si la operación sigue pendiente.
Nunca mostrar:
Impreso
si solo se creó el print job.
Modelar estados desconocidos/pending confirmation donde sean necesarios.
Backend debe utilizar structured logging.
Incluir cuando corresponda:
- requestId;
- correlationId;
- organizationId;
- branchId;
- deviceId;
- saleId;
- paymentId;
- orderId.
Sin secretos.
- DEBUG
- INFO
- WARN
- ERROR
- FATAL cuando aplique.
No registrar cada interacción UI.
Preparar:
- API latency;
- error rate;
- DB latency;
- queue backlog;
- sync backlog;
- KDS delivery latency;
- print failures.
Ejemplos:
- API caída;
- DB inaccesible;
- backup fallido;
- cola crítica;
- tasa de errores alta.
Evitar alert fatigue.
POS/KDS/CDS deben poder reportar crashes sanitizados cuando haya Internet.
Si ocurre offline:
guardar información técnica mínima y subir después.
Crear:
Configuración → Diagnóstico.
Mostrar:
```
Local Database       ✓
Cloud API            ✓
Sync Queue            ✓
KDS Cocina            ✓
CDS Caja              ✓
Receipt Printer       ✓
Kitchen Printer       ⚠
Storage               ✓
```
Adaptar a componentes reales.
Permitir exportar/copy diagnostic report sanitizado.
No incluir:
- clientes completos;
- passwords;
- tokens;
- PIN.
Dashboard puede mostrar:
- versión;
- last seen;
- conexión;
- configuración;
- almacenamiento aproximado;
- batería opcional.
No convertir telemetría en invasiva.
Si el dispositivo tiene poco espacio:
primero limpiar:
- cache;
- assets;
- logs antiguos.
Nunca borrar ventas pendientes para liberar espacio.
Si no hay espacio suficiente para persistir una nueva venta:
bloquear nuevas transacciones y mostrar:
El dispositivo no tiene espacio suficiente para guardar nuevas ventas de forma segura.
El sistema debe sobrevivir a Android matando el proceso.
No depender de ViewModel para conservar una venta.
Persistir draft/carrito cuando sea necesario para recuperación.
Después de reiniciar:
- turno;
- tickets;
- sync;
- print jobs;
- comandas KDS;
deben recuperarse según corresponda.
No borrar automáticamente DB ante cualquier error.
Intentar:
- diagnosticar;
- backup;
- recuperar;
- informar.
Todas las actualizaciones de esquema deben tener migrations.
Probar:
- instalación limpia;
- upgrade.
Bloquear si es inseguro.
No borrar DB silenciosamente.
Versionadas.
Antes de deploy:
- backup/checkpoint;
- migration;
- verify;
- deploy compatible code.
Cuando sea necesario:
1. agregar campo compatible;
2. desplegar;
3. backfill;
4. retirar legacy posteriormente.
Utilizar:
- PK;
- FK;
- UNIQUE;
- CHECK;
- NOT NULL;
según corresponda.
La aplicación no debe ser la única barrera de integridad.
Crear para consultas frecuentes:
- barcode;
- receipt;
- sale;
- businessDate;
- branch;
- customer;
- open tickets;
- sync;
- device;
- audit.
Basados en uso real.
Utilizar para operaciones críticas.
Probar:
- dos cajas;
- mismo ticket;
- secuencias;
- stock;
- pagos.
Para tickets/configuración mutable considerar:
version
Si dos clientes modifican la misma entidad:
detectar conflicto.
Dos empleados no pueden cobrar simultáneamente el mismo ticket.
Si dos cajas abren el mismo ticket:
definir política.
Como mínimo:
- versionado;
- advertencia;
- prevención de overwrite silencioso.
Obligatorio proteger.
API debe utilizar un formato exacto.
Ejemplo:
- minor units integer + currency;
o
- decimal string.
No JSON float ambiguo.
Utilizar ISO 8601.
Timestamps absolutos consistentes.
BusinessDate separado.
Default inicial WTF:
DOP / RD$.
Pero configurable.
Ejemplo:
RD$1,250.00
No almacenar el símbolo junto al valor.
Textos visibles deben estar en resources/i18n.
Idiomas iniciales:
- Español
- Inglés
No hardcodear strings UI dentro de lógica.
Crear:
GLOSSARY.md
Diferenciar:
Shift.
Número del pedido.
Orden guardada.
Documento de venta.
Orden de producción.
Crear componentes consistentes:
- Button;
- Card;
- Dialog;
- Input;
- Select;
- Switch;
- Badge;
- Table;
- MoneyDisplay;
- EmptyState;
- ErrorState.
Optimizar para táctil.
Botones críticos grandes:
- Cobrar
- Guardar
- Despachar
No depender únicamente del color.
Ejemplo KDS:
además de rojo:
RETRASADO — 30 MIN
Si el sistema solicita reducir movimiento:
el estado crítico debe seguir visible sin depender del parpadeo.
Probar Android font scaling.
WTF Dashboard:
- móvil;
- tablet;
- desktop.
WTF POS:
- móvil;
- tablet;
- PC según variante.
KDS:
landscape prioritario.
CDS:
ambas orientaciones.
Operaciones locales frecuentes deben sentirse inmediatas:
- categorías;
- productos;
- carrito;
- modificadores.
No consultar cloud para cada toque.
Debe funcionar rápidamente

Correcto. El 333 quedó incompleto porque terminó en “Debe funcionar rápidamente…” y yo pasé al 334. Para evitar alterar la consolidación, no voy a renumerar ni rehacer lo anterior. Considera el 334 en adelante como válido; simplemente completamos el 333 con este texto y después seguimos desde donde íbamos.

La búsqueda de artículos en WTF POS debe funcionar rápidamente sobre el catálogo local y no depender de Internet para cada búsqueda.
Debe permitir localizar artículos por:
- nombre;
- nombre corto;
- SKU;
- código interno;
- código de barras.
La búsqueda debe:
- ignorar diferencias entre mayúsculas y minúsculas;
- manejar correctamente acentos y caracteres en español;
- ignorar espacios accidentales al inicio/final;
- utilizar índices apropiados;
- responder fluidamente incluso con catálogos grandes;
- funcionar offline con el último catálogo sincronizado.
Implementar búsqueda incremental/debounced cuando corresponda.
Ejemplo:
```
w
wt
wtf
wtf b
wtf bu
wtf burger
```
Los resultados deben actualizarse sin bloquear la interfaz.
No ejecutar una consulta cloud por cada carácter.
Orden recomendado:
1. código de barras exacto;
2. SKU exacto;
3. nombre exacto;
4. nombre que comienza con el texto;
5. coincidencia parcial.
Cuando la entrada provenga de un scanner y exista coincidencia exacta:
agregar o seleccionar inmediatamente el producto según el contexto configurado.
Si el producto requiere modificadores obligatorios:
abrir primero el selector de modificadores.
Mostrar:
No se encontró ningún artículo.
Si el valor proviene de un código de barras:
No existe ningún artículo asociado a este código de barras.
No crear productos automáticamente.
No deben aparecer en búsqueda normal de ventas.
Pueden aparecer identificados como:
Agotado
pero no deben poder agregarse cuando la política lo impida.
Aplicar la misma lógica de disponibilidad por sucursal.
No mostrar artículos que no estén disponibles/configurados para la sucursal actual.
La búsqueda debe realizarse prioritariamente sobre la base local del POS mediante índices adecuados.
No descargar el catálogo completo nuevamente para cada búsqueda.
Botón:
X / Limpiar
debe restaurar inmediatamente la categoría/listado anterior.
En PC:
- Enter puede seleccionar el resultado destacado;
- Escape puede limpiar/cerrar la búsqueda cuando sea apropiado.
Debe poder diferenciar razonablemente una entrada rápida de scanner de escritura humana cuando la implementación lo requiera.
La búsqueda mediante cámara debe utilizar el mismo servicio de resolución de códigos de barras que los scanners externos.
No implementar tres lógicas diferentes para:
- cámara;
- scanner USB;
- entrada manual.
Todos deben terminar resolviendo el mismo:
BarcodeLookupService
o abstracción equivalente.
Si un producto nuevo fue creado en WTF Dashboard pero el POS todavía no lo ha sincronizado:
no inventar el producto.
Después de sincronizar:
debe aparecer normalmente.
Probar:
- búsqueda por nombre;
- búsqueda parcial;
- mayúsculas/minúsculas;
- acentos;
- SKU;
- barcode;
- barcode inexistente;
- producto archivado;
- producto agotado;
- producto con modificadores;
- catálogo offline;
- catálogo grande;
- scanner HID;
- cámara cuando esté disponible.
La búsqueda debe continuar siendo fluida y no debe bloquear el hilo principal de la interfaz.
Con eso el 333 queda completo y no necesitamos tocar la numeración posterior. El siguiente bloque continúa donde realmente nos quedamos: punto 439 — FUTURE.


Sí, tienes razón. En el consolidado anterior retomé desde el número correcto de cada corte, pero al presentarlo como bloques separados puede dar la impresión de que la numeración se reinicia o se superpone. Para evitar cualquier confusión, desde ahora mantengo una única secuencia correlativa estricta. El último punto fue 333, así que continúo en 334 y no repetiré ningún número.
:

La búsqueda de artículos debe ser rápida y funcionar prioritariamente sobre la base local del POS.
Buscar por:
- nombre;
- nombre corto;
- SKU;
- código de barras.
Normalizar cuando corresponda:
- mayúsculas/minúsculas;
- espacios;
- acentos.
Código de barras debe tener búsqueda exacta/indexada.
El POS debe seguir siendo fluido con miles de artículos.
Utilizar:
- índices;
- paginación/virtualización;
- caché;
- imágenes optimizadas.
No renderizar innecesariamente miles de componentes simultáneamente.
Optimizar:
- resolución;
- tamaño;
- compresión;
- cache.
Si una imagen falla:
el producto continúa vendiéndose.
Mostrar placeholder.
Las imágenes ya descargadas pueden mantenerse localmente.
No permitir que el cache de imágenes consuma almacenamiento sin límite.
Aplicar estrategia de eviction.
WTF POS debe iniciar rápidamente.
No cargar:
- reportes;
- históricos completos;
- assets administrativos;
antes de mostrar la interfaz operacional.
No crear un timer pesado independiente por cada tarjeta.
Utilizar un ticker compartido o estrategia eficiente.
Revisar especialmente:
- WebSockets;
- timers;
- cámara;
- Bluetooth;
- observers;
- Compose effects;
- coroutines.
Liberar recursos según lifecycle.
Al cerrar scanner:
liberar cámara.
Conexiones realtime deben respetar lifecycle sin perder operaciones persistidas.
Antes de producción ejecutar pruebas prolongadas de POS/KDS cuando sea posible.
Objetivo:
detectar:
- memory leaks;
- degradación;
- reconexiones;
- crecimiento de DB;
- CPU excesiva.
Medir:
- latencia;
- consultas lentas;
- errores.
No optimizar a ciegas.
Evitar en Dashboard/reportes.
Una exportación anual pesada no debe degradar significativamente las ventas.
Cuando sea necesario:
- jobs;
- agregados;
- workers.
Puede utilizarse para:
- catálogo;
- configuración;
- imágenes.
No convertir cache en fuente de verdad financiera.
Opcional.
Utilizar solo si resuelve una necesidad concreta.
No es requisito para v1.
No almacenar estado crítico únicamente en memoria de una instancia.
Preparar backend para múltiples instancias cuando sea necesario.
Si existen varias instancias backend y WebSockets cloud:
utilizar mecanismo apropiado de pub/sub/backplane.
No afecta la comunicación LAN local.
Versionar contratos.
Ejemplo:
/api/v1/
No romper clientes instalados sin estrategia.
Generar documentación OpenAPI cuando el stack lo permita.
Utilizarla para:
- contratos;
- clientes tipados;
- tests.
Los tipos TypeScript/Kotlin de compilación no sustituyen validación runtime de input externo.
Definir formato consistente:
```
{
  code,
  message,
  details?,
  correlationId
}
```
No enviar stack traces al cliente en producción.
Listados grandes:
- ventas;
- recibos;
- clientes;
- auditoría;
deben paginarse.
Cursor pagination puede utilizarse cuando sea apropiado.
Paginación debe tener orden determinista.
Ejemplo:
createdAt DESC, id DESC
Búsquedas Dashboard:
- artículos;
- clientes;
- empleados;
- recibos;
- dispositivos.
Indexar según uso.
Agregar búsqueda de configuraciones cuando el volumen lo justifique.
Ejemplo:
buscar:
IP
puede llevar a:
- Dispositivos;
- KDS;
- Impresoras.
Las opciones originales que mencionaban “Learn more” deben tener:
Más información
con ayuda real.
No enlaces rotos.
Configuraciones complejas deben tener explicación breve.
Ejemplo:
Impuesto incluido
“El precio ingresado ya contiene este impuesto. WTF POS calculará automáticamente la base y el impuesto incluido.”
“Permite guardar y editar órdenes antes de completar el pago.”
“Envía los artículos correspondientes a una impresora o WTF KDS según su configuración de cocina.”
“Muestra al cliente los artículos y totales de la venta actual.”
“Advierte o bloquea cuando la cantidad solicitada supera el inventario disponible.”
Agrupar configuración.
- apariencia;
- idioma;
- scanner.
- modalidades;
- tickets;
- pagos;
- descuentos.
- impuestos;
- comprobantes;
- secuencias.
- impresoras;
- KDS;
- CDS.
- sucursales;
- dispositivos;
- empleados/permisos.
En Dashboard:
Configuración > Cocina > KDS Cocina
Cada página administrativa debe tener una acción principal clara.
Ejemplo:
Agregar empleado
Separarlas visualmente.
No utilizar únicamente:
“¿Está seguro?”
Utilizar:
¿Archivar “WTF Burger”? Dejará de aparecer en nuevas ventas, pero conservará su historial.
Preferir archivar entidades con historial.
Ejemplos:
Agrega artículos para comenzar una venta.
No hay órdenes guardadas.
Sin comandas pendientes — Cocina al día ✓
No hay ventas para el período seleccionado.
No mostrar “Sin ventas” mientras todavía se consulta.
No mostrar una lista vacía cuando en realidad falló el servidor.
Mostrar discretamente:
Sin Internet — trabajando offline
No bloquear operación compatible.
Reconectando...
Las comandas activas permanecen.
Mostrar branding/estado discreto.
No mostrar indefinidamente una venta obsoleta.
Como Web.App administrativa puede requerir cloud.
Mostrar error claro.
No fingir que está actualizado.
Crear:
HARDWARE_SETUP.md
Incluir:
- POS;
- KDS;
- CDS;
- receipt printer;
- kitchen printer;
- cash drawer;
- router/switch.
```
Internet
   │
Router / Switch
   │
   ├── WTF POS
   ├── WTF KDS
   ├── WTF CDS
   ├── Receipt Printer
   └── Kitchen Printer
```
Para dispositivos fijos:
preferir conexión estable.
Impresoras Ethernet pueden utilizar DHCP reservation.
KDS/CDS pueden utilizar Wi-Fi estable o Ethernet cuando el hardware lo permita.
Para IP estable:
recomendar reservar la IP desde el router.
No exigir configurar una IP estática manual dentro de Android si no es necesario.
Documentar que redes Guest/AP Isolation pueden impedir POS ↔ KDS/CDS.
Documentar los puertos utilizados por:
- KDS;
- CDS;
- backend local si existe;
- printers.
No hardcodear valores sin documentación.
Para KDS/CDS:
botón:
Probar conexión
Debe verificar:
1. endpoint;
2. autenticación;
3. protocol version;
4. mensaje de prueba.
Una prueba KDS debe marcarse claramente:
No contabilizarla como venta.
Permitir enviar una pantalla de prueba.
Debe indicar:
IMPRESIÓN DE PRUEBA
No generar venta.
Campos posibles:
- Nombre
- Tipo
- Conexión
- IP
- Puerto
- Papel
- Auto cut
- Cash drawer
- Copias
- Estado
Mostrar únicamente campos aplicables.
No asumir que todas soportan:
- cutter;
- drawer;
- QR;
- imágenes.
Crear capabilities por adapter/modelo.
Permitir configurar impresora secundaria cuando sea necesario.
Si primaria falla:
intentar fallback según política.
Registrar ambos intentos.
Si KDS falla y existe impresora de cocina de respaldo:
puede enviarse allí según configuración.
No enviar simultáneamente a primaria y backup salvo que esté explícitamente configurado.
Crear:
SUPPORTED_HARDWARE.md
Listar solamente hardware realmente probado.
Utilizar:
- versionName;
- versionCode;
- buildType;
- protocolVersion.
Ejemplo:
1.0.0
Release:
```
WTF-POS-v1.0.0-release.apk
WTF-KDS-v1.0.0-release.apk
WTF-CDS-v1.0.0-release.apk
```
No entregar simplemente app-release.apk.
Production APKs correctamente firmadas.
No incluir keystore/private keys en repositorio.
Generar SHA-256.
Crear:
SHA256SUMS.txt
Crear:
RELEASE_MANIFEST.md
Incluir:
- app;
- versión;
- artifact;
- checksum;
- commit;
- protocol version;
- DB schema version.
Probar las tres APK desde instalación limpia.
Probar actualización sobre versión anterior.
No perder:
- configuración;
- pairing;
- ventas;
- tickets;
- turno;
- comandas.
Probar.
Probar.
No considerar una función Android terminada únicamente porque debug compile.
Probar release.
Si se utiliza:
probar release real.
Conservar mapping para diagnóstico.
Preferiblemente diferente a producción.
Mostrar indicador:
TEST/STAGING
Separar:
- Development
- Test
- Staging/Pilot
- Production
Cada uno con:
- DB;
- URLs;
- secrets;
- provider modes.
No copiar datos reales sin anonimización.
Fiscal/pagos externos:
sandbox separado de production.
Build production no debe apuntar accidentalmente a:
- localhost;
- staging API;
- sandbox provider.
WTF POS debe diseñarse con posibilidad de uso en PC.
Antes de elegir tecnología de PC, evaluar:
Ventajas:
- despliegue;
- actualizaciones.
Limitaciones:
- hardware;
- impresión;
- offline avanzado.
Ventajas:
- hardware;
- filesystem;
- integración local.
Seleccionar según requerimientos reales.
Si se implementa cliente desktop nativo, priorizar inicialmente Windows.
Crear adapter apropiado.
No asumir que el mismo driver Android funciona idénticamente.
Soportar scanners HID/keyboard.
Preparar posibilidad de WTF CDS en segundo monitor.
No duplicar reglas.
PC debe utilizar los mismos contratos/reglas financieras.
Separar módulos conceptuales:
- Auth
- Organizations
- Branches
- Employees
- Catalog
- Pricing
- Taxes
- Orders
- Sales
- Payments
- Shifts
- Inventory
- Kitchen
- Devices
- Receipts
- Fiscal
- Reports
- Audit
No necesariamente microservicios.
Domain no debe depender directamente de:
- Android;
- PostgreSQL;
- Firebase;
- ESC/POS;
- proveedor fiscal.
Utilizar ports/adapters donde aporte valor.
Aplicar especialmente a:
- pagos;
- fiscal;
- printing;
- sync;
- kitchen routing.
No sobrearquitectar.
Cada patrón debe resolver un problema concreto.
Evitar duplicar reglas financieras y validaciones.
Pero no crear abstracciones genéricas incomprensibles.
PricingEngine y TaxEngine deben poder probarse sin Android/browser/database real.
Modelar explícitamente estados críticos.
DRAFT → OPEN → PAYMENT_PENDING → COMPLETED / VOIDED.
CREATED → PROCESSING → SUCCEEDED / FAILED / UNKNOWN / REFUNDED.
OPEN → CLOSING → CLOSED.
NEW → IN_PROGRESS → READY → DISPATCHED.
Adaptar según flujo real.
Rechazar:
- editar venta completed;
- refund > refundable;
- cash movement sobre shift cerrado;
- login employee archived;
- command from revoked device.
Puede utilizar eventos internos:
- SaleCompleted
- PaymentCompleted
- KitchenOrderCreated
- InventoryMovementCreated
No implementar Event Sourcing completo salvo necesidad.
Crear:
DATA_IMMUTABILITY.md
Definir:
- editable;
- archivable;
- append-only;
- immutable after completion.
Crear verificaciones para:
Puede ejecutar job que detecte inconsistencias.
No corregir automáticamente dinero.
Generar alerta.
Mostrar pagos:
- pending;
- unknown;
- failed;
- reconciled.
Solo con permiso y auditoría.
No crear botón casual:
Marcar pagado
sin evidencia/referencia.
Nunca editar directamente ventas para “cuadrar”.
Utilizar:
- refund;
- void;
- adjustment.
Un dataset conocido debe producir el mismo total en:
- transacciones;
- reportes;
- exports.
Debe poder explicarse cada orden que requirió cocina:
- enviada;
- recibida;
- despachada;
- cancelada.
Cada print job:
- printed;
- failed;
- pending.
No preguntar solamente:
¿Funciona?
También:
- ¿qué ocurre si falla?
- ¿qué ocurre si se repite?
- ¿qué ocurre simultáneamente?
- ¿qué ocurre sin Internet?
- ¿qué ocurre si la app se cierra?
Utilizar:
Muchos.
Servicios/DB.
Flujos críticos.
Dispositivos reales.
Clasificar:
- P0
- P1
- SECURITY
- OFFLINE
- HARDWARE
- FISCAL
- FUTURE
Incluye como mínimo:
- login;
- turnos;
- catálogo;
- pricing;
- taxes;
- open tickets;
- payments;
- receipts;
- KDS;
- CDS;
- persistence;
- idempotency;
- offline;
- security.
Incluye:
- reportes;
- clientes;
- empleados;
- inventario;
- import/export;
- multi-sucursal;
- auditoría avanzada.
Ejemplos


Continúo exactamente desde el 439 del Prompt Maestro consolidado, manteniendo la numeración correlativa.
:

Clasificar como funciones futuras aquellas que no sean necesarias para completar correctamente el alcance inicial.
Ejemplos:
- Loyalty avanzado;
- promociones avanzadas;
- combos;
- recetas/BOM avanzadas;
- integración directa con Uber Eats u otras plataformas;
- accounting integration;
- gift cards;
- store credit;
- cuentas por cobrar;
- pantalla pública de estado de pedidos;
- notificaciones SMS/WhatsApp;
- edge server;
- analítica predictiva.
Estas funciones deben influir razonablemente en la extensibilidad de la arquitectura, pero no deben convertirse automáticamente en requisitos de v1.
Una función futura no debe quedar parcialmente habilitada en producción.
Opciones válidas:
- completamente implementada;
- desactivada mediante feature flag;
- documentada en ROADMAP.md.
No dejar botones que conduzcan a pantallas falsas o sin funcionalidad.
Crear una suite automatizada:
critical-pos-safety
Debe verificar obligatoriamente:
1. no doble cobro;
2. no venta duplicada;
3. no pérdida de venta persistida;
4. no comanda perdida;
5. no comanda duplicada;
6. totales exactos;
7. inventario idempotente;
8. permisos reales;
9. reconciliación de caja;
10. recuperación offline.
Esta suite debe ejecutarse antes de cada release.
Probar doble toque/repetición rápida en:
- Guardar;
- Cobrar;
- Confirmar pago;
- Despachar;
- Restaurar;
- Reimprimir;
- Aplicar descuento;
- Cerrar turno;
- Devolver.
La UI puede bloquear temporalmente el botón, pero esto no sustituye la idempotencia en las capas transaccionales.
Prueba obligatoria:
1. POS envía una venta.
2. Backend la persiste.
3. La respuesta al POS se pierde.
4. POS recibe timeout.
5. POS reintenta.
Resultado obligatorio:
una sola venta.
El backend debe reconocer el mismo operationId/idempotencyKey.
Escenario crítico:
1. PaymentAttempt persistido.
2. Provider procesa el pago.
3. Respuesta se pierde.
4. POS no sabe si fue aprobado.
Resultado:
estado:
UNKNOWN/PENDING_CONFIRMATION
El sistema debe reconciliar antes de permitir otro intento que pudiera duplicar el cobro.
Prueba:
1. POS envía KitchenEvent.
2. KDS lo persiste.
3. ACK se pierde.
4. POS reenvía.
Resultado:
KDS detecta el messageId/eventId.
No crea otra comanda.
Devuelve ACK correspondiente.
Procesar dos veces el mismo saleId/eventId.
Resultado:
un solo efecto de inventario.
Una devolución repetida por timeout no puede devolver dinero ni inventario dos veces.
Dos requests para cerrar el mismo turno:
resultado:
un único cierre válido.
Crear carrito.
Cerrar proceso de WTF POS.
Reabrir.
El draft debe recuperarse según la política definida.
Una orden guardada debe continuar existiendo.
Si todavía no existe pago confirmado:
recuperar un estado seguro.
No marcar venta pagada por estar visualmente en la pantalla de cobro.
Si la transacción ya fue persistida:
al volver no debe ofrecer cobrar nuevamente como si no hubiese ocurrido.
La venta permanece.
El PrintJob continúa pendiente/reintentable.
El KitchenEvent permanece.
Puede reintentarse idempotentemente.
La Outbox persiste.
Repetir escenarios críticos después de reiniciar físicamente/emular reinicio del dispositivo cuando sea posible.
Alternar repetidamente:
Internet ON/OFF.
El sistema no debe:
- duplicar ventas;
- duplicar pagos;
- perder outbox;
- bloquear permanentemente sync.
Simular alta latencia.
La interfaz debe continuar respondiendo.
No ejecutar networking en UI thread.
Probar como mínimo:
Error de validación.
No retry infinito.
Renovar sesión/reautenticar.
Permiso denegado.
Conflicto.
Rate limit/backoff.
Retry cuando sea seguro.
Resolver según idempotencia/estado de la operación.
Una respuesta inválida del servidor no debe provocar corrupción ni crash no controlado.
POS/KDS/CDS deben detectar versiones incompatibles.
Mostrar:
Actualización requerida
cuando no exista compatibilidad segura.
Probar como mínimo:
- usuario no autenticado;
- empleado inactivo;
- PIN incorrecto;
- brute force PIN;
- dispositivo no autorizado;
- dispositivo revocado;
- usuario sin permiso;
- branch incorrecta;
- tenant incorrecto;
- IDOR;
- price tampering;
- tax tampering;
- discount tampering;
- payment tampering;
- replay de eventos;
- pairing code expirado;
- XSS;
- SQL injection;
- archivos inválidos.
Ocultar un botón no es suficiente.
Intentar llamar directamente el endpoint de una acción no autorizada.
Resultado:
403 / acción rechazada.
Usuario de organización A intenta acceder a recurso de organización B.
Debe fallar aunque conozca el ID.
Usuario limitado a sucursal A intenta consultar/modificar sucursal B.
Debe fallar.
Precio configurado:
RD$500.
Cliente modificado envía:
RD$5.
Backend debe detectar/rechazar/recalcular según contrato.
Venta:
RD$1,000.
Cliente intenta marcarla pagada con RD$100.
Debe fallar.
No permitir atribuir una acción a otro empleado simplemente enviando otro ID.
La identidad del actor debe derivarse de autenticación/contexto confiable.
Una laptop/dispositivo no emparejado intenta enviar una comanda.
KDS debe rechazarla.
Repetir mensaje válido capturado.
No duplicar.
Un comando administrativo expirado/repetido no debe ejecutarse nuevamente de forma insegura.
Buscar PIN en logs después de autenticación.
Resultado:
no debe aparecer.
Tokens no deben aparecer.
No deben aparecer datos de tarjeta restringidos.
Probar:
- archivo válido;
- columnas faltantes;
- tipos incorrectos;
- duplicados;
- archivo corrupto;
- archivo excesivamente grande;
- caracteres especiales;
- CSV potencialmente malicioso.
Debe producir preview/reporte claro.
Definir si importación funciona:
- por fila;
- por lote;
- mediante job.
Nunca dejar al usuario sin saber qué filas fueron importadas.
Registrar:
- usuario;
- archivo;
- fecha;
- total;
- aceptadas;
- rechazadas;
- errores.
Además de clientes, proporcionar importación de productos cuando sea posible.
Campos iniciales:
- SKU
- Name
- Category
- Price
- DeliveryAppPrice
- Barcode
- Tax
- Stock
- MinimumStock
Adaptar al esquema final.
Agregar:
Validar sin importar
para archivos importantes.
Dashboard puede permitir:
- cambiar precios;
- asignar categorías;
- asignar impuestos;
- marcar disponibilidad;
sobre varios artículos.
Mostrar preview antes de operaciones sensibles.
Registrar cambios masivos.
Crear venta.
Después modificar:
- nombre del producto;
- precio;
- categoría;
- impuesto;
- modificador;
- empleado;
- método de pago;
- sucursal.
El recibo histórico debe continuar representando la venta original.
Archivar:
- producto;
- empleado;
- método de pago;
- modificador.
El histórico continúa funcionando.
Probar:
- mismo producto con precio distinto;
- stock distinto;
- dispositivos separados;
- secuencias separadas;
- reportes filtrados.
Probar ventas:
- antes del cutoff;
- después de medianoche;
- antes del cutoff del día siguiente;
- después del cutoff.
Reportes deben asignarlas correctamente.
Probar:
- cambio de mes;
- cambio de año;
- 29 de febrero;
- turnos cruzando medianoche.
Si una zona utiliza DST, probar cambios correspondientes.
Crear un conjunto versionado de escenarios con resultados exactos.
Como mínimo:
1. venta simple;
2. Comer aquí;
3. Para llevar;
4. Delivery;
5. Apps Delivery con precio alternativo;
6. modificadores;
7. descuento;
8. pago dividido;
9. devolución parcial;
10. impuesto incluido;
11. impuesto adicional;
12. redondeo complejo.
No modificar el resultado esperado únicamente para conseguir que un test pase.
Si cambia una regla empresarial:
documentar el cambio y actualizar explícitamente el vector.
Probar:
- por línea;
- por impuesto;
- por factura;
según la estrategia seleccionada.
La estrategia debe estar documentada y ser consistente.
Ejemplo:
Total:
RD$999.99.
Dividir entre varios métodos.
La suma final debe ser exactamente RD$999.99.
Probar:
- recibido menor que total;
- exacto;
- mayor;
- cambio;
- valores grandes;
- input inválido.
Probar:
- total;
- parcial;
- múltiples devoluciones;
- límite;
- stock;
- turno;
- método.
Una configuración nueva no debe alterar silenciosamente una orden ya abierta.
Definir snapshot/version.
Si se desea recalcular:
acción explícita:
Actualizar precios/impuestos
con autorización cuando corresponda.
Mismo principio.
La línea existente puede conservarse.
El producto ya no debe poder agregarse nuevamente si está archivado/no disponible.
No modificar pagos ya registrados.
Para nuevos pagos:
aplicar configuración vigente según política.
Simular múltiples comandas simultáneas.
Verificar:
- legibilidad;
- timer;
- scroll/paging;
- memoria;
- CPU.
Simular catálogo grande y ventas consecutivas.
Simular múltiples cajas/sucursales.
Consultar rangos grandes sin degradar operaciones críticas.
Cuando sea posible ejecutar una jornada prolongada de prueba.
Especialmente:
- POS;
- KDS;
- conexiones realtime.
Simular:
1. apertura;
2. múltiples empleados;
3. ventas;
4. mesas;
5. takeout;
6. delivery;
7. Apps Delivery;
8. descuentos;
9. devoluciones;
10. KDS;
11. CDS;
12. printers;
13. Internet outage;
14. cierre.
Crear varias órdenes rápidamente.
Verificar que:
- POS siga fluido;
- KDS no pierda eventos;
- printers no dupliquen;
- CDS mantenga sesión correcta;
- backend procese correctamente.
Durante pruebas desconectar intencionalmente:
- WAN;
- KDS;
- CDS;
- printer;
- backend;
- router cuando corresponda.
Evaluar recuperación.
Verificar:
- PIN válido;
- PIN inválido;
- biometría;
- empleado inactivo;
- supervisor.
Verificar:
- abrir;
- fondo;
- entradas;
- salidas;
- efectivo;
- cierre;
- diferencia.
Verificar:
modalidad → producto → total → pago → recibo → nueva venta.
Producto con modificador obligatorio y extra de precio.
Verificar POS/KDS/receipt/CDS.
Abrir Mesa 1.
Agregar.
Guardar.
Salir.
Reabrir.
Modificar.
Cobrar.
Mesa queda disponible.
Nombre/turno.
Cocina.
Cobro.
Cliente + dirección + impuestos + cocina + pago.
Canal/plataforma + precio alternativo + impuestos + cocina + reporte.
Verificar:
- orden nueva;
- artículos;
- modificadores;
- comentarios;
- número;
- hora;
- timer;
- 10/20/30;
- despacho;
- historial;
- restore.
Verificar:
- idle;
- artículos;
- cantidades;
- precios;
- impuestos;
- total;
- modificaciones;
- compra completada;
- mensaje WTFLover;
- regreso a idle.
Verificar:
- recibo;
- cocina;
- 58/80 mm;
- caracteres;
- reprint;
- printer failure;
- retry.
Con POS ya provisionado:
1. desconectar WAN;
2. mantener LAN;
3. vender;
4. guardar;
5. KDS;
6. CDS;
7. imprimir;
8. cobrar mediante método offline soportado;
9. reiniciar app;
10. reconectar;
11. sincronizar;
12. confirmar cero duplicados.
Dos cajas simultáneas.
Verificar:
- ventas;
- KDS;
- CDS separados;
- turn numbers;
- sync;
- conflictos.
Seleccionar un día conocido.
Calcular manualmente un dataset pequeño.
Dashboard debe coincidir.
Archivo con:
- filas válidas;
- duplicados;
- errores.
Preview correcto.
Autorizar.
Usar.
Revocar.
Bloquear correctamente.
Cambiar configuración.
Publicar.
Verificar aplicación por dispositivos.
Probar:
- dispositivo;
- activado;
- desactivado.
Modal con previews.
Cancelar no cambia.
Aceptar cambia.
Persistir después de reiniciar.
Cambiar idioma mediante mecanismo oficial soportado.
Verificar layouts.
En ambiente de prueba:
backup.
restore.
comparar.
Clasificar:
Pérdida/duplicación/dinero/seguridad crítica.
Función esencial rota.
Impacto importante con workaround.
Limitado.
Visual.
No liberar con BLOCKER.
Critical debe resolverse salvo decisión explícita documentada que no comprometa el alcance del release.
Todo bug crítico corregido debe producir un regression test cuando sea viable.
Crear:
QA_SIGNOFF.md
Incluir:
- versión;
- fecha;
- suites;
- resultados;
- hardware;
- blockers;
- known issues.
Crear:
FINAL_QA_REPORT.md
Resultado:
- PASS
- PASS_WITH_LIMITATIONS
- FAIL
PASS_WITH_LIMITATIONS solo si la limitación no compromete funciones críticas declaradas.
Para cada integración distinguir:
No llamar “Hardware Tested” a una simulación.
Ejemplo:
Utilizar

<!-- PARTE 3 | attachment=9c6709c9-9e5c-4b6b-899f-df5aa24d2d12 | rango=1-5 -->

Continúo exactamente desde el 533, manteniendo la numeración correlativa.
:

La matriz de hardware debe contener únicamente dispositivos realmente evaluados.
Registrar:
- fabricante;
- modelo;
- sistema operativo/firmware cuando sea relevante;
- tipo de conexión;
- resultado;
- limitaciones.
No afirmar:
Compatible con todas las impresoras ESC/POS
si solamente se probaron modelos específicos.
Cuando no exista hardware físico durante el desarrollo:
implementar:
1. interface;
2. adapter;
3. virtual adapter/simulator;
4. tests;
5. documentación.
Marcar:
HARDWARE_VALIDATION_PENDING
No detener los demás módulos.
Crear adapter de desarrollo capaz de:
- recibir PrintJobs;
- guardar output;
- generar preview;
- simular éxito;
- simular timeout;
- simular error;
- simular reconexión.
Nunca utilizarlo como prueba de compatibilidad física.
Para tests automatizados debe poder simular:
- conexión;
- ACK;
- ACK perdido;
- mensajes duplicados;
- desconexión;
- reconexión;
- versión incompatible.
Debe permitir probar:
- sesión;
- snapshots;
- deltas;
- reconexión;
- finalización.
Solo development/test.
Debe poder simular:
- success;
- decline;
- timeout;
- unknown;
- duplicate request.
Nunca habilitarlo como provider productivo.
Solo development/test/staging.
Simular:
- issued;
- accepted;
- rejected;
- timeout;
- unknown;
- duplicate.
No afirmar cumplimiento fiscal productivo por pasar estos tests.
Crear pipeline cuando el repositorio/entorno lo permita.
Etapas mínimas:
```
Checkout
   ↓
Dependencies
   ↓
Lint
   ↓
Type Check / Compile
   ↓
Unit Tests
   ↓
Integration Tests
   ↓
Security Checks
   ↓
Build
   ↓
Artifacts
```
Suites E2E/hardware pueden ejecutarse en etapas adicionales.
No generar release productivo si falla:
- compilación;
- migration validation;
- critical-pos-safety;
- security checks críticos;
- tests financieros críticos.
Medir cobertura.
No perseguir 100% artificial.
Exigir cobertura sólida en:
- PricingEngine;
- TaxEngine;
- Payment logic;
- Sync;
- sequences;
- permissions;
- kitchen deduplication.
Ejecutar herramientas apropiadas para:
- Kotlin;
- TypeScript;
- backend;
- dependencies.
Resolver problemas críticos.
Escanear CVEs.
No liberar con vulnerabilidades críticas conocidas sin mitigación/decisión formal.
CI debe intentar detectar:
- API keys;
- private keys;
- passwords;
- tokens.
Si un secreto llegó al historial Git:
eliminarlo del código y rotarlo.
Automatizar avisos cuando sea razonable.
No fusionar automáticamente una actualización crítica sin tests.
Documentar versiones de:
- JDK;
- Android Gradle Plugin;
- Node;
- package manager;
- DB;
- tooling.
Utilizar lockfiles.
Crear:
DEVELOPMENT.md
Debe explicar desde cero:
- prerequisites;
- variables;
- DB;
- backend;
- Dashboard;
- Android;
- tests;
- builds.
Cuando sea razonable proporcionar Docker Compose o equivalente para levantar:
- DB;
- backend dependencies;
- servicios auxiliares.
Ejemplo conceptual:
```
docker compose up
```
El comando real debe probarse antes de documentarlo.
Crear seed únicamente para development/test.
Puede incluir:
- productos ficticios WTF;
- categorías;
- empleados ficticios;
- sucursal de prueba.
Nunca datos reales de clientes.
Tests deben utilizar DB/servicios separados.
Nunca ejecutar suites destructivas sobre producción.
CI debe poder crear el esquema mediante migrations desde cero.
Además de creación limpia:
probar migración desde versiones anteriores relevantes.
Antes de handoff:
en un entorno limpio:
1. clonar;
2. seguir README;
3. instalar;
4. levantar;
5. ejecutar tests;
6. compilar.
Si no funciona:
la entrega no está terminada.
README raíz:
Debe incluir:
- descripción;
- componentes;
- quick start;
- enlaces a documentación;
- estructura;
- builds.
No convertir README en miles de líneas.
Crear:
docs/README.md
Enlazar:
- Architecture
- Data Model
- API
- Offline
- KDS
- CDS
- Printing
- Fiscal
- Security
- Testing
- Deployment
- Operations
- User Guides
- Production Readiness
Crear:
ARCHITECTURE.md
Debe reflejar el sistema real.
No conservar diagramas que ya no correspondan al código.
Crear:
docs/adr/
para decisiones importantes.
Ejemplos:
- local database;
- money representation;
- offline sync;
- LAN protocol;
- fiscal provider;
- backend architecture.
Crear:
DATA_MODEL.md
Documentar entidades y relaciones principales.
Generar diagrama real.
Debe incluir como mínimo las relaciones conceptuales entre:
- Organization;
- Branch;
- Register;
- Device;
- Employee;
- Product;
- Category;
- Modifier;
- Customer;
- Order;
- Sale;
- SaleLine;
- Payment;
- Receipt;
- Shift;
- InventoryMovement;
- KitchenOrder;
- AuditLog.
Crear/actualizar:
- OpenAPI;
- authentication;
- errors;
- pagination;
- idempotency;
- realtime;
- sync.
Crear:
REALTIME_PROTOCOL.md
Documentar:
- discovery;
- pairing;
- authentication;
- message envelope;
- ACK;
- versioning;
- dedup;
- reconnect;
- revocation.
Crear:
OFFLINE_ARCHITECTURE.md
Debe explicar:
- local DB;
- outbox;
- inbox;
- conflict resolution;
- retries;
- multi-POS limitations;
- recovery.
Crear:
PRINTING.md
Documentar:
- adapters;
- queue;
- retry;
- receipt;
- kitchen;
- supported hardware.
Crear:
FISCAL.md
Separar claramente:
- configuración;
- provider abstraction;
- sandbox;
- production;
- secuencias;
- estados;
- limitaciones.
Crear:
SECURITY.md
Incluir:
- auth;
- RBAC;
- device trust;
- tenant isolation;
- secrets;
- storage;
- network;
- audit;
- threat model.
Crear:
THREAT_MODEL.md
Analizar:
- empleado no autorizado;
- dispositivo falso;
- replay;
- tablet robada;
- token filtrado;
- price tampering;
- double charge;
- SQL/XSS;
- pérdida de red.
Crear:
OPERATIONS_RUNBOOK.md
Debe ser útil para encargado.
Checklist:
- red;
- POS;
- KDS;
- CDS;
- printers;
- papel;
- turno.
Checklist:
- órdenes abiertas;
- pagos pendientes;
- sync;
- conteo;
- cierre;
- alertas.
Procedimientos para:
- Internet;
- KDS;
- CDS;
- printer;
- payment unknown;
- fiscal error;
- lost device.
Crear:
INSTALLATION.md
Separar:
- WTF POS;
- WTF KDS;
- WTF CDS;
- Dashboard;
- Backend.
Generar instrucciones guiadas con capturas reales de la interfaz final.
No utilizar mockups obsoletos.
Igual.
Incluir:
- agregar;
- IP;
- test;
- paper width;
- routing;
- troubleshooting.
Crear checklist de activación.
Crear guía para personal operativo.
Debe ser sencilla.
Más detallada.
Debe explicar:
- empleados;
- catálogo;
- impuestos;
- métodos;
- dispositivos;
- cocina;
- reportes.
Crear versiones breves para:
Crear:
REQUIREMENTS_TRACEABILITY.md
Cada requisito principal debe mapearse a:
- Requirement ID;
- módulo;
- implementación;
- test;
- estado.
Utilizar:
- NOT_STARTED
- IN_PROGRESS
- BLOCKED
- IMPLEMENTED
- TESTED
- ACCEPTED
- FUTURE_SCOPE
Un requisito crítico no puede marcarse:
TESTED
sin test/evidencia correspondiente.
Crear:
IMPLEMENTATION_STATUS.md
Con:
- versión;
- completed;
- in progress;
- tests;
- builds;
- blockers;
- known issues;
- next exact step.
Debe ser específico.
Incorrecto:
“Continuar KDS.”
Correcto:
“Implementar persistencia de KitchenEvent y deduplicación por eventId antes de activar retries de WTF POS.”
Crear:
ROADMAP.md
Separar:
- v1;
- v1.1;
- v2;
- Research.
No mezclar roadmap con alcance actual.
Crear:
TECHNICAL_DEBT.md
Registrar deuda real.
No utilizarlo para posponer P0 indispensables.
Mantener:
CHANGELOG.md
Por release.
Documentar compatibilidad:
Crear:
PRODUCTION_READINESS.md
Evaluar:
- architecture;
- data;
- security;
- tests;
- operations;
- hardware;
- blockers.
Solo uno:
No utilizar frases ambiguas como:
“casi listo”.
Usar cuando:
- P0 implementado;
- pruebas críticas pasan;
- quedan validaciones operacionales/hardware razonables.
Solo cuando:
- P0 completo;
- critical suite pasa;
- UAT pasa;
- hardware requerido validado;
- backups/restores probados;
- seguridad revisada;
- integraciones críticas necesarias listas;
- pilot satisfactorio cuando corresponda.
Si existe riesgo crítico de:
- doble cobro;
- venta perdida;
- corrupción;
- fiscalidad incorrecta;
- acceso no autorizado;
- comanda perdida.
Antes de reemplazar completamente un POS existente:
realizar piloto controlado cuando sea posible.
Puede comenzar con:
- una caja;
- un KDS;
- un CDS;
- printers reales;
- subset de personal.
Registrar:
- ventas;
- pagos;
- tiempos;
- KDS;
- impresión;
- sync;
- errores;
- UX;
- cierre.
Si se compara con un POS existente:
evitar doble contabilización/inventario.
Utilizar comparación controlada.
Después de pilot:
planificar activación.
Checklist:
- catálogo;
- precios;
- impuestos;
- empleados;
- dispositivos;
- printers;
- KDS;
- CDS;
- fiscal;
- opening balances;
- backup.
Realizar venta controlada.
Verificar inmediatamente:
- POS;
- payment;
- receipt;
- KDS;
- CDS;
- inventory;
- Dashboard;
- fiscal cuando aplique.
Reconciliar cuidadosamente.
Al terminar primer día:
- reportes;
- diferencias;
- sync;
- errors;
- backup.
Después de go-live:
priorizar correcciones/estabilidad antes de añadir grandes features nuevas.
Entregar como mínimo:
```
WTF-POS-<version>-release.apk
WTF-KDS-<version>-release.apk
WTF-CDS-<version>-release.apk
```
Además:
- Dashboard build/deployment;
- Backend;
- migrations;
- docs;
- tests;
- checksums;
- Release Manifest.
Organizar claramente.
Ejemplo:
```
release/
  v1.0.0/
    android/
    dashboard/
    backend/
    database/
    docs/
    test-reports/
    checksums/
```
Cada release debe corresponder a:
- commit;
- tag;
- DB schema;
- protocol version.
Ejemplo:
v1.0.0
cuando corresponda.
Incluir:
- Added
- Changed
- Fixed
- Security
- Known Limitations
Ser transparente.
Ejemplo válido:
Kitchen printer model X pending physical validation.
No ocultar.
No afirmar:
- “sin errores”;
- “compatible con todo”;
- “certificado fiscalmente”;
- “100% offline”;
sin evidencia y alcance preciso.
Al terminar generar:
FINAL_STATUS_REPORT.md
Con:
- release;
- commit;
- builds;
- tests;
- components;
- hardware;
- blockers;
- limitations;
- readiness.
Mostrar:
Utilizar estados reales.
Separar:
- unit;
- integration;
- E2E;
- security;
- offline;
- hardware;
- fiscal.
No inventar números.
Solo hardware real.
Mostrar P0 primero.
Debe responder claramente:
1. ¿Está listo?
2. ¿Qué puedo probar?
3. ¿Qué falta?
4. ¿Dónde están los APK?
5. ¿Cuál es el siguiente paso?
Esta especificación no solicita únicamente planificación.
Después de inspeccionar el repositorio:
IMPLEMENTAR.
No devolver únicamente:
- arquitectura;
- mockups;
- TODO;
- pseudocódigo;
- screenshots.
Inspeccionar el repositorio completo.
No asumir que está vacío.
Identificar:
- apps;
- backend;
- DB;
- auth;
- APIs;
- inventory;
- tests;
- infrastructure;
- problems.
Antes de cambios grandes:
ejecutar:
- dependencies;
- build;
- tests;
- migrations;
- lint;
según el stack real.
Comparar el estado real con este Prompt Maestro.
Crear plan por fases.
Después:
comenzar a implementarlo sin pedir autorización entre fases técnicas normales.
Utilizar:
```
INSPECT
   ↓
IMPLEMENT
   ↓
BUILD
   ↓
TEST
   ↓
FIX
   ↓
VERIFY
   ↓
DOCUMENT
   ↓
CONTINUE
```
Cuando algo falle:
```
REPRODUCE
   ↓
ROOT CAUSE
   ↓
FIX
   ↓
REGRESSION TEST
   ↓
RETEST
```
No aplicar cambios aleatorios.
Errores de:
- TypeScript;
- Kotlin;
- Gradle;
- migration;
- lint;
- tests;
- dependencies;
deben investigarse y corregirse cuando sea posible.
No devolverlos al usuario como tarea de programación.
Solo detener una parte cuando requiera algo realmente externo:
- API key;
- certificado;
- provider account;
- hardware;
- decisión fiscal/financiera no inferible.
Cuando ocurra:
1. crear interface;
2. configuración;
3. mock/sandbox de tests;
4. documentar;
5. continuar otros módulos.


Continúo exactamente desde el 627, sin reiniciar ni repetir la numeración.
:

Nunca inventar:
- API keys;
- tokens;
- passwords;
- certificados;
- client secrets;
- URLs privadas;
- respuestas de proveedores;
- credenciales fiscales.
Si falta una credencial externa, utilizar variables de entorno/configuración documentada y continuar con las partes independientes.
Antes de integrar:
- Android API;
- librería;
- impresora;
- provider fiscal;
- payment provider;
- servicio externo;
consultar la documentación oficial disponible cuando sea posible.
No escribir producción contra métodos/endpoints imaginarios.
Si el repositorio ya contiene una implementación válida:
- analizar;
- probar;
- reutilizar;
- mejorar cuando sea necesario.
No reescribir únicamente por preferencia técnica.
Si lo existente utiliza prácticas incompatibles con requisitos críticos, migrarlo.
Ejemplos:
- float para dinero;
- passwords/PIN en texto plano;
- autorización únicamente en frontend;
- ventas únicamente en memoria;
- retries sin idempotencia;
- MAX(sequence)+1;
- hardcoded secrets;
- stock mutable sin ledger.
No ejecutar generadores que sobrescriban el proyecto antes de inspeccionarlo.
Si el repositorio realmente está vacío:
crear estructura apropiada.
Preservar funcionalidad existente.
Analizar especialmente:
- Firebase;
- autenticación;
- inventario;
- empleados;
- sucursales;
- hosting;
- permisos.
Integrar WTF Dashboard de forma coherente.
No eliminarlo automáticamente.
Evaluar su utilidad para:
- auth;
- realtime;
- hosting;
- notifications;
- configuración.
Para transacciones financieras complejas, elegir una estrategia con garantías apropiadas y documentar la decisión.
Reutilizar cuando sea adecuado.
No crear una segunda base central innecesariamente.
Extender/versionar.
No crear dos APIs paralelas que resuelvan exactamente lo mismo sin una razón documentada.
Determinar explícitamente cuál será la fuente de verdad.
No permitir dos inventarios independientes sin mapping/sincronización formal.
Una venta completada debe generar un evento/movimiento identificable.
Ejemplo:
```
SALE_COMPLETED
saleId
eventId
branchId
lines
```
El consumidor de inventario debe procesarlo una sola vez.
Mantener distinción.
Ejemplo:
WTF Burger
es artículo de venta.
Ingredientes:
- carne;
- pan;
- queso;
- salsa.
La relación futura debe resolverse mediante receta/BOM.
Si existe integración con ICG FrontRest:
mantenerla desacoplada.
WTF POS debe poder convertirse en sistema POS independiente sin requerir ICG para su operación central.
Si durante migración WTF POS debe coexistir con un sistema legacy:
crear adapter/integration layer.
No modificar directamente una DB legacy de forma insegura.
Definir cuál sistema registra la venta oficial.
Evitar:
- doble inventario;
- doble venta;
- doble fiscalidad.
Si existe sistema anterior:
definir explícitamente qué se migrará:
- productos;
- categorías;
- clientes;
- empleados;
- stock;
- configuración;
- históricos cuando sea necesario.
Para datos importantes:
realizar dry run antes del cutover.
Generar:
- total origen;
- importados;
- rechazados;
- warnings;
- mappings.
Importar inventario inicial como:
OPENING_BALANCE
No establecer stock mediante una edición sin movimiento.
No migrar PINs inseguros.
Solicitar creación/reset de credenciales.
Si se implementa:
marcar origen legacy.
No tratarlas como ventas nuevas.
Trabajar contra copia/ambiente de desarrollo para migraciones de alto riesgo.
No probar scripts destructivos en producción.
Scripts de:
- reset;
- truncate;
- delete;
- rebuild;
deben estar protegidos para no ejecutarse accidentalmente en producción.
No construir todas las pantallas antes de validar un flujo real.
Primer vertical slice recomendado:
```
Employee Login
      ↓
Open Shift
      ↓
POS
      ↓
Product
      ↓
Pricing/Tax
      ↓
Cash Payment
      ↓
Sale Persistence
      ↓
Receipt
      ↓
Sync
      ↓
Dashboard
```
```
POS
 ↓
Open Ticket
 ↓
Kitchen Routing
 ↓
WTF KDS
 ↓
ACK
 ↓
Dispatch
```
```
POS Cart
    ↓
Display Session
    ↓
LAN
    ↓
WTF CDS
```
```
Offline Sale
    ↓
Local Persistence
    ↓
Outbox
    ↓
Reconnect
    ↓
Cloud Sync
    ↓
Dashboard
```
```
Sale
 ↓
Inventory Event
 ↓
Inventory Ledger
 ↓
Stock
 ↓
Report
```
Generar builds instalables desde etapas tempranas.
Esto permite detectar:
- permisos;
- Gradle;
- R8;
- networking;
- hardware;
- Android lifecycle;
antes del final.
Cada vertical slice debe probarse antes de ampliarlo.
Antes de implementar flujos complejos de cobro:
terminar y probar:
- Money;
- PricingEngine;
- TaxEngine;
- Discount Engine;
- Rounding.
Antes de exponer administración:
implementar:
- authentication;
- RBAC;
- tenant scope;
- branch scope.
Antes de considerar KDS/CDS productivos:
implementar pairing/autenticación.
No afirmar soporte offline hasta comprobar:
- local DB;
- process death;
- restart;
- outbox;
- reconnect;
- dedup.
No activar retries automáticos de operaciones críticas antes de tener idempotencia.
Probar release build durante desarrollo.
No descubrir problemas de firma/obfuscation al final.
Cuando exista hardware:
instalar APK real.
No depender únicamente de previews/emulador.
Probar WTF POS, KDS y CDS como procesos/dispositivos diferentes.
No utilizar localhost incorrectamente para representar otro dispositivo Android.
Cloud endpoints dependen del ambiente.
LAN endpoints dependen del pairing/discovery.
No hardcodear IPs de desarrollo en production.
Documentar puertos requeridos para la instalación.
Probar:
- granted;
- denied;
- permanently denied.
Si se deniega cámara:
POS continúa funcionando sin scanner de cámara.
Si biometría:
- no existe;
- falla;
- se cancela;
- queda invalidada;
permitir fallback seguro según política.
Mocks, diagnostics avanzados y test menus deben estar separados por build type/feature controls.
No dejar herramientas inseguras expuestas en producción.
No hardcodear en código:
- impuestos;
- métodos de pago;
- mesas;
- categorías de cocina;
- sucursal;
- moneda;
- business cutoff;
- printer IP;
- KDS IP;
- CDS IP.
Definir precedencia:
```
Environment
   ↓
Organization
   ↓
Branch
   ↓
Register / Device
   ↓
User Preference
```
No permitir que una preferencia personal anule una regla de seguridad empresarial.
Para:
- API URL;
- DB connection;
- secrets;
- provider credentials;
- environment name.
Para:
- taxes;
- prices;
- payments;
- receipt;
- dining options;
- kitchen routing;
- features.
Para:
- register;
- printer;
- KDS/CDS association;
- device-specific behavior.
Para:
- theme;
- grid/list;
- UX preferences permitidas.
No convertir invariantes críticos en switches.
Nunca permitir desactivar casualmente:
- tenant isolation;
- idempotency;
- payment integrity;
- authorization.
Antes de publicar cambios masivos de precios/impuestos:
mostrar impacto.
Permitir probar:
“¿Dónde iría este producto?”
Ejemplo:
WTF Burger → Cocina.
Mojito → Bar.
Render realista antes de guardar configuración.
Enviar comanda de prueba.
Enviar venta de prueba.
Crear acción:
Debe comprobar:
- productos;
- precios;
- impuestos;
- métodos;
- register;
- devices;
- receipt;
- kitchen;
- fiscal cuando esté activo.
Bloquean go-live.
Ejemplos:
- producto activo sin precio;
- método de pago inexistente;
- rango fiscal inválido;
- register faltante.
No necesariamente bloquean.
Ejemplos:
- KDS offline;
- printer no probado;
- artículo sin imagen.
Mostrar:
Configuración validada
con fecha/versión.
Preparar:
- SETUP
- TESTING
- LIVE
- INACTIVE
- ARCHIVED
Las ventas de testing deben quedar claramente separadas.
No mezclarlas con producción.
Puede existir modo de capacitación.
Debe:
- marcarse visualmente;
- no afectar reportes reales;
- no afectar inventario real;
- no consumir secuencias fiscales productivas.
Imprimir:
PRUEBA / CAPACITACIÓN — NO VÁLIDO
No enviar a cocina productiva salvo estación específicamente de training.
Cambiar de TESTING a LIVE requiere permiso administrativo y checklist.
Antes de LIVE:
eliminar/archivar datos demo del ambiente correspondiente.
No borrar configuración real.
Al comenzar jornada:
1. empleado se autentica;
2. Time Clock si aplica;
3. abre turno de caja;
4. POS queda listo.
Mantener estos conceptos separados.
Mostrar compactamente:
- sucursal;
- empleado;
- register;
- shift;
- sync status.
Permitir cambiar empleado rápidamente según política.
Acceso al resumen del turno desde el header.
Tocar estado de sync abre diagnóstico resumido.
Mostrar solamente alertas relevantes:
- KDS offline;
- printer offline;
- sync backlog;
- storage warning.
Stock bajo, por ejemplo, no debe interrumpir cada venta.
Reservar para situaciones donde continuar sería inseguro:
- pago;
- fiscal;
- permiso;
- persistencia;
- configuración crítica.
Con carrito activo:
no cerrar/perder venta accidentalmente.
Persistir o solicitar confirmación.
En tablet dedicada:
salir/configurar puede requerir PIN administrativo.
Mismo concepto.
Preparar guía opcional para:
- Screen Pinning;
- Device Owner/MDM futuro.
No intentar bloquear Android mediante hacks.
Mantener pantalla activa durante operación cuando sea apropiado.
Igual.
KDS/CDS pueden mostrar alerta administrativa de batería baja si resulta útil.
No convertirla en dependencia crítica.
Reportar:
- normal;
- low;
- critical.
No listar archivos privados.
Permitir reemplazar POS/KDS/CDS conservando configuración lógica.
Nuevo hardware recibe nuevo deviceId.
No transferir secretos inseguros.
Register es entidad lógica.
Device es hardware/instalación.
Cambiar tablet no debe obligar a crear una nueva Caja Principal.
Estación Cocina puede conservarse aunque se sustituya la tablet.
Puede reasignarse a otro dispositivo.
Requiere autorización.
Antes:
- cerrar shift;
- sincronizar pendientes;
- validar.
Registrar auditoría.
Procedimiento:
1. revocar;
2. cerrar sesiones;
3. revisar último sync;
4. revisar operaciones pendientes;
5. provisionar reemplazo.
Dashboard puede solicitar bloqueo del POS.
No borrar datos.
Revocar sesión/credencial según caso.
No intentar reiniciar/controlar arbitrariamente Android salvo integración MDM oficialmente soportada.
Puede existir:
Solicitar sincronización
Registrar:
- command;
- issuer;
- target;
- result.
Una venta normal sin modificadores complejos debe requerir muy pocos toques.
Producto sin modificadores obligatorios:
un toque agrega.
Un toque abre selección.
Accesible cuando Open Tickets esté activo.
Siempre prominente cuando la orden sea cobrable.
Métodos frecuentes visibles inmediatamente.
Cocina debe poder comprender una tarjeta en segundos.
Prioridad visual:
1. turno;
2. tiempo;
3. artículos;
4. cantidades;
5. modificadores/comentarios;
6. acción.
Cliente debe identificar:
1. artículos;
2. precio;
3. subtotal;
4. impuestos;
5. total.
Administración detallada sin convertir el POS operacional en un panel complejo.
Según contexto ofrecer:
- Reintentar
- Verificar estado
- Trabajar offline
- Cambiar destino
- Solicitar supervisor
- Ver diagnóstico
No mostrar simplemente:
Reintentar
cuando repetir pudiera duplicar un pago/documento.
Primero verificar estado.
Crear herramientas administrativas para recuperar/diagnosticar operaciones pendientes sin editar directamente tablas.
Permitir exportar paquete técnico sanitizado:
- app versions;
- device status;
- config versions;
- recent error codes;
- sync status.
No incluir DB completa de clientes por defecto.
Errores/incidencias pueden tener correlation/support ID.
Para incidentes graves documentar:
- impacto;
- timeline;
- causa;
- corrección;
- acciones preventivas.
Doble cobro/pago desconocido = máxima prioridad.
Máxima prioridad.
Máxima prioridad.
Crear cuando un incidente grave lo amerite.
Si se necesita reparar datos:
utilizar scripts/casos de uso versionados.
Antes:
backup.
Después:
audit/evidence.
Evitar SQL manual sobre producción.
Si excepcionalmente es imprescindible:
- script

<!-- PARTE 4 | attachment=4bbb9a1b-1c73-47c2-a273-55ae5c8ddb26 | rango=1-4 -->

Continúo exactamente desde el 627, sin reiniciar ni repetir la numeración.
:

Nunca inventar:
- API keys;
- tokens;
- passwords;
- certificados;
- client secrets;
- URLs privadas;
- respuestas de proveedores;
- credenciales fiscales.
Si falta una credencial externa, utilizar variables de entorno/configuración documentada y continuar con las partes independientes.
Antes de integrar:
- Android API;
- librería;
- impresora;
- provider fiscal;
- payment provider;
- servicio externo;
consultar la documentación oficial disponible cuando sea posible.
No escribir producción contra métodos/endpoints imaginarios.
Si el repositorio ya contiene una implementación válida:
- analizar;
- probar;
- reutilizar;
- mejorar cuando sea necesario.
No reescribir únicamente por preferencia técnica.
Si lo existente utiliza prácticas incompatibles con requisitos críticos, migrarlo.
Ejemplos:
- float para dinero;
- passwords/PIN en texto plano;
- autorización únicamente en frontend;
- ventas únicamente en memoria;
- retries sin idempotencia;
- MAX(sequence)+1;
- hardcoded secrets;
- stock mutable sin ledger.
No ejecutar generadores que sobrescriban el proyecto antes de inspeccionarlo.
Si el repositorio realmente está vacío:
crear estructura apropiada.
Preservar funcionalidad existente.
Analizar especialmente:
- Firebase;
- autenticación;
- inventario;
- empleados;
- sucursales;
- hosting;
- permisos.
Integrar WTF Dashboard de forma coherente.
No eliminarlo automáticamente.
Evaluar su utilidad para:
- auth;
- realtime;
- hosting;
- notifications;
- configuración.
Para transacciones financieras complejas, elegir una estrategia con garantías apropiadas y documentar la decisión.
Reutilizar cuando sea adecuado.
No crear una segunda base central innecesariamente.
Extender/versionar.
No crear dos APIs paralelas que resuelvan exactamente lo mismo sin una razón documentada.
Determinar explícitamente cuál será la fuente de verdad.
No permitir dos inventarios independientes sin mapping/sincronización formal.
Una venta completada debe generar un evento/movimiento identificable.
Ejemplo:
```
SALE_COMPLETED
saleId
eventId
branchId
lines
```
El consumidor de inventario debe procesarlo una sola vez.
Mantener distinción.
Ejemplo:
WTF Burger
es artículo de venta.
Ingredientes:
- carne;
- pan;
- queso;
- salsa.
La relación futura debe resolverse mediante receta/BOM.
Si existe integración con ICG FrontRest:
mantenerla desacoplada.
WTF POS debe poder convertirse en sistema POS independiente sin requerir ICG para su operación central.
Si durante migración WTF POS debe coexistir con un sistema legacy:
crear adapter/integration layer.
No modificar directamente una DB legacy de forma insegura.
Definir cuál sistema registra la venta oficial.
Evitar:
- doble inventario;
- doble venta;
- doble fiscalidad.
Si existe sistema anterior:
definir explícitamente qué se migrará:
- productos;
- categorías;
- clientes;
- empleados;
- stock;
- configuración;
- históricos cuando sea necesario.
Para datos importantes:
realizar dry run antes del cutover.
Generar:
- total origen;
- importados;
- rechazados;
- warnings;
- mappings.
Importar inventario inicial como:
OPENING_BALANCE
No establecer stock mediante una edición sin movimiento.
No migrar PINs inseguros.
Solicitar creación/reset de credenciales.
Si se implementa:
marcar origen legacy.
No tratarlas como ventas nuevas.
Trabajar contra copia/ambiente de desarrollo para migraciones de alto riesgo.
No probar scripts destructivos en producción.
Scripts de:
- reset;
- truncate;
- delete;
- rebuild;
deben estar protegidos para no ejecutarse accidentalmente en producción.
No construir todas las pantallas antes de validar un flujo real.
Primer vertical slice recomendado:
```
Employee Login
      ↓
Open Shift
      ↓
POS
      ↓
Product
      ↓
Pricing/Tax
      ↓
Cash Payment
      ↓
Sale Persistence
      ↓
Receipt
      ↓
Sync
      ↓
Dashboard
```
```
POS
 ↓
Open Ticket
 ↓
Kitchen Routing
 ↓
WTF KDS
 ↓
ACK
 ↓
Dispatch
```
```
POS Cart
    ↓
Display Session
    ↓
LAN
    ↓
WTF CDS
```
```
Offline Sale
    ↓
Local Persistence
    ↓
Outbox
    ↓
Reconnect
    ↓
Cloud Sync
    ↓
Dashboard
```
```
Sale
 ↓
Inventory Event
 ↓
Inventory Ledger
 ↓
Stock
 ↓
Report
```
Generar builds instalables desde etapas tempranas.
Esto permite detectar:
- permisos;
- Gradle;
- R8;
- networking;
- hardware;
- Android lifecycle;
antes del final.
Cada vertical slice debe probarse antes de ampliarlo.
Antes de implementar flujos complejos de cobro:
terminar y probar:
- Money;
- PricingEngine;
- TaxEngine;
- Discount Engine;
- Rounding.
Antes de exponer administración:
implementar:
- authentication;
- RBAC;
- tenant scope;
- branch scope.
Antes de considerar KDS/CDS productivos:
implementar pairing/autenticación.
No afirmar soporte offline hasta comprobar:
- local DB;
- process death;
- restart;
- outbox;
- reconnect;
- dedup.
No activar retries automáticos de operaciones críticas antes de tener idempotencia.
Probar release build durante desarrollo.
No descubrir problemas de firma/obfuscation al final.
Cuando exista hardware:
instalar APK real.
No depender únicamente de previews/emulador.
Probar WTF POS, KDS y CDS como procesos/dispositivos diferentes.
No utilizar localhost incorrectamente para representar otro dispositivo Android.
Cloud endpoints dependen del ambiente.
LAN endpoints dependen del pairing/discovery.
No hardcodear IPs de desarrollo en production.
Documentar puertos requeridos para la instalación.
Probar:
- granted;
- denied;
- permanently denied.
Si se deniega cámara:
POS continúa funcionando sin scanner de cámara.
Si biometría:
- no existe;
- falla;
- se cancela;
- queda invalidada;
permitir fallback seguro según política.
Mocks, diagnostics avanzados y test menus deben estar separados por build type/feature controls.
No dejar herramientas inseguras expuestas en producción.
No hardcodear en código:
- impuestos;
- métodos de pago;
- mesas;
- categorías de cocina;
- sucursal;
- moneda;
- business cutoff;
- printer IP;
- KDS IP;
- CDS IP.
Definir precedencia:
```
Environment
   ↓
Organization
   ↓
Branch
   ↓
Register / Device
   ↓
User Preference
```
No permitir que una preferencia personal anule una regla de seguridad empresarial.
Para:
- API URL;
- DB connection;
- secrets;
- provider credentials;
- environment name.
Para:
- taxes;
- prices;
- payments;
- receipt;
- dining options;
- kitchen routing;
- features.
Para:
- register;
- printer;
- KDS/CDS association;
- device-specific behavior.
Para:
- theme;
- grid/list;
- UX preferences permitidas.
No convertir invariantes críticos en switches.
Nunca permitir desactivar casualmente:
- tenant isolation;
- idempotency;
- payment integrity;
- authorization.
Antes de publicar cambios masivos de precios/impuestos:
mostrar impacto.
Permitir probar:
“¿Dónde iría este producto?”
Ejemplo:
WTF Burger → Cocina.
Mojito → Bar.
Render realista antes de guardar configuración.
Enviar comanda de prueba.
Enviar venta de prueba.
Crear acción:
Debe comprobar:
- productos;
- precios;
- impuestos;
- métodos;
- register;
- devices;
- receipt;
- kitchen;
- fiscal cuando esté activo.
Bloquean go-live.
Ejemplos:
- producto activo sin precio;
- método de pago inexistente;
- rango fiscal inválido;
- register faltante.
No necesariamente bloquean.
Ejemplos:
- KDS offline;
- printer no probado;
- artículo sin imagen.
Mostrar:
Configuración validada
con fecha/versión.
Preparar:
- SETUP
- TESTING
- LIVE
- INACTIVE
- ARCHIVED
Las ventas de testing deben quedar claramente separadas.
No mezclarlas con producción.
Puede existir modo de capacitación.
Debe:
- marcarse visualmente;
- no afectar reportes reales;
- no afectar inventario real;
- no consumir secuencias fiscales productivas.
Imprimir:
PRUEBA / CAPACITACIÓN — NO VÁLIDO
No enviar a cocina productiva salvo estación específicamente de training.
Cambiar de TESTING a LIVE requiere permiso administrativo y checklist.
Antes de LIVE:
eliminar/archivar datos demo del ambiente correspondiente.
No borrar configuración real.
Al comenzar jornada:
1. empleado se autentica;
2. Time Clock si aplica;
3. abre turno de caja;
4. POS queda listo.
Mantener estos conceptos separados.
Mostrar compactamente:
- sucursal;
- empleado;
- register;
- shift;
- sync status.
Permitir cambiar empleado rápidamente según política.
Acceso al resumen del turno desde el header.
Tocar estado de sync abre diagnóstico resumido.
Mostrar solamente alertas relevantes:
- KDS offline;
- printer offline;
- sync backlog;
- storage warning.
Stock bajo, por ejemplo, no debe interrumpir cada venta.
Reservar para situaciones donde continuar sería inseguro:
- pago;
- fiscal;
- permiso;
- persistencia;
- configuración crítica.
Con carrito activo:
no cerrar/perder venta accidentalmente.
Persistir o solicitar confirmación.
En tablet dedicada:
salir/configurar puede requerir PIN administrativo.
Mismo concepto.
Preparar guía opcional para:
- Screen Pinning;
- Device Owner/MDM futuro.
No intentar bloquear Android mediante hacks.
Mantener pantalla activa durante operación cuando sea apropiado.
Igual.
KDS/CDS pueden mostrar alerta administrativa de batería baja si resulta útil.
No convertirla en dependencia crítica.
Reportar:
- normal;
- low;
- critical.
No listar archivos privados.
Permitir reemplazar POS/KDS/CDS conservando configuración lógica.
Nuevo hardware recibe nuevo deviceId.
No transferir secretos inseguros.
Register es entidad lógica.
Device es hardware/instalación.
Cambiar tablet no debe obligar a crear una nueva Caja Principal.
Estación Cocina puede conservarse aunque se sustituya la tablet.
Puede reasignarse a otro dispositivo.
Requiere autorización.
Antes:
- cerrar shift;
- sincronizar pendientes;
- validar.
Registrar auditoría.
Procedimiento:
1. revocar;
2. cerrar sesiones;
3. revisar último sync;
4. revisar operaciones pendientes;
5. provisionar reemplazo.
Dashboard puede solicitar bloqueo del POS.
No borrar datos.
Revocar sesión/credencial según caso.
No intentar reiniciar/controlar arbitrariamente Android salvo integración MDM oficialmente soportada.
Puede existir:
Solicitar sincronización
Registrar:
- command;
- issuer;
- target;
- result.
Una venta normal sin modificadores complejos debe requerir muy pocos toques.
Producto sin modificadores obligatorios:
un toque agrega.
Un toque abre selección.
Accesible cuando Open Tickets esté activo.
Siempre prominente cuando la orden sea cobrable.
Métodos frecuentes visibles inmediatamente.
Cocina debe poder comprender una tarjeta en segundos.
Prioridad visual:
1. turno;
2. tiempo;
3. artículos;
4. cantidades;
5. modificadores/comentarios;
6. acción.
Cliente debe identificar:
1. artículos;
2. precio;
3. subtotal;
4. impuestos;
5. total.
Administración detallada sin convertir el POS operacional en un panel complejo.
Según contexto ofrecer:
- Reintentar
- Verificar estado
- Trabajar offline
- Cambiar destino
- Solicitar supervisor
- Ver diagnóstico
No mostrar simplemente:
Reintentar
cuando repetir pudiera duplicar un pago/documento.
Primero verificar estado.
Crear herramientas administrativas para recuperar/diagnosticar operaciones pendientes sin editar directamente tablas.
Permitir exportar paquete técnico sanitizado:
- app versions;
- device status;
- config versions;
- recent error codes;
- sync status.
No incluir DB completa de clientes por defecto.
Errores/incidencias pueden tener correlation/support ID.
Para incidentes graves documentar:
- impacto;
- timeline;
- causa;
- corrección;
- acciones preventivas.
Doble cobro/pago desconocido = máxima prioridad.
Máxima prioridad.
Máxima prioridad.
Crear cuando un incidente grave lo amerite.
Si se necesita reparar datos:
utilizar scripts/casos de uso versionados.
Antes:
backup.
Después:
audit/evidence.
Evitar SQL manual sobre producción.
Si excepcionalmente es imprescindible:
- script

Continúo exactamente desde el 740, manteniendo la secuencia correlativa.
:

Evitar modificaciones manuales directas sobre la base de datos de producción.
Si excepcionalmente una reparación requiere SQL:
- crear script versionado;
- revisar el script;
- realizar backup previo;
- probarlo en un entorno seguro;
- registrar quién autorizó la ejecución;
- guardar evidencia before/after;
- auditar el cambio.
Nunca utilizar modificaciones manuales de DB como mecanismo normal para corregir ventas o cuadrar caja.
Una reparación técnica debe preservar la trazabilidad.
Cuando sea posible:
crear una operación compensatoria o registro de corrección.
No borrar silenciosamente el registro original.
Las herramientas administrativas de soporte deben operar mediante casos de uso seguros.
No proporcionar al administrador normal un editor genérico de tablas.
Las herramientas técnicas de DB deben permanecer fuera del flujo normal de WTF Dashboard.
El efectivo esperado debe derivarse del ledger.
Conceptualmente:
```
Opening Cash
+ Cash Sales
+ Cash In
- Cash Refunds
- Cash Out
- Safe Drops
± Authorized Adjustments
=
Expected Cash
```
La fórmula definitiva debe reflejar los tipos de movimiento implementados.
Al cerrar turno:
registrar el efectivo contado por el usuario.
No sobrescribir el efectivo esperado.
Calcular:
countedCash - expectedCash
Mostrar:
- sobrante;
- faltante;
- exacto.
Si existe diferencia:
permitir comentario/motivo.
No modificar ventas automáticamente para hacer que la diferencia desaparezca.
Entradas/salidas manuales deben requerir:
- permiso;
- motivo;
- monto;
- empleado.
Permitir registrar retiro de efectivo hacia caja fuerte/depósito interno cuando se utilice.
Debe reducir efectivo esperado de la gaveta, no ventas.
Si se permite:
registrar evento.
Puede requerir supervisor según política.
Una sucursal puede tener varias cajas.
Cada Shift pertenece a un Register.
Un empleado puede operar una caja según permisos.
Definir si puede existir más de un empleado activo sobre un mismo shift/register según política empresarial.
Si varios empleados comparten la misma gaveta:
el sistema debe poder identificar el Shift/Register responsable.
No atribuir automáticamente toda diferencia a la última persona que inició sesión.
Preparar modelo para turnos por empleado si en futuro se utiliza una gaveta individual.
El turno debe tener:
- openedAt;
- closedAt;
- businessDate.
Puede cruzar medianoche.
Solo administrador autorizado.
Utilizar únicamente para situaciones excepcionales.
Registrar:
- motivo;
- usuario;
- hora;
- estado pendiente.
Si WTF POS se reinicia:
detectar turno abierto.
No solicitar crear uno nuevo innecesariamente.
Si el dispositivo original falla:
un administrador puede recuperar el Register desde otro POS cuando sea seguro.
Antes verificar:
- último sync;
- turno;
- pendientes;
- dispositivo anterior.
Si el dispositivo dañado contenía operaciones que nunca llegaron al cloud:
no fingir que pueden recuperarse desde el servidor.
Documentar procedimiento de recuperación/reconciliación.
Separar:
- internal saleId;
- receipt number;
- turn number;
- fiscal number.
No reutilizar un mismo campo para todos.
Debe ser concurrency-safe.
Definir ámbito:
- organization;
- branch;
- register;
según política.
Número visible de pedido.
Puede reiniciarse:
- por businessDate;
- por shift;
según configuración.
Default recomendado:
por businessDate.
Permitir:
- 084
- A-084
- VZLA-084
según configuración.
Permitir:
- 001
- 0001
No afecta ID interno.
Incluso si por configuración excepcional se repite un número visible:
internamente las órdenes deben seguir siendo únicas.
KDS puede mostrar además:
- ticket;
- hora;
- register;
para diferenciarlas.
Diseñar una estrategia que evite conflictos visuales razonables entre varias cajas offline.
Opciones posibles:
- prefijo por register;
- bloques reservados;
- identificador compuesto.
Documentar la estrategia elegida.
Nunca confundir.
El número de turno puede imprimirse grande en el recibo.
Debe ser prominente.
La arquitectura puede permitir posteriormente una pantalla:
Ejemplo:
084 — Preparando
081 — Listo
No requerida en v1.
Diseñar Kitchen/Order events de manera que una futura pantalla pueda consumirlos sin modificar el núcleo de ventas.
Una pantalla pública futura debe utilizar principalmente número de turno.
No mostrar nombre completo del cliente por defecto.
WTF CDS puede mostrar el número de turno después de asignarlo, configurable.
Crear entidad/configuración para canales cuando corresponda.
Ejemplos:
- POS
- Uber Eats
- PedidosYa
- DoorDash
- Otro
No hardcodear proveedores específicos como únicos posibles.
Cuando modalidad = Apps Delivery:
permitir seleccionar plataforma/canal.
Permitir guardar referencia de la plataforma.
Ejemplo:
número de orden externo.
Puede validarse dentro de:
- sucursal;
- canal;
- período;
según integración.
No impedir una venta legítima por una regla arbitraria sin documentar.
Preparar adapter:
```
DeliveryProvider
 ├── ProviderA
 ├── ProviderB
 └── ManualDeliveryChannel
```
No implementar APIs ficticias.
V1 puede permitir registrar manualmente una orden proveniente de una app aunque todavía no exista integración automática.
Separar:
canal de venta
de:
método de pago
Una orden Uber Eats no necesariamente significa que el método de pago se llame Uber Eats.
Configurar según operación real.
No exigir crear un cliente completo para toda orden de plataforma si la información no está disponible/necesaria.
Para delivery propio:
permitir seleccionar/registrar dirección del cliente.
Preparar modelo para múltiples direcciones.
Permitir seleccionar principal.
Campo separado para:
- referencia;
- edificio;
- instrucciones.
No mezclar necesariamente con comentario de cocina.
Distinguir:
Para preparación.
Para entrega.
Para personal autorizado.
Solo cuando corresponda.
No mostrar notas internas.
Configurable qué tipos aparecen.
Mostrar únicamente notas de preparación relevantes.
Guardar origen:
- POS;
- Dashboard/manual futuro;
- delivery integration;
- import/test.
Marcar:
isTest
No mezclar con producción/reportes.
No generar efectos productivos.
Separar de SaleStatus.
Ejemplo:
- DRAFT
- OPEN
- SENT_TO_KITCHEN
- READY
- COMPLETED
- CANCELLED
La implementación final puede simplificar estados, pero debe evitar ambigüedad.
Ejemplo:
- DRAFT
- PAYMENT_PENDING
- COMPLETED
- VOIDED
- PARTIALLY_REFUNDED
- REFUNDED
Separado.
Separado.
Separado.
Separado.
Separado.
No modelar una venta compleja únicamente como:
success = true/false
Debe ser posible saber:
- venta completada;
- pago;
- fiscal;
- sync;
- kitchen;
- printing.
Dashboard puede mostrar:
```
18:42 Order created
18:43 Sent to Kitchen
18:55 Kitchen dispatched
18:58 Payment completed
18:58 Receipt printed
18:59 Cloud synced
```
Adaptar eventos reales.
Relacionar subsistemas.
Útil para soporte.
Reintentar impresión:
NO vuelve a cobrar.
Reintentar KDS:
NO vuelve a descontar inventario.
Reintentar fiscal:
NO crea una segunda venta.
Reintentar sync:
NO duplica.
Permitir búsqueda local de históricos recientes en POS.
Para históricos no locales:
consultar cloud cuando haya Internet.
Si un recibo antiguo no está en cache local:
mostrar:
Se requiere conexión para recuperar este recibo.
Descargar snapshot.
Crear nuevo PrintJob.
No reconstruir usando catálogo actual.
Registrar:
- usuario;
- receipt;
- dispositivo;
- hora;
- motivo cuando la política lo requiera.
Configurable:
COPIA / REIMPRESIÓN
Preparar posibilidad de:
- email;
- QR;
- enlace seguro.
No necesaria para completar v1.
Si se implementa:
token aleatorio seguro.
No utilizar IDs secuenciales públicos.
El enlace no debe permitir enumerar recibos de otros clientes.
No debe revertir venta.
Enviar un recibo solicitado no significa automáticamente consentimiento de marketing.
Puede permitir:
- QR de recibo;
- QR de reseña;
- loyalty.
Mantenerlos configurables.
Utilizar bloques/configuración segura.
No ejecutar HTML/JavaScript arbitrario proporcionado desde settings.
Guardar versión del template utilizado cuando sea necesario para reproducción.
Soportar:
- 58 mm;
- 80 mm.
No asumir ancho fijo.
Probar:
- nombres largos;
- comentarios;
- muchos modificadores;
- 100 líneas;
- múltiples impuestos.
No cortar precios/totales.
Tarjeta debe poder expandirse/scroll cuando sea necesario.
No ocultar artículos.
Lista puede hacer scroll.
Mantener total visible cuando el layout lo permita.
En tablet/PC mantener resumen de orden accesible.
Recomendado.
Mantener visible:
- turno;
- tiempo;
- modalidad.
Default:
orden de llegada.
No reordenar constantemente por pequeñas actualizaciones.
Si una orden se marca prioridad:
puede ir al frente.
Mostrar indicador.
Animación breve.
No distraer permanentemente.
Una comanda no desaparece por tiempo.
Requiere transición explícita.
Mantener suficiente historial local reciente.
Histórico completo puede residir en cloud.
No hardcodear una duración sin documentarla.
Preparar datos para:
- tiempo promedio;
- órdenes;
- retrasadas;
- tiempo por estación.
No contaminar el flujo principal.
Definir claramente desde qué momento corre.
Recomendación:
desde confirmación/envío inicial a producción.
Guardar timestamp explícito.
Calcular mediante timestamp.
Al restaurar una comanda:
definir si conserva tiempo original.
Recomendación:
sí, conservar tiempo operacional original y registrar restauración.
Una cancelación debe ser visualmente clara.
No simplemente desaparecer sin que cocina la vea cuando ya había sido recibida.
Puede requerir:
- supervisor;
- motivo;
- notificación KDS.
Preparar futura relación con merma.
Módulo/flujo para registrar:
- producto/ingrediente;
- cantidad;
- motivo;
- empleado;
- fecha.
Configurables:
- daño;
- vencimiento;
- preparación;
- devolución no reutilizable;
- error.
Puede requerir supervisor según política.
Debe requerir:
- cantidad;
- motivo;
- usuario;
- auditoría.
No permitir simplemente escribir “stock = 50” sin movimiento.
Preparar conteos físicos/cycle counts.
No necesario para v1 si el inventario actual ya maneja conteos.
Preparar transferencias entre sucursales.
Debe generar:
- TRANSFER_OUT;
- TRANSFER_IN.
Separar del precio de venta.
Permisos para ver costos/márgenes deben ser específicos.
Si reportes históricos de margen lo requieren:
guardar/derivar costo histórico apropiado.
No utilizar costo actual para recalcular margen pasado sin documentar.
Definir posteriormente:
- promedio;
- FIFO;
- estándar;
según sistema de inventario/contabilidad.
No inventar ahora.
Un cajero no debe acceder automáticamente a:
- costos;
- márgenes;
- ventas globales;
- auditoría.
Separar reports.view de reports.export cuando sea útil.
Específico.
Específico.
Específico.
Ejemplo:
products.cost.read
Muy sensible.
Separar de empleado básico.
Un usuario no debe poder otorgarse privilegios superiores mediante edición de su propio rol.
Dashboard puede permitir:
Duplicar rol
para crear variantes.
Si un rol está asignado:
no borrarlo directamente.
Migrar usuarios o archivar.
Antes de publicar:
mostrar:
Este cambio afectará a X empleados.
Un empleado puede pertenecer a una o varias sucursales.
Opcional.
En POS fijo:
el dispositivo/register determina principalmente la sucursal.
No puede iniciar sesión en esa caja.
Registrar dónde marcó entrada/salida.
Permitir número interno opcional.
Por:
- nombre;
- email;
- teléfono;
- número.
Al dar de baja:
guardar fecha.
No borrar.
Mantener empleados POS desacoplados de un módulo completo de RRHH.
Puede integrarse posteriormente.
CSV/XLSX.
No construir nómina completa dentro del POS como efecto secundario de Time Clock.
Puede existir módulo separado futuro.
Preparar extensibilidad.
No necesarios para v1.
Preparar:
- Person
- Business
No obligar a utilizar Razón Social/RNC para

Continúo exactamente desde el 866, completando ese punto y manteniendo la numeración correlativa.
:

Preparar como mínimo:
- Person / Persona
- Business / Empresa
No obligar a utilizar:
- Razón Social;
- RNC;
para un cliente consumidor que no los requiera.
Para clientes empresariales/fiscales, activar las validaciones correspondientes.
Cuando el cliente solicite un comprobante que requiera identificación fiscal:
validar los campos necesarios antes de emitir.
No inventar datos faltantes.
Desde WTF POS permitir creación rápida cuando el empleado tenga permiso.
Campos mínimos configurables:
- Nombre
- Teléfono
Después el cliente puede completarse desde Dashboard.
Si se selecciona Crédito Fiscal:
solicitar la información fiscal requerida.
No permitir emitir un documento fiscal empresarial con datos incompletos cuando la regulación/provider lo impida.
Buscar por:
- nombre;
- teléfono;
- RNC;
- correo.
Optimizar para operación rápida.
Puede mostrar clientes utilizados recientemente.
No es obligatorio.
Dashboard puede mostrar:
- ventas;
- última compra;
- total comprado;
- tickets;
- devoluciones.
Respetar permisos.
Crédito/cuentas por cobrar no forman parte automáticamente de v1.
No confundir historial de compras con saldo por cobrar.
Preparar posibilidad administrativa futura de fusionar duplicados.
Nunca perder referencias históricas.
Un cliente archivado:
- conserva historial;
- no aparece por defecto en selección;
- puede restaurarse.
Solo considerar eliminación/anonymization cuando sea legal y no destruya obligaciones contables/fiscales.
Implementar validación de formato/check digit únicamente basándose en reglas oficiales verificadas.
No inventar algoritmos.
Si posteriormente se integra un servicio oficial/autorizado:
hacerlo mediante adapter.
No bloquear la creación básica del cliente porque un servicio externo esté caído, salvo que el flujo fiscal realmente lo requiera.
Permitir mapear encabezados diferentes.
Ejemplo:
Telefono
→
Phone
Mostrar preview.
Por fila mostrar:
- válida;
- warning;
- error;
- duplicada.
Opciones:
- Omitir
- Actualizar existente
Solo actualizar cuando exista una coincidencia suficientemente confiable.
Preparar modelo para:
Producto normal.
Precio introducido durante venta con permiso.
No afecta inventario.
Futuro/si se implementa.
No crear tipos innecesarios si el alcance inicial no los utiliza.
Si se habilita:
solicitar precio.
Aplicar:
- mínimo/máximo opcional;
- permiso;
- auditoría.
No permitir valores negativos.
Separado de Open Price.
Producto con precio fijo puede permitir override solo con permiso.
Registrar:
- precio original;
- nuevo precio;
- usuario;
- supervisor;
- motivo.
Separar:
- active;
- archived;
- availableForSale.
Un producto puede estar disponible en una sucursal y no en otra.
Permitir precios por sucursal mediante PriceBook/configuración.
No duplicar el producto completo.
Un artículo puede tener:
- uno;
- varios;
- ningún impuesto;
según reglas configuradas.
La modalidad puede cambiar qué reglas fiscales se aplican.
El TaxEngine debe resolver la combinación.
Los impuestos deben poder aplicarse a artículos específicos, tal como requiere el sistema original.
Preparar posibilidad de artículo exento cuando corresponda.
Si existe necesidad real:
modelarlo explícitamente.
No implementar reglas fiscales inventadas.
Si varias reglas coinciden:
definir precedencia explícita.
Ejemplo conceptual:
1. regla específica producto/modalidad;
2. categoría;
3. default de sucursal.
La regla definitiva debe documentarse.
Los cambios de impuestos pueden tener:
- effectiveFrom;
- effectiveTo.
No reescribir ventas anteriores.
Dashboard debe detectar reglas incompatibles/duplicadas antes de publicar.
Crear casos versionados con:
- precio;
- modalidad;
- artículo;
- configuración;
- resultado esperado.
Ejecutarlos en POS/backend.
Mismo principio.
Si Android y backend implementan motores separados:
ejecutar los mismos test vectors en ambos.
Backend es autoridad de validación cloud.
Una venta offline puede calcularse localmente, pero al sincronizar debe verificarse con la versión/reglas registradas.
Guardar versión cuando ayude a explicar transacciones offline/históricas.
Cada venta puede registrar:
- pricingConfigVersion;
- taxConfigVersion;
o referencia equivalente.
Si una orden abierta utiliza configuración antigua y el administrador desea aplicar nueva:
acción explícita:
Actualizar precios
Mostrar diferencias.
No hacerlo silenciosamente.
Ejemplo:
```
WTF Burger
RD$550 → RD$575

Total
RD$1,250 → RD$1,300
```
Definir si descuentos pueden combinarse.
No dejar comportamiento accidental.
Definir orden de aplicación:
- item discounts;
- order discounts;
- taxes;
según reglas empresariales/fiscales.
Documentar.
No permitir que descuentos produzcan total negativo.
Puede producir total cero cuando esté autorizado.
Registrar como cortesía/descuento.
Debe poder completarse sin un pago ficticio si la política lo permite.
Mantener registro de la razón.
Soportar vigencia.
Configurable por sucursal.
Configurable.
No mezclar descuentos simples con un motor promocional avanzado.
Promociones futuras pueden incluir:
- 2x1;
- happy hour;
- bundles;
- horarios.
No son requisito automático de v1.
Una opción puede:
- sumar;
- restar cuando esté permitido;
- no cambiar precio.
Permitir cantidad de extras cuando sea necesario.
Ejemplo:
2 × Extra queso.
Una opción puede marcarse temporalmente no disponible.
Puede variar por sucursal.
Puede tener nombre corto para cocina.
Ejemplo:
Display:
Sin cebolla caramelizada
Kitchen:
SIN CEBOLLA
Puede reutilizar displayName o una variante configurada.
Guardar nombre/precio seleccionados en SaleLine.
Backend debe validar:
- min;
- max;
- required;
- option valid;
- price.
Generar delta.
No reenviar toda la comanda.
Enviar actualización identificable.
Enviar diferencia.
Ejemplo:
2 → 3:
ADD 1
3 → 1:
VOID 2
según protocolo.
KDS debe destacar modificaciones recientes.
Ejemplos:
- AGREGADO
- CAMBIO
- CANCELADO
Cada delta requiere idempotencia.
Una configuración nueva de routing no debe mover silenciosamente líneas ya enviadas.
Aplicar a nuevos eventos según política.
Una línea puede enviarse a más de un destino cuando se configure.
Ejemplo:
impresora + KDS.
Cada destino mantiene delivery status independiente.
Por destino:
- PENDING
- SENT
- ACKNOWLEDGED
- FAILED
Reintentar por destino.
No crear nueva KitchenOrder.
Ejemplo:
KDS falla → printer backup.
Debe configurarse explícitamente.
Dashboard puede consultar histórico completo de cocina.
Tablet mantiene histórico reciente suficiente para recuperación operacional.
Puede ser:
- libre;
- PIN supervisor;
- rol cocina autorizado;
según configuración.
Configurable como obligatorio/opcional.
Siempre registrar.
Guardar timestamps suficientes para calcular:
- received;
- started;
- ready;
- dispatched.
Si se utiliza Simple Mode, conservar al menos received/dispatched.
Documentar qué significa:
Tiempo de preparación
No mezclar:
- tiempo hasta listo;
- tiempo hasta despachado.
Dashboard puede incluir:
- órdenes;
- tiempo promedio;
- retrasadas;
- por estación;
- por período.
P1 o posterior según prioridad.
Configurable por estación.
Defaults de color continúan siendo:
- 10;
- 20;
- 30 minutos;
hasta que se configure otra política.
Además del color mostrar:
- icono;
- texto;
- tiempo.
Permitir tamaño de tarjeta apropiado para:
- 8";
- 10";
- pantallas mayores.
No reducir tipografía a niveles ilegibles para mostrar más comandas.
Al despachar:
reorganizar automáticamente.
No dejar páginas vacías entre páginas con contenido.
Si se utiliza paginación por hojas:
swipe natural.
Mostrar indicador:
1 / 3
cuando sea útil.
Historial debe paginarse.
Permitir buscar por:
- turno;
- ticket;
- hora;
cuando sea útil.
Un CDS debe saber con qué POS/Register está asociado.
Cambiar asociación requiere autorización.
Cuando POS crea nueva venta:
crear/activar DisplaySession.
Al conectar/reconectar:
enviar snapshot completo.
Después pueden utilizarse deltas.
Formato recomendado:
2 × WTF Burger
Mostrar total de línea.
Mostrar modificadores relevantes para el cliente.
Mostrar descuento de forma clara.
Usar nombres configurados.
El total debe provenir del snapshot calculado/autorizado por POS/domain.
CDS no ejecuta TaxEngine independiente.
Si existe integración real:
puede mostrar:
Procesando pago...
No mostrar información sensible.
Mostrar mensaje genérico:
Consulte con el cajero.
No mostrar errores internos.
Opcionalmente mostrar:
Su cambio: RD$X
Configurable.
Después del mensaje final:
mantenerlo durante un período razonable/configurable.
Después:
idle.
Si POS cancela venta:
limpiar sesión y regresar a idle.
No mezclar la próxima venta con la anterior.
Al reconectar:
validar displaySessionId.
Puede reservarse un área para branding/promoción.
Nunca debe ocultar el total durante una venta.
Dashboard puede administrar:
- imágenes;
- mensajes;
- QR.
No requisito P0.
No reproducir promociones con audio automáticamente.
Permitir:
- español;
- inglés;
y arquitectura extensible.
Configurar qué información se imprime.
No imprimir información innecesaria.
Mostrar método(s) de pago de manera apropiada.
No imprimir datos sensibles de tarjeta.
Puede mostrar:
- recibido;
- cambio.
Cuando corresponda mostrar campos exigidos por la integración/regulación real.
Mostrar de forma destacada cuando esté activo.
Los comentarios de preparación solo aparecen en recibo si el setting lo permite.
Arquitectura preparada para:
- fiscal;
- digital receipt;
- review;
según configuración.
No colocar QR ficticio.
Optimizar para impresora térmica.
Si falla:
imprimir texto/continuar.
Venta permanece completada.
Mostrar:
Venta completada. No fue posible imprimir el recibo.
Botón:
Reintentar impresión
Por defecto una reimpresión no debe abrir la gaveta.
Mantener templates separados.
Como mínimo:
- turno;
- hora;
- modalidad;
- artículos;
- cantidades;
- modificadores;
- comentarios.
No necesita información financiera salvo configuración específica.
Cambios posteriores deben imprimirse como:
- AGREGADO;
- CANCELADO;
- MODIFICADO.
No reimprimir toda la orden sin indicación porque puede causar duplicación en preparación.
Debe indicar:
PRUEBA — NO PREPARAR
Probar caracteres:
- á;
- é;
- í;
- ó;
- ú;
- ñ;
- Ñ;
- RD$.
Implementar fallback apropiado según code page de impresora.
Cuando sea detectable:
mostrar error.
PrintJob permanece pendiente/fallido.
Mismo principio.
No afirmar “sin papel” si el protocolo/modelo únicamente informa “sin respuesta”.
Mostrar el estado que realmente pueda determinarse.
Si la gaveta no abre:
la venta puede seguir completada.
Mostrar alerta operacional.
Utilizar API de cámara/scanning estable.
No enviar imágenes a cloud únicamente para leer barcode si puede resolverse localmente.
Solicitar permiso únicamente cuando el usuario utilice scanner o cuando la feature lo requiera.
Preferir barcode único por organización/catálogo.
Detectar duplicados.
Dashboard debe impedir o advertir claramente.
No permitir que scanner seleccione aleatoriamente uno de dos productos.
SKU debe ser único dentro del ámbito definido.
La prioridad definida en el punto 333 debe mantenerse:
1. barcode exacto;
2. SKU exacto;
3. nombre exacto;
4. comienza con;
5. coincidencia parcial.
Puede permitir marcar artículos favoritos para acceso rápido.
No duplicar entidades.
Administrador puede ordenar categorías para POS.
Permitir ordenar productos dentro de categoría cuando sea útil.
Debe mostrar como mínimo:
- nombre;
- precio;
- disponibilidad.
Imagen opcional.
Mostrar:
- nombre;
- precio;
- categoría/metadata útil;
- disponibilidad.
El modal solicitado

Continúo exactamente desde el 995, completando ese punto y siguiendo la numeración correlativa.
:

El modal solicitado para seleccionar la distribución de artículos debe mostrar una representación visual suficientemente clara de ambas opciones.
Opciones:
Mostrar ejemplo de varios artículos como tarjetas.
Mostrar ejemplo de artículos distribuidos verticalmente.
El preview debe adaptarse al dispositivo actual:
- si WTF POS está ejecutándose en móvil, mostrar preview móvil;
- si está ejecutándose en tablet, mostrar preview correspondiente;
- si la versión PC está ejecutándose en escritorio, mostrar preview desktop.
No utilizar una imagen fija que represente incorrectamente todos los tamaños.
En la parte inferior:
Cancelar
Aceptar
Cancelar:
no modifica la configuración.
Aceptar:
guarda la selección y actualiza la pantalla de artículos.
La preferencia debe persistir después de:
- cerrar WTF POS;
- reiniciar aplicación;
- reiniciar dispositivo.
Puede ser una preferencia por usuario o dispositivo según arquitectura seleccionada.
No es necesario sincronizar esta preferencia entre todos los dispositivos si se considera preferencia local.
Documentar la decisión.
Opciones exactas:
Seguir tema del sistema operativo.
Forzar modo oscuro.
Forzar modo claro.
Persistir selección.
Si se utiliza:
Usar ajuste del dispositivo
responder a cambios del sistema cuando sea apropiado.
No implementar modo oscuro mediante inversión automática de colores.
Definir tokens específicos para:
- background;
- surface;
- primary;
- secondary;
- text;
- border;
- warning;
- error;
- success.
KDS puede utilizar un esquema optimizado propio.
Los colores de tiempo crítico deben mantener contraste suficiente.
CDS debe mantener branding y legibilidad.
Utilizar recursos de idioma oficiales de la plataforma.
No construir un selector paralelo innecesario si Android soporta idioma por aplicación.
Si un texto no existe en el idioma seleccionado:
utilizar idioma base definido.
No mostrar keys técnicas.
El idioma del recibo puede configurarse independientemente cuando el negocio lo requiera.
Puede utilizar el idioma configurado para ese dispositivo/estación.
Puede utilizar idioma de sucursal/dispositivo.
Utilizar keys estables.
No utilizar textos completos como IDs cuando complique mantenimiento.
Respetar locale para presentación.
Mantener almacenamiento interno consistente.
Utilizar formatter centralizado.
No concatenar manualmente:
"RD$" + amount
en múltiples componentes.
Separadores de miles/decimales deben ser consistentes.
El usuario puede escribir montos de forma natural.
Parser debe manejar formato local sin producir ambigüedad.
No aceptar múltiples separadores inválidos.
Productos normales:
cantidades enteras por defecto.
Productos que admitan fracciones:
habilitar explícitamente.
Para:
- efectivo;
- cantidad;
- PIN;
utilizar teclado numérico apropiado.
Ocultar dígitos visualmente después de entrada breve cuando sea apropiado.
No permitir copiar PIN.
Exactamente:
4–6 dígitos numéricos.
Evaluar si dos empleados pueden tener el mismo PIN.
Recomendación:
evitar PIN duplicado dentro del ámbito donde se selecciona empleado implícitamente.
Si primero se selecciona empleado, la unicidad global puede no ser técnicamente necesaria.
Documentar la decisión.
Opción recomendada:
1. seleccionar empleado;
2. introducir PIN/biometría;
3. validar;
4. entrar.
En dispositivos compartidos puede mostrar empleados autorizados de esa sucursal.
No mostrar empleados archivados/inactivos.
Opcional.
No requerido.
Después de un período configurable de inactividad:
bloquear interfaz y solicitar PIN.
No cerrar turno automáticamente.
Persistir orden antes de bloquear.
Si se cambia de empleado durante una orden:
definir:
- quién es owner/server de la orden;
- quién realizó cambios;
- quién cobró.
No sobrescribir autoría histórica.
Guardar:
createdByEmployeeId
Guardar cuando corresponda:
assignedEmployeeId
Guardar:
completedByEmployeeId
o actor del pago.
Permitir definir/filtrar por:
- creador;
- camarero asignado;
- cajero que completó.
No mezclar métricas sin etiqueta.
Seleccionar una definición default para WTF y documentarla.
Mantener los campos necesarios para otras vistas.
Configurable si imprime:
- cajero;
- camarero;
- ambos.
Al seleccionar cliente:
el POS puede mostrar discretamente si posee:
- RNC;
- razón social;
- dirección fiscal.
No llenar la pantalla principal con datos innecesarios.
Cuando un tipo de comprobante lo requiera:
validar cliente antes de continuar.
Para ventas que no requieren cliente específico:
permitir consumidor genérico según configuración/fiscalidad válida.
No inventar datos fiscales.
Durante cobro o antes, permitir seleccionar tipo de comprobante cuando corresponda.
Ejemplo:
La UX definitiva debe evitar errores del cajero.
Configurable por sucursal.
Puede ser Consumidor Final cuando corresponda legalmente.
Si cambia a Crédito Fiscal:
solicitar/validar cliente.
Antes de emisión puede mostrar tipo, pero no consumir número/secuencia innecesariamente.
Definir el momento exacto según provider/regulación.
No asignar números prematuramente si eso genera huecos inválidos.
No reutilizar un número si la normativa/provider indica que quedó consumido.
Registrar estado.
No asumir que toda emisión fiscal puede realizarse offline.
Diseñar política basada en el mecanismo real.
Si el provider/regulación permite rangos offline:
asignarlos de manera segura por dispositivo/register.
No permitir colisiones.
Dashboard puede mostrar:
- conectado;
- degradado;
- caído;
- último éxito.
Si provider falla repetidamente:
aplicar backoff/circuit breaker.
No bombardearlo.
Job/proceso para revisar:
- pending;
- rejected;
- unknown.
Configuración/reportes deben permitir ver documentos con problemas.
Cambios de:
- secuencias;
- provider;
- credenciales/config;
- tipo;
deben auditarse.
Nunca guardar secretos completos en audit.
Gestionar mediante secret manager/environment seguro.
No Dashboard en texto plano salvo mecanismo seguro diseñado específicamente.
Preparar:
```
PaymentProvider
 ├── ManualCash
 ├── ManualCard
 ├── ManualTransfer
 └── IntegratedProviderFuture
```
Separar.
Ejemplo:
PaymentMethod:
Visa Terminal
Provider:
ManualExternalTerminal
Métodos pueden requerir:
- número de aprobación;
- referencia;
- últimos dígitos permitidos cuando sea apropiado.
Nunca CVV.
Debe permitir registrar que el pago ocurrió en una terminal externa.
Puede solicitar:
- referencia;
- autorización;
según configuración.
Si todavía no existe side effect:
permitir regresar.
No asumir cancelación local.
Verificar provider.
Antes de completar:
puede volver.
Después de completar:
utilizar refund/void según reglas.
Cada componente crea un Payment independiente.
Ejemplo:
```
Total RD$1,000

Cash      RD$400
Card      RD$600
----------------
Remaining RD$0
```
Mientras falta saldo:
venta permanece PAYMENT_PENDING.
Efectivo puede producir cambio según reglas.
Otros métodos normalmente no deben exceder saldo.
Debe saber qué pagos pueden devolverse y cómo.
Propina no es requisito original.
Si se agrega posteriormente:
modelarla separada de impuestos/precio.
El cargo de servicio/“10% Ley” solicitado debe modelarse mediante una regla fiscal/cargo configurable y no como texto hardcodeado.
Su tratamiento contable/fiscal definitivo debe validarse conforme a la normativa aplicable.
Si el 10% y otros cargos no son técnicamente impuestos en la arquitectura final:
crear concepto:
ChargeRule
separado de TaxRule.
Guardar:
- nombre;
- rate;
- base;
- amount.
Mostrar claramente separado cuando corresponda.
Igual.
Reportar separado de impuestos si el modelo contable lo requiere.
Comer aquí puede activar el cargo.
Para llevar/Delivery/Apps Delivery pueden no activarlo según configuración.
No obligar a que todas las modalidades compartan las mismas reglas.
Si el negocio requiere precio incluido:
el motor debe poder resolverlo matemáticamente.
El motor debe manejar combinaciones configuradas sin depender del orden accidental de código.
Crear:
PRICING_AND_TAX_SPEC.md
Documentar fórmulas y orden de operaciones.
Este documento debe incluir ejemplos numéricos verificables.
Definir explícitamente:
- escala;
- método;
- punto de redondeo.
Utilizar una sola política coherente.
Si existe una diferencia inevitable por redondeo:
registrarla explícitamente si el modelo lo requiere.
No esconder centavos mediante ajustes arbitrarios.
Subtotal
− descuentos
- impuestos
- cargos
=
Total
Debe reconciliar exactamente con los componentes del snapshot.
Suma de pagos netos aplicados debe coincidir con total debido, considerando refunds/cambio según modelo.
Reportes deben utilizar los mismos registros financieros.
CDS recibe exactamente esos totales.
Nunca recalcular una venta histórica con TaxEngine actual para mostrar su total.
Definir cuándo una venta genera consumo definitivo.
Recomendación:
al completar venta.
Si Open Ticket enviado a cocina reserva stock:
utilizar reserva separada.
Cancelar ticket:
libera reserva.
Completar venta:
convertir/consumir reserva sin descontar doble.
Si la cocina prepara antes del cobro:
la reserva ayuda a reflejar compromiso operacional.
Puede generar sugerencia de merma.
No crear merma automáticamente sin confirmación.
Refund no significa automáticamente que el artículo volvió físicamente a inventario.
Solicitar decisión/regla.
Cuando feature activa:
generar resumen de artículos:
- low;
- out.
Evitar un email por cada movimiento.
No afecta ventas.
No crear cientos de alertas idénticas mientras un artículo permanece bajo.
Crear alertas con:
- type;
- severity;
- resource;
- branch;
- createdAt;
- acknowledgedAt;
- resolvedAt.
- CRITICAL
- WARNING
- INFO
Fingerprint por:
- type;
- resource;
- branch.
Marcar revisada no elimina la causa.
Cuando condición desaparece:
marcar resuelta.
Critical:
- payment reconciliation;
- fiscal range exhausted;
- DB unavailable.
Warning:
- KDS offline;
- printer offline;
- low stock;
- device outdated.
Info:
- update available.
Separar de Business Dashboard.
Owner/Admin puede acceder a:
Estado del sistema
Mostrar resumen:
- POS;
- KDS;
- CDS;
- printers;
- sync.
Una impresora offline no significa que la sucursal completa esté “caída”.
Mostrar granularidad.
Administrador puede añadir nota:
“Tablet cocina izquierda”.
Campo opcional para inventario de hardware.
No depender de identificadores Android restringidos.
Puede introducirse manualmente cuando sea útil.
Definir cómo se distribuyen nuevas APK:
- MDM futuro;
- descarga administrada;
- instalación manual controlada.
No implementar auto-update inseguro.
Dashboard puede indicar versiones antiguas.
Backend puede definir versión mínima.
No bloquear una caja en plena operación sin una estrategia segura salvo incompatibilidad crítica.
Permitir rollout gradual cuando sea técnicamente posible.
Solo cuando exista razón:
- seguridad crítica;
- protocolo incompatible;
- corrupción.
No actualizar/resetear de forma que se pierdan operaciones pendientes.
Debe preservar turno.
Debe preservar.
Debe preservar/reconstruir.
Debe conservar pairing/config.
Configuración → Acerca de.
Mostrar:
- versión;
- build;
- device ID parcial;
- environment;
- protocol.
Botón:
Copiar información de diagnóstico
sanitizada.
Incluir:
- WTF POS/KDS/CDS;
- versión;
- licencias cuando corresponda;
- política/ayuda.
Cumplir licencias de dependencias/assets.
No incluir SDK publicitario en aplicaciones POS/KDS/CDS.
Minimizar tracking.
Si se utiliza:
enfocada en:
- crash;
- performance;
- reliability.
No capturar datos de clientes innecesariamente.
Considerar protección de

<!-- PARTE 5 | attachment=7c4f1d6c-6a11-4eb4-bee0-c598944de814 | rango=1-5 -->

Continúo exactamente desde el 1117, completando ese punto y manteniendo la numeración correlativa.
:

Considerar protección de contenido sensible cuando WTF POS aparece en el selector de aplicaciones de Android.
No es necesario ocultar indiscriminadamente toda la interfaz, pero evitar exponer innecesariamente:
- datos de clientes;
- información administrativa;
- información financiera sensible;
- pantallas de autenticación.
Aplicar mecanismos oficiales de Android cuando la política de seguridad lo requiera.
Definir política por pantalla.
Pantallas operacionales normales pueden permitir screenshots si ayudan a soporte.
Pantallas especialmente sensibles pueden restringirlas.
No bloquear screenshots globalmente sin necesidad.
No copiar automáticamente:
- PIN;
- tokens;
- credenciales;
- datos sensibles.
Si se permite copiar información de diagnóstico:
sanitizarla.
Notificaciones Android no deben mostrar información sensible innecesaria en lock screen.
Utilizar únicamente cuando aporten valor.
Ejemplos:
- sync crítico;
- dispositivo requiere atención;
- KDS cuando la arquitectura lo necesite.
No abusar de high-priority notifications.
Si se utilizan notificaciones/sonidos para nuevas comandas:
crear configuración de canal apropiada.
Permitir al administrador ajustar el comportamiento mediante mecanismos normales de Android.
Implementar mediante mecanismo compatible con Android moderno.
No depender de procesos background eternos que el sistema operativo pueda finalizar.
Utilizar únicamente cuando sea técnicamente necesario y cumpla las políticas de Android.
No mantener un foreground service sin justificación.
Para sync diferido/reintentos utilizar mecanismos apropiados como WorkManager o equivalente según arquitectura.
Durante operación activa puede mantenerse conexión realtime.
Si el proceso muere:
la persistencia local garantiza recuperación.
KDS dedicado puede mantener conexión mientras está operativo, respetando lifecycle y políticas Android.
Igual.
Detectar cambios razonablemente:
- Wi-Fi → otra red;
- pérdida de LAN;
- regreso de Internet.
Reevaluar endpoints/discovery sin borrar pairing.
Si cambia IP por DHCP:
el deviceId permanece.
Discovery puede localizarlo nuevamente.
Mismo principio.
Si no existe discovery compatible:
permitir actualizar IP desde configuración.
No crear una nueva impresora histórica necesariamente.
No depender exclusivamente de ICMP ping.
Preferir:
- TCP connection;
- health endpoint;
- protocol handshake.
Debe verificar realmente:
- conexión;
- autenticación;
- protocolVersion.
No solo que una IP responda.
Mismo principio.
Utilizar las capacidades reales del protocolo/modelo.
No afirmar un estado que no pueda verificarse.
Separar:
- Internet;
- API;
- authentication;
- sync.
Comparar reloj del dispositivo con una fuente confiable cuando esté online.
Advertir si existe una desviación significativa que pueda afectar:
- auditoría;
- fiscal;
- businessDate;
- timers.
No utilizar el reloj local como única autoridad para:
- expiraciones críticas;
- secuencias;
- seguridad.
Guardar timestamps de servidor cuando estén disponibles.
El cronómetro puede utilizar timestamps persistidos.
Si existe desviación de reloj entre POS/KDS:
utilizar información de sincronización/protocolo para evitar resultados absurdos.
Eventos cloud importantes deben registrar cuándo fueron recibidos.
Cuando el orden sea importante:
utilizar sequence/revision.
No confiar únicamente en createdAt.
Utilizar identificadores globales robustos.
No exponer IDs secuenciales sensibles innecesariamente.
Para usuario utilizar:
- ticket;
- turn number;
- receipt number;
- NCF.
No utilizar UUID largo como identificador principal visible.
Puede mostrar una versión abreviada del correlationId para soporte.
No deben cambiar.
Persiste aunque cambie:
- nombre;
- precio;
- categoría.
Persiste aunque cambie rol/estado.
Persiste aunque cambie teléfono/dirección.
Persiste aunque cambie nombre.
Persiste aunque se cambie hardware.
Nuevo dispositivo = nuevo deviceId.
Cada pago independiente tiene ID.
Separado del Payment final cuando exista provider externo.
Separado.
Separado.
Separado.
Separado.
Todos pueden vincularse a sale/order mediante correlation IDs/referencias.
Evitar cascade delete que pueda borrar:
- ventas;
- pagos;
- recibos;
- auditoría.
Preferir para entidades históricas cuando corresponda.
Utilizar para entidades empresariales administrables.
Cada migration debe revisarse por:
- pérdida de datos;
- locks;
- índices;
- runtime;
- compatibilidad.
No bloquear producción durante períodos largos innecesariamente.
Utilizar estrategias compatibles con la DB elegida.
Realizar mediante jobs/scripts controlados cuando sea necesario.
En tablas grandes puede aplicarse:
1. agregar nullable;
2. backfill;
3. validar;
4. convertir required.
Cuando el motor lo requiera.
Registrar versión.
Eventos persistidos/realtime deben incluir versionado cuando puedan evolucionar.
Durante rollout:
versiones nuevas deben poder manejar eventos soportados de versiones anteriores dentro de la ventana definida.
Después de confirmación y período de retención:
limpiar eventos procesados de forma segura.
No borrar pendientes.
Mantener IDs procesados suficiente tiempo para evitar replay accidental.
Monitorear.
Si crece demasiado:
generar warning.
Persistente en disco.
No memoria solamente.
Si cloud está lento:
no consumir memoria ilimitada.
Persistir y procesar gradualmente.
Ante poco almacenamiento:
eliminar assets/cache antes de datos transaccionales.
Logs locales deben tener límites.
Limitada.
Subir cuando exista Internet y política lo permita.
Monitorear crecimiento.
POS no necesita conservar localmente todos los años de ventas si están sincronizados de forma segura.
Definir política de cache/histórico.
Regla absoluta.
Mantener suficiente histórico para reimpresión operacional.
Histórico adicional puede recuperarse del cloud.
Mantener comandas activas + histórico reciente.
No conservar historial financiero innecesario.
Definir con infraestructura/política empresarial.
No inventar períodos legales.
Si el proveedor DB lo soporta:
considerarlo para producción.
Restaurar primero en ambiente aislado para investigación cuando sea posible.
Solo roles técnicos/Owner autorizados.
Registrar.
Validar schema/app version.
Verificar integridad del backup cuando sea posible.
Configuración central debe estar incluida en backups.
Un dispositivo nuevo puede descargar configuración autorizada desde cloud después de provisionarse.
Datos que solo existen en dispositivo requieren mecanismos específicos.
No asumir que cloud puede recuperarlos.
Para casos extraordinarios puede existir herramienta protegida para exportar operaciones pendientes.
No es flujo normal.
Solo herramienta técnica segura.
Debe deduplicar por IDs.
Puede permitir mover configuración entre sucursales/ambientes.
No incluir secretos.
Puede duplicar:
- categorías;
- productos;
- kitchen routing;
- receipt config.
No duplicar automáticamente:
- ventas;
- empleados;
- secuencias fiscales;
- dispositivos.
Puede existir catálogo global con overrides por sucursal.
Evitar duplicar todo el catálogo por cada sucursal.
Crear entidad raíz:
Organization
WTF – What's That Food! puede tener múltiples Branch.
Como mínimo:
- nombre;
- marca;
- moneda default;
- idioma default;
- información empresarial.
Sucursal puede sobrescribir:
- dirección;
- teléfono;
- timezone;
- business cutoff;
- receipt header;
- fiscal config;
- kitchen;
- prices.
Owner pertenece a Organization.
Puede tener scope limitado.
Owner/Admin autorizado puede comparar sucursales.
Si algún día existen monedas distintas:
no sumar directamente sin estrategia de conversión.
Inicialmente WTF puede operar en DOP donde corresponda.
Cada sucursal calcula su propio businessDate.
Mostrar timezone/sucursal cuando sea relevante.
En pantalla/export:
- período;
- sucursal;
- filtros.
Botón:
Restablecer filtros
Puede conservarse durante la sesión.
En web puede reflejar filtros en URL cuando sea seguro y útil.
Near realtime.
Pueden utilizar agregados.
Si se utilizan:
deben poder reconstruirse desde transacciones.
Si cambia fórmula:
versionar/rebuild.
Documentar cambios.
Si un reporte no es realtime:
mostrar:
Actualizado hace X
Diferenciar:
RD$0.00
de:
No hay datos
de:
No fue posible cargar los datos
Todo gráfico debe tener valores legibles/tabla o tooltip.
Seleccionar apropiadamente:
- día → hora;
- mes → día;
- año → mes.
Debe mostrar ventas por businessDate.
Mostrar:
- cantidad;
- ventas brutas;
- descuentos;
- neto;
- impuestos/cargos según diseño.
Usar categoría histórica/snapshot apropiado.
Etiquetar criterio de atribución.
Basarse en Payments, no en texto del recibo.
Listado detallado.
Cantidad + impacto monetario cuando corresponda.
Mostrar:
- descuento;
- cantidad;
- monto;
- empleados;
- autorizaciones.
Basarse en TaxSnapshots.
Mostrar:
- apertura;
- cierre;
- expected;
- counted;
- difference;
- movimientos.
Marcar claramente:
En curso
No presentar como cierre definitivo.
Separar devoluciones de ventas nuevas.
Separado.
- Comer aquí
- Para llevar
- Delivery
- Apps Delivery
Plataformas/canales.
P1/futuro según prioridad.
Mostrar:
- opening;
- movements;
- closing;
- low stock;
- negative.
Filtrar por:
- tipo;
- artículo;
- sucursal;
- fecha;
- empleado.
Filtrar por:
- actor;
- acción;
- entidad;
- fecha;
- sucursal.
Registrar exports sensibles cuando corresponda.
Nunca confiar únicamente en ocultar menú.
Evitar exportaciones síncronas ilimitadas.
Archivos temporales deben expirar según política.
No hacer públicos archivos con datos sensibles.
Si se almacenan:
acceso autorizado/token seguro.
CDS token no debe poder consultar reportes.
KDS token no debe poder crear empleados o cobrar.
Una impresora normal no requiere credencial de app, pero su acceso de red debe limitarse mediante infraestructura/configuración cuando sea posible.
Para instalaciones más grandes:
considerar red/VLAN de dispositivos POS.
No requisito v1.
No colocar POS/KDS/CDS en Guest Wi-Fi con client isolation.
Puede evaluarse segunda WAN/4G.
No necesaria para la lógica local.
Puede recomendarse UPS para:
- router;
- switch;
- POS;
- impresora crítica.
No es requisito del software.
Para instalación inicial puede crear asistente:
1. sucursal;
2. register;
3. printers;
4. KDS;
5. CDS;
6. test.
Un dispositivo nuevo debe:
1. identificar environment;
2. autenticarse/provisionarse;
3. solicitar autorización;
4. descargar configuración;
5. verificar readiness.
Un dispositivo nuevo no provisionado no puede mágicamente obtener configuración cloud.
Mostrar:
Se requiere conexión para configurar este dispositivo por primera vez.
Si existe provisioning local futuro, documentarlo.
Una vez correctamente provisionado:
puede operar offline dentro de las reglas definidas.
Definir política razonable para cuánto tiempo un dispositivo puede continuar usando credenciales/configuración cacheada sin contactar cloud.
Mostrar antes del vencimiento:
Este dispositivo deberá conectarse a Internet para renovar su autorización.
No borrar información.
Bloquear nuevas operaciones que la política no permita hasta renovar.
No crear bypass universal.
Si el negocio necesita un procedimiento de emergencia:
debe ser temporal, autorizado y auditado.
Una caída temporal del propio backend

Retomo exactamente desde el 1261.
Una caída temporal del propio backend no debe provocar que todas las cajas correctamente provisionadas queden bloqueadas inmediatamente.
Diferenciar:
- backend temporalmente inaccesible;
- dispositivo cuya autorización offline realmente expiró;
- dispositivo revocado;
- configuración inválida.
La política offline debe priorizar continuidad operacional sin eliminar controles de seguridad.
Si un dispositivo fue revocado mientras estaba completamente offline, no puede conocer inmediatamente la revocación.
Mitigar mediante:
- credenciales con expiración;
- renovación periódica;
- sincronización al reconectar;
- políticas de offline authorization.
Documentar esta limitación de sistemas distribuidos.
Al recuperar conexión:
verificar autorización antes de continuar sincronizando nuevas operaciones sensibles cuando corresponda.
Si está revocado:
- bloquear nuevas operaciones;
- conservar datos locales pendientes;
- iniciar procedimiento seguro de reconciliación.
Revocar un dispositivo nunca significa borrar automáticamente ventas pendientes.
El sistema debe permitir que un administrador autorizado recupere/reconcilie esos datos.
Cambios críticos como:
- revocación;
- permisos;
- fiscal;
- seguridad;
deben tener prioridad de sincronización sobre:
- imágenes;
- promociones;
- assets no críticos.
Sincronizar catálogo incrementalmente cuando sea posible.
No descargar necesariamente todo el catálogo ante cada cambio.
Registrar versión/revisión.
Cambios posibles:
- CREATE
- UPDATE
- ARCHIVE
- AVAILABILITY
- PRICE
Los dispositivos aplican deltas de manera transaccional.
Debe existir mecanismo para reconstruir cache local si los deltas quedan inconsistentes.
No dejar el catálogo local parcialmente actualizado si una actualización crítica falla.
Aplicar transaction/staging cuando sea necesario.
Los cambios de precio deben sincronizarse con prioridad suficiente.
Un precio nuevo sincronizado no debe modificar automáticamente una orden ya abierta.
Los permisos actualizados deben invalidar/cachear correctamente.
Un empleado dado de baja debe dejar de poder iniciar nuevas sesiones después de que el dispositivo reciba la actualización.
Definir política.
Recomendación:
si el dispositivo está online y recibe una desactivación, bloquear/reautenticar la sesión.
No perder el ticket actual; persistirlo.
Marcar un producto agotado desde Dashboard debe propagarse a POS.
Cambios de:
- estación;
- thresholds;
- sonido;
- routing relacionado;
deben sincronizarse.
Cambios de:
- branding;
- idioma;
- mensaje final;
- contenido idle;
deben sincronizarse.
POS debe conservar una versión válida local para imprimir offline.
Métodos disponibles deben estar cacheados.
Configuración fiscal necesaria debe estar disponible offline según política.
Antes de aplicar:
- schema;
- signature/authenticity cuando corresponda;
- version;
- required fields;
- invariants.
Rechazar.
Conservar Last Known Good.
Enviar diagnóstico al backend.
Después de aplicar:
enviar versión aplicada.
Dashboard debe poder mostrar:
5/6 dispositivos actualizados
No asumir aplicación inmediata.
Si dispositivo está offline:
configuración queda pendiente.
Mantener historial de versiones importantes.
Registrar quién publicó.
Para cambios sensibles puede solicitar motivo.
Registrar:
- producto;
- precio anterior;
- nuevo;
- sucursal/PriceBook;
- usuario;
- fecha.
Obligatorio.
Obligatorio.
Obligatorio.
Obligatorio.
Obligatorio.
Obligatorio para características operacionales.
Antes de desactivar una característica:
verificar estado.
Ejemplo:
Shifts con turno abierto.
Open Tickets con tickets activos.
Kitchen con comandas pendientes.
Si existe turno abierto:
impedir desactivación hasta cerrarlo o ejecutar procedimiento administrativo seguro.
Si existen órdenes abiertas:
no borrarlas.
Preferir impedir desactivación hasta resolverlas.
Si existen comandas activas:
no eliminarlas.
Definir procedimiento antes de detener nuevos envíos.
WTF CDS pasa a idle.
No borrar pairing.
No borrar marcaciones históricas.
No borrar minimumStock.
Dejar de advertir/bloquear según configuración.
Inventario continúa registrándose.
No borrar modalidades históricas.
POS puede utilizar una modalidad interna/default según configuración.
Al activar una feature que requiere configuración adicional:
mostrar setup correspondiente.
No impedir guardar cuando la feature pueda permanecer configurándose, salvo que produzca un estado inseguro.
UI, backend y dispositivos deben coincidir eventualmente sobre el estado de la feature.
No mostrar ON si el cambio no pudo publicarse/aplicarse donde sea necesario sin indicar estado pendiente.
Cambios de características forman parte de configuración versionada.
Si printing está deshabilitado/no configurado:
la venta puede conservar receipt snapshot aunque no produzca papel.
Kitchen routing puede funcionar con:
- KDS;
- printer;
- ambos;
según configuración.
WTF POS no depende de CDS para completar una venta.
Si inventario está desactivado para un artículo:
la venta no genera movimientos de stock para ese artículo.
No permitir desactivar reglas fiscales necesarias para una operación únicamente para evitar un error.
La configuración debe obedecer requisitos reales.
Para completar una venta con total > 0 debe existir al menos un método válido.
Si no:
mostrar:
No hay métodos de pago activos. Solicite al administrador configurar uno.
Si Shifts está activo:
el POS debe estar asociado a un Register válido antes de abrir turno.
Si KDS está caído:
el POS puede continuar según fallback/política.
Mostrar alerta.
Si CDS está caído:
continuar.
Una impresora de recibos caída no debe borrar/revertir la venta.
Depende de las reglas reales.
Si la venta requiere obligatoriamente una operación fiscal que no puede completarse:
usar el estado/procedimiento seguro definido por provider/regulación.
No inventar éxito.
Un fallo de:
- promotions;
- email;
- CDS;
- analytics;
no debe tumbar el núcleo de ventas.
Para una venta local segura se requiere como mínimo:
- autenticación/autorización válida;
- persistencia local;
- PricingEngine;
- Tax/Charge Engine aplicable;
- payment recording;
- Sale transaction.
Ejemplos:
- CDS;
- email;
- analytics;
- promotions.
Deben estar desacoplados.
Ejemplos:
- KDS;
- printers.
Deben tener estado/fallback.
Ejemplos:
- integrated payment provider;
- fiscal provider;
cuando el flujo los requiera.
Modelar explícitamente.
Un producto puede marcarse agotado manualmente aunque inventory tracking esté desactivado.
Puede ocultarse temporalmente una categoría completa por sucursal.
Preparar posibilidad de horarios:
- desayuno;
- happy hour;
- menú nocturno.
No requisito v1.
Un artículo puede estar disponible en POS pero no en Apps Delivery o viceversa.
Preparar configuración.
Apps Delivery utiliza PriceBook correspondiente.
Configurable por Register.
Ejemplo:
caja principal abre por defecto en:
Comer aquí
pero el cajero puede cambiar.
Toda orden debe tener modalidad cuando feature esté activa.
Al cambiar modalidad:
recalcular precios/impuestos aplicables.
Mostrar cambios inmediatamente.
No debe duplicar cocina.
Si el cambio afecta preparación/routing:
generar evento específico cuando sea necesario.
No permitido como edición directa.
Utilizar corrección formal si fuera necesaria.
Permitido según reglas.
Actualizar fiscal/receipt context.
No editar venta histórica directamente.
Una orden abierta puede moverse de mesa con permiso.
Registrar cambio cuando sea relevante.
Preparar posibilidad de unir tickets/mesas.
No requisito P0.
Preparar posibilidad de dividir cuenta.
Puede ser P1/futuro según necesidad.
No confundir.
Split Payment: una venta, varios métodos.
Split Check: dividir una orden en varias cuentas.
Son funciones diferentes.
Más importante para v1 que Split Check si se requiere flexibilidad de cobro.
Guardar:
- creator;
- assigned employee;
- last modified by.
Utilizar version para detectar edición concurrente.
Si otra caja modificó la orden:
mostrar:
Esta orden cambió en otro dispositivo.
Opciones seguras:
- Recargar
- Revisar cambios
No sobrescribir silenciosamente.
Reconocer limitación si dos POS completamente desconectados editan el mismo ticket.
Definir política para evitarlo cuando sea posible:
- ownership/lock lease;
- limitar edición offline de tickets ajenos;
- conflicto al sincronizar.
Puede utilizarse online/LAN.
Debe expirar.
No dejar un ticket bloqueado eternamente porque una tablet murió.
Aunque un lock expire:
las versiones permiten detectar cambios.
Guardar última revisión enviada.
Al comenzar cobro:
evitar que otra caja modifique simultáneamente la misma orden.
Si la caja muere:
permitir recuperación segura.
No dejar ticket bloqueado permanentemente.
Antes de liberar lock:
resolver PaymentAttempt UNKNOWN.
Cancelar una orden abierta requiere:
- permiso según estado;
- motivo cuando ya fue enviada a cocina;
- kitchen cancellation;
- release inventory reservation.
Draft nunca enviado puede descartarse según política.
Una orden operacional ya enviada debe cancelarse, no desaparecer.
Registrar.
Debe poder confirmar recepción.
Mostrar incidencia/fallback.
No asumir que cocina vio la cancelación.
Mantener terminología clara:
- Cancelar orden abierta
- Anular venta
- Devolver venta
Utilizar el mismo término en:
- POS;
- Dashboard;
- documentación.
Los desarrolladores deben consultar GLOSSARY.md antes de introducir términos equivalentes nuevos.
Un ticket abierto no debe aparecer como venta completada en reportes financieros.
Puede aparecer en reportes operacionales de cocina aunque la venta aún no esté completada.
Puede incluirse en reportes operacionales, no en ventas netas.
Solo ventas en estados financieros válidos según definición.
Definir formalmente.
Definir formalmente.
No mezclar impuestos cobrados con ventas netas si la definición contable los separa.
Definir según tratamiento contable/fiscal real.
Definir en reportes:
- gross;
- refunds;
- net.
Definir.
Mostrar:
- gross before discount;

<!-- PARTE 6 | attachment=90fee492-14ad-47cf-8ad7-ffb5af13ea45 | rango=532-1 -->


## 532. HARDWARE MATRIX

Crear y mantener una matriz formal de validación de hardware para todos los componentes físicos relacionados con WTF POS Ecosystem.

La matriz debe permitir distinguir claramente entre:

1. una función implementada en código;
2. una integración probada automáticamente;
3. una integración probada mediante simulador;
4. una integración realmente probada con hardware físico.

### Formato mínimo

Utilizar una tabla equivalente a:

| Componente / Función | Unit Test | Integration Test | Simulator | Hardware físico | Estado |
|---|---:|---:|---:|---:|---|
| WTF POS Tablet | PASS | PASS | N/A | PASS/PENDING | ... |
| WTF KDS Tablet | PASS | PASS | PASS | PASS/PENDING | ... |
| WTF CDS Tablet | PASS | PASS | PASS | PASS/PENDING | ... |
| Receipt Printer LAN | PASS | PASS | PASS | PASS/PENDING | ... |
| Kitchen Printer LAN | PASS | PASS | PASS | PASS/PENDING | ... |
| Bluetooth Printer | PASS | PASS | PASS | PASS/PENDING | ... |
| USB Printer | PASS | PASS | PASS | PASS/PENDING | ... |
| Cash Drawer | PASS | PASS | PASS | PASS/PENDING | ... |
| Barcode Scanner HID | PASS | PASS | PASS | PASS/PENDING | ... |
| Camera Barcode Scanner | PASS | PASS | PASS | PASS/PENDING | ... |
| Biometric Authentication | PASS | PASS | N/A | PASS/PENDING | ... |

Adaptar las filas al hardware realmente soportado.

No incluir un dispositivo como soportado únicamente porque aparece en esta tabla de ejemplo.

---

### Niveles de validación

#### UNIT TEST

Valida la lógica interna.

Ejemplo:

`PrinterService` crea correctamente un `PrintJob`.

Esto NO demuestra que una impresora física funcione.

#### INTEGRATION TEST

Valida que varios componentes trabajen juntos.

Ejemplo:

`PrintQueue → PrinterAdapter`.

#### SIMULATOR

Valida el flujo mediante:

- VirtualPrinter;
- Fake KDS;
- Fake CDS;
- hardware simulator.

Esto permite probar:

- éxito;
- timeout;
- desconexión;
- retry;
- errores.

Pero sigue sin equivaler a una prueba física.

#### HARDWARE FÍSICO

Significa que la versión correspondiente del software fue realmente probada con el dispositivo físico identificado.

---

### ESTADOS

Utilizar estados claros:

- `NOT_IMPLEMENTED`
- `IMPLEMENTED`
- `TESTED_SIMULATOR`
- `HARDWARE_VALIDATION_PENDING`
- `HARDWARE_TESTED`
- `SUPPORTED`
- `SUPPORTED_WITH_LIMITATIONS`
- `NOT_SUPPORTED`

No utilizar simplemente:

`Works`

sin indicar qué se probó.

---

### INFORMACIÓN DEL HARDWARE

Cuando exista prueba física registrar como mínimo:

- fabricante;
- modelo;
- tipo de dispositivo;
- conexión;
- firmware cuando sea relevante;
- versión Android/Windows cuando corresponda;
- versión WTF POS/KDS/CDS;
- fecha de prueba;
- resultado;
- limitaciones conocidas.

Ejemplo:

```text
Device:
Epson TM-T20III

Type:
Receipt Printer

Connection:
Ethernet

Paper:
80 mm

WTF POS:
1.0.0-rc.2

Result:
PASS

Tested:
Receipt printing
Reprint
Special characters
Network reconnect
Paper width
Auto cut

Not Tested:
Cash drawer
```

No marcar Cash Drawer como validado en este ejemplo.

---

### IMPRESORAS

Para cada impresora física probar según capacidades:

- conexión;
- impresión de prueba;
- recibo;
- comanda;
- 58/80 mm;
- caracteres españoles;
- logo;
- QR;
- cutter;
- cash drawer;
- desconexión;
- reconexión;
- retry;
- múltiples trabajos.

Si una función no es soportada por ese modelo:

marcar:

`NOT_SUPPORTED`

y no tratarlo como error del sistema.

---

### WTF KDS

En hardware físico verificar:

- instalación APK;
- primer inicio;
- IP;
- pairing;
- recepción de orden;
- ACK;
- modificadores;
- comentarios;
- número de turno;
- timer;
- 10/20/30 minutos;
- despacho;
- historial;
- restore;
- pérdida de LAN;
- reconexión;
- reinicio de tablet;
- comandas persistentes;
- varias horas de funcionamiento.

---

### WTF CDS

Verificar físicamente:

- instalación;
- pairing;
- idle;
- productos;
- precios;
- cantidades;
- modificadores;
- subtotal;
- impuestos;
- cargos;
- total;
- actualización realtime;
- desconexión;
- reconexión;
- mensaje final;
- aislamiento entre cajas.

---

### WTF POS TABLET

Probar:

- instalación;
- login;
- PIN;
- biometría cuando exista;
- cámara;
- scanner;
- carrito;
- modificadores;
- Open Tickets;
- pago;
- impresión;
- offline;
- process restart;
- reconexión.

---

### SCANNER HID

Probar scanners USB/Bluetooth que se comporten como teclado cuando formen parte del hardware soportado.

Verificar:

- barcode correcto;
- rapidez;
- Enter suffix;
- códigos inexistentes;
- códigos duplicados;
- foco de la aplicación.

---

### CÁMARA

En dispositivos con cámara verificar:

- permiso;
- lectura;
- autofocus;
- orientación;
- iluminación razonable;
- denegación de permiso;
- reapertura de cámara;
- lifecycle.

---

### BIOMETRÍA

Probar solamente en dispositivos compatibles.

Registrar si se utilizó:

- fingerprint;
- face authentication;
- otro mecanismo oficial.

No afirmar soporte de Face ID en Android como si fuera una API universal equivalente a Apple Face ID.

Utilizar las capacidades biométricas oficiales que Android exponga.

---

### CASH DRAWER

Si se conecta mediante impresora:

registrar también:

- impresora;
- puerto;
- pulse configuration;
- apertura después de pago en efectivo;
- apertura manual autorizada;
- reimpresión sin apertura.

---

### NETWORK TEST

El hardware debe probarse bajo:

#### LAN + Internet

#### LAN sin Internet

#### Reconexión

Cuando sea aplicable.

---

### POWER/RESTART TEST

Para dispositivos críticos probar recuperación después de:

- cerrar app;
- reiniciar app;
- reiniciar dispositivo.

---

### HARDWARE VALIDATION PENDING

Si el dispositivo físico no está disponible:

NO detener la implementación.

Completar:

- interface;
- adapter;
- simulator;
- unit tests;
- integration tests.

Después marcar:

`HARDWARE_VALIDATION_PENDING`.

---

### NO FALSE SUPPORT CLAIMS

Nunca escribir:

**Compatible con todas las impresoras térmicas.**

Escribir:

**Compatible y probado con los modelos enumerados en SUPPORTED_HARDWARE.md. Otros modelos compatibles con el protocolo implementado pueden funcionar, pero requieren validación.**

---

### SUPPORTED_HARDWARE.MD

Mantener un documento separado:

`SUPPORTED_HARDWARE.md`

que contenga únicamente hardware realmente validado o su estado preciso.

---

### RELEASE GATE

Si determinado hardware es obligatorio para la operación de producción y todavía aparece:

`HARDWARE_VALIDATION_PENDING`

el sistema puede clasificarse como:

**READY FOR PILOT / HARDWARE VALIDATION**

pero no debe marcarse automáticamente:

**READY FOR PRODUCTION**

para ese flujo.

---

### EVIDENCIA

Cuando sea posible conservar:

- logs de prueba;
- test report;
- screenshots;
- modelo;
- versión;
- fecha.

La matriz debe permitir demostrar **qué se probó realmente**, no solamente qué fue programado.

<!-- PARTE 7 | attachment=66084fa6-d9d9-4a57-b1e7-772d4c251dde | rango=1370-1508 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
1370. DISCOUNT EFFECT
Los reportes financieros deben mostrar claramente el efecto de los descuentos.
Como mínimo distinguir:
- venta bruta antes de descuento;
- descuento aplicado;
- venta después de descuento;
- impuestos/cargos;
- total final.
No ocultar el valor original del producto.
1371. DISCOUNT REPORT ATTRIBUTION
Registrar:
- descuento;
- monto;
- empleado que lo aplicó;
- supervisor que autorizó cuando corresponda;
- motivo;
- venta;
- sucursal.
1372. MANUAL PRICE OVERRIDE REPORT
Crear capacidad de reportar cambios manuales de precio.
Mostrar:
- precio original;
- precio aplicado;
- diferencia;
- empleado;
- supervisor;
- motivo.
1373. COURTESY REPORT
Las cortesías deben poder identificarse por separado.
No registrarlas como si el producto tuviera precio normal de RD$0.
Conservar valor original.
1374. PAYMENT REPORT RECONCILIATION
La suma por métodos de pago debe reconciliar con Payments reales considerando:
- pagos exitosos;
- refunds;
- anulaciones;
- ajustes válidos.
1375. CASH REPORT VS SALES REPORT
No asumir:
Cash = Sales.
Una venta puede pagarse mediante:
- efectivo;
- tarjeta;
- transferencia;
- múltiples métodos.
1376. TAX REPORT RECONCILIATION
El reporte fiscal debe utilizar snapshots de impuestos/cargos de las ventas.
No recalcular con configuración actual.
1377. MODIFIER REPORT
Debe poder mostrar:
- opción;
- cantidad;
- ingreso adicional;
- producto relacionado;
- categoría;
- período.
1378. CATEGORY HISTORICAL REPORTING
Si un producto cambia de categoría:
las ventas históricas deben conservar la categoría relevante al momento de la venta cuando el reporte requiera análisis histórico.
1379. PRODUCT RENAME REPORTING
Cambiar el nombre actual no debe hacer que un reporte histórico pierda la referencia original.
Puede mostrar:
- nombre histórico;
- producto actual;
según diseño.
1380. EMPLOYEE ARCHIVE REPORTING
Un empleado archivado continúa apareciendo en reportes históricos.
1381. PAYMENT METHOD ARCHIVE REPORTING
Mismo principio.
1382. DINING OPTION ARCHIVE REPORTING
Mismo principio.
1383. REPORT DRILL-DOWN
Cuando sea útil:
permitir ir de:
Ventas por categoría
→ producto
→ recibos.
Respetar permisos.
1384. REPORT TOTAL CLICK
Un KPI puede abrir su detalle.
1385. DASHBOARD KPI DEFINITIONS
Documentar:
Ventas
Tickets
Ticket promedio
Artículos vendidos
Descuentos
Impuestos
Refunds
1386. AVERAGE TICKET
Definir fórmula explícita.
Ejemplo conceptual:
Net Sales / Completed Sales Count
pero utilizar la definición empresarial aprobada.
1387. VOIDED SALE IN KPI
No contar como venta completada.
1388. REFUNDED SALE IN KPI
Definir si ticket count permanece y cómo afecta net sales.
Documentar.
1389. TEST SALE IN KPI
Nunca incluir producción.
1390. TRAINING SALE IN KPI
Nunca incluir producción.
1391. SALES DASHBOARD REFRESH
Puede actualizarse automáticamente.
No realizar polling excesivo.
1392. DASHBOARD REALTIME
Puede utilizar WebSocket/eventos para KPIs actuales.
Si realtime falla:
fallback a refresh/polling razonable.
1393. DASHBOARD DATA FRESHNESS INDICATOR
Mostrar:
Actualizado hace X
cuando sea relevante.
1394. DASHBOARD CACHE
Puede cachear reportes costosos.
Debe invalidarse/expirar correctamente.
1395. REPORT QUERY TIMEOUT
No dejar consultas pesadas ejecutándose indefinidamente.
1396. REPORT JOB CANCELLATION
Jobs pesados pueden cancelarse cuando sea seguro.
1397. REPORT EXPORT FILE NAME
Utilizar nombres descriptivos.
Ejemplo:
WTF_Ventas_Diarias_2026-08-01_2026-08-31.xlsx
1398. REPORT EXPORT LOCALE
Columnas y fechas según idioma seleccionado.
Mantener datos numéricos correctamente tipados.
1399. REPORT EXPORT METADATA
Incluir:
- generado por;
- fecha;
- filtros;
- sucursal.
1400. REPORT PDF PAGE NUMBER
Para reportes multipágina:
Página X de Y
cuando el renderer lo permita.
1401. REPORT EMPTY EXPORT
Si no hay datos:
puede generar documento indicando:
No hay datos para los filtros seleccionados
o impedir export con mensaje claro.
1402. DASHBOARD SEARCH SECURITY
Los términos de búsqueda deben parametrizarse/sanitizarse.
1403. DASHBOARD TABLES
Soportar:
- sort;
- pagination;
- filters;
- responsive behavior.
1404. MOBILE DASHBOARD TABLES
En móvil:
convertir tablas complejas a cards/scroll horizontal de forma usable.
1405. DESKTOP DASHBOARD
Aprovechar espacio para:
- sidebar;
- filtros;
- tablas;
- paneles.
1406. DASHBOARD ACCESSIBILITY
Teclado.
Focus visible.
Labels.
Contraste.
1407. DASHBOARD DARK MODE
Puede soportarlo siguiendo design system.
No es obligatorio que coincida exactamente con POS si afecta legibilidad administrativa.
1408. DASHBOARD LANGUAGE
Español e inglés mediante i18n.
1409. DASHBOARD SESSION TIMEOUT
Configurable/seguro.
No cerrar una edición sin advertencia cuando sea posible.
1410. UNSAVED CHANGES
Si usuario intenta abandonar un formulario modificado:
advertir.
1411. OPTIMISTIC UI ADMIN
Puede utilizarse para acciones reversibles.
No mostrar éxito definitivo antes de confirmación en cambios críticos.
1412. ADMIN FORM VALIDATION
Mostrar errores junto al campo.
No solamente un toast genérico.
1413. SERVER VALIDATION DISPLAY
Mapear errores backend a mensajes comprensibles.
1414. DUPLICATE SKU ERROR
Ejemplo:
Ya existe un artículo con este SKU.
1415. DUPLICATE BARCODE ERROR
Este código de barras ya está asignado a otro artículo.
1416. DUPLICATE RNC WARNING
Mostrar cliente existente antes de crear otro.
1417. TAX CONFLICT ERROR
Explicar qué reglas entran en conflicto.
1418. FISCAL RANGE OVERLAP ERROR
Mostrar rangos implicados.
1419. DEVICE NAME DUPLICATE
Puede permitirse técnicamente, pero advertir para evitar confusión.
1420. UNIQUE INTERNAL DEVICE ID
Siempre.
1421. BRANCH CODE
Preferir código único por Organization.
1422. REGISTER CODE
Único por Branch.
1423. CATEGORY NAME DUPLICATE
Puede advertirse dentro de mismo ámbito.
No necesariamente error absoluto.
1424. PRODUCT NAME DUPLICATE
Permitido si SKU/barcode los diferencia.
No utilizar nombre como ID.
1425. CUSTOMER NAME DUPLICATE
Permitido.
1426. EMPLOYEE NAME DUPLICATE
Permitido.
1427. DATA VALIDATION NORMALIZATION
Normalizar cuidadosamente:
- emails;
- teléfonos;
- códigos.
No alterar nombres legales arbitrariamente.
1428. PHONE STORAGE
Guardar formato normalizado cuando sea posible y presentación separada.
1429. EMAIL
Normalizar case razonablemente.
Validar formato.
No intentar verificar existencia sin servicio explícito.
1430. ADDRESS
No exigir estructura excesiva.
Mantener:
- address line;
- city;
- state/province;
según requerimiento original.
1431. DOMINICAN REPUBLIC DEFAULTS
La configuración inicial puede facilitar:
- DOP;
- Español;
- formatos locales;
pero no hardcodear de manera que impida otras sucursales/mercados.
1432. COUNTRY CONFIG
Preparar campo country cuando sea necesario para:
- dirección;
- fiscal;
- moneda;
- timezone.
1433. FISCAL COUNTRY SCOPE
Las reglas B01/B02/E31/E32 son específicas de la configuración dominicana correspondiente.
No aplicarlas automáticamente a sucursales de otros países.
1434. US BRANCH FUTURE
Si WTF utiliza sucursal en Estados Unidos:
debe poder utilizar reglas fiscales/precios/configuración diferentes.
No intentar aplicar DGII allí.
1435. TAX ENGINE JURISDICTION
Preparar concepto de jurisdicción/configuración por Branch.
1436. MULTI-CURRENCY FUTURE
No necesario inicialmente, pero evitar asumir que todas las organizaciones del sistema usarán siempre DOP.
1437. CURRENCY PER SALE
Guardar currency en snapshot.
1438. NO CROSS-CURRENCY SUM
Si aparecen monedas diferentes:
no sumar sin conversión explícita.
1439. RECEIPT CURRENCY
Utilizar currency de la venta.
1440. PAYMENT CURRENCY
Debe coincidir o manejar conversión explícita futura.
1441. TAX CURRENCY
Derivada de venta.
1442. INVENTORY QUANTITY UNIT
Separar cantidad de dinero.
1443. UNIT OF MEASURE
Preparar:
- unit;
- lb;
- oz;
- kg;
- g;
- ml;
- l;
según inventario.
1444. POS SELLING UNIT
Producto vendido puede ser:
- unidad;
- servicio;
- porción.
1445. INVENTORY CONVERSION
Recetas futuras deben manejar conversiones.
No usar floats sin control para cantidades cuando la precisión sea crítica.
1446. INVENTORY DECIMAL QUANTITY
Utilizar Decimal/representación exacta apropiada.
1447. INVENTORY ROUNDING
Definir por unidad.
1448. STOCK DISPLAY
Mostrar una precisión razonable.
No mostrar 12 decimales al usuario.
1449. LOW STOCK COMPARISON
Utilizar valor interno preciso.
1450. PRODUCT UNIT LABEL
Dashboard puede mostrar unidad.
1451. INVENTORY NON-SELLABLE ITEMS
Ingredientes pueden existir sin aparecer en POS.
1452. SELLABLE NON-INVENTORY ITEMS
También.
1453. PRODUCT ENTITY DESIGN
No forzar una única entidad a representar todos los conceptos si complica inventario.
Puede separar:
- SellableItem;
- InventoryItem;
con mapping cuando sea necesario.
1454. ARCHITECTURE DECISION INVENTORY
Documentar si v1 utiliza una entidad unificada o separada.
1455. EXISTING INVENTORY COMPATIBILITY
Priorizar compatibilidad con el gestor WTF existente cuando sea técnicamente correcto.
1456. INVENTORY SYNC EVENT CONTRACT
Documentar:
- saleId;
- item;
- quantity;
- unit;
- branch;
- eventId;
- timestamp.
1457. INVENTORY EVENT VERSION
Versionado.
1458. INVENTORY EVENT REPLAY
Idempotente.
1459. INVENTORY SYNC FAILURE
Venta no desaparece.
Evento permanece pendiente.
1460. INVENTORY ALERT ON BACKLOG
Si movimientos no se sincronizan durante demasiado tiempo:
alertar administrador.
1461. INVENTORY RECONCILIATION JOB
Comparar ledger vs snapshot/materialized stock.
1462. INVENTORY REBUILD
Debe ser posible reconstruir stock derivado desde movimientos cuando sea práctico.
1463. INVENTORY CORRECTION
Si existe inconsistencia:
crear ajuste auditado.
No editar movimientos históricos silenciosamente.
1464. INVENTORY REPORT SNAPSHOT
Para cierres históricos puede ser útil guardar snapshots de conteo.
1465. PHYSICAL COUNT FUTURE
Crear estructura extensible:
- CountSession;
- CountLine;
- variance.
No P0.
1466. PURCHASES FUTURE
El gestor de inventario existente puede seguir manejando entradas/compras.
WTF POS no necesita convertirse en sistema completo de compras en v1.
1467. SUPPLIERS FUTURE
Fuera de alcance POS inicial salvo integración existente.
1468. ACCOUNTING FUTURE
No construir contabilidad completa dentro de POS.
Exportar datos/integrar posteriormente.
1469. GENERAL LEDGER FUTURE
Separado del Cash/Inventory Ledger operacional.
1470. DATA EXPORT FOR ACCOUNTING
Preparar reportes/exportaciones útiles:
- ventas;
- impuestos;
- pagos;
- refunds.
1471. API INTEGRATION FUTURE
Puede exponer endpoints seguros para contabilidad/ERP.
1472. WEBHOOKS FUTURE
Eventos como:
- sale.completed;
- refund.completed;
- inventory.low;
pueden exponerse posteriormente.
1473. WEBHOOK SECURITY
Si se implementan:
- signatures;
- retries;
- idempotency;
- secret rotation.
1474. WEBHOOK DELIVERY LOG
Registrar.
1475. WEBHOOK DOES NOT BLOCK SALE
Asíncrono.
1476. ANALYTICS EVENTS
Separar de transacciones.
Si analytics falla:
no falla venta.
1477. CUSTOMER LOYALTY FUTURE
Cuando se implemente:
no calcular puntos únicamente en frontend.
1478. LOYALTY LEDGER FUTURE
Utilizar ledger para:
- earn;
- redeem;
- adjust;
- expire.
1479. LOYALTY DOES NOT REWRITE SALE
Redenciones se registran como componente correspondiente.
1480. GIFT CARDS FUTURE
Modelarlas como liability/payment instrument, no descuento simple.
1481. STORE CREDIT FUTURE
Mismo principio.
1482. CUSTOMER ACCOUNT CREDIT FUTURE
Requiere cuentas por cobrar.
No implementarlo accidentalmente dentro de PaymentMethod.
1483. RESERVATIONS FUTURE
No forman parte de v1.
1484. ONLINE ORDERING FUTURE
Puede integrarse mediante APIs/canales.
1485. MENU SYNC FUTURE
Dashboard puede convertirse en fuente para menús digitales.
No P0.
1486. KIOSK ORDERING FUTURE
No confundir con WTF CDS.
CDS es read-only para el cliente en v1.
1487. CDS MUST REMAIN READ-ONLY
El cliente no puede:
- eliminar productos;
- aplicar descuentos;
- seleccionar método;
- modificar orden;
desde WTF CDS v1.
1488. CUSTOMER TIPPING FUTURE
Si se implementa posteriormente, puede requerir interacción CDS.
No habilitar ahora sin especificación.
1489. ORDER STATUS SCREEN FUTURE
Separado de CDS.
1490. KDS AND ORDER STATUS EVENT REUSE
Diseñar eventos para poder reutilizar estados sin acoplar UI.
1491. NOTIFICATION FUTURE
SMS/WhatsApp/email:
adapter separado.
1492. NOTIFICATION CONSENT
Marketing separado de notificaciones transaccionales.
1493. DELIVERY DRIVER FUTURE
Fuera de v1.
1494. DELIVERY TRACKING FUTURE
Fuera de v1.
1495. EMPLOYEE SCHEDULING FUTURE
Fuera de POS inicial.
1496. HR MODULE INTEGRATION FUTURE
Puede integrarse con sistema WTF existente.
1497. AI FEATURES FUTURE
No introducir IA en cálculos financieros críticos.
IA futura puede ayudar en:
- análisis;
- recomendaciones;
- soporte.
Nunca autoridad final para dinero/fiscalidad.
1498. AI REPORT INSIGHTS FUTURE
Puede resumir tendencias basándose en datos existentes.
Debe indicar que son análisis, no alterar transacciones.
1499. AI CONFIGURATION SAFETY
Una recomendación de IA no debe publicar automáticamente cambios de:
- impuestos;
- precios;
- permisos;
- fiscal;
sin aprobación humana autorizada.
1500. SCOPE FREEZE V1
Una vez definidos P0/P1 del release:
no agregar nuevas funciones automáticamente.
Nuevas ideas → ROADMAP.md, salvo que sean necesarias para corregir integridad, seguridad o un requisito ya existente.
1501. V1 CORE DEFINITION
WTF POS v1 debe poder cubrir de extremo a extremo:
- empleados/PIN;
- turnos;
- catálogo;
- modalidades;
- clientes;
- modificadores;
- descuentos;
- impuestos/cargos;
- tickets abiertos;
- cocina;
- pagos;
- recibos;
- KDS;
- CDS;
- impresión;
- offline/sync;
- Dashboard;
- reportes esenciales;
- dispositivos;
- auditoría;
- seguridad.
1502. V1.1 CANDIDATES
Después de estabilización:
- inventario más avanzado;
- recetas;
- KDS analytics;
- loyalty básico;
- promociones.
1503. V2 CANDIDATES
- delivery integrations;
- order status;
- accounting integrations;
- advanced promotions;
- edge server;
- customer self-service.
1504. RELEASE PRIORITY
Estabilidad del núcleo antes que roadmap.
1505. CODE QUALITY
El código debe ser:
- legible;
- modular;
- tipado;
- testeable;
- mantenible.
1506. NO GOD CLASS
Evitar clases que concentren:
- ventas;
- pagos;
- inventario;
- printing;
- sync;
en un único componente.
1507. NO GOD COMPONENT
UI dividida por responsabilidades.
1508. NO BUSINESS LOGIC IN UI
Compose/React deben invocar casos de uso/services

<!-- PARTE 8 | attachment=16faec37-ad61-41da-b6d5-364d0fa9c4a5 | rango=1508-1659 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
1508. NO BUSINESS LOGIC IN UI
Compose/React deben invocar casos de uso, servicios o ViewModels apropiados.
No implementar directamente en componentes visuales reglas como:
- cálculo de impuestos;
- cálculo de descuentos;
- autorización;
- secuencias;
- inventario;
- fiscalidad;
- idempotencia;
- conciliación.
La UI presenta estado y captura intención.
El dominio ejecuta reglas.
1509. NO SQL IN UI
Prohibido ejecutar SQL directamente desde:
- Activity;
- Fragment;
- Composable;
- React component;
- pantalla Dashboard.
Utilizar repositories/services.
1510. NO HTTP DIRECTLY IN UI
La UI no debe construir requests críticos directamente.
Utilizar:
- API client;
- repository;
- use case/service.
1511. DOMAIN LAYER
Debe contener reglas empresariales independientes de infraestructura cuando sea razonable.
Ejemplos:
- Money;
- Pricing;
- Taxes;
- Discounts;
- Sale state;
- Refund validation.
1512. APPLICATION LAYER
Orquesta casos de uso.
Ejemplos:
- CreateOrder
- SaveOpenTicket
- CompleteSale
- ApplyDiscount
- RefundSale
- OpenShift
- CloseShift
1513. INFRASTRUCTURE LAYER
Implementa:
- DB;
- network;
- printers;
- providers;
- file storage;
- device communication.
1514. PRESENTATION LAYER
Implementa:
- UI;
- ViewModels;
- state;
- navigation.
1515. MODULE BOUNDARIES
Evitar dependencias circulares.
Ejemplo:
Inventory no debe necesitar importar UI de Sales.
1516. SHARED CORE
Puede contener:
- Money;
- IDs;
- Result/Error;
- Clock;
- serialization contracts;
- security primitives.
No convertir core en depósito de código sin dueño.
1517. ANDROID MODULES
Si el tamaño del proyecto lo justifica, considerar:
core-domain
core-data
core-network
core-ui

feature-auth
feature-pos
feature-orders
feature-payments
feature-shifts
feature-receipts
feature-settings
feature-devices
Adaptar al repositorio real.
1518. KDS MODULES
Puede compartir:
- protocol;
- domain IDs;
- security;
- networking.
No compartir innecesariamente lógica financiera.
1519. CDS MODULES
Puede compartir protocolo/display contracts.
No incluir módulos de administración/pagos innecesarios.
1520. DASHBOARD MODULES
Organizar por dominio:
- sales;
- catalog;
- customers;
- employees;
- reports;
- settings;
- devices;
- audit.
1521. BACKEND MODULES
Mantener límites conceptuales definidos anteriormente.
1522. SHARED CONTRACTS
Si Android/backend utilizan lenguajes diferentes:
compartir especificaciones y contract tests.
No depender de copiar manualmente modelos y esperar que coincidan.
1523. API CLIENT GENERATION
Si OpenAPI lo permite:
generar clientes tipados.
Evitar editar manualmente código generado.
1524. GENERATED CODE
Separarlo claramente.
1525. DOMAIN EVENTS
Utilizar únicamente cuando reduzcan acoplamiento.
Ejemplo:
SaleCompleted
puede disparar:
- inventory event;
- receipt;
- outbox.
1526. EVENT HANDLER IDEMPOTENCY
Handlers críticos deben tolerar retry.
1527. EVENT FAILURE ISOLATION
Fallo de una integración no crítica no revierte una venta ya confirmada.
1528. CRITICAL TRANSACTIONAL EVENTS
Los eventos necesarios para garantizar consistencia local deben crearse dentro de la misma transacción/outbox.
1529. NON-CRITICAL EVENTS
Ejemplos:
- analytics;
- email;
- marketing.
Asíncronos.
1530. CLOCK ABSTRACTION
Inyectar Clock en lógica sensible al tiempo.
Permite probar:
- businessDate;
- KDS timers;
- expiration;
- shifts.
1531. RANDOM/ID ABSTRACTION
Para tests deterministas cuando sea necesario.
1532. PAYMENT PROVIDER INTERFACE
No acoplar CompleteSale a un SDK bancario específico.
1533. FISCAL PROVIDER INTERFACE
Mismo principio.
1534. PRINTER ADAPTER
Mismo principio.
1535. DEVICE TRANSPORT
Separar protocolo lógico de transporte cuando sea razonable.
Ejemplo:
- LAN WebSocket;
- cloud relay futuro.
1536. REPOSITORY PATTERN
Utilizar donde aporte testabilidad/abstracción.
No crear repositories vacíos que simplemente reenvían métodos sin beneficio.
1537. UNIT OF WORK
Para operaciones transaccionales complejas, utilizar la abstracción apropiada del stack.
1538. DATABASE TRANSACTION BOUNDARY
Definir en application/domain service, no accidentalmente en UI.
1539. ERROR HANDLING
No utilizar excepciones como flujo normal para estados esperados cuando el lenguaje/patrón permita Result types claros.
1540. DOMAIN ERROR
Ejemplos:
- InsufficientPermission
- InvalidOrderState
- PaymentAlreadyCompleted
- ShiftClosed
- ProductUnavailable
Mapear a mensajes localizados.
1541. INFRASTRUCTURE ERROR
Ejemplos:
- NetworkUnavailable
- PrinterUnavailable
- DatabaseFailure
- ProviderTimeout
No exponer detalles internos directamente al cajero.
1542. ERROR MAPPER
Centralizar:
Error → UI message/action
1543. NO EMPTY CATCH
Prohibido:
try {
  ...
} catch {
}
en operaciones importantes.
1544. ERROR CONTEXT
Agregar correlation/context sin datos sensibles.
1545. RETRY POLICY CENTRALIZATION
No implementar backoff diferente en 20 lugares.
Crear políticas reutilizables por tipo de operación.
1546. CIRCUIT BREAKER
Útil para providers externos repetidamente fallidos.
No necesario para toda llamada local.
1547. TIMEOUT POLICY
Definir por servicio.
Ejemplo:
KDS LAN puede utilizar timeout corto.
Reporte pesado puede tener otro.
No utilizar un timeout universal arbitrario.
1548. CANCELLATION
Coroutines/requests deben respetar cancelación cuando sea seguro.
No cancelar una operación financiera ya enviada a provider únicamente porque la pantalla se cerró.
1549. BACKGROUND COMPLETION
Una operación crítica iniciada debe continuar/reconciliarse independientemente del lifecycle de la pantalla.
1550. UI STATE
Modelar estados:
- Loading
- Content
- Empty
- Error
y estados específicos de operación.
1551. ONE-SHOT EVENTS
Manejar:
- navigation;
- snackbar;
- dialogs;
sin duplicarlos tras recomposición/rotación.
1552. CONFIGURATION CHANGES AND ROTATION
Rotar pantalla Android no debe:
- duplicar cobro;
- duplicar KDS send;
- perder carrito.
1553. PROCESS RESTORATION
No confiar únicamente en savedInstanceState para transacciones.
Persistencia durable.
1554. COMPOSE PERFORMANCE
Evitar recomposiciones globales por timer KDS/carrito.
1555. LIST KEYS
Utilizar IDs estables.
1556. VIRTUALIZED WEB TABLES
Para grandes datasets.
1557. FRONTEND STATE
No duplicar innecesariamente server state en stores globales.
Utilizar herramientas adecuadas.
1558. SERVER STATE CACHE
Invalidar después de mutations.
1559. OPTIMISTIC MUTATION
Solo para acciones seguras/reversibles.
No para:
- fiscal;
- payment;
- destructive admin;
sin confirmación real.
1560. FORM STATE
Separar de datos persistidos hasta Guardar.
1561. AUTOSAVE
Puede utilizarse para drafts no críticos.
No publicar configuraciones fiscales automáticamente mientras se escribe.
1562. ADMIN DRAFT
Configuraciones complejas pueden guardar borrador.
1563. FORM DIRTY STATE
Detectar cambios.
1564. CANCEL ADMIN FORM
Debe descartar cambios no guardados después de confirmación si es necesario.
1565. ADMIN SAVE IDEMPOTENCY
Doble click en Guardar no crea duplicados.
1566. CREATE EMPLOYEE DOUBLE CLICK
Un empleado.
1567. CREATE PRODUCT DOUBLE CLICK
Un producto.
1568. IMPORT JOB DOUBLE SUBMIT
Un job.
1569. EXPORT JOB DOUBLE SUBMIT
Puede deduplicar o crear dos exports explícitos, pero no generar efectos inconsistentes.
1570. PAGINATION CONCURRENCY
Nuevos registros durante paginación no deben causar duplicados/omisiones excesivas.
Preferir cursor donde sea importante.
1571. AUDIT PAGINATION
Cursor recomendado.
1572. RECEIPT PAGINATION
Cursor recomendado para históricos grandes.
1573. SEARCH DEBOUNCE WEB
Utilizar cuando corresponda.
1574. SEARCH CANCEL PREVIOUS REQUEST
Evitar race donde resultado viejo reemplaza búsqueda nueva.
1575. BARCODE SEARCH NO DEBOUNCE UNNECESSARY
Código exacto puede resolverse inmediatamente.
1576. POS CATEGORY FILTER
Seleccionar categoría filtra localmente/indexadamente.
1577. ALL CATEGORY
Puede existir:
Todos
1578. FAVORITES CATEGORY
Opcional.
1579. OUT OF STOCK FILTER
No ocultar necesariamente agotados si el cajero necesita ver que existen.
Configurable.
1580. PRODUCT AVAILABILITY BADGE
Mostrar:
- Agotado
- No disponible
1581. PRODUCT PRICE DISPLAY
Debe reflejar modalidad actual.
Si Apps Delivery cambia precio:
tile/lista puede actualizar.
1582. PRICE CHANGE ON MODE SWITCH
Recalcular todas las líneas que dependan de PriceBook.
1583. MANUAL OVERRIDE ON MODE SWITCH
No sobrescribir automáticamente un precio manual autorizado sin advertencia.
1584. PRICE SNAPSHOT ON ADD
Guardar el precio aplicado a la línea.
1585. REPRICE OPEN CART
Puede recalcular antes de pago según reglas.
No hacerlo después de completar.
1586. CUSTOMER-SPECIFIC PRICING FUTURE
No P0.
Arquitectura puede extender PriceBook.
1587. HAPPY HOUR FUTURE
No P0.
1588. PROMO PRICE DISPLAY FUTURE
Mostrar precio anterior/actual cuando se implemente.
1589. TAX DISPLAY POS
Mostrar desglose en resumen.
No necesariamente por línea en pantalla principal si sobrecarga.
1590. CHARGE DISPLAY POS
Separado.
1591. DISCOUNT DISPLAY POS
Mostrar total de descuentos.
1592. EXPAND TOTAL BREAKDOWN
Permitir ver detalle:
- subtotal;
- discounts;
- taxes;
- charges;
- total.
1593. CART LINE EDIT
Tocar línea permite:
- cantidad;
- modifiers;
- comment;
- remove;
- discount cuando permitido.
1594. CART LINE REMOVE
Si ya fue enviada a cocina:
generar delta/cancelación.
1595. CART CLEAR
Si existen líneas enviadas a cocina:
no simplemente vaciar.
Solicitar cancelación apropiada.
1596. UNDO REMOVE
Puede existir antes de enviar cocina.
Después de kitchen event, evitar undo silencioso; debe generar nuevo evento.
1597. QUANTITY BUTTONS
- / − grandes.
1598. QUANTITY ZERO
Reducir a cero equivale a eliminar con las reglas correspondientes.
1599. CART COMMENT
Puede existir comentario general de orden separado de comentarios por artículo.
1600. KITCHEN ORDER COMMENT
Si comentario general es relevante a cocina:
configurar/indicar.
1601. CUSTOMER NOTE
Separado.
1602. INTERNAL NOTE
No CDS/receipt por defecto.
1603. ORDER NAME
Para ticket sin mesa:
permitir nombre manual.
1604. ORDER NAME DUPLICATE
Puede permitirse.
Mostrar turno/ticket para diferenciar.
1605. TABLE OCCUPANCY
Mesa con ticket abierto:
estado ocupada.
1606. TABLE COLORS
No depender solo del color.
Mostrar:
- Libre
- Ocupada
- Lista/Cuenta solicitada futuro.
1607. TABLE GRID
Si Open Tickets predefinidos activos:
pantalla rápida de mesas.
1608. TABLE MANUAL ORDER
Administrador puede ordenar/numerar mesas manualmente.
1609. TABLE DELETE
Mesa con historial puede archivarse.
1610. TABLE AREA
Opcional.
1611. OPEN TICKET LIST
Alternativa a mesas.
Mostrar:
- nombre;
- turno;
- modalidad;
- total;
- hora;
- empleado;
- status.
1612. OPEN TICKET SORT
Default:
más recientes o criterio operacional definido.
1613. OPEN TICKET SEARCH
Por:
- nombre;
- mesa;
- turno;
- ticket.
1614. OPEN TICKET AGE
Mostrar tiempo abierto cuando sea útil.
1615. STALE OPEN TICKET WARNING
Si lleva demasiado tiempo:
advertir.
No cerrarlo automáticamente.
1616. END-OF-DAY OPEN TICKETS
Antes de cerrar turno:
mostrar tickets abiertos asociados.
Definir política:
- resolver;
- transferir;
- mantener;
según operación.
1617. SHIFT CLOSE WITH OPEN TICKET
No bloquear necesariamente si ticket pertenece a otro empleado/register, pero mostrar claramente.
Para tickets propios, aplicar política.
1618. SHIFT TRANSFER OPEN TICKET
Puede reasignarse a otro empleado/register con permiso.
1619. SHIFT TRANSFER AUDIT
Registrar.
1620. RECEIPT AFTER OPEN TICKET
Al cobrar:
el receipt debe reflejar todos los snapshots finales.
1621. KITCHEN STATUS DOES NOT BLOCK PAYMENT BY DEFAULT
Puede cobrarse antes de despachar cocina, salvo política específica.
1622. PAYMENT DOES NOT AUTO-DISPATCH KDS
Completar pago no significa automáticamente que cocina terminó.
Mantener estados separados.
1623. ORDER COMPLETION BUSINESS RULE
Definir cuándo Order se considera completamente cerrado:
- pago;
- kitchen;
- delivery;
según modalidad.
No mezclar con SaleCompleted.
1624. TAKEOUT READY FUTURE
Puede existir estado listo para entregar.
1625. DELIVERY DISPATCH FUTURE
Puede existir estado enviado.
1626. SIMPLE V1
No introducir estados logísticos adicionales si no son necesarios para el flujo inicial.
1627. CUSTOMER ORDER STATUS FUTURE
Reutilizar estados.
1628. POS RECEIPT LIST
Módulo Recibos debe ser rápido para recibos recientes.
1629. RECEIPT DETAIL ACTION PERMISSIONS
Reprint puede tener permiso diferente de refund.
1630. REFUND REASON
Configurable lista de motivos.
1631. VOID REASON
Configurable.
1632. DISCOUNT REASON
Opcional/configurable.
1633. PRICE OVERRIDE REASON
Recomendado obligatorio.
1634. CASH MOVEMENT REASON
Obligatorio para manual.
1635. REASON MANAGEMENT
Dashboard puede administrar catálogos de motivos por tipo.
1636. REASON ARCHIVE
No borrar histórico.
1637. FREE-TEXT OTHER REASON
Permitir:
Otro
- comentario.
1638. AUDIT REASON SNAPSHOT
Guardar texto/ID.
1639. REFUND AUTHORIZATION
Configurable por monto/rol.
1640. VOID AUTHORIZATION
Normalmente supervisor/manager.
1641. REPRINT AUTHORIZATION
Configurable.
1642. DRAWER OPEN AUTHORIZATION
Configurable.
1643. SETTINGS AUTHORIZATION
Permisos específicos.
1644. KDS CONFIG PROTECTION
PIN/rol.
1645. CDS CONFIG PROTECTION
PIN/rol.
1646. POS DIAGNOSTIC ACCESS
Puede estar disponible a manager/admin.
1647. SUPPORT MODE
Si se implementa:
temporal.
No bypass de seguridad.
1648. REMOTE SUPPORT FUTURE
No construir control remoto arbitrario.
Puede integrar herramientas autorizadas posteriormente.
1649. DEBUG INFORMATION
No mostrar stack trace al cajero.
1650. DEVELOPMENT ERROR SCREEN
Puede mostrar detalles.
1651. PRODUCTION ERROR SCREEN
Mensaje + support ID.
1652. GLOBAL CRASH HANDLING
No intentar continuar después de corrupción crítica.
Persistir lo posible previamente y permitir reinicio seguro.
1653. ANR PREVENTION
No realizar:
- DB pesada;
- network;
- image processing;
en main thread.
1654. STRICT MODE DEVELOPMENT
Puede utilizarse para detectar problemas Android.
1655. PERFORMANCE BASELINES
Definir objetivos razonables basados en hardware real.
No inventar SLAs imposibles.
1656. POS TAP RESPONSE
Operaciones locales deben sentirse inmediatas.
1657. KDS EVENT LATENCY LAN
Debe ser baja bajo red normal.
Medir.
1658. CDS UPDATE LATENCY LAN
Igual.
1659. CLOUD SYNC LATENCY
No afecta confirmación local de

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 9 | attachment=6f55d4c2-6f62-473a-9461-21160945491d | rango=1659-1816 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
1659. CLOUD SYNC LATENCY
La latencia de sincronización con cloud no debe afectar la confirmación local de una venta cuando el flujo está autorizado para trabajar offline/local-first.
Una venta correctamente persistida localmente puede quedar:
SYNC_PENDING
sin bloquear al cajero.
1660. CLOUD SYNC EVENTUAL CONSISTENCY
Dashboard puede tardar brevemente en reflejar una venta offline.
Debe mostrar data freshness cuando sea relevante.
No presentar datos incompletos como definitivos.
1661. POS LOCAL CONFIRMATION
La pantalla:
Cobrado
solo debe aparecer después de confirmar los componentes locales/externos críticos requeridos para ese método.
No esperar innecesariamente:
- analytics;
- email;
- Dashboard;
- CDS acknowledgement.
1662. CDS FAILURE AFTER PAYMENT
Si CDS no recibe el mensaje final:
la venta sigue siendo válida.
Al reconectar, no debe mostrar accidentalmente una venta nueva como si fuera la anterior.
1663. KDS FAILURE AFTER SALE
La venta y KitchenDelivery mantienen estados separados.
Debe existir alerta de comanda pendiente/fallida.
1664. PRINT FAILURE AFTER SALE
Mismo principio.
1665. CLOUD FAILURE AFTER SALE
Outbox.
1666. ANALYTICS FAILURE AFTER SALE
Ignorar operacionalmente y reintentar cuando corresponda.
1667. ERROR ISOLATION
Diseñar límites para que una falla auxiliar no provoque cascading failure.
1668. DATABASE CONNECTION POOL
Backend debe configurar pool apropiado.
No abrir una conexión nueva ilimitada por request.
1669. DATABASE TIMEOUT
Queries deben tener límites razonables.
1670. SLOW QUERY LOG
Registrar queries lentas sin exponer parámetros sensibles.
1671. DATABASE HEALTH CHECK
Health endpoint debe verificar DB de forma ligera.
1672. READINESS VS LIVENESS
Si infraestructura lo soporta:
separar:
- liveness;
- readiness.
1673. API HEALTH
No exponer información sensible públicamente.
1674. DEPENDENCY HEALTH
Fiscal/payment provider puede aparecer como dependency health sin bloquear liveness del backend.
1675. MAINTENANCE MODE
Dashboard puede entrar en mantenimiento.
POS provisionado debe continuar offline/local cuando sea seguro.
1676. MAINTENANCE MESSAGE
Mostrar información clara.
No error técnico.
1677. MAINTENANCE SCHEDULING
Planificar fuera de horas críticas cuando sea posible.
No asumir medianoche como horario libre.
1678. BRANCH BUSINESS HOURS
Puede almacenarse para:
- reporting;
- maintenance planning;
- future scheduling.
No es requisito para calcular businessDate si ya existe cutoff.
1679. BUSINESS HOURS CONFIG
No hardcodear horarios WTF actuales.
Deben ser configurables.
1680. DAYLIGHT SAVING
Aunque República Dominicana normalmente no utilice DST, la arquitectura multi-sucursal debe manejar zonas que sí lo utilicen.
1681. CLOCK STORAGE
Timestamps absolutos.
Presentación en timezone de sucursal.
1682. BUSINESS DATE FUNCTION
Centralizar.
No implementar lógica distinta en:
- POS;
- Dashboard;
- reports.
1683. BUSINESS DATE TEST VECTORS
Crear casos.
1684. TIME CLOCK DATE
Marcaciones deben conservar timestamp real.
Reportes laborales pueden utilizar reglas separadas del businessDate financiero cuando sea necesario.
1685. SHIFT DATE
Guardar businessDate.
1686. KDS METRIC DATE
Utilizar timestamps reales.
1687. FISCAL DATE
Seguir requisitos provider/regulación.
No derivarla arbitrariamente de businessDate si no corresponde.
1688. RECEIPT DATE
Mostrar fecha/hora de transacción/documento según configuración.
1689. SERVER CLOCK
Backend debe usar reloj confiable.
1690. DEVICE CLOCK WARNING
Ya definido; implementar diagnóstico.
1691. EVENT CLOCK SKEW
Si evento offline tiene timestamp extraño:
no rechazar automáticamente una venta legítima sin estrategia.
Guardar:
- deviceCreatedAt;
- serverReceivedAt.
Generar warning si corresponde.
1692. OFFLINE SALES ORDERING
Para reportes puede utilizar businessDate calculado según reglas/snapshot, además de timestamps.
1693. SYNC CONFLICT TYPES
Definir:
- catalog conflict;
- open ticket conflict;
- device conflict;
- configuration conflict.
Una venta completada con ID único no debería convertirse en un merge editable.
1694. CONFLICT RESOLUTION
Preferir reglas deterministas.
No mostrar diálogos técnicos al cajero salvo que necesite decidir algo empresarial.
1695. CATALOG CONFLICT
Cloud/admin normalmente es autoridad para configuración futura.
Una venta histórica conserva snapshot local.
1696. CUSTOMER OFFLINE DUPLICATE
Dos POS pueden crear el mismo cliente offline.
Al sincronizar:
detectar posibles duplicados.
No fusionar automáticamente si no existe clave confiable.
1697. EMPLOYEE OFFLINE CREATION
No permitir crear empleados desde POS offline salvo requisito futuro.
Administración de empleados debe ocurrir principalmente en Dashboard.
1698. PRODUCT OFFLINE CREATION
No permitir crear productos desde POS operacional por defecto.
1699. CONFIGURATION OFFLINE EDIT
Configuración empresarial crítica se administra principalmente en Dashboard/cloud.
Preferencias locales sí pueden cambiar offline.
1700. POS ADMIN SETTINGS
WTF POS puede contener configuración de:
- hardware local;
- layout;
- scanner;
- connection diagnostics.
No duplicar todo WTF Dashboard dentro del APK.
1701. PRINTER LOCAL CONFIG
Puede configurarse desde POS porque depende del hardware local.
Debe sincronizar metadata cuando sea útil.
1702. KDS/CDS PAIRING LOCAL
Puede iniciarse desde POS.
Dashboard puede visualizar/administrar asociaciones.
1703. DEVICE AUTHORIZATION CLOUD
La autorización final puede depender de Dashboard/backend cuando exista Internet.
1704. LOCAL PAIRING WITHOUT CLOUD FUTURE
No requisito inicial.
Si se implementa:
debe seguir siendo seguro.
1705. POS REGISTER ASSOCIATION
Cada POS debe saber qué Register utiliza.
1706. MULTIPLE REGISTER PROFILE
Un dispositivo puede permitir seleccionar register solo a administrador si se diseña así.
Preferir asociación estable para reducir errores.
1707. REGISTER CHANGE
Requiere:
- shift cerrado;
- sync;
- autorización.
1708. RECEIPT PRINTER ASSOCIATION
Por Register/device.
1709. CASH DRAWER ASSOCIATION
Normalmente junto a receipt printer/register.
1710. CDS ASSOCIATION
Por Register/POS.
1711. KDS ASSOCIATION
Por Branch/station.
1712. KITCHEN PRINTER ASSOCIATION
Por Branch/station.
1713. HARDWARE CONFIG SCOPE
Definir si setting pertenece a:
- branch;
- register;
- device;
- station.
No guardar todo en una tabla genérica sin semántica.
1714. CONFIG VALIDATION BY SCOPE
Ejemplo:
un KDS de Branch A no puede asignarse accidentalmente a Branch B sin traslado autorizado.
1715. HARDWARE TEST AFTER CONFIG CHANGE
Al cambiar IP/adapter:
ofrecer:
Probar conexión
1716. UNSAVED HARDWARE CONFIG
No reemplazar configuración activa hasta que el usuario guarde.
1717. SAFE PRINTER CHANGE
Puede probar nueva impresora antes de reemplazar la activa.
1718. SAFE KDS REPLACEMENT
Emparejar nueva tablet.
Probar.
Después desactivar anterior.
1719. SAFE CDS REPLACEMENT
Mismo principio.
1720. DEVICE DECOMMISSION
Archivar dispositivo.
Revocar credenciales.
Conservar historial.
1721. DEVICE WIPE
No existe garantía de borrar remotamente Android sin MDM.
No afirmar que WTF Dashboard puede hacerlo si no existe integración MDM.
1722. LOCAL LOGOUT
Borra/revoca sesión, no necesariamente datos operacionales necesarios.
1723. FACTORY RESET APP
Acción administrativa peligrosa.
Debe:
- verificar sync;
- advertir;
- requerir autorización;
- explicar qué se perderá.
1724. FACTORY RESET BLOCK
Si existen ventas no sincronizadas:
bloquear por defecto.
1725. CLEAR CACHE
Debe ser seguro.
No borrar:
- sales;
- tickets;
- outbox;
- shift.
1726. CLEAR LOCAL HISTORY
Solo datos ya sincronizados y recuperables.
Acción avanzada.
1727. STORAGE MANAGEMENT UI
Puede mostrar:
- DB;
- images;
- logs;
- cache.
No permitir eliminar datos críticos accidentalmente.
1728. BACKUP LOCAL DB MANUAL
No necesario para usuario normal.
Cloud sync/backups son estrategia principal.
Puede existir herramienta técnica protegida.
1729. LOCAL DB ENCRYPTION DECISION
Documentar ADR según sensibilidad/performance.
1730. DEVICE LOST RISK
Si DB contiene datos sensibles:
evaluar encryption + Android lock requirements.
1731. ROOTED DEVICE
No asumir seguridad absoluta.
Puede advertir/limitar según política futura.
No bloquear automáticamente sin evaluar operación.
1732. ANDROID MINIMUM VERSION
Definir según hardware objetivo y APIs requeridas.
Documentar.
1733. ANDROID TARGET SDK
Mantener actualizado conforme requisitos de plataforma.
1734. ANDROID TABLET FORM FACTOR
Optimizar landscape para POS/KDS cuando sea apropiado.
1735. PHONE FORM FACTOR
POS debe seguir usable.
No simplemente escalar UI de tablet.
1736. FOLDABLE FUTURE
No requisito.
Responsive Compose puede adaptarse.
1737. DESKTOP WIDTH
Limitar anchuras para mantener legibilidad.
1738. KEYBOARD SHORTCUTS PC
Preparar:
- buscar;
- cobrar;
- nueva venta;
- guardar;
cuando la versión PC se implemente.
No interferir con scanner HID.
1739. SCANNER HID FOCUS
El scanner debe funcionar aunque el foco esté en una pantalla POS apropiada.
No introducir el barcode dentro de un comentario por accidente.
1740. SCANNER INPUT BUFFER
Detectar patrón rápido/terminador cuando sea necesario.
1741. SCANNER CONFIG
Permitir configurar sufijo:
- Enter;
- Tab;
si el hardware lo requiere.
1742. SCANNER DUPLICATE READ
Aplicar debounce corto para evitar lectura doble accidental del mismo scan físico, sin impedir vender dos unidades intencionalmente.
1743. CAMERA SCANNER OVERLAY
Mostrar área de lectura clara.
1744. CAMERA FLASH
Permitir flash cuando hardware lo soporte.
1745. CAMERA HAPTIC/SOUND
Feedback opcional al detectar.
1746. CAMERA DUPLICATE SCAN
Evitar múltiples detecciones del mismo frame.
1747. UNKNOWN BARCODE UX
Opciones:
- Cerrar
- Buscar manualmente
No ofrecer crear artículo a cajero sin permiso.
1748. ADMIN UNKNOWN BARCODE FUTURE
Un manager podría crear producto desde flujo administrativo, no P0.
1749. PRODUCT IMAGE CAPTURE
Dashboard/Android admin futuro puede usar cámara para fotografiar producto.
No necesario en POS caja.
1750. PRODUCT IMAGE UPLOAD
Validar y optimizar.
1751. PRODUCT IMAGE CDN/STORAGE
Utilizar almacenamiento apropiado.
No guardar grandes blobs directamente en DB salvo razón.
1752. IMAGE VERSION/CACHE BUSTING
Cuando cambia imagen:
dispositivos deben actualizar cache.
1753. PRODUCT DESCRIPTION
Puede existir para Dashboard/menu.
POS puede mostrarla solo cuando sea útil.
1754. PRODUCT KITCHEN NAME
Nombre corto opcional.
1755. PRODUCT RECEIPT NAME
Opcional si se necesita abreviar.
1756. PRODUCT CUSTOMER NAME
Default al nombre público.
1757. INTERNAL PRODUCT NAME
Si se agrega:
no mostrar CDS/receipt.
1758. PRODUCT TAGS FUTURE
Para búsqueda/menús.
No P0.
1759. PRODUCT ALLERGENS FUTURE
Puede añadirse posteriormente.
No hacer claims médicos.
1760. PRODUCT TAX CATEGORY
Puede ayudar a asignar impuestos.
1761. CATEGORY TAX DEFAULT
Producto puede heredar regla de categoría.
1762. PRODUCT TAX OVERRIDE
Específica gana según precedencia documentada.
1763. CATEGORY KITCHEN DEFAULT
Producto puede heredar estación.
1764. PRODUCT KITCHEN OVERRIDE
Específico gana.
1765. CATEGORY PRICE
No necesario.
1766. MODIFIER TAX
Definir si el precio del modificador hereda impuestos del producto o tiene regla propia.
Documentar.
1767. MODIFIER KITCHEN ROUTING
Normalmente sigue producto.
Puede tener override futuro si necesario.
1768. DISCOUNT TAX INTERACTION
Documentar si descuento reduce base imponible y cómo.
Debe seguir reglas fiscales aplicables.
1769. SERVICE CHARGE DISCOUNT INTERACTION
Documentar.
1770. REFUND TAX
Utilizar snapshots originales.
1771. PARTIAL REFUND TAX
Calcular proporcional/por líneas conforme a la transacción original y reglas aplicables.
1772. FISCAL CREDIT NOTE FUTURE/PROVIDER
Si devolución requiere documento fiscal específico:
provider adapter debe soportarlo.
No inventar flujo.
1773. RECEIPT REFUND DOCUMENT
Generar comprobante/recibo de devolución apropiado.
1774. REFUND KDS
Una devolución financiera después de consumo no envía automáticamente cancelación a cocina.
1775. VOID BEFORE PREPARATION
Puede enviar cancelación.
1776. VOID AFTER PREPARATION
Puede sugerir waste.
1777. PAYMENT REFUND PROVIDER
Si integrado:
usar provider original cuando corresponda.
1778. MANUAL CARD REFUND
Registrar que el reembolso se realizó externamente, con referencia cuando corresponda.
1779. CASH REFUND
Afecta cash ledger/shift.
1780. REFUND WITHOUT OPEN SHIFT
Definir política.
Puede requerir abrir turno/register apropiado o registrar movimiento administrativo.
No alterar caja silenciosamente.
1781. REFUND DIFFERENT DAY
Debe aparecer en businessDate de la devolución, manteniendo referencia a venta original.
1782. REFUND REPORT ORIGINAL SALE
Mostrar vínculo.
1783. REFUND INVENTORY DECISION
Ya definido; persistir decisión por línea.
1784. REFUND REASON SNAPSHOT
Guardar.
1785. REFUND AUDIT
Registrar actor/supervisor.
1786. VOID AUDIT
Igual.
1787. DISCOUNT AUDIT
Según límites.
1788. LOGIN AUDIT
No llenar AuditLog con cada desbloqueo si no aporta valor.
Registrar eventos relevantes.
1789. FAILED LOGIN SECURITY LOG
Mantener información para seguridad sin almacenar PIN.
1790. PAIRING AUDIT
Registrar:
- device;
- branch;
- actor;
- time.
1791. DEVICE REVOCATION AUDIT
Sí.
1792. DATA EXPORT AUDIT
Para exports sensibles.
1793. CUSTOMER EDIT AUDIT
Puede registrar cambios importantes.
1794. EMPLOYEE EDIT AUDIT
Sí.
1795. ROLE EDIT AUDIT
Sí.
1796. BRANCH EDIT AUDIT
Sí.
1797. RECEIPT CONFIG AUDIT
Sí.
1798. KDS CONFIG AUDIT
Sí.
1799. AUDIT DIFF REDACTION
No guardar:
- password hash;
- token;
- secret;
- PIN hash completo;
en before/after.
1800. AUDIT RETENTION
Definir según política/requisitos legales.
No permitir al usuario común borrar audit.
1801. AUDIT INTEGRITY
Considerar controles para detectar manipulación en entornos de alta exigencia.
No es necesario implementar blockchain.
1802. SECURITY EVENT LOG
Puede separarse de AuditLog operacional.
1803. TECHNICAL LOG VS AUDIT
No confundir.
Technical logs pueden rotarse.
Audit representa acciones empresariales sensibles.
1804. DATA ACCESS LOG FUTURE
Para entornos que lo requieran.
No P0.
1805. OWNER DATA EXPORT
Puede solicitar export de datos empresariales.
Debe ser seguro y auditable.
1806. DATA PORTABILITY
Utilizar formatos razonables.
1807. ACCOUNT DELETION
No borrar organización con historial financiero mediante un botón casual.
Requiere procedimiento.
1808. BRANCH ARCHIVE
Sucursal con historial:
archivar.
1809. BRANCH REACTIVATION
Permitida con validación.
1810. REGISTER ARCHIVE
No si existe shift abierto.
1811. DEVICE ARCHIVE
Revocar primero.
1812. PRODUCT ARCHIVE
No disponible para nuevas ventas.
1813. CATEGORY ARCHIVE
Gestionar productos asociados.
No borrarlos.
1814. MODIFIER GROUP ARCHIVE
No afecta históricos.
1815. TAX ARCHIVE
No afecta snapshots.
1816. PAYMENT METHOD ARCHIVE
No afecta históricos.

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 10 | attachment=f0c84104-8ade-4e05-b42d-3d7a2c1d7ede | rango=1817-1992 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
1817. DINING OPTION ARCHIVE
Una modalidad archivada:
- deja de aparecer en nuevas ventas;
- conserva ventas históricas;
- conserva reportes;
- puede reactivarse.
No borrar snapshots.
1818. DISCOUNT ARCHIVE
Un descuento archivado:
- no puede aplicarse a nuevas ventas;
- permanece visible en reportes históricos.
1819. CUSTOMER ARCHIVE
Ya definido.
Mantener relaciones históricas.
1820. EMPLOYEE ARCHIVE
Ya definido.
Bloquear nuevas sesiones.
1821. ROLE ARCHIVE
No asignable a nuevos empleados.
Mantener histórico de permisos/rol cuando sea necesario.
1822. CONFIGURATION ENTITY ARCHIVE
Siempre preferir lifecycle explícito sobre eliminación destructiva cuando exista historial.
1823. ARCHIVE FILTER
Dashboard debe permitir:
- Activos
- Archivados
- Todos
según módulo.
1824. RESTORE ARCHIVED ENTITY
Acción:
Restaurar
Debe validar conflictos actuales.
Ejemplo:
restaurar SKU que ahora pertenece a otro producto.
1825. RESTORE CONFLICT
No sobrescribir entidad activa.
Solicitar resolución.
1826. PRODUCT DUPLICATION
Dashboard puede permitir:
Duplicar artículo
Crear nuevo ID/SKU según reglas.
No copiar historial.
1827. CATEGORY DUPLICATION
Opcional.
1828. MODIFIER GROUP DUPLICATION
Útil para crear conjuntos similares.
1829. RECEIPT TEMPLATE DUPLICATION
Opcional.
1830. BRANCH CONFIG CLONE
Ya preparado como futuro.
1831. BULK PRICE UPDATE
Permitir:
- porcentaje;
- monto;
- import.
Mostrar preview.
1832. BULK PRICE ROUNDING
Definir regla.
Ejemplo:
incrementar 5%.
El resultado debe usar Money/Decimal.
1833. BULK PRICE EFFECTIVE DATE
Puede permitir programar publicación futura.
P1/futuro.
1834. SCHEDULED CONFIGURATION FUTURE
Preparar posibilidad de cambios efectivos en fecha/hora.
No P0.
1835. CONFIGURATION EFFECTIVE DATE
Taxes ya pueden requerirlo.
PriceBooks pueden extenderse.
1836. CONFIG SCHEDULER SAFETY
No aplicar dos versiones incompatibles simultáneamente.
1837. TIMEZONE FOR SCHEDULED CONFIG
Usar timezone de Branch.
1838. PRODUCT IMPORT PRICE
Validar moneda/decimal.
1839. PRODUCT IMPORT TAX
Mapear por código/nombre confiable.
No crear impuestos silenciosamente por typo.
1840. PRODUCT IMPORT CATEGORY
Puede:
- mapear existente;
- crear nueva si el usuario lo confirma.
1841. PRODUCT IMPORT MODIFIERS
Puede ser una segunda fase de importación si complica v1.
No bloquear import básico.
1842. PRODUCT IMPORT BARCODE
Validar duplicados.
1843. PRODUCT IMPORT SKU
Validar.
1844. PRODUCT IMPORT STOCK
Si se importa stock:
crear Opening Balance/Adjustment apropiado.
No escribir stock directamente.
1845. IMPORT TRANSACTION
Un import grande puede procesarse por job.
Registrar resultados.
1846. IMPORT ROLLBACK
Si el job falla parcialmente:
debe conocerse exactamente qué se aplicó.
No prometer rollback total si técnicamente se procesa por lotes sin soporte.
1847. IMPORT IDEMPOTENCY
Reenviar el mismo job/file no debe duplicar accidentalmente todo.
Utilizar jobId/hash/confirmación cuando corresponda.
1848. IMPORT PREVIEW LIMIT
Para archivos grandes:
mostrar muestra + resumen.
No cargar millones de filas en browser.
1849. IMPORT ERROR FILE
Permitir descargar archivo/reporte de filas rechazadas.
1850. IMPORT PERMISSION
Permiso específico.
1851. PRODUCT EXPORT
Permitir exportar catálogo.
1852. CUSTOMER EXPORT
Permiso específico.
1853. EMPLOYEE EXPORT
Permiso específico.
1854. CONFIG EXPORT FUTURE
Sin secretos.
1855. AUDIT EXPORT
Protegido.
1856. RECEIPT EXPORT
Puede exportar listados, no necesariamente PDFs individuales en masa salvo necesidad.
1857. REPORT CSV ENCODING
Utilizar UTF-8 compatible.
1858. EXCEL FORMATTING
Columnas:
- dinero;
- fecha;
- cantidades;
con tipos/formato correcto.
1859. PDF FONT SUPPORT
Debe soportar español correctamente.
1860. PRINT FONT SUPPORT
Depende de printer adapter.
1861. DASHBOARD NOTIFICATIONS
Crear centro de alertas/notificaciones administrativas.
1862. NOTIFICATION TYPES
- system;
- inventory;
- device;
- fiscal;
- payment;
- security.
1863. NOTIFICATION READ STATE
- unread;
- read;
- resolved cuando corresponda.
1864. NOTIFICATION EMAIL
Solo para alertas configuradas.
1865. EMAIL CONFIGURATION
Secretos SMTP/provider fuera de frontend.
1866. EMAIL FAILURE
No afecta transacción principal.
1867. DAILY LOW STOCK EMAIL
Cuando feature activa.
1868. DAILY REPORT EMAIL FUTURE
Puede configurarse posteriormente.
1869. OWNER ALERTS
Puede incluir:
- payment unknown;
- fiscal rejected;
- backup failed;
- critical device.
1870. CASH DIFFERENCE ALERT
Configurable por umbral.
1871. DISCOUNT ALERT FUTURE
Puede alertar descuentos extraordinarios.
1872. SECURITY ALERT
Ejemplos:
- muchos PIN fallidos;
- device pairing sospechoso;
- owner role change.
1873. ALERT DELIVERY FAILURE
Mantener alerta en Dashboard aunque email falle.
1874. ALERT ACKNOWLEDGEMENT AUDIT
Para critical alerts puede registrar quién la revisó.
1875. BACKUP FAILURE ALERT
Critical.
1876. RESTORE TEST REMINDER
Operacional futuro.
1877. CERTIFICATE EXPIRATION ALERT
Para:
- TLS;
- fiscal;
- signing-related external certs;
cuando sea aplicable.
1878. FISCAL RANGE EXPIRATION ALERT
Sí.
1879. APP VERSION ALERT
Dispositivos muy desactualizados.
1880. STORAGE ALERT
POS/KDS.
1881. SYNC BACKLOG ALERT
Si supera umbral.
1882. KDS OFFLINE ALERT
No enviar 100 emails por reconexiones breves.
Aplicar debounce/delay.
1883. PRINTER OFFLINE ALERT
Puede ser local, no necesariamente email.
1884. ALERT FATIGUE
Agrupar.
Priorizar.
Resolver automáticamente cuando corresponda.
1885. SYSTEM STATUS PAGE
Dashboard:
Estado del sistema
Mostrar por Branch.
1886. SYSTEM STATUS CARDS
- Cloud API
- POS Devices
- KDS
- CDS
- Printers
- Sync
- Fiscal Provider
- Payment Provider cuando exista
1887. PROVIDER STATUS
No consultar provider agresivamente desde cada navegador.
Backend centraliza health.
1888. SYSTEM STATUS PERMISSIONS
Solo roles autorizados.
1889. DIAGNOSTIC HISTORY
Mantener eventos de incidentes importantes, no cada heartbeat.
1890. DEVICE LAST SEEN
Sí.
1891. DEVICE CURRENT IP
Puede mostrarse como información diagnóstica.
No identidad.
1892. DEVICE NETWORK NAME
No capturar SSID si no es necesario/permisos complicados.
1893. DEVICE MODEL
Puede reportarse.
1894. DEVICE OS VERSION
Sí.
1895. DEVICE APP VERSION
Sí.
1896. DEVICE PROTOCOL VERSION
Sí.
1897. DEVICE STORAGE STATUS
Sí.
1898. DEVICE BATTERY STATUS
Opcional.
1899. DEVICE UPTIME
Opcional.
1900. DEVICE ERROR COUNT
Puede agregarse.
1901. REMOTE DIAGNOSTIC REQUEST
Puede solicitar al dispositivo que envíe estado sanitizado.
1902. REMOTE COMMAND SECURITY
Ya definido; obligatorio.
1903. COMMAND EXPIRY
Sí.
1904. COMMAND DEDUP
Sí.
1905. COMMAND AUTHORIZATION
Solo roles apropiados.
1906. REMOTE RESTART APP
No implementar salvo mecanismo oficial/MDM.
1907. REMOTE CLEAR DATA
Prohibido como función normal.
1908. REMOTE FACTORY RESET
No sin MDM y controles muy estrictos.
Fuera de v1.
1909. DEVICE UPDATE COMMAND FUTURE
Puede integrarse con MDM.
1910. BRANCH DEVICE INVENTORY
Dashboard puede listar todo hardware lógico.
1911. DEVICE TYPE
- POS
- KDS
- CDS
- Printer
- Other
Printer puede modelarse separado si resulta mejor.
1912. DEVICE CAPABILITIES
Ejemplo POS:
- camera;
- biometric;
- bluetooth;
- usb.
1913. CAPABILITY DETECTION
No asumir que todos los Android soportan biometría/cámara.
1914. CAPABILITY-BASED UI
Ocultar/deshabilitar opciones imposibles.
Explicar.
1915. BIOMETRIC ENROLLMENT
La app no administra huellas.
Dirigir a configuración del sistema cuando no haya biometría registrada.
1916. CAMERA ABSENT
Ocultar scanner de cámara.
1917. BLUETOOTH ABSENT
No mostrar conexión Bluetooth.
1918. USB HOST ABSENT
No ofrecer USB si no es viable.
1919. NETWORK PRINTER ALWAYS OPTIONAL
Solo mostrar si feature/adapter soportado.
1920. PRINTER DISCOVERY FUTURE
Puede implementar discovery de impresoras compatibles.
Manual IP sigue siendo fallback.
1921. PRINTER NAME
Humano.
Ejemplo:
Caja Principal — Recibos
1922. KDS NAME
Ejemplo:
Cocina Principal
1923. CDS NAME
Ejemplo:
Pantalla Cliente Caja 1
1924. DEVICE NAMING VALIDATION
Evitar nombres vacíos.
Duplicados permitidos solo con advertencia.
1925. PAIRING UX
Mostrar ambos dispositivos con nombres claros.
No pedir al usuario comparar UUID largos.
1926. PAIRING CONFIRMATION
Ejemplo:
Conectar:

WTF POS — Caja Principal

con

WTF KDS — Cocina Principal

Código: 482731
Confirmar en el flujo seguro definido.
1927. PAIRING TIMEOUT
Código expira.
1928. PAIRING CANCEL
Revocar nonce.
1929. PAIRING SUCCESS
Guardar association + credentials.
1930. PAIRING FAILURE
Mostrar razón útil:
- código expirado;
- dispositivo no autorizado;
- versión incompatible;
- red inaccesible.
1931. PAIRING RETRY
Generar nuevo nonce cuando sea necesario.
1932. PAIRING HISTORY
Registrar eventos relevantes.
1933. UNPAIR
Acción administrativa.
Revocar asociación.
1934. UNPAIR ACTIVE KDS
Advertir si existen comandas pendientes.
1935. UNPAIR CDS
Puede realizarse sin afectar ventas.
1936. UNPAIR POS DEVICE
No equivale a revocar POS de la organización.
1937. DEVICE AUTH VS PAIRING
Diferenciar:
Device authorization
Puede operar en WTF.
Pairing
Dos dispositivos específicos pueden comunicarse.
1938. KDS MULTI-POS
Un KDS puede estar emparejado/autorizado para múltiples POS de la misma Branch.
1939. CDS SINGLE ACTIVE POS
Por defecto un CDS debe asociarse a un POS/Register para evitar cruce de sesiones.
1940. CDS REASSIGNMENT
Debe terminar sesión actual antes de reasignar.
1941. KDS STATION ROUTING
KDS recibe únicamente estaciones asignadas.
1942. KDS MULTI-STATION
Puede mostrar varias estaciones si se configura.
1943. KDS STATION FILTER
Si dispositivo cubre varias:
puede filtrar.
1944. KDS ALL STATIONS VIEW
Opcional para expediter/manager.
1945. EXPEDITER MODE FUTURE
Vista agregada de cocina.
P1/futuro.
1946. KITCHEN ITEM STATUS FUTURE
Puede marcar líneas individualmente.
No P0 si se utiliza comanda completa.
1947. SIMPLE KDS FIRST
Priorizar flujo sencillo y confiable.
1948. KDS ACTION TARGET SIZE
Botones grandes.
1949. KDS ACCIDENTAL DISPATCH
Puede requerir:
- swipe;
- confirm;
- undo temporal;
según UX.
Pero siempre existe historial/restore.
1950. KDS RESTORE VISIBILITY
Historial debe tener acción clara.
1951. KDS RESTORE DUPLICATION
Restaurar no crea una nueva KitchenOrder.
Cambia estado de la existente mediante evento.
1952. KDS DISPATCH IDEMPOTENCY
Doble toque:
una transición.
1953. KDS READY IDEMPOTENCY
Igual.
1954. KDS TIMER PERFORMANCE
Ticker compartido.
1955. KDS TIMER PRECISION
Segundos no son necesarios para color thresholds.
Puede mostrar:
12 min
1956. KDS NEW ORDER TIME
Mostrar hora.
1957. KDS LONG-WAIT SORT
No reordenar automáticamente salvo configuración.
El color ya indica retraso.
1958. KDS SOUND DUPLICATE
Retry de mismo evento no debe reproducir sonido de nueva comanda nuevamente.
1959. KDS NEW DELTA SOUND
Puede utilizar sonido diferente/opcional.
1960. KDS CANCEL SOUND
Opcional.
1961. KDS NETWORK INDICATOR
Discreto.
1962. KDS OFFLINE DOES NOT HIDE ORDERS
Sí.
1963. KDS SNAPSHOT RECONCILIATION
Al reconectar:
comparar active orders.
No borrar una orden local activa sin evidencia de estado remoto.
1964. KDS SERVER AUTHORITY
Definir autoridad para estados.
Para acciones KDS offline:
persistir eventos y reconciliar.
1965. KDS OFFLINE DISPATCH
Debe poder despachar localmente si la política lo permite.
Al reconectar:
sincronizar evento.
1966. KDS OFFLINE RESTORE
Igual.
1967. KDS CONFLICT
Si cloud/POS indica cancelada pero KDS offline la despachó:
conservar ambos eventos y resolver mediante reglas/timeline.
No ocultar.
1968. KITCHEN EVENT TIMELINE
Dashboard puede mostrar.
1969. KITCHEN AUDIT VS EVENT
Kitchen events forman historial operacional.
AuditLog se reserva para acciones sensibles/config.
1970. KITCHEN DATA RETENTION
Definir según necesidades de reportes/operación.
1971. CDS DISPLAY PROTOCOL VERSION
Sí.
1972. CDS OLD VERSION
Si incompatible:
mostrar pantalla de actualización/configuración.
No mostrar carrito incorrectamente.
1973. CDS HEARTBEAT
POS puede detectar conexión.
1974. CDS ACK
Para snapshots críticos puede existir ACK, pero la venta no depende de él.
1975. CDS MESSAGE DEDUP
Evitar aplicar delta dos veces.
1976. CDS SNAPSHOT REVISION
Cada DisplaySession puede tener revision.
1977. CDS OUT-OF-ORDER DELTA
Ignorar/request snapshot.
1978. CDS SESSION EXPIRED
Volver a idle.
1979. CDS SESSION PRIVACY AFTER SALE
Limpiar datos del cliente anterior.
1980. CDS APP RESTART
Recuperar pairing.
Solicitar estado actual al POS.
1981. CDS POS OFFLINE
Mostrar idle/reconnecting según estado.
1982. CDS POS CLOSED
No mostrar última venta indefinidamente.
1983. CDS BRANCH BRANDING
Puede descargar:
- logo;
- nombre;
- mensaje.
1984. CDS ASSET CACHE
Sí.
1985. CDS ASSET FAILURE
Fallback a texto/logo local.
1986. CDS PROMOTION CACHE
Futuro.
1987. CDS CUSTOMER NAME
No mostrar por defecto salvo configuración/necesidad.
1988. CDS FISCAL INFO
No necesita mostrar RNC/NCF durante carrito.
Después puede mostrar información de recibo si se diseña.
1989. CDS RECEIPT QR FUTURE
Sí.
1990. CDS SCREEN BURN-IN
Para displays permanentes:
considerar pequeños cambios/idle dinámico.
No comprometer UX.
1991. KDS SCREEN BURN-IN
Similar.
1992. ORIENTATION LOCK
KDS puede bloquear landscape si el dispositivo/

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 11 | attachment=7a3f4732-2abd-41ac-9da3-aa653540b7f3 | rango=1992-2152 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
1992. ORIENTATION LOCK
WTF KDS puede bloquearse en orientación horizontal cuando el dispositivo/instalación esté diseñado para trabajar de esa manera.
WTF CDS puede permitir:
- landscape;
- portrait;
según configuración/dispositivo.
WTF POS debe responder apropiadamente al factor de forma.
No depender de una orientación específica para preservar estado.
1993. ORIENTATION CHANGE STATE
Si cambia orientación:
no perder:
- carrito;
- ticket;
- pago en estado local previo a confirmación;
- pairing;
- KDS commands;
- CDS session.
1994. WINDOW RESIZE
En PC/tablet multitarea:
la UI debe adaptarse sin reiniciar flujos críticos.
1995. MULTI-WINDOW ANDROID
Si Android permite multi-window:
mantener estado.
No es necesario optimizar KDS para operar pequeño si la instalación es dedicada, pero no debe corromperse.
1996. POS LAYOUT BREAKPOINTS
Definir breakpoints por capacidad real, no únicamente por modelo de dispositivo.
Ejemplo conceptual:
Compact
Móvil.
Medium
Tablet pequeña.
Expanded
Tablet grande/PC.
1997. COMPACT POS
Puede utilizar:
- catálogo;
- carrito en panel/pantalla alterna;
- bottom actions.
Mantener Cobrar accesible.
1998. EXPANDED POS
Puede mostrar simultáneamente:
- categorías/productos;
- carrito;
- total.
1999. PC POS
Optimizar para:
- mouse;
- keyboard;
- touch cuando exista.
2000. RESPONSIVE PREVIEW SETTING
La opción Cuadrícula/Lista debe representar cómo se verá en el layout actual.
2001. FONT SYSTEM
Utilizar tipografía legible y consistente.
No depender de fuentes externas que puedan no cargar para operaciones críticas.
2002. ICON SYSTEM
Utilizar iconografía coherente.
Botones críticos deben tener texto además de icono cuando el significado pueda ser ambiguo.
2003. COLOR SYSTEM
Utilizar colores WTF mediante design tokens.
Estados semánticos:
- success;
- warning;
- error;
- info;
no deben confundirse con branding.
2004. KDS YELLOW
Debe mantener contraste de texto.
2005. KDS RED
Debe mantener contraste.
2006. KDS BLINK
A partir de 30 minutos:
puede parpadear el borde/indicador, no necesariamente toda la tarjeta.
Evitar dificultar lectura.
2007. REDUCED MOTION KDS
Sustituir parpadeo por indicador estático crítico.
2008. SOUND ACCESSIBILITY
No depender únicamente del sonido para informar nueva comanda.
2009. POS HAPTICS
Puede utilizarse de forma discreta para scanner/acciones.
No necesaria.
2010. CONFIRMATION TOASTS
No utilizar toasts para información financiera crítica que desaparece inmediatamente.
Preferir estados persistentes/pantallas.
2011. SNACKBAR
Adecuado para acciones reversibles/no críticas.
2012. PAYMENT SUCCESS
Pantalla persistente:
Cobrado
2013. PAYMENT FAILURE
Mostrar estado claro y acción.
2014. PAYMENT UNKNOWN
Mostrar:
Verificando pago
No invitar inmediatamente a cobrar otra vez.
2015. PAYMENT UNKNOWN CASH
No debería ocurrir como provider externo.
Para efectivo, la confirmación es local/operacional.
2016. MANUAL CARD CONFIRMATION
Como la terminal externa no puede ser verificada automáticamente:
el empleado confirma que fue aprobada.
Puede requerir referencia.
2017. MANUAL CARD WARNING
La UI debe dejar claro que WTF POS está registrando el pago, no procesándolo.
2018. MANUAL TRANSFER
Mismo principio.
2019. CUSTOM PAYMENT METHOD
Debe definir comportamiento:
- cashLike;
- requiresReference;
- opensDrawer;
- refundable.
No deducir por nombre.
2020. PAYMENT METHOD ICON
Opcional/configurable.
No usar logos protegidos sin autorización.
2021. PAYMENT METHOD ORDER
Administrador puede ordenar.
2022. PAYMENT METHOD BRANCH SCOPE
Puede variar.
2023. PAYMENT METHOD AVAILABILITY
Puede activarse/desactivarse.
2024. PAYMENT METHOD OFFLINE CAPABILITY
Cada método debe indicar si puede utilizarse offline.
Ejemplo:
Cash:
sí.
Integrated online card:
depende del provider.
2025. OFFLINE PAYMENT UX
Ocultar/deshabilitar métodos que requieren conexión cuando no están disponibles.
Explicar:
Este método requiere conexión a Internet.
2026. PAYMENT PROVIDER DEGRADATION
Si provider está caído:
otros métodos continúan.
2027. PAYMENT PROVIDER HEALTH CACHE
No llamar health endpoint antes de cada toque.
2028. PAYMENT ATTEMPT AUDIT
Registrar estados sin secretos.
2029. PAYMENT PROVIDER REFERENCE
Guardar identificador externo.
2030. PAYMENT UNIQUE PROVIDER REFERENCE
Cuando provider lo garantice:
unique constraint/validation.
2031. PAYMENT WEBHOOK FUTURE
Si provider utiliza webhook:
procesarlo idempotentemente.
2032. WEBHOOK OUT-OF-ORDER
Manejar eventos tardíos.
2033. WEBHOOK SIGNATURE
Verificar.
2034. PAYMENT RECONCILIATION JOB
Consultar provider para UNKNOWN/PENDING cuando sea compatible.
2035. PAYMENT MANUAL RESOLUTION
Solo manager/admin.
Debe requerir:
- estado seleccionado;
- evidencia/referencia;
- motivo.
2036. PAYMENT MANUAL RESOLUTION AUDIT
Obligatorio.
2037. NEVER DELETE PAYMENT ATTEMPT
Mantener historial.
2038. PAYMENT RETRY CREATES ATTEMPT
Si realmente se realiza un segundo intento después de confirmar que el primero falló:
crear nuevo PaymentAttempt.
No reutilizar ambiguamente el anterior.
2039. SALE PAYMENT SUMMARY
Sale puede tener múltiples Payments.
2040. PAYMENT CHANGE
Cambio de efectivo no es un Payment separado necesariamente.
Modelar consistentemente.
2041. CASH ROUNDING FUTURE
Si alguna jurisdicción lo requiere:
configurable.
No aplicar en DOP sin necesidad.
2042. REFUND PROVIDER REFERENCE
Guardar.
2043. PAYMENT FEES
Comisiones de adquirente no cambian el total cobrado al cliente.
Pueden incorporarse en reportes financieros futuros.
2044. PAYMENT SETTLEMENT FUTURE
Reconciliación bancaria/adquirente fuera de P0.
2045. TIP PAYMENT FUTURE
Separado.
2046. CASH DRAWER OPEN ON CASH
Configurable.
2047. CASH DRAWER OPEN ON CARD
Normalmente no.
Configurable si negocio lo necesita.
2048. CASH DRAWER MANUAL OPEN
Permiso + audit.
2049. CASH DRAWER TEST
Configuración → Printer/Register → Probar gaveta.
No registrar como movimiento de efectivo.
Sí puede registrar acción técnica/audit cuando sea necesario.
2050. SHIFT CASH COUNT DENOMINATIONS
Puede ofrecer conteo por denominación.
Ejemplo:
- RD$2,000 × X
- RD$1,000 × X
P1/recomendado.
2051. SIMPLE CASH COUNT
V1 puede permitir monto total contado.
2052. DENOMINATION CONFIG
Por currency.
2053. BLIND CLOSE UX
Si activo:
no mostrar expected hasta que cajero confirme contado.
2054. BLIND CLOSE RESULT
Después de confirmar:
mostrar diferencia según permiso/política.
2055. SHIFT CLOSE APPROVAL
Diferencias superiores a umbral pueden requerir manager.
2056. SHIFT CLOSE COMMENT
Puede ser obligatorio si diferencia ≠ 0.
2057. SHIFT CLOSE RECEIPT
Opcional imprimir resumen de caja.
2058. SHIFT CLOSE REPORT
Dashboard.
2059. SHIFT REOPEN
Evitar.
Si existe necesidad excepcional:
procedimiento administrativo auditado, no edición casual.
2060. SHIFT CORRECTION
Preferir adjustment.
2061. CASH MOVEMENT RECEIPT
Puede imprimir comprobante interno para Cash In/Out.
Opcional.
2062. SAFE DROP RECEIPT
Opcional.
2063. CASH MOVEMENT ATTACHMENT FUTURE
Puede adjuntar evidencia.
No P0.
2064. SHIFT NOTES
Permitir notas internas.
2065. TIME CLOCK CORRECTION
Manager puede corregir marcación.
Guardar:
- original;
- corrected;
- reason;
- actor.
2066. TIME CLOCK MANUAL ENTRY
Permiso.
2067. TIME CLOCK DUPLICATE CLOCK-IN
No permitir dos entradas abiertas simultáneas para mismo empleado salvo política explícita.
2068. TIME CLOCK CLOCK-OUT WITHOUT IN
Advertir/bloquear.
2069. TIME CLOCK OPEN ENTRY
Dashboard puede mostrar empleados actualmente marcados.
2070. TIME CLOCK HOURS
Calcular duración.
No convertir automáticamente en nómina.
2071. TIME CLOCK BUSINESS DATE
Reportes laborales pueden agrupar por fecha/turno laboral definido.
Documentar.
2072. TIME CLOCK OFFLINE
POS puede registrar marcación local si empleado/config está disponible.
Sincronizar después.
2073. TIME CLOCK IDEMPOTENCY
Doble toque no crea dos marcaciones.
2074. TIME CLOCK DEVICE
Registrar device/branch.
2075. TIME CLOCK BIOMETRIC
Puede usar biometría si la política/dispositivo lo permite.
2076. TIME CLOCK PIN
Puede usar mismo mecanismo de identidad del empleado, pero mantener caso de uso separado.
2077. TIME CLOCK REPORT
- employee;
- date;
- in;
- out;
- duration;
- corrections.
2078. TIME CLOCK EXPORT
Sí.
2079. EMPLOYEE ROLE VS JOB POSITION
No necesariamente son lo mismo.
Ejemplo:
Position:
Camarero.
Role:
CashierPermissions.
Preparar separación si el sistema de RRHH existente la necesita.
2080. SIMPLE V1 EMPLOYEE ROLE
Puede utilizar un campo Rol según requerimiento original.
No bloquear v1 por modelado avanzado.
2081. EMPLOYEE PROFILE FUTURE
Puede integrar:
- position;
- department;
- HR data.
Fuera del núcleo POS.
2082. EMPLOYEE PHONE PRIVACY
No mostrar a todos los cajeros.
Dashboard según permiso.
2083. EMPLOYEE EMAIL PRIVACY
Igual.
2084. EMPLOYEE PIN RESET
Admin autorizado puede iniciar reset.
No mostrar PIN actual.
2085. EMPLOYEE PIN CHANGE
Empleado puede cambiarlo tras autenticarse si la política lo permite.
2086. FORGOT PIN
No enviar PIN por email.
Proceso de reset administrativo/seguro.
2087. BIOMETRIC ENROLLMENT ASSOCIATION
No almacenar template biométrico.
Asociar capacidad/credencial mediante APIs oficiales.
2088. BIOMETRIC SHARED DEVICE LIMITATION
Documentar que biometría del sistema autentica al usuario del dispositivo, no necesariamente identifica automáticamente a un empleado específico en todos los escenarios.
Diseñar flujo seguro.
2089. FACE AUTHENTICATION TERMINOLOGY
En Android utilizar:
Biometría / reconocimiento facial compatible
No llamar universalmente “Face ID”, que es terminología específica de Apple.
2090. APP LANGUAGE TERMINOLOGY
Si se crea versión iOS futura:
puede usar Face ID.
No requisito actual APK.
2091. ANDROID BIOMETRIC API
Utilizar API oficial disponible.
2092. BIOMETRIC SECURITY CLASS
Si una acción requiere biometría fuerte:
validar capability apropiada.
No asumir que cualquier face unlock tiene el mismo nivel.
2093. HIGH-RISK ACTION REAUTH
Para:
- owner changes;
- fiscal config;
- role escalation;
puede requerir reautenticación reciente.
2094. REAUTH WINDOW
Definir período corto/configurable.
2095. SUPERVISOR AUTH SINGLE-USE
Una autorización de descuento no debe autorizar automáticamente el siguiente refund.
2096. SUPERVISOR AUTH CONTEXT
Vincular a:
- action;
- entity;
- timestamp.
2097. AUTHORIZATION REASON
Puede requerirse.
2098. OWNER EMERGENCY RECOVERY
Diseñar mecanismo seguro para recuperar cuenta administrativa.
No master password.
2099. PASSWORD RESET
Tokens:
- aleatorios;
- expirables;
- one-time.
2100. EMAIL ENUMERATION
Login/reset no debe revelar innecesariamente si una cuenta existe.
2101. MFA FUTURE/RECOMMENDED
Para Owner/Admin Dashboard considerar MFA.
Puede ser P1 según alcance.
2102. POS MFA
No necesario para cada venta.
PIN/biometría + device trust.
2103. API AUTH TOKEN
Scopes/claims no deben confiar en datos modificables del cliente.
2104. REFRESH TOKEN ROTATION
Considerar para Dashboard/mobile cloud sessions.
2105. DEVICE TOKEN ROTATION
Soportar.
2106. SECRET ROTATION
Providers.
Documentar procedimiento.
2107. CERTIFICATE ROTATION
Sin downtime cuando sea posible.
2108. KEY COMPROMISE
Runbook.
2109. LOST OWNER DEVICE
Revocar sesiones/device.
2110. SECURITY UPDATE PROCESS
Critical vulnerabilities priorizadas.
2111. DEPENDENCY PINNING
Utilizar lockfiles.
2112. SUPPLY CHAIN
Preferir dependencias mantenidas.
Evitar paquetes desconocidos para funciones simples.
2113. LICENSE CHECK
Sí.
2114. BUILD SIGNING SECURITY
Keystore fuera del repo.
2115. CI SECRETS
Utilizar secret storage de CI.
2116. CI LOG REDACTION
No imprimir secrets.
2117. ENV VALIDATION
Backend al iniciar debe verificar variables críticas.
Fail fast con mensaje técnico seguro.
2118. OPTIONAL ENV
Defaults documentados.
2119. PRODUCTION DEBUG MODE
Desactivado.
2120. PRODUCTION SOURCE MAPS
Gestionarlos de forma segura para diagnóstico.
2121. DASHBOARD SOURCE MAP
No exponer información sensible.
2122. API STACK TRACE
No production response.
2123. ANDROID DEBUG LOG
Reducir en release.
2124. KDS DEBUG LOG
Igual.
2125. CDS DEBUG LOG
Igual.
2126. PRIVACY SCRUBBER
Centralizar sanitización de logs cuando sea útil.
2127. CORRELATION ID UI
Solo mostrar abreviado cuando existe error.
2128. SUPPORT WORKFLOW
Empleado:
1. ve error;
2. copia support code;
3. manager/soporte consulta logs.
No pedir screenshots con información sensible innecesariamente.
2129. SUPPORT SEARCH
Dashboard técnico puede buscar correlationId.
2130. SUPPORT PERMISSIONS
No accesible a cashier.
2131. SUPPORT NOTES
Puede registrar incidente.
2132. SUPPORT DATA RETENTION
Limitada.
2133. ERROR ANALYTICS
Agrupar por error code/version.
2134. CRASH FREE METRIC
Puede utilizarse para calidad.
No sustituye pruebas.
2135. PERFORMANCE METRICS PRIVACY
No incluir PII.
2136. USER ANALYTICS
No necesarias para v1.
2137. BUSINESS ANALYTICS
Derivadas de ventas, no tracking invasivo.
2138. DATA WAREHOUSE FUTURE
No P0.
2139. REPORTING DATABASE FUTURE
Si volumen crece:
read replica/warehouse.
No sobrearquitectar v1.
2140. MODULAR MONOLITH
Backend v1 puede centralizar transacciones y simplificar consistencia.
2141. MODULE DATABASE OWNERSHIP
Incluso en monolith:
definir qué módulo modifica qué tablas.
2142. CROSS-MODULE WRITES
Evitar que cualquier módulo actualice tablas ajenas directamente.
Utilizar services/events.
2143. TRANSACTIONAL CONSISTENCY
Para operaciones que deben ser atómicas dentro del mismo DB:
aprovechar monolith/transaction.
2144. ASYNC BOUNDARIES
Usar para:
- external providers;
- notifications;
- printing;
- analytics.
2145. QUEUE TECHNOLOGY
No agregar broker complejo si DB outbox/worker resuelve escala inicial.
2146. MESSAGE BROKER FUTURE
Puede añadirse cuando exista necesidad real.
2147. REDIS FUTURE
Igual.
2148. SERVICE EXTRACTION FUTURE
Los límites modulares deben permitir extraer:
- reporting;
- notifications;
- integrations;
si escala lo requiere.
2149. DO NOT EXTRACT PAYMENTS PREMATURELY
Mantener consistencia sencilla hasta que exista razón.
2150. DO NOT EXTRACT INVENTORY PREMATURELY
Igual.
2151. DATABASE SINGLE SOURCE
Central DB es fuente cloud.
No múltiples bases transaccionales sin estrategia.
2152. LOCAL DB IS OPERATIONAL SOURCE OFFLINE
Durante

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮

<!-- PARTE 12 | attachment=a3ea43ed-9ea7-4592-b02d-429963f7ce63 | rango=2152-2316 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
2152. LOCAL DB IS OPERATIONAL SOURCE OFFLINE
Durante una interrupción de Internet, la base local de WTF POS constituye la fuente operacional inmediata para las transacciones creadas en ese dispositivo.
Esto NO significa que existan dos fuentes de verdad financieras independientes.
La arquitectura debe distinguir:
Autoridad operacional local
Permite continuar trabajando y persistir transacciones.
Autoridad central
Consolida y sincroniza las transacciones de todas las cajas/sucursales.
Las operaciones locales deben poseer IDs globales e información suficiente para integrarse al cloud sin recrearse como transacciones nuevas.
2153. CLOUD DOES NOT RECREATE LOCAL SALE
Al sincronizar:
el backend debe aceptar/reconciliar la venta existente mediante su ID.
No crear:
Local Sale → New Cloud Sale
como dos entidades financieras diferentes.
2154. CLOUD ACKNOWLEDGEMENT
Después de persistir la operación:
backend devuelve confirmación.
POS actualiza:
SYNCED
2155. CLOUD DUPLICATE SALE
Si recibe nuevamente el mismo saleId/idempotencyKey:
devolver el resultado existente.
No insertar duplicado.
2156. CLOUD CONFLICT ON IMMUTABLE SALE
Si el mismo saleId llega con contenido financiero diferente:
no hacer merge silencioso.
Marcar conflicto crítico e investigar.
2157. IMMUTABLE SALE HASH
Puede calcularse fingerprint/hash de campos críticos para detectar discrepancias.
No utilizarlo como sustituto de firmas/autenticación.
2158. SYNC CONFLICT DASHBOARD
Mostrar incidencias reales que requieran revisión.
2159. NO CASHIER CONFLICT RESOLUTION
Conflictos financieros complejos no deben presentarse al cajero como merge técnico.
2160. SYNC ADMIN RESOLUTION
Solo manager/admin/support autorizado.
Registrar resolución.
2161. CUSTOMER CONFLICT
Puede resolverse mediante merge posterior.
No afecta integridad de venta.
2162. PRODUCT CONFIG CONFLICT
Cloud/config publicada normalmente gana para operaciones futuras.
Ventas anteriores mantienen snapshot.
2163. OPEN TICKET CONFLICT
Resolver mediante version/revision.
No sumar líneas automáticamente sin reglas.
2164. DEVICE CONFIG CONFLICT
Utilizar configVersion.
2165. LAST-WRITE-WINS
No utilizar LWW indiscriminadamente para:
- dinero;
- pagos;
- ventas;
- inventario.
Puede ser aceptable para preferencias simples.
2166. USER PREFERENCE LWW
Ejemplo:
grid/list.
2167. FINANCIAL CONFLICT
Requiere regla transaccional explícita.
2168. SYNC TEST MATRIX
Probar:
- 1 venta offline;
- 100 ventas offline;
- reinicio;
- timeout;
- duplicate;
- partial batch;
- invalid operation;
- reconnect;
- device revocation;
- config update simultánea.
2169. LONG OFFLINE PERIOD
Simular horas/días razonables según política.
Verificar:
- DB growth;
- outbox;
- auth expiry;
- catalog age;
- sync.
2170. OFFLINE CATALOG AGE
Puede mostrar:
Catálogo actualizado hace X
en diagnóstico.
No molestar al cajero constantemente.
2171. CRITICAL CONFIG AGE
Si una configuración crítica requiere renovación periódica:
aplicar política explícita.
2172. FISCAL OFFLINE LIMIT
Debe provenir de reglas/provider real.
2173. PAYMENT OFFLINE LIMIT
Depende del método.
2174. CLOUD REPORTS DURING OFFLINE BRANCH
Dashboard puede estar incompleto hasta sync.
Mostrar data freshness.
2175. BRANCH LAST SYNC
Dashboard muestra.
2176. DEVICE LAST SYNC
También.
2177. UNSYNCED COUNT
Mostrar a administrador.
2178. UNSYNCED VALUE
Puede mostrar monto total pendiente con cuidado.
No asumir que es pérdida.
2179. SYNC FAILURE REASON
Clasificar.
2180. SYNC MANUAL RETRY
Admin puede solicitar retry.
2181. SYNC DEAD LETTER
Después de múltiples fallos no-retryable:
marcar para revisión.
No borrar.
2182. DEAD LETTER UI
Mostrar:
- operation;
- entity;
- error code;
- attempts;
- action.
2183. DEAD LETTER SECURITY
No permitir editar payload financiero libremente.
2184. DEAD LETTER REPAIR
Crear herramientas específicas.
2185. SYNC OPERATION PAYLOAD VERSION
Sí.
2186. OLD CLIENT SYNC
Backend debe manejar versiones soportadas.
2187. UNSUPPORTED CLIENT
Responder claramente:
UPGRADE_REQUIRED
2188. OFFLINE UPGRADE REQUIRED
No destruir datos.
Permitir sincronización/recovery path cuando sea posible.
2189. MIGRATION + SYNC COMPATIBILITY
Actualizar schema local no debe invalidar outbox pendiente.
2190. OUTBOX MIGRATION
Migrar payloads o mantener handlers compatibles.
2191. KDS EVENT MIGRATION
Igual.
2192. PRINT JOB MIGRATION
Preservar pendientes.
2193. PAYMENT ATTEMPT MIGRATION
Máxima precaución.
2194. RELEASE ROLLBACK
Una nueva versión no debe asumir que siempre puede hacerse downgrade de DB.
Documentar rollback real.
2195. SERVER ROLLBACK
Migrations deben considerar compatibilidad con versión anterior durante despliegue cuando sea necesario.
2196. MOBILE ROLLOUT
No todos los dispositivos actualizarán simultáneamente.
Backend/protocol debe tolerar ventana de versiones.
2197. KDS ROLLOUT
Puede actualizarse independientemente.
2198. CDS ROLLOUT
Igual.
2199. PROTOCOL NEGOTIATION
Handshake puede indicar:
- clientVersion;
- protocolVersion;
- capabilities.
2200. CAPABILITY NEGOTIATION
Si una versión nueva soporta feature adicional:
no enviarla a cliente viejo incompatible.
2201. REQUIRED CAPABILITY
Si una orden requiere una capability que KDS no soporta:
no degradar silenciosamente.
Alertar/actualizar.
2202. PRINTER CAPABILITY NEGOTIATION
Adapter conoce capacidades.
2203. RECEIPT TEMPLATE CAPABILITY
Si printer no soporta QR/logo:
fallback documentado.
2204. DEVICE FEATURE MATRIX
Dashboard puede mostrar capacidades.
2205. RELEASE COMPATIBILITY TESTS
Probar:
- new POS + supported old API;
- supported old POS + new API;
- new POS + supported old KDS;
- new KDS + supported old POS;
según ventana declarada.
2206. BREAKING CHANGE
Requiere major protocol/API version o migration strategy.
2207. DEPRECATION
Documentar.
2208. DEPRECATION WARNING
Logs/Dashboard técnico.
No mostrar al cajero salvo que requiera actualización.
2209. API CONTRACT TESTS
Automatizar.
2210. REALTIME CONTRACT TESTS
Automatizar.
2211. DATABASE CONTRACT TESTS
Constraints.
2212. MONEY CONTRACT TESTS
Serialization exacta.
2213. DATE CONTRACT TESTS
Timezone/ISO.
2214. ENUM COMPATIBILITY
Clientes deben manejar valores nuevos según estrategia.
No crash por un enum desconocido cuando pueda tratarse como unsupported.
2215. UNKNOWN FIELD
Ignorar campos adicionales cuando contrato lo permita.
2216. REQUIRED FIELD REMOVAL
Breaking change.
2217. API DOCUMENTATION VERSION
Debe corresponder al release.
2218. OPENAPI CI
Detectar breaking changes cuando sea posible.
2219. DB SCHEMA DOCUMENTATION
Actualizar automáticamente o verificar.
2220. ARCHITECTURE DIAGRAM
Debe reflejar deployment real.
2221. DEPLOYMENT DIAGRAM
Crear:
Users
  │
WTF Dashboard
  │ HTTPS
  ▼
Backend/API
  │
PostgreSQL
  │
Workers/Jobs

Branch LAN
  │
WTF POS
 ├── WTF KDS
 ├── WTF CDS
 └── Printers
Adaptar según infraestructura final.
2222. TRUST BOUNDARIES
Marcar en Threat Model:
- Internet;
- cloud;
- branch LAN;
- Android device;
- printer.
2223. DATA FLOW DIAGRAM
Crear para:
Venta
Pago
KDS
CDS
Sync
Fiscal
2224. SALE DATA FLOW
Debe mostrar:
POS UI
→ Domain
→ Local DB
→ Outbox
→ Backend
→ Central DB
→ Reports.
2225. KDS DATA FLOW
POS
→ KitchenRouting
→ KitchenEvent
→ LAN/queue
→ KDS
→ ACK
→ state sync.
2226. CDS DATA FLOW
POS
→ DisplaySession
→ CDS.
Unidireccional principalmente.
2227. PAYMENT DATA FLOW
POS
→ PaymentAttempt
→ Provider/manual confirmation
→ Payment
→ Sale.
2228. FISCAL DATA FLOW
Sale/Receipt
→ FiscalRequest
→ Provider
→ FiscalDocument.
2229. INVENTORY DATA FLOW
SaleCompleted
→ InventoryEvent
→ Ledger
→ Stock.
2230. SHIFT DATA FLOW
Cash payment/refund/movement
→ CashMovement
→ Shift reconciliation.
2231. REPORT DATA FLOW
Transactions
→ queries/aggregates
→ Dashboard/export.
2232. SECURITY DATA FLOW
Auth
→ token/session
→ authorization
→ audit.
2233. DATA OWNERSHIP DOCUMENT
Definir quién puede modificar cada entidad.
2234. PRODUCT OWNERSHIP
Catalog module.
2235. SALE OWNERSHIP
Sales module.
2236. PAYMENT OWNERSHIP
Payments module.
2237. INVENTORY OWNERSHIP
Inventory module.
2238. KITCHEN OWNERSHIP
Kitchen module.
2239. DEVICE OWNERSHIP
Devices module.
2240. FISCAL OWNERSHIP
Fiscal module.
2241. REPORT READ MODEL
Reports pueden leer múltiples módulos sin modificar transacciones.
2242. AUDIT OWNERSHIP
Audit service append-only.
2243. NO CROSS-MODULE TABLE HACKS
Evitar.
2244. TEST DATABASE
Integration tests con DB real/container cuando sea posible.
No confiar únicamente en mocks de SQL.
2245. TRANSACTION TESTS
Verificar rollback.
2246. CONSTRAINT TESTS
Verificar unique/FK/check.
2247. CONCURRENCY TESTS
Ejecutar realmente operaciones paralelas.
2248. SEQUENCE CONCURRENCY TEST
Múltiples workers/cajas.
Cero duplicados.
2249. PAYMENT CONCURRENCY TEST
Dos requests para misma venta.
Un efecto.
2250. OPEN TICKET CONCURRENCY TEST
Detectar conflict.
2251. INVENTORY CONCURRENCY TEST
Ledger correcto.
2252. CONFIG PUBLISH CONCURRENCY
Evitar versiones ambiguas.
2253. DEVICE AUTH CONCURRENCY
No autorizar/revocar en estado imposible.
2254. LOCK TESTS
No deadlocks bajo flujos normales.
2255. DEADLOCK RETRY
DB puede reintentar transacción idempotente cuando sea seguro.
2256. TRANSACTION ISOLATION
Elegir niveles apropiados.
Documentar decisiones críticas.
2257. SEQUENCE TRANSACTION ISOLATION
Especial atención.
2258. FINANCIAL TRANSACTION ISOLATION
Especial atención.
2259. INVENTORY LEDGER INSERT
Append-only.
2260. CASH LEDGER INSERT
Append-only.
2261. AUDIT INSERT
Append-only.
2262. EVENT OUTBOX INSERT
En misma transacción que cambio crítico.
2263. OUTBOX WORKER
Lee pendientes.
Publica/envía.
Marca procesado.
2264. OUTBOX CRASH AFTER SEND
Si worker envía pero muere antes de marcar:
reenviará.
Consumer debe ser idempotente.
2265. INBOX CRASH AFTER PROCESS
Consumer debe persistir dedup junto al efecto cuando sea posible.
2266. KDS ACK AFTER PERSIST
Reiteración crítica.
2267. BACKEND ACK AFTER COMMIT
Reiteración crítica.
2268. PRINT ACK LIMITATION
Abrir socket no significa papel impreso.
Utilizar el mejor estado disponible y documentar limitación.
2269. PAYMENT ACK
Provider response debe interpretarse según documentación real.
2270. FISCAL ACK
Igual.
2271. UNKNOWN EXTERNAL STATE
Primera clase.
2272. RECONCILIATION WORKER
Procesa unknown/pending.
2273. RECONCILIATION UI
Manager/Admin.
2274. RECONCILIATION DOES NOT AUTO-GUESS
No marcar success porque “probablemente pasó”.
2275. MANUAL EVIDENCE
Puede registrar referencia/comentario.
2276. INCIDENT CORRELATION
Unknown payment/fiscal debe tener correlation ID.
2277. PAYMENT PROVIDER OUTAGE
Circuit breaker/backoff.
2278. FISCAL PROVIDER OUTAGE
Igual.
2279. EMAIL PROVIDER OUTAGE
No crítico.
2280. PUSH PROVIDER OUTAGE
No crítico.
2281. STORAGE PROVIDER OUTAGE
Producto images pueden fallar; ventas continúan con cache/placeholder.
2282. BACKUP PROVIDER OUTAGE
Critical alert.
2283. CLOUD DATABASE OUTAGE
Backend no puede confirmar sync.
POS local continúa según política.
2284. BACKEND RECOVERY
Outbox sincroniza.
2285. DATABASE RECOVERY
Verificar consistencia antes de abrir completamente si incidente grave.
2286. READ-ONLY MAINTENANCE MODE
Dashboard puede quedar read-only durante ciertas migrations.
POS local sigue según arquitectura.
2287. POS CONFIG UPDATE DURING CLOUD OUTAGE
No disponible.
Utiliza Last Known Good.
2288. ADMIN EXPECTATION
Dashboard debe indicar que dispositivos offline aún no recibieron cambios.
2289. CONFIGURATION SAFETY WINDOW
Para cambios críticos, considerar publicación antes de servicio para permitir propagación.
2290. PRICE CHANGE DURING SERVICE
Permitido, pero órdenes abiertas conservan snapshot.
2291. TAX CHANGE DURING SERVICE
Mayor riesgo.
Utilizar effective date/version.
2292. FISCAL SEQUENCE CHANGE DURING SERVICE
Requiere controles estrictos.
2293. KITCHEN ROUTING CHANGE DURING SERVICE
Nuevas líneas/órdenes usan nueva versión.
No mover silenciosamente comandas existentes.
2294. PAYMENT METHOD DISABLE DURING SERVICE
Pagos ya completados intactos.
Pantallas nuevas dejan de ofrecerlo después de config sync.
2295. EMPLOYEE PERMISSION CHANGE DURING SERVICE
Aplicar lo antes razonablemente posible.
2296. DEVICE REVOCATION DURING SERVICE
Persistir orden actual antes de bloquear si es seguro.
No permitir nuevas ventas.
2297. POS EMERGENCY LOCAL OPERATION
No crear “modo emergencia” que ignore permisos.
Offline normal debe ser suficiente dentro de políticas.
2298. BUSINESS OWNER OVERRIDE
Acciones excepcionales requieren Owner/Manager, no bypass técnico.
2299. DATA INTEGRITY OVER AVAILABILITY
Cuando ambas entren en conflicto para una operación financiera crítica:
preferir no corromper/duplicar dinero.
2300. AVAILABILITY OVER AUXILIARY FEATURES
Para funciones no críticas:
preferir continuar venta.
2301. CAP THE SCOPE OF FAILURE
CDS failure → CDS.
Printer failure → PrintJob.
Email failure → Email.
No convertirlos en sale failure.
2302. PAYMENT FAILURE SCOPE
Puede impedir completar pago, pero no borrar orden.
2303. FISCAL FAILURE SCOPE
Depende de legalidad.
No borrar orden/venta; mantener estado seguro.
2304. LOCAL DB FAILURE SCOPE
Puede impedir nuevas ventas porque no existe persistencia segura.
2305. STORAGE FULL SCOPE
Igual.
2306. AUTHORIZATION FAILURE SCOPE
Impide acción específica.
2307. KDS FAILURE SCOPE
No debe borrar ticket.
2308. SYNC FAILURE SCOPE
No debe borrar venta.
2309. REPORT FAILURE SCOPE
No afecta ventas.
2310. BACKUP FAILURE SCOPE
No afecta una venta individual, pero genera critical operational alert.
2311. ERROR RECOVERY TEST MATRIX
Crear tests para cada dependencia y verificar el alcance del fallo.
2312. CHAOS TEST — PRINTER
Apagar durante print.
2313. CHAOS TEST — KDS
Desconectar después de persistir evento.
2314. CHAOS TEST — CLOUD
Desconectar durante sync.
2315. CHAOS TEST — POS PROCESS
Matar después de local commit.
2316. CHAOS TEST — PAYMENT

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 13 | attachment=ebab45a1-541e-4b6d-88a6-be49379acbe0 | rango=2316-2492 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
2316. CHAOS TEST — PAYMENT
Simular interrupciones en distintos momentos del pago:
Caso A
Antes de enviar al provider.
Resultado:
no existe cobro externo.
Caso B
Después de enviar pero antes de recibir respuesta.
Resultado:
UNKNOWN/PENDING_CONFIRMATION.
Caso C
Después de recibir aprobación pero antes de finalizar la venta localmente.
Resultado:
recuperar PaymentAttempt y completar/reconciliar sin volver a cobrar.
Caso D
Después de persistir Payment pero antes de mostrar pantalla final.
Resultado:
al reabrir no solicitar otro pago.
2317. CHAOS TEST — FISCAL
Simular:
- antes de request;
- timeout;
- provider acepta pero response se pierde;
- rechazo;
- app/backend restart.
No emitir duplicados.
2318. CHAOS TEST — INVENTORY
Matar worker después de crear movimiento pero antes de marcar evento procesado.
Retry no duplica.
2319. CHAOS TEST — OUTBOX
Matar worker después de enviar.
Consumer idempotente.
2320. CHAOS TEST — DATABASE
Simular fallo transaccional antes de commit.
No dejar venta parcial.
2321. CHAOS TEST — STORAGE
Simular error de escritura.
No mostrar venta como completada.
2322. CHAOS TEST — CONFIG
Descargar configuración corrupta.
Conservar Last Known Good.
2323. CHAOS TEST — ROUTER
Reiniciar durante servicio.
POS local continúa.
KDS/CDS reconectan.
2324. CHAOS TEST — KDS REBOOT
Comandas activas vuelven.
2325. CHAOS TEST — CDS REBOOT
Pairing vuelve.
Solicita snapshot.
2326. CHAOS TEST — PRINTER RECONNECT
Jobs pendientes reintentables.
2327. CHAOS TEST — CLOCK CHANGE
Cambiar reloj del dispositivo.
No corromper:
- KDS;
- businessDate;
- sync.
Generar warning si corresponde.
2328. CHAOS TEST — DUPLICATE MESSAGE
Reenviar eventos varias veces.
Un efecto lógico.
2329. CHAOS TEST — OUT-OF-ORDER
Enviar eventos KDS/CDS desordenados.
Resolver/request snapshot.
2330. CHAOS TEST — SLOW DATABASE
UI/backend deben manejar timeout/backpressure.
2331. CHAOS TEST — HIGH LATENCY LAN
KDS/CDS reconnection/retry sin duplicar.
2332. CHAOS TEST — LOW STORAGE
Advertir/bloquear antes de corrupción.
2333. CHAOS TEST — APP UPDATE
Actualizar con:
- open shift;
- open ticket;
- outbox;
- print job.
Conservar estado.
2334. CHAOS TEST — BACKEND DEPLOY
Clientes continúan durante rollout compatible.
2335. CHAOS TEST — CONFIG CHANGE DURING OFFLINE
POS offline conserva versión anterior.
Al reconectar:
aplica nueva para operaciones futuras.
No reescribe ventas offline completadas.
2336. TEST AUTOMATION PRINCIPLE
Automatizar todo lo que pueda probarse de forma determinista.
No depender de pruebas manuales para lógica financiera básica.
2337. MANUAL TEST PURPOSE
Reservar especialmente para:
- UX;
- hardware;
- percepción;
- flujos físicos;
- impresoras;
- kitchen workflow.
2338. UNIT TEST — MONEY
Probar:
- suma;
- resta;
- comparación;
- multiplicación;
- rounding;
- serialization.
2339. UNIT TEST — PRICING
Probar todos los PriceBooks/modalidades.
2340. UNIT TEST — TAX
Incluido/adicional.
2341. UNIT TEST — CHARGES
Sí.
2342. UNIT TEST — DISCOUNTS
Sí.
2343. UNIT TEST — MODIFIERS
Sí.
2344. UNIT TEST — BUSINESS DATE
Sí.
2345. UNIT TEST — TURN NUMBER
Sí.
2346. UNIT TEST — SEQUENCES
Sí.
2347. UNIT TEST — STATE MACHINES
Transiciones válidas/inválidas.
2348. UNIT TEST — PERMISSIONS
Policies.
2349. UNIT TEST — KITCHEN ROUTING
Categoría/product override.
2350. UNIT TEST — INVENTORY
Movements/reservations.
2351. UNIT TEST — CASH
Expected cash.
2352. UNIT TEST — REFUND
Limits.
2353. UNIT TEST — IDEMPOTENCY
Sí.
2354. INTEGRATION TEST — SALE
DB transaction.
2355. INTEGRATION TEST — PAYMENT
Persistence + idempotency.
2356. INTEGRATION TEST — OUTBOX
Persistence + worker.
2357. INTEGRATION TEST — INVENTORY
Sale event → ledger.
2358. INTEGRATION TEST — KDS
POS protocol → KDS persistence.
2359. INTEGRATION TEST — CDS
DisplaySession.
2360. INTEGRATION TEST — PRINT
Print queue + virtual adapter.
2361. INTEGRATION TEST — AUTH
Login + RBAC.
2362. INTEGRATION TEST — TENANT
Isolation.
2363. INTEGRATION TEST — BRANCH
Isolation.
2364. INTEGRATION TEST — REPORTS
Known dataset.
2365. INTEGRATION TEST — FISCAL
Sandbox/fake provider.
2366. E2E — CASH SALE
Login → shift → sale → cash → receipt.
2367. E2E — OPEN TICKET
Create → save → reopen → modify → pay.
2368. E2E — KDS
Save → KDS → dispatch.
2369. E2E — CDS
Cart → totals → thank you.
2370. E2E — OFFLINE
WAN off → sale → restart → WAN on → sync.
2371. E2E — REFUND
Receipt → refund → cash/inventory/report.
2372. E2E — MULTI-POS
Concurrent.
2373. E2E — ADMIN CONFIG
Dashboard change → publish → POS applies.
2374. E2E — DEVICE REVOCATION
Dashboard → POS blocked.
2375. E2E — IMPORT
Upload → preview → import → search.
2376. E2E — REPORT EXPORT
Known dataset → export → totals.
2377. E2E — SHIFT CLOSE
Expected vs counted.
2378. E2E — FISCAL
Solo sandbox/provider autorizado.
2379. E2E — PRINTER
Con hardware cuando disponible.
2380. E2E — KDS HARDWARE
Tablet real.
2381. E2E — CDS HARDWARE
Tablet real.
2382. TEST FIXTURES
Versionados.
No datos reales.
2383. TEST CLOCK
Controlado.
2384. TEST IDS
Deterministas cuando sea útil.
2385. TEST DATABASE RESET
Solo test/dev.
2386. TEST PARALLELISM
Aislar datos.
2387. FLAKY TESTS
No ignorar.
Investigar.
2388. NO RETRY TEST TO HIDE FLAKINESS
Un retry CI puede existir por infraestructura, pero no sustituye corregir race conditions.
2389. NO SLEEP-BASED TEST
Preferir:
- fake clock;
- await condition;
- events.
2390. KDS 10/20/30 TEST
No esperar 30 minutos reales.
Inyectar clock.
2391. BUSINESS DATE TEST
Fake clock/timezone.
2392. AUTH EXPIRY TEST
Fake clock.
2393. PAIRING EXPIRY TEST
Fake clock.
2394. FISCAL RANGE EXPIRY TEST
Fake clock.
2395. TEST ASSERTIONS
Verificar resultado empresarial, no detalles internos innecesarios.
2396. SNAPSHOT TESTS
Útiles para:
- receipt render;
- KDS card;
- CDS layout.
No sustituir functional tests.
2397. VISUAL REGRESSION
Puede utilizarse para:
- Dashboard;
- KDS;
- CDS.
2398. ACCESSIBILITY TESTS
Automatizar donde herramientas lo permitan.
2399. ANDROID UI TESTS
Para flujos críticos.
2400. WEB E2E TESTS
Dashboard.
2401. BROWSER MATRIX
Definir navegadores soportados.
Como mínimo versiones modernas de:
- Chrome;
- Edge;
y otros según necesidad.
2402. MOBILE WEB
Dashboard responsive.
2403. PWA DASHBOARD
Opcional.
No confundir con POS offline.
2404. POS WEB FUTURE
Si se crea:
requiere evaluación específica de hardware/offline.
2405. DESKTOP CLIENT FUTURE
Según decisión.
2406. SHARED DOMAIN TEST VECTORS
Dinero/tax/pricing deben ejecutarse en todas las implementaciones relevantes.
2407. CONTRACT TEST ARTIFACT
Guardar JSON/casos versionados.
2408. TEST REPORT ARTIFACT
CI guarda:
- JUnit;
- coverage;
- logs;
- screenshots.
2409. HARDWARE TEST EVIDENCE
Guardar manualmente/automatizado:
- modelo;
- versión;
- resultado.
2410. UAT DOCUMENT
Crear:
UAT_CHECKLIST.md
2411. UAT ACTORS
Probar con roles:
- Cashier;
- Manager;
- Kitchen;
- Admin.
2412. UAT CASHIER
No utilizar herramientas de desarrollo.
2413. UAT KITCHEN
No pedirle conocer IP después del setup.
2414. UAT ADMIN
Debe configurar sin editar código.
2415. UAT OWNER
Debe entender reportes/estado.
2416. UAT CUSTOMER VIEW
CDS legible desde distancia real de instalación.
2417. UAT RECEIPT
Impresión física legible.
2418. UAT PEAK
Simular presión operacional.
2419. UAT MISTAKES
Probar errores humanos:
- producto equivocado;
- doble toque;
- mesa equivocada;
- pago incorrecto antes de confirmar;
- cancelación.
2420. UX ERROR PREVENTION
Diseñar para prevenir errores, no solo recuperarlos.
2421. DESTRUCTIVE BUTTON PLACEMENT
No colocar:
Anular
junto a:
Cobrar
con mismo estilo.
2422. PAYMENT CONFIRMATION
Para efectivo:
mostrar total/recibido/cambio antes de confirmar cuando sea útil.
2423. LARGE CASH AMOUNT
Confirmar cuando monto parezca extraordinario según umbral configurable/futuro.
No bloquear arbitrariamente.
2424. MANUAL PRICE WARNING
Indicador visible.
2425. DISCOUNT INDICATOR
Visible en carrito.
2426. SUPERVISOR APPROVAL INDICATOR
Después de aprobar:
mostrar que fue autorizado.
2427. OFFLINE INDICATOR
Visible pero no alarmante.
2428. UNSYNCED SALE INDICATOR
No mostrar en cada ticket al cajero salvo necesidad.
Disponible en diagnóstico.
2429. KDS DISCONNECTED INDICATOR
Más importante.
2430. PRINTER DISCONNECTED INDICATOR
Mostrar cuando afecta operación.
2431. CDS DISCONNECTED INDICATOR
Discreto.
2432. STORAGE CRITICAL INDICATOR
Bloqueante.
2433. AUTH EXPIRY INDICATOR
Advertencia anticipada.
2434. FISCAL RANGE WARNING
Visible a manager/admin.
No necesariamente al cajero hasta que afecte emisión.
2435. PRODUCT OUT OF STOCK POS
Tile disabled/badge.
2436. NEGATIVE STOCK WARN
Modal:
Stock insuficiente
Mostrar:
- disponible;
- solicitado.
Opciones según política:
- Cancelar
- Continuar
Si BLOCK:
solo supervisor/ninguna opción según configuración.
2437. NEGATIVE STOCK OFFLINE
Advertir basándose en último stock local.
Puede no reflejar otras cajas offline.
2438. LOW STOCK POS
No mostrar alerta intrusiva por cada venta.
2439. INVENTORY BADGE ADMIN
Sí.
2440. ITEM AVAILABILITY QUICK TOGGLE
Manager autorizado puede marcar agotado desde POS.
2441. QUICK TOGGLE AUDIT
Registrar.
2442. QUICK TOGGLE SYNC
Propagar.
2443. QUICK TOGGLE OFFLINE
Puede aplicarse localmente y sincronizar, pero otras cajas offline pueden no saberlo inmediatamente.
Documentar.
2444. BRANCH MANAGER QUICK ACTIONS
Puede incluir:
- agotado;
- test printer;
- KDS status;
- sync.
No configuración fiscal profunda.
2445. OWNER DASHBOARD
Puede ver todas las sucursales.
2446. MANAGER DASHBOARD
Scope por sucursal.
2447. CASHIER DASHBOARD ACCESS
Puede no tener acceso web.
2448. KITCHEN USER DASHBOARD
Puede no necesitar.
2449. ROLE DEFAULTS
Proporcionar defaults razonables.
Administrador puede ajustar.
2450. PERMISSION DEPENDENCIES
Si se otorga:
employees.manage
puede requerir employees.view.
Resolver coherentemente.
2451. DENY BY DEFAULT
Nuevos permisos sensibles no se conceden automáticamente a roles existentes salvo migration explícita.
2452. OWNER ALL PERMISSIONS
Owner puede tener todos, salvo restricciones técnicas/fiscales que igualmente requieren flujo correcto.
2453. ADMIN VS OWNER
Owner puede gestionar propiedad/otros Owners.
Admin puede administrar operación sin necesariamente controlar ownership.
2454. MANAGER
Operacional.
2455. CASHIER
Ventas/caja.
2456. KITCHEN
KDS.
2457. CUSTOM ROLES
Sí.
2458. PERMISSION MATRIX UI
Dashboard puede mostrar por categorías.
2459. ROLE PREVIEW
Antes de guardar:
mostrar resumen.
2460. ROLE IMPACT
Empleados afectados.
2461. ROLE AUDIT
Sí.
2462. EMPLOYEE INVITE FUTURE
Dashboard web puede invitar por email.
No necesario si Admin crea cuentas.
2463. EMPLOYEE EMAIL OPTIONAL
Requerimiento original incluye correo.
Puede mantenerse obligatorio en Dashboard si así se decide, pero para empleados operativos sin email evaluar opcionalidad.
No inventar correos.
2464. EMPLOYEE PHONE OPTIONALITY
Igual.
2465. POS EMPLOYEE IDENTIFIER
Nombre + employee number puede ser suficiente para selección.
2466. EMPLOYEE DUPLICATE EMAIL
Si se utiliza para login Dashboard:
debe ser único en ámbito correspondiente.
2467. EMPLOYEE POS-ONLY ACCOUNT
Puede existir sin acceso Dashboard.
2468. DASHBOARD USER
Puede estar vinculado a Employee o identidad administrativa.
Documentar.
2469. AUTH MODEL DECISION
Crear ADR:
ADR-AUTH-IDENTITY.md
2470. ORGANIZATION MEMBERSHIP
Un usuario puede tener membership/role por Organization.
2471. BRANCH SCOPES
Sí.
2472. POS DEVICE LOCAL EMPLOYEE CACHE
Solo empleados necesarios/autorizados.
2473. EMPLOYEE CACHE SECURITY
No almacenar datos personales innecesarios.
2474. PIN VERIFICATION OFFLINE
Diseñar almacenamiento/verificación segura.
No almacenar PIN plaintext.
2475. PIN HASH OFFLINE
Si se cachea verifier:
usar método seguro y proteger DB/keystore según arquitectura.
2476. PIN CHANGE WHILE POS OFFLINE
Evitar cambios administrativos offline si complican sincronización/seguridad.
2477. EMPLOYEE DEACTIVATION OFFLINE LIMITATION
Ya documentada.
2478. OFFLINE PERMISSION CACHE
Guardar versión.
2479. PERMISSION CACHE EXPIRY
Política.
2480. OWNER OFFLINE ACTIONS
No permitir acciones cloud-only como gestionar otras sucursales sin conexión.
2481. POS OFFLINE ADMIN
Limitar a operaciones locales necesarias.
2482. LOCAL HARDWARE SETTINGS OFFLINE
Sí.
2483. CLOUD SETTINGS OFFLINE
Read-only Last Known Good.
2484. RECEIPT TEMPLATE OFFLINE
Cache.
2485. TAX RULES OFFLINE
Cache.
2486. PRICE RULES OFFLINE
Cache.
2487. KITCHEN ROUTING OFFLINE
Cache.
2488. PAYMENT METHODS OFFLINE
Cache.
2489. CUSTOMERS OFFLINE
Cache recientes/búsqueda local según estrategia.
2490. CUSTOMER CREATION OFFLINE
Puede permitirse con global ID y sync.
2491. CUSTOMER UPDATE OFFLINE
Puede permitirse con conflict handling.
P1.
2492. PRODUCT CATALOG FULL OFFLINE
Necesario para vender.

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 14 | attachment=14db8d9d-e666-4ed8-bf28-edc428061176 | rango=2493-2656 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
2493. PRODUCT CATALOG OFFLINE INTEGRITY
Antes de considerar el catálogo local listo para operación offline:
verificar que la última sincronización válida incluya:
- artículos activos;
- categorías;
- precios;
- PriceBooks;
- impuestos;
- cargos;
- modificadores;
- disponibilidad;
- kitchen routing;
- códigos de barras;
- configuración necesaria.
No activar una configuración parcial que deje productos sin reglas críticas.
2494. CATALOG SNAPSHOT ACTIVATION
Una nueva versión de catálogo/configuración debe pasar por:
1. descarga;
2. validación;
3. persistencia;
4. activación.
Si falla:
conservar versión anterior.
2495. CATALOG VERSION AT SALE
Registrar versión utilizada cuando sea útil para auditoría/reconciliación.
2496. CATALOG UPDATE DURING CART
Una actualización descargada no debe modificar silenciosamente el carrito actual.
Aplicar a:
- nuevas órdenes;
- nuevas líneas;
según política.
2497. PRODUCT DEACTIVATED DURING CART
Si producto está en carrito y llega configuración que lo desactiva:
no eliminarlo silenciosamente.
Mostrar warning antes de completar cuando corresponda.
2498. CRITICAL PRODUCT RECALL FUTURE
Puede existir mecanismo para bloquear inmediatamente un producto por seguridad.
No P0.
Si se implementa:
debe ser explícito y auditable.
2499. CONFIG SNAPSHOT AT ORDER
Open Ticket puede guardar referencias/versiones relevantes.
2500. CONFIG SNAPSHOT AT SALE
La venta final guarda snapshots definitivos.
2501. CUSTOMER CACHE STRATEGY
No es necesario descargar toda la base de clientes a cada POS si es grande.
Puede utilizar:
- clientes recientes;
- favoritos;
- cache de búsquedas;
- subset por sucursal.
2502. CUSTOMER SEARCH ONLINE/OFFLINE
Online:
puede buscar cloud + local.
Offline:
solo local.
Mostrar claramente si los resultados pueden estar limitados.
2503. CUSTOMER NOT FOUND OFFLINE
Permitir:
- continuar sin cliente;
- crear cliente offline;
según flujo/fiscalidad.
2504. FISCAL CUSTOMER OFFLINE
Si se requiere validar información mediante servicio externo:
seguir política fiscal real.
No inventar validación.
2505. CUSTOMER CACHE PRIVACY
No descargar datos de clientes innecesarios a KDS/CDS.
2506. EMPLOYEE CACHE SCOPE
Solo empleados con acceso relevante a la sucursal/dispositivo.
2507. REPORTS OFFLINE POS
No es requisito que todos los reportes administrativos funcionen offline en WTF POS.
Priorizar operación.
2508. SHIFT SUMMARY OFFLINE
Sí debe funcionar localmente para el turno actual.
2509. RECEIPT RECENT OFFLINE
Sí.
2510. INVENTORY CURRENT OFFLINE
Último estado local + movimientos locales.
2511. KDS OFFLINE HISTORY
Reciente.
2512. CDS OFFLINE
Solo sesión/local communication.
2513. DASHBOARD CLOUD DEPENDENCE
Dashboard puede depender del backend.
No prometer administración completa offline.
2514. DASHBOARD PWA CACHE
Puede cachear shell estático.
No mostrar datos financieros antiguos sin indicador.
2515. POS DATA FRESHNESS
Diagnóstico debe mostrar:
- catalog last sync;
- config last sync;
- cloud last sync.
2516. KDS DATA FRESHNESS
Mostrar conexión/última sync.
2517. CDS DATA FRESHNESS
No necesita timestamp visible al cliente salvo problema.
2518. SYNC PRIORITY QUEUES
Priorizar:
1. ventas/pagos;
2. fiscal crítico;
3. permisos/revocaciones;
4. tickets/kitchen;
5. inventory;
6. config;
7. assets/analytics.
Adaptar según arquitectura.
2519. NO STARVATION
Assets de baja prioridad eventualmente deben sincronizarse, pero nunca bloquear críticos.
2520. NETWORK BANDWIDTH
Optimizar imágenes/assets.
No saturar LAN/WAN durante servicio.
2521. CATALOG DELTA COMPRESSION
Opcional.
2522. IMAGE DOWNLOAD ON DEMAND
Puede ser lazy.
2523. CRITICAL CONFIG EAGER
Sí.
2524. KDS ASSETS
Mínimos.
2525. CDS ASSETS
Branding/promotions pueden cachearse.
2526. BACKGROUND ASSET SYNC
No interferir con ventas.
2527. NETWORK METERED
Android puede detectar red medida cuando sea útil.
No impedir sync de ventas por ahorrar datos.
2528. BATTERY OPTIMIZATION
KDS/POS dedicados pueden requerir configuración del dispositivo.
Documentar en instalación.
No utilizar hacks.
2529. ANDROID DOZE
Diseñar background sync considerando Doze.
2530. KDS DEDICATED MODE
Durante operación activa la app debe permanecer foreground.
2531. CDS DEDICATED MODE
Igual.
2532. POS ACTIVE MODE
Foreground durante caja.
2533. BACKGROUND POS
Si se minimiza:
persistencia protege estado.
2534. NOTIFICATION FOR CRITICAL BACKGROUND OPERATION
Solo si Android lo requiere.
2535. WORKMANAGER CONSTRAINTS
No exigir Wi-Fi para sincronizar ventas si cualquier Internet seguro es suficiente, salvo política.
2536. SYNC CHARGING CONSTRAINT
No retrasar ventas hasta cargar batería.
2537. ASSET SYNC CHARGING
Puede retrasarse.
2538. BATTERY LOW POS
Advertir operacionalmente.
No bloquear venta por batería baja.
2539. BATTERY CRITICAL KDS
Alertar.
2540. DEVICE POWER LOSS
Persistencia.
2541. PRINTER POWER LOSS
Queue.
2542. ROUTER POWER LOSS
POS local.
2543. INTERNET MODEM LOSS
LAN puede continuar si router/switch sigue.
2544. NETWORK TOPOLOGY GUIDE
Explicar esta diferencia al instalador.
2545. STATIC IP TERMINOLOGY
La pantalla KDS puede mostrar:
Dirección IP actual
Si se desea estabilidad:
instruir DHCP reservation.
No afirmar “IP fija” si Android recibió una dirección dinámica.
2546. USER REQUEST COMPATIBILITY — IP FIJA
Como el requerimiento original solicita mostrar “Dirección IP Fija”, la UX puede mostrar una sección:
Dirección IP del dispositivo
y debajo:
Para mantener esta dirección estable, configure una reserva DHCP en su router.
Si el sistema detecta/configura una IP estática real:
puede indicarlo.
No etiquetar incorrectamente una IP DHCP como fija.
2547. IP INSTRUCTIONS
Botón:
Cómo mantener esta IP fija
Mostrar instrucciones generales:
1. abrir router;
2. buscar DHCP/Address Reservation;
3. localizar dispositivo;
4. reservar IP actual;
5. guardar;
6. reiniciar conexión cuando sea necesario.
No inventar pasos específicos para todos los routers.
2548. ROUTER-SPECIFIC GUIDES FUTURE
Puede añadirse documentación para modelos conocidos.
No P0.
2549. KDS CONNECTION SCREEN
Después de pairing:
Configuración → Conexión.
Mostrar:
- Estado;
- Nombre;
- IP;
- Puerto;
- Device ID parcial;
- Branch;
- Station;
- Protocol;
- Last connection.
2550. CDS CONNECTION SCREEN
Equivalente.
2551. POS CONNECTION SCREEN
Configuración → Dispositivos/Conexiones.
Mostrar:
- KDS;
- CDS;
- printers;
- cloud.
2552. CONNECTION STATUS ICONS
- Connected
- Reconnecting
- Offline
- Error
No depender solo del color.
2553. CONNECTION DETAILS
Botón:
Ver detalles
para manager/admin.
2554. CONNECTION RETRY
Automático con backoff.
Manual:
Reintentar ahora
2555. CONNECTION FORGET
Desvincular
requiere confirmación.
2556. CONNECTION TEST RESULT
Mostrar latencia cuando sea útil.
No prometer calidad únicamente por un ping exitoso.
2557. LAN SERVICE PORT
Configurable internamente/avanzado.
Evitar conflicto con otros servicios.
2558. PORT OCCUPIED
KDS/CDS deben detectar.
Mostrar error técnico accionable.
2559. AUTO PORT FUTURE
Puede seleccionar puerto disponible y anunciarlo mediante discovery.
2560. FIREWALL
Guía debe indicar permitir tráfico local necesario.
2561. WINDOWS FIREWALL FUTURE
Para cliente PC.
2562. ANDROID LOCAL NETWORK
Gestionar permisos/restricciones de plataforma según versión.
2563. WIFI ROAMING
Si tablet cambia AP dentro de misma LAN:
reconectar.
2564. MULTIPLE ACCESS POINTS
Discovery debe funcionar si infraestructura permite multicast.
Manual IP fallback.
2565. VLAN
Si POS/KDS están en VLAN distintas:
se requiere routing/firewall adecuado.
Documentar.
2566. MDNS LIMITATION
mDNS puede no cruzar subredes.
Manual IP/DNS fallback.
2567. LOCAL DNS FUTURE
Puede utilizar hostname estable.
2568. DEVICE HOSTNAME
No depender de hostname Android como identidad.
2569. CONNECTION AUTHENTICATION
Después de localizar endpoint:
realizar handshake autenticado.
2570. CONNECTION ENCRYPTION
Evaluar TLS/mTLS o canal autenticado apropiado para LAN.
Documentar threat model.
2571. SELF-SIGNED CERTIFICATES
No desactivar verificación global.
Si se utilizan certificados locales:
implementar trust/pinning/provisioning seguro.
2572. PAIRING KEY EXCHANGE
No enviar secretos permanentes en texto plano sin protección.
2573. LAN TOKEN
Scope limitado.
Rotable.
2574. LAN TOKEN STORAGE
Keystore.
2575. LAN TOKEN REVOCATION
Unpair/revoke.
2576. LAN MESSAGE AUTH
Validar origen.
2577. LAN MESSAGE SIZE LIMIT
Evitar payloads enormes.
2578. LAN INPUT VALIDATION
KDS/CDS deben validar payload.
No confiar en POS únicamente.
2579. MALFORMED KDS MESSAGE
Rechazar sin crash.
2580. MALFORMED CDS MESSAGE
Igual.
2581. MESSAGE RATE LIMIT
Proteger contra flood sin impedir operación normal.
2582. HEARTBEAT RATE
Razonable.
2583. DISCOVERY RATE
No emitir multicast continuamente de forma agresiva.
2584. LAN RECONNECT STORM
Aplicar jitter/backoff.
2585. MULTI-POS KDS CONNECTIONS
KDS debe gestionar varias conexiones sin mezclar IDs.
2586. KDS ORDER ID GLOBAL
Sí.
2587. KDS SOURCE POS
Guardar.
2588. KDS SOURCE REGISTER
Guardar.
2589. KDS SOURCE BRANCH
Validar.
2590. KDS WRONG BRANCH
Rechazar.
2591. KDS REVOKED POS
Rechazar.
2592. CDS WRONG POS
Rechazar session.
2593. CDS REVOKED POS
Rechazar.
2594. LAN PROTOCOL AUDIT
Pair/unpair/config, no cada heartbeat.
2595. LAN SECURITY TEST
Intentar:
- unauthenticated connection;
- replay;
- wrong branch;
- expired token;
- malformed payload.
2596. LAN PENETRATION TEST LIGHT
Antes de producción realizar revisión de seguridad de endpoints locales.
2597. CLOUD SECURITY TEST
OWASP-oriented review.
2598. MOBILE SECURITY REVIEW
Revisar:
- exported components;
- storage;
- logs;
- deep links;
- network security.
2599. DASHBOARD SECURITY REVIEW
Revisar:
- XSS;
- CSRF;
- IDOR;
- auth;
- CORS;
- headers.
2600. BACKEND SECURITY REVIEW
Revisar:
- injection;
- authorization;
- rate limit;
- secrets;
- dependencies.
2601. DATABASE SECURITY REVIEW
- least privilege DB user;
- network restrictions;
- backup access;
- encryption where available.
2602. DB APPLICATION USER
No utilizar superuser para backend normal.
2603. DB MIGRATION USER
Puede tener permisos adicionales separados.
2604. READ-ONLY REPORT USER FUTURE
Opcional.
2605. BACKUP CREDENTIALS
Separadas.
2606. SECRET MANAGER
Preferir proveedor/plataforma segura.
2607. ENV FILE PRODUCTION
No almacenar en Git.
2608. LOCAL DEVELOPMENT SECRETS
.env.local ignorado.
2609. EXAMPLE ENV
Solo nombres/placeholders.
2610. CONFIG VALIDATION STARTUP
Si falta secret crítico:
backend falla de forma explícita.
2611. OPTIONAL PROVIDER
Si fiscal/payment provider no está habilitado:
no requerir sus secrets.
2612. FEATURE-PROVIDER DEPENDENCY
Activar integrated payment requiere provider config válida.
2613. FISCAL-PROVIDER DEPENDENCY
Activar fiscal production requiere config válida.
2614. TEST PROVIDER IN PRODUCTION
No permitir fake provider en environment production.
Fail startup/config validation.
2615. TEST MODE VISUAL INDICATOR
Muy visible.
2616. PRODUCTION MODE VISUAL INDICATOR
No necesita banner constante, pero About/diagnostic debe indicarlo.
2617. ENVIRONMENT CROSS-CHECK
APK production no debe conectarse a staging accidentalmente.
Puede utilizar environment signature/config.
2618. DEEP LINKS
Si existen:
validar.
No permitir ejecutar acciones sensibles sin auth.
2619. RECEIPT LINK FUTURE
Token.
2620. PASSWORD RESET LINK
One-time.
2621. APP LINK SECURITY
Sí.
2622. CLIPBOARD RECEIPT NUMBER
Seguro.
2623. QR CODE INPUT
Si scanner lee QR:
no ejecutar URL/comando arbitrario.
Interpretar únicamente formatos soportados.
2624. BARCODE PAYLOAD LENGTH
Limitar.
2625. MALICIOUS BARCODE
Tratar como string.
No SQL/command execution.
2626. CAMERA FRAME PROCESSING
Local.
2627. CAMERA IMAGE STORAGE
No guardar frames de scanner por defecto.
2628. CAMERA PERMISSION EXPLANATION
Mostrar contexto antes de solicitar cuando sea útil:
WTF POS utiliza la cámara únicamente para escanear códigos de barras cuando esta función está activa.
2629. MICROPHONE
WTF POS no necesita permiso de micrófono para los requisitos actuales.
No solicitarlo.
2630. LOCATION
WTF POS no necesita ubicación para el alcance descrito de ventas/KDS/CDS.
No solicitarla salvo que una función futura explícita la requiera.
2631. CONTACTS
No solicitar acceso a contactos para crear clientes.
2632. STORAGE PERMISSION
Utilizar APIs modernas de archivos.
No solicitar acceso amplio al almacenamiento si no es necesario.
2633. IMPORT FILE PICKER
Utilizar selector de documentos.
2634. EXPORT FILE
Dashboard web descarga.
Android puede utilizar Storage Access Framework cuando corresponda.
2635. BLUETOOTH PERMISSIONS
Solicitar solo si se configura printer/scanner Bluetooth.
2636. USB PERMISSION
Solicitar cuando se conecta hardware USB.
2637. NOTIFICATION PERMISSION
Solo si se utilizan notificaciones Android que lo requieran.
2638. PERMISSION DENIAL CORE
Denegar una capacidad opcional no debe impedir ventas.
2639. CAMERA DENIED
Scanner manual/HID sigue.
2640. BLUETOOTH DENIED
LAN printer sigue.
2641. BIOMETRIC UNAVAILABLE
PIN.
2642. NOTIFICATIONS DENIED
Core sigue.
2643. ACCESSIBILITY SERVICE
No solicitar.
2644. DEVICE ADMIN
No solicitar salvo proyecto MDM explícito futuro.
2645. ROOT/SUPERUSER
No requerir.
2646. SIDELOAD APK
Documentar instalación cuando distribución sea privada.
2647. UNKNOWN SOURCES
Guía de instalación puede explicar habilitar temporalmente la fuente correspondiente cuando sea necesario.
No pedir desactivar seguridad global permanentemente.
2648. APK SIGNATURE UPDATE
Todas las versiones production deben usar la misma signing identity para permitir actualización.
2649. LOST SIGNING KEY
Disaster recovery/secret management crítico.
Documentar backup seguro.
2650. SIGNING KEY BACKUP
Fuera del repositorio.
Acceso restringido.
2651. PLAY STORE FUTURE
Si se distribuye mediante managed Play:
adaptar.
No requisito.
2652. MDM FUTURE
Puede facilitar:
- kiosk;
- updates;
- remote management.
No requisito inicial.
2653. WINDOWS DISTRIBUTION FUTURE
Firmar installer cuando corresponda.
2654. WEB DASHBOARD DEPLOYMENT
HTTPS.
2655. BACKEND DEPLOYMENT
Container/service según infraestructura.
2656.

<!-- PARTE 15 | attachment=7bfef1bb-fabf-4d83-81a1-456f293454a5 | rango=2656-2835 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
2656. BACKEND DEPLOYMENT HEALTH
Después de cada despliegue verificar automáticamente:
- proceso activo;
- health endpoint;
- database connectivity;
- migrations;
- workers;
- queues/outbox processors;
- realtime;
- servicios críticos configurados.
No considerar un deployment exitoso únicamente porque el proceso inició.
2657. DEPLOYMENT STRATEGY
Utilizar estrategia segura según infraestructura.
Puede ser:
- rolling;
- blue/green;
- recreate controlado;
según escala.
Evitar downtime innecesario durante servicio.
2658. DEPLOYMENT PRE-CHECK
Antes de production deploy:
1. tests;
2. backup/checkpoint cuando corresponda;
3. migrations review;
4. compatibility;
5. environment validation;
6. secrets;
7. release manifest.
2659. DEPLOYMENT POST-CHECK
Después:
1. health;
2. login;
3. DB;
4. sync;
5. realtime;
6. Dashboard;
7. smoke sale en ambiente apropiado;
8. logs.
2660. DATABASE MIGRATION ORDER
Si existen cambios de DB incompatibles:
utilizar estrategia expand/migrate/contract.
No desplegar código que dependa de una columna antes de que exista.
2661. BACKWARD-COMPATIBLE DEPLOYMENT
Durante rollout, backend debe poder atender versiones soportadas de POS/KDS/CDS.
2662. ROLLBACK DECISION
Antes de deploy saber:
- si código puede revertirse;
- si migration puede revertirse;
- qué datos nuevos se crearán.
No improvisar rollback después del incidente.
2663. ROLLBACK DOES NOT MEAN DATABASE RESET
Nunca.
2664. MIGRATION BACKUP
Cambios de alto riesgo requieren backup/checkpoint.
2665. DEPLOYMENT DURING SERVICE
Evitar cambios de alto riesgo durante hora pico.
2666. MAINTENANCE WINDOW
Si una migration requiere downtime:
programar ventana.
POS local puede continuar únicamente si la arquitectura/sync lo permite y el cambio es compatible.
2667. BACKEND WORKERS
Separar workers de requests cuando corresponda para:
- sync processing;
- reports;
- notifications;
- reconciliation.
2668. WORKER IDEMPOTENCY
Obligatoria.
2669. WORKER CONCURRENCY
Configurar para no procesar simultáneamente la misma operación de forma insegura.
2670. WORKER LEASE/LOCK
Si se utiliza:
debe expirar ante crash.
2671. WORKER RETRY
Backoff.
2672. WORKER DEAD LETTER
Sí.
2673. WORKER OBSERVABILITY
Métricas:
- pending;
- processing;
- failed;
- latency.
2674. REPORT WORKER
Separado cuando exports sean pesados.
2675. NOTIFICATION WORKER
No crítico.
2676. FISCAL RECONCILIATION WORKER
Crítico cuando fiscal activo.
2677. PAYMENT RECONCILIATION WORKER
Crítico cuando provider integrado.
2678. BACKUP JOB
Monitoreado.
2679. CLEANUP JOB
No borrar datos críticos.
2680. CACHE CLEANUP
Seguro.
2681. OUTBOX CLEANUP
Solo procesados.
2682. TEMP EXPORT CLEANUP
Sí.
2683. LOG CLEANUP
Sí.
2684. DATABASE VACUUM/MAINTENANCE
Según motor.
No bloquear producción innecesariamente.
2685. DATABASE MONITORING
Monitorear:
- storage;
- connections;
- CPU;
- slow queries;
- locks.
2686. DATABASE STORAGE ALERT
Antes de agotarse.
2687. DATABASE CONNECTION ALERT
Sí.
2688. DATABASE REPLICATION FUTURE
Puede utilizarse para HA/reporting.
No requisito inicial.
2689. HIGH AVAILABILITY FUTURE
Arquitectura debe poder evolucionar.
No sobrearquitectar v1.
2690. BACKEND HORIZONTAL SCALE
Stateless donde sea razonable.
Estado crítico en DB/servicios compartidos.
2691. STICKY SESSION
No depender de sticky sessions para integridad.
2692. WEBSOCKET SCALE
Puede requerir shared pub/sub en escala mayor.
2693. LAN KDS DOES NOT DEPEND ON CLOUD WEBSOCKET
Importante.
La comunicación local debe mantenerse separada cuando así se diseñe.
2694. CLOUD RELAY FUTURE
Puede permitir KDS remoto, no P0.
2695. BRANCH EDGE FUTURE
Ya definido.
2696. API RATE LIMIT BUSINESS SAFETY
No bloquear una caja legítima por límites demasiado bajos.
Aplicar límites por endpoint/contexto.
2697. LOGIN RATE LIMIT
Más estricto.
2698. REPORT RATE LIMIT
Evitar abuso.
2699. SYNC RATE LIMIT
Compatible con backlog legítimo.
2700. DEVICE HEARTBEAT RATE LIMIT
Sí.
2701. FILE UPLOAD RATE LIMIT
Sí.
2702. API REQUEST SIZE LIMIT
Evitar payloads enormes.
2703. SYNC BATCH SIZE
Configurable.
No enviar miles de operaciones en una sola petición si afecta estabilidad.
2704. SYNC BATCH COMPRESSION
Opcional.
2705. SYNC CHECKPOINT
Guardar progreso.
2706. SYNC RESUME
Después de crash:
continuar.
2707. SYNC ORDER
No depender estrictamente del timestamp cuando existen dependencias.
2708. SALE BEFORE CUSTOMER SYNC
Global IDs permiten enviar ambos en orden adecuado.
2709. INVENTORY AFTER SALE
El evento puede procesarse después sin perder relación.
2710. RECEIPT CLOUD SYNC
Snapshot forma parte de transacción/eventos.
2711. KITCHEN CLOUD HISTORY
Puede sincronizar después.
LAN operation no debe esperar.
2712. CDS DATA CLOUD
No necesita persistir cada update.
DisplaySession puede ser efímera/local salvo información necesaria para diagnóstico.
2713. CUSTOMER DISPLAY AUDIT
No registrar cada render.
2714. KDS DISPLAY AUDIT
No registrar cada segundo de timer.
2715. METRICS VS EVENTS
No convertir métricas técnicas en millones de AuditLogs.
2716. OBSERVABILITY SAMPLING
Para logs muy frecuentes.
No samplear errores financieros críticos de forma que desaparezcan.
2717. TRACE ID
Puede integrarse con distributed tracing.
2718. DISTRIBUTED TRACING FUTURE
Útil cuando backend crece.
No P0.
2719. CORRELATION FIRST
Suficiente inicialmente.
2720. SUPPORT ERROR CATALOG
Crear:
ERROR_CATALOG.md
Para cada error:
- code;
- subsystem;
- user message;
- technical meaning;
- retryable;
- recommended action.
2721. ERROR CODE STABILITY
No reutilizar el mismo code para otro significado.
2722. LOCALIZATION ERROR MESSAGE
Code estable.
Message localizado.
2723. ERROR DETAILS
No incluir secretos.
2724. VALIDATION ERROR FIELD
API puede indicar field.
2725. MULTIPLE VALIDATION ERRORS
Dashboard puede mostrar todos.
POS debe priorizar UX simple.
2726. PAYMENT ERROR MESSAGE
No mostrar:
HTTP 502
al cajero.
Mostrar:
No fue posible verificar el pago. No intente cobrar nuevamente hasta confirmar el estado.
cuando corresponda.
2727. FISCAL ERROR MESSAGE
Mostrar estado accionable.
Ejemplo:
No fue posible emitir el comprobante. La venta quedó registrada y requiere revisión fiscal.
Solo si ese comportamiento es legal/compatible con provider.
2728. KDS ERROR MESSAGE
No se pudo confirmar la recepción en cocina.
Acciones:
- Reintentar
- Ver estado
- Imprimir respaldo cuando configurado.
2729. PRINTER ERROR MESSAGE
No fue posible imprimir. La venta está guardada.
2730. SYNC ERROR MESSAGE
La venta está guardada en este dispositivo y se sincronizará cuando vuelva la conexión.
Solo si realmente está persistida.
2731. STORAGE ERROR MESSAGE
No hay espacio suficiente para guardar una nueva venta de forma segura.
2732. AUTH ERROR MESSAGE
No tiene permiso para realizar esta acción.
2733. SUPERVISOR REQUIRED MESSAGE
Se requiere autorización de un supervisor.
2734. PRODUCT UNAVAILABLE MESSAGE
Este artículo no está disponible actualmente.
2735. STOCK WARNING MESSAGE
Claro.
2736. OPEN TICKET CONFLICT MESSAGE
Claro.
2737. DEVICE REVOKED MESSAGE
Este dispositivo ya no está autorizado. Contacte a un administrador.
2738. UPDATE REQUIRED MESSAGE
Esta versión debe actualizarse para continuar.
2739. CONFIG INVALID MESSAGE
La nueva configuración no pudo aplicarse. Se mantiene la última configuración válida.
Solo manager/diagnostic.
2740. CUSTOMER FISCAL ERROR
Complete los datos fiscales requeridos del cliente.
2741. EMPTY PAYMENT METHODS
Ya definido.
2742. SHIFT REQUIRED
Debe abrir un turno de caja antes de cobrar.
cuando Shifts ON.
2743. REGISTER NOT CONFIGURED
Este dispositivo no tiene una caja asignada.
2744. BRANCH NOT CONFIGURED
Este dispositivo no tiene una sucursal asignada.
2745. FIRST-RUN NOT AUTHORIZED
Dispositivo pendiente de autorización.
2746. FIRST-RUN CLOUD FAILURE
No fue posible completar la configuración inicial. Verifique la conexión e inténtelo nuevamente.
2747. KDS FIRST-RUN IP
Mostrar IP.
2748. KDS FIRST-RUN QR
Puede mostrar QR pairing.
2749. CDS FIRST-RUN QR
Igual.
2750. FIRST-RUN HELP IMAGES
Deben corresponder a UI real.
2751. HELP CONTENT VERSION
Actualizar cuando cambie navegación.
2752. OFFLINE HELP
Disponible localmente.
2753. ADMIN ONLINE DOCUMENTATION
Puede enlazar documentación web.
2754. USER GUIDE VERSION
Indicar versión compatible.
2755. TRAINING MATERIAL
Puede incluir capturas/videos futuros.
2756. ONBOARDING CASHIER
Muy breve.
No mostrar tutorial largo en cada login.
2757. ONBOARDING KDS
Solo first-run/config.
2758. ONBOARDING CDS
Solo first-run/config.
2759. TOOLTIP FREQUENCY
No molestar usuarios experimentados.
2760. HELP BUTTON
Disponible en configuración.
2761. SUPPORT CONTACT CONFIG
Puede mostrar contacto interno de soporte.
No hardcodear número personal.
2762. RELEASE NOTES IN APP
Opcional.
2763. WHAT'S NEW
No mostrar durante servicio si interrumpe.
2764. FORCED MIGRATION UX
Mostrar progreso si DB migration tarda.
No permitir venta hasta completar de forma segura.
2765. MIGRATION FAILURE UX
No borrar DB.
Mostrar error y support code.
2766. CONFIG MIGRATION
Versionar preferencias.
2767. PAIRING MIGRATION
Conservar cuando compatible.
2768. DEVICE CREDENTIAL MIGRATION
Segura.
2769. KEYSTORE INVALIDATION
Si Android invalida key:
requerir reprovisioning seguro.
No generar automáticamente identidad distinta sin informar.
2770. DEVICE REPROVISION
Preservar datos pendientes cuando sea posible.
2771. LOCAL DB KEY LOSS
Runbook.
No prometer recuperación imposible.
2772. ENCRYPTION BACKUP
Diseñar key strategy con cuidado.
2773. SECURITY VS RECOVERABILITY
Documentar tradeoff.
2774. DATABASE EXPORT DEBUG
No habilitar en production normal.
2775. PII IN BUG REPORTS
Sanitizar.
2776. SCREEN RECORDING SUPPORT
No requerir.
2777. CUSTOMER PRIVACY DURING SUPPORT
Ocultar datos cuando sea posible.
2778. DEMO MODE
Puede utilizar datos ficticios.
Nunca conectarse accidentalmente a production.
2779. DEMO APK FUTURE
No necesaria.
2780. STAGING KDS/CDS
Deben distinguirse visualmente de production.
2781. STAGING PRINTER
No imprimir tickets que parezcan fiscales reales.
2782. STAGING RECEIPT
PRUEBA — NO VÁLIDO
2783. STAGING FISCAL
Sandbox.
2784. STAGING PAYMENT
Sandbox/fake.
2785. STAGING INVENTORY
Separado.
2786. STAGING CUSTOMERS
Ficticios/anónimos.
2787. STAGING EMAIL
No enviar a clientes reales.
2788. STAGING NOTIFICATIONS
Controladas.
2789. PRODUCTION DATA IMPORT
Validar cuidadosamente.
2790. PRODUCTION SEED
No ejecutar dev seed.
2791. PRODUCTION OWNER BOOTSTRAP
Crear mediante proceso seguro.
2792. PRODUCTION DEFAULT PASSWORD
Prohibido.
2793. PRODUCTION DEFAULT PIN
Prohibido para todos los empleados.
2794. PRODUCTION DEVICE DEFAULT TOKEN
Prohibido.
2795. PRODUCTION FIRST LOGIN
Forzar configuración segura cuando corresponda.
2796. PRODUCTION BRANCH VALIDATION
Antes de LIVE:
- nombre;
- timezone;
- currency;
- cutoff;
- fiscal;
- receipt.
2797. PRODUCTION PRODUCT VALIDATION
- price;
- category;
- taxes;
- modifiers;
- kitchen;
- availability.
2798. PRODUCTION EMPLOYEE VALIDATION
- active;
- role;
- branch;
- PIN/auth.
2799. PRODUCTION PAYMENT VALIDATION
Al menos un método.
2800. PRODUCTION REGISTER VALIDATION
Sí.
2801. PRODUCTION PRINTER VALIDATION
Según operación.
2802. PRODUCTION KDS VALIDATION
Sí si Kitchen Display feature activa.
2803. PRODUCTION CDS VALIDATION
Sí si Customer Display feature activa.
2804. PRODUCTION FISCAL VALIDATION
Obligatoria cuando aplique.
2805. PRODUCTION INVENTORY VALIDATION
Si inventory feature activa.
2806. PRODUCTION BACKUP VALIDATION
Sí.
2807. PRODUCTION RESTORE VALIDATION
Sí.
2808. PRODUCTION SECURITY VALIDATION
Sí.
2809. PRODUCTION OFFLINE VALIDATION
Sí.
2810. PRODUCTION RELEASE BUILD VALIDATION
Sí.
2811. PRODUCTION APK INSTALL
Sí.
2812. PRODUCTION DASHBOARD DEPLOY
Sí.
2813. PRODUCTION BACKEND DEPLOY
Sí.
2814. PRODUCTION DB MIGRATIONS
Sí.
2815. PRODUCTION CHECKSUMS
Sí.
2816. PRODUCTION RELEASE MANIFEST
Sí.
2817. PRODUCTION GO/NO-GO
Reunir resultados.
2818. NO-GO CONDITIONS
Como mínimo:
- double-charge risk;
- sale-loss risk;
- DB corruption;
- tenant escape;
- required fiscal failure;
- KDS loss without acceptable fallback;
- untested mandatory hardware.
2819. GO CONDITIONS
P0 + critical tests + operational readiness.
2820. PILOT BEFORE GO
Recomendado/obligatorio según riesgo.
2821. PILOT DATA
Puede ser production-like pero claramente controlado.
2822. PILOT TRANSACTIONS
Si son ventas reales:
tratarlas como producción real, incluyendo fiscalidad/inventario.
No mezclarlas con test.
2823. PILOT TEST TRANSACTIONS
Si no son ventas reales:
marcarlas test/training.
2824. PILOT FEEDBACK
Clasificar:
- bug;
- UX;
- training;
- feature request.
2825. FEATURE REQUEST DURING PILOT
No implementar automáticamente si pone en riesgo release.
Roadmap.
2826. PILOT BUG FIX
Regression.
2827. PILOT CONFIG TUNING
Puede ajustar:
- layout;
- KDS thresholds;
- routing;
- receipt.
Auditar cambios importantes.
2828. PILOT EXIT CRITERIA
- no blockers;
- cash reconciles;
- KDS reliable;
- sync reliable;
- users trained;
- hardware stable.
2829. CUTOVER PLAN
Crear:
CUTOVER_PLAN.md
2830. CUTOVER BACKUP
Sí.
2831. CUTOVER INVENTORY
Definir opening balance/sync.
2832. CUTOVER OPEN TICKETS
Resolver sistema anterior.
2833. CUTOVER FISCAL
Coordinar secuencias/provider.
2834. CUTOVER DEVICES
Autorizar.
2835. CUTOVER STAFF
PIN/roles

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 16 | attachment=c021622b-f234-4531-9c30-0ceaf5b00707 | rango=2835-3012 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
2835. CUTOVER STAFF
Antes del cambio definitivo:
verificar:
- empleados activos;
- roles;
- permisos;
- PIN;
- sucursal;
- acceso Dashboard cuando corresponda;
- capacitación mínima.
No crear credenciales genéricas compartidas como:
cajero / 1234
para producción.
2836. CUTOVER HARDWARE
Verificar físicamente:
- POS;
- KDS;
- CDS;
- receipt printer;
- kitchen printers;
- cash drawer;
- scanner;
- router/switch;
- alimentación eléctrica.
2837. CUTOVER NETWORK
Verificar:
- Internet;
- LAN;
- DHCP reservations;
- ports;
- client isolation;
- KDS/CDS discovery;
- printer IPs.
2838. CUTOVER TEST PRINT
Realizar:
- receipt test;
- kitchen test.
Marcar claramente como prueba.
2839. CUTOVER KDS TEST
Enviar:
PRUEBA — NO PREPARAR
Verificar estación/routing.
2840. CUTOVER CDS TEST
Verificar:
- pairing;
- productos;
- total;
- thank-you screen.
2841. CUTOVER PAYMENT TEST
Utilizar método de prueba/sandbox cuando corresponda.
Para efectivo:
venta controlada.
2842. CUTOVER FISCAL TEST
Solo según procedimiento/provider autorizado.
No consumir comprobantes productivos innecesariamente.
2843. CUTOVER INVENTORY TEST
Venta controlada debe producir movimiento correcto.
2844. CUTOVER REPORT TEST
Dashboard debe reflejar la transacción.
2845. CUTOVER SYNC TEST
WAN off/on controlado cuando sea seguro.
2846. CUTOVER FALLBACK
Tener procedimientos disponibles para:
- KDS caído;
- printer caído;
- Internet caído.
2847. CUTOVER ROLLBACK PLAN
Definir qué ocurre si el sistema no puede utilizarse.
No improvisar volver al POS anterior sin considerar:
- ventas;
- inventario;
- fiscal;
- caja.
2848. DUAL SYSTEM WARNING
No registrar la misma venta en dos POS productivos sin estrategia explícita.
2849. CUTOVER OWNER APPROVAL
Registrar decisión GO.
2850. FIRST SALE SUPERVISION
Un responsable verifica la primera venta completa.
2851. FIRST CASH SALE
Verificar:
- total;
- cash received;
- change;
- drawer;
- receipt;
- shift.
2852. FIRST KITCHEN ORDER
Verificar KDS/printer.
2853. FIRST CDS DISPLAY
Verificar cliente.
2854. FIRST FISCAL DOCUMENT
Verificar estado real.
2855. FIRST INVENTORY MOVEMENT
Verificar.
2856. FIRST DASHBOARD REPORT
Verificar.
2857. FIRST OFFLINE RECOVERY
No necesariamente durante servicio real.
Puede validarse previamente/pilot.
2858. FIRST TEN SALES REVIEW
Revisar:
- totals;
- payments;
- receipts;
- kitchen;
- sync.
2859. FIRST SHIFT CLOSE REVIEW
Comparar manualmente.
2860. FIRST DAY REPORT
Reconciliar:
- sales;
- payments;
- taxes;
- discounts;
- refunds;
- cash;
- inventory.
2861. FIRST DAY ERROR REVIEW
Analizar logs/alerts.
2862. FIRST DAY BACKUP
Confirmar ejecución.
2863. FIRST WEEK STABILIZATION
Monitorear:
- crashes;
- sync;
- hardware;
- KDS;
- payment;
- fiscal;
- cash differences.
2864. FIRST WEEK FEATURE FREEZE
Evitar cambios grandes salvo correcciones necesarias.
2865. FIRST WEEK UX NOTES
Recoger para v1.1.
2866. HOTFIX PROCESS
Para blocker production:
1. reproduce;
2. fix;
3. regression;
4. build;
5. smoke;
6. deploy;
7. monitor.
2867. HOTFIX VERSION
Incrementar versión.
2868. HOTFIX DOCUMENTATION
Changelog.
2869. HOTFIX DATABASE
Evitar migration apresurada si existe alternativa segura.
Si necesaria:
seguir proceso completo.
2870. EMERGENCY CONFIG CHANGE
Puede ser más rápido que code deploy cuando el problema es configuración.
Auditar.
2871. FEATURE KILL SWITCH
Para integraciones no críticas puede existir flag que permita desactivarlas rápidamente.
No utilizar kill switch para ocultar corrupción financiera.
2872. KDS KILL SWITCH
Si KDS presenta fallo:
desactivar nuevos envíos y utilizar printer fallback cuando configurado.
2873. CDS KILL SWITCH
Puede desactivarse sin afectar ventas.
2874. EMAIL KILL SWITCH
Sí.
2875. ANALYTICS KILL SWITCH
Sí.
2876. PAYMENT PROVIDER KILL SWITCH
Deshabilita ese método integrado.
Otros métodos continúan.
2877. FISCAL PROVIDER KILL SWITCH
No utilizar para evadir obligaciones fiscales.
Solo conforme al procedimiento legal/operacional permitido.
2878. INCIDENT MODE
Dashboard puede destacar critical incident.
2879. INCIDENT BANNER
Solo para roles afectados.
2880. CUSTOMER-FACING INCIDENT
CDS no debe mostrar detalles técnicos.
2881. KITCHEN INCIDENT
KDS muestra solo información necesaria.
2882. POST-INCIDENT RECONCILIATION
Después de recuperar:
- sync;
- payments;
- fiscal;
- inventory;
- kitchen;
- cash.
2883. INCIDENT DATA PRESERVATION
No limpiar logs/eventos relevantes antes de investigar.
2884. POSTMORTEM TEMPLATE
Crear:
POSTMORTEM_TEMPLATE.md
Con:
- Summary
- Impact
- Timeline
- Root Cause
- Resolution
- Corrective Actions
- Prevention
2885. ROOT CAUSE VS SYMPTOM
No cerrar incidente únicamente porque reiniciar servidor lo resolvió temporalmente.
2886. CORRECTIVE ACTION TEST
Cuando sea posible agregar regression test.
2887. SECURITY INCIDENT
Seguir procedimiento específico.
2888. CREDENTIAL COMPROMISE
Rotar.
2889. DEVICE COMPROMISE
Revocar.
2890. DATA BREACH
Seguir obligaciones aplicables.
No inventar requisitos legales; documentar con asesoría apropiada.
2891. PAYMENT INCIDENT
Consultar provider cuando corresponda.
2892. FISCAL INCIDENT
Consultar provider/asesor fiscal cuando corresponda.
2893. BACKUP INCIDENT
Restaurar según DR.
2894. DATABASE CORRUPTION INCIDENT
No continuar escribiendo ciegamente.
2895. APP CORRUPTION
Preservar DB cuando sea posible.
2896. KDS CORRUPTION
Recuperar desde backend/POS snapshot cuando corresponda.
2897. CDS CORRUPTION
Reprovisionar; no contiene fuente financiera.
2898. POS LOST WITH SYNCED DATA
Provisionar reemplazo.
2899. POS LOST WITH UNSYNCED DATA
Investigar recuperación del dispositivo/backup local.
No inventar transacciones.
2900. MANUAL RECONSTRUCTION
Último recurso.
Requiere evidencia y auditoría.
2901. BUSINESS CONTINUITY PAPER FALLBACK
Puede documentarse procedimiento manual temporal si todo sistema falla.
No es función de software.
2902. MANUAL TICKET REENTRY
Si luego se reingresan operaciones manuales:
marcarlas con origen/motivo apropiado.
Evitar duplicados.
2903. RECOVERY SALE ENTRY
Solo manager/admin.
2904. RECOVERY SALE AUDIT
Obligatorio.
2905. RECOVERY INVENTORY
Debe reconciliar.
2906. RECOVERY FISCAL
Seguir procedimiento legal.
2907. RECOVERY CASH
Reconciliar shift.
2908. BUSINESS CONTINUITY TRAINING
Encargados deben conocer:
- offline banner;
- KDS fallback;
- printer retry;
- payment unknown;
- support contact.
2909. CASHIER SHOULD NOT TROUBLESHOOT NETWORK
El sistema debe dar instrucciones simples.
2910. MANAGER DIAGNOSTICS
Más detalle.
2911. TECHNICAL RUNBOOK
Para soporte.
2912. ESCALATION LEVELS
L1
Operación.
L2
Manager/Admin.
L3
Technical support.
2913. L1 ACTIONS
- retry printer;
- check KDS status;
- switch payment method;
- continue offline.
2914. L2 ACTIONS
- authorize;
- device status;
- sync;
- config;
- reconcile.
2915. L3 ACTIONS
- logs;
- DB;
- deployment;
- provider.
2916. NO DATABASE ACCESS FOR L1/L2
Sí.
2917. SUPPORT DOCUMENTATION
Organizada por error code.
2918. SUPPORT SEARCH BY SALE
Puede buscar:
- receipt;
- turn;
- saleId interno.
2919. SUPPORT SEARCH BY DEVICE
Sí.
2920. SUPPORT SEARCH BY PAYMENT
Sí.
2921. SUPPORT SEARCH BY CORRELATION
Sí.
2922. SUPPORT TIMELINE
Útil para incidentes.
2923. CUSTOMER SERVICE RECEIPT LOOKUP
Puede existir permiso para buscar recibo sin ver configuración.
2924. CUSTOMER SERVICE REFUND
Permiso separado.
2925. CUSTOMER SERVICE CUSTOMER EDIT
Permiso separado.
2926. MANAGER VOID
Sí.
2927. OWNER FISCAL
Sí.
2928. OWNER DEVICE MANAGEMENT
Sí.
2929. AUDITOR ROLE FUTURE
Read-only reports/audit.
2930. ACCOUNTANT ROLE FUTURE
Reports/fiscal read access.
2931. ROLE TEMPLATES
Puede incluir:
- Owner
- Admin
- Manager
- Cashier
- Kitchen
2932. ROLE TEMPLATE CUSTOMIZATION
Sí.
2933. ROLE TEMPLATE UPDATE
No sobrescribir roles personalizados automáticamente.
2934. NEW PERMISSION MIGRATION
Default deny.
Owner puede recibir automáticamente si política explícita.
2935. PERMISSION DOCUMENTATION
Crear:
PERMISSIONS.md
2936. PERMISSION DESCRIPTION
Humana.
2937. PERMISSION GROUPS
- Sales
- Payments
- Cash
- Catalog
- Customers
- Employees
- Reports
- Devices
- Fiscal
- Audit
2938. PERMISSION UI SEARCH
Útil.
2939. PERMISSION DANGEROUS BADGE
Para:
- role management;
- fiscal;
- refunds;
- device revoke.
2940. OWNER ROLE PROTECTION
No archivar último Owner.
2941. OWNER TRANSFER
Reauth + confirmation.
2942. EMPLOYEE SELF-EDIT
Puede editar datos básicos futuros.
No rol/permisos.
2943. ADMIN SELF-ROLE CHANGE
No auto-escalation.
2944. API POLICY TESTS
Cada permiso sensible debe tener test.
2945. ENDPOINT INVENTORY
Documentar endpoints y required permissions.
2946. REALTIME AUTHORIZATION
KDS/CDS messages también deben aplicar scope.
2947. REPORT ROW-LEVEL SECURITY
Branch filters deben aplicarse server-side.
2948. EXPORT ROW-LEVEL SECURITY
Igual.
2949. CUSTOMER SEARCH SCOPE
Organization/Branch según política.
2950. PRODUCT SEARCH SCOPE
Organization/Branch.
2951. EMPLOYEE SEARCH SCOPE
Según permisos.
2952. DEVICE SEARCH SCOPE
Branch/Admin.
2953. AUDIT SEARCH SCOPE
Sí.
2954. BACKEND ADMIN ENDPOINTS
No exponer públicamente sin auth.
2955. INTERNAL ENDPOINTS
Protegidos.
2956. HEALTH ENDPOINT
Puede ser público limitado o protegido según infraestructura.
No revelar DB credentials/version details.
2957. METRICS ENDPOINT
Protegido.
2958. DEBUG ENDPOINT
No production.
2959. API DOCUMENTATION PRODUCTION
Puede protegerse si contiene información interna.
2960. CORS EXACT ORIGINS
No * con credenciales.
2961. CSP DASHBOARD
Definir.
2962. CONTENT UPLOAD CSP
Sí.
2963. CLICKJACKING
Protección.
2964. CSRF
Si auth cookie-based.
2965. XSS TEST
Inputs:
<script>alert(1)</script>
Deben mostrarse/guardarse de forma segura, no ejecutarse.
2966. CSV INJECTION TEST
Valores que comiencen con:
- =
-
  -
-
  -
- @
proteger en export cuando corresponda.
2967. SQL INJECTION TEST
Payloads comunes.
No ejecutar.
2968. PATH TRAVERSAL TEST
Uploads/exports.
2969. MIME SPOOF TEST
Validar.
2970. ZIP BOMB
Si se aceptan archivos comprimidos en futuro:
proteger.
No necesario si no se aceptan.
2971. XLSX RESOURCE LIMIT
Limitar filas/tamaño.
2972. IMAGE DECOMPRESSION BOMB
Limitar dimensiones.
2973. FILE NAME
Generar nombre interno seguro.
2974. ORIGINAL FILE NAME
Puede guardarse como metadata sanitizada.
2975. UPLOAD VIRUS SCAN FUTURE
Considerar para entornos mayores.
2976. CUSTOMER IMPORT FORMULA
No evaluar formulas del Excel como código.
Leer valores de forma segura.
2977. IMPORT ERROR SANITIZATION
No mostrar stack traces.
2978. EXPORT FILE ACCESS
Usuario debe estar autorizado al solicitar y descargar.
2979. EXPORT URL
Expirable.
2980. EXPORT IDOR TEST
Sí.
2981. RECEIPT IDOR TEST
Sí.
2982. CUSTOMER IDOR TEST
Sí.
2983. EMPLOYEE IDOR TEST
Sí.
2984. DEVICE IDOR TEST
Sí.
2985. REPORT IDOR TEST
Sí.
2986. BRANCH IDOR TEST
Sí.
2987. ORGANIZATION IDOR TEST
Sí.
2988. ROLE IDOR TEST
Sí.
2989. PAYMENT IDOR TEST
Sí.
2990. FISCAL IDOR TEST
Sí.
2991. AUDIT IDOR TEST
Sí.
2992. API FUZZ TEST FUTURE
Puede utilizarse.
No P0.
2993. MOBILE REVERSE ENGINEERING ASSUMPTION
Asumir que APK puede inspeccionarse.
No confiar en ocultar endpoints/keys.
2994. OBFUSCATION
Ayuda a dificultar análisis, no es control principal.
2995. CERTIFICATE PINNING
Considerar según threat model.
Debe tener estrategia de rotación.
No implementarlo de manera que un certificado renovado bloquee todas las cajas sin recuperación.
2996. ROOT DETECTION
No es defensa suficiente.
Opcional.
2997. DEVICE ATTESTATION FUTURE
Puede utilizar Play Integrity u otro mecanismo si distribución lo permite.
No P0.
2998. LOCAL DATABASE TAMPERING
Backend debe validar datos sincronizados.
No confiar ciegamente en DB local modificada.
2999. SALE SIGNATURE FUTURE
Puede utilizar firma/HMAC de eventos para detectar manipulación.
Evaluar threat model.
3000. SERVER VALIDATION OF OFFLINE SALE
Validar:
- employee authorization snapshot;
- device authorization;
- branch;
- pricing/tax version;
- totals;
- IDs.
No rechazar ciegamente una venta legítima solo porque configuración actual cambió después.
3001. OFFLINE SALE CONFIG VERSION
Permite validar contra reglas históricas/versionadas.
3002. CONFIG VERSION RETENTION SERVER
Mantener suficiente historial para validar transacciones offline pendientes.
3003. PRICE VERSION RETENTION
Sí.
3004. TAX VERSION RETENTION
Sí.
3005. PERMISSION VERSION RETENTION
Puede necesitarse para auditoría.
3006. REVOKED EMPLOYEE OFFLINE SALE
Escenario:
empleado vende offline antes de que dispositivo conozca su revocación.
Al sincronizar:
no borrar automáticamente la venta.
Marcar/auditar según política.
3007. REVOKED DEVICE OFFLINE SALE
Mismo tipo de problema.
Requiere reconciliación/política.
3008. SECURITY EVENTUAL CONSISTENCY
Documentar claramente limitaciones offline.
3009. OFFLINE MAX WINDOW
Definir política configurable/operacional.
No dejar dispositivos indefinidamente offline sin renovación.
3010. OFFLINE WINDOW TEST
Sí.
3011. OFFLINE WINDOW OWNER OVERRIDE
No universal.
Si se implementa:
temporal/auditado.
3012. CLOCK ROLLBACK ATTACK
No

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 17 | attachment=a56707d1-d57b-4a3a-9edc-15139ef1f98e | rango=3012-3194 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
3012. CLOCK ROLLBACK ATTACK
No confiar exclusivamente en el reloj local para extender artificialmente:
- autorización offline;
- pairing;
- tokens;
- certificados;
- promociones futuras;
- secuencias;
- permisos temporales.
Cuando el dispositivo haya tenido conexión, conservar información suficiente para detectar retrocesos de reloj sospechosos.
No bloquear automáticamente una operación legítima únicamente por una pequeña desviación; clasificar según severidad y contexto.
3013. MONOTONIC TIME
Para duraciones dentro de una sesión puede utilizarse reloj monotónico.
Para timestamps históricos:
utilizar tiempo absoluto.
3014. KDS TIMER IMPLEMENTATION
Combinar:
- timestamp persistido;
- reloj monotónico mientras app está activa;
para evitar saltos visuales innecesarios.
Después de restart:
recalcular desde timestamp.
3015. PAYMENT TIMEOUT CLOCK
Timeout de una request debe utilizar mecanismo monotónico/runtime.
No cambiar porque el usuario cambió la hora.
3016. TOKEN EXPIRY
Validado por servidor cuando online.
Offline según política/cache segura.
3017. PAIRING NONCE EXPIRY
Puede validarse por ambos lados dentro de tolerancia.
3018. FISCAL TIMESTAMP
Provider/servidor es autoridad cuando corresponda.
3019. AUDIT TIMESTAMP
Guardar server timestamp cuando evento llega a cloud, además de device timestamp si es útil.
3020. CASH MOVEMENT TIMESTAMP
Conservar tiempo real de creación local + recepción.
3021. TIME CLOCK TAMPERING
Marcaciones offline con reloj anómalo deben poder marcarse para revisión.
No corregirlas silenciosamente.
3022. TIME CLOCK MANAGER CORRECTION
Utilizar flujo auditado.
3023. BUSINESS DATE RECOMPUTE
No recalcular históricos automáticamente si cambia cutoff.
Guardar businessDate/snapshot utilizado.
3024. BUSINESS CUTOFF CHANGE
Aplica a operaciones futuras según effective date.
3025. TIMEZONE CHANGE
No reescribir timestamps históricos.
3026. BRANCH RELOCATION
Cambiar timezone/dirección requiere cuidado.
Histórico conserva contexto.
3027. RECEIPT HISTORICAL ADDRESS
Guardar snapshot cuando requisitos fiscales/operacionales lo necesiten.
3028. ORGANIZATION LEGAL NAME CHANGE
Ventas históricas deben conservar datos legales correspondientes si aplica.
3029. RNC CHANGE
Debe tratarse como cambio sensible.
No reescribir documentos anteriores.
3030. FISCAL CONFIG EFFECTIVE DATE
Sí.
3031. CONFIG HISTORICAL SNAPSHOT
La estrategia puede combinar:
- referencias versionadas;
- snapshots;
según entidad.
3032. SNAPSHOT STORAGE TRADEOFF
No copiar toda la configuración en cada venta.
Guardar únicamente información necesaria para reproducir/auditar.
3033. SNAPSHOT SCHEMA VERSION
Versionar si evoluciona.
3034. SNAPSHOT IMMUTABILITY
Después de completar venta:
no modificar.
3035. RECEIPT REGENERATION
Utilizar snapshot.
3036. REPORT HISTORICAL DIMENSIONS
Utilizar snapshots cuando la pregunta sea histórica.
3037. CURRENT CATALOG REPORT
Puede utilizar entidad actual cuando el reporte lo indique claramente.
3038. HISTORICAL VS CURRENT CATEGORY
No mezclar sin etiqueta.
3039. PRODUCT MERGE FUTURE
Si se fusionan productos duplicados:
no reescribir sale snapshots.
Puede crear mapping analítico.
3040. CUSTOMER MERGE
Historial puede reasignarse mediante relación/mapping auditado.
No modificar documentos fiscales que deban conservar identidad original.
3041. EMPLOYEE MERGE
Normalmente no.
No fusionar personas solo por nombre.
3042. BRANCH MERGE
No.
Archivar/reorganizar.
3043. DATA QUALITY DASHBOARD FUTURE
Puede detectar:
- duplicate customers;
- missing barcodes;
- missing categories;
- invalid tax config.
3044. CONFIGURATION VALIDATOR
Ya requerido.
Debe cubrir data quality crítica.
3045. PRODUCT REQUIRED FIELDS
Como mínimo:
- name;
- category o política default;
- sell price;
- active status.
SKU/barcode pueden ser opcionales según negocio.
3046. PRODUCT PRICE ZERO
Permitido únicamente si:
- producto gratuito;
- open price;
- cortesía/config específica.
Advertir.
3047. PRODUCT NEGATIVE PRICE
No permitido.
3048. MODIFIER NEGATIVE PRICE
Puede permitirse solo si representa reducción configurada y no produce resultados inválidos.
Preferir descuentos para reducciones comerciales.
3049. TAX NEGATIVE RATE
No permitido salvo modelo legal específico explícito.
3050. DISCOUNT NEGATIVE VALUE
No.
3051. QUANTITY NEGATIVE SALE
No.
Refund utiliza flujo separado.
3052. CASH MOVEMENT NEGATIVE INPUT
El tipo determina dirección.
Solicitar monto positivo.
3053. INVENTORY MOVEMENT SIGN
Puede almacenarse signed quantity internamente.
UI utiliza tipo + cantidad positiva.
3054. Rounding SCALE
Moneda define escala.
DOP normalmente dos decimales para representación monetaria del sistema salvo regla real distinta.
3055. MONEY DATABASE TYPE
Utilizar:
- integer minor units;
o
- NUMERIC/DECIMAL con precisión definida.
No FLOAT/REAL.
3056. MONEY API TYPE
Exacto.
3057. MONEY UI TYPE
No convertir a double para cálculos.
3058. MONEY TEST LARGE VALUES
Probar límites razonables.
3059. INTEGER OVERFLOW
Si minor units:
seleccionar tipo suficientemente amplio.
3060. QUANTITY DATABASE TYPE
Exacto.
3061. TAX RATE TYPE
Decimal exacto.
3062. PERCENTAGE INPUT
UI puede mostrar:
18%
internamente representar consistentemente.
3063. PERCENTAGE LIMIT
Validar rango.
Descuentos >100% normalmente no permitidos.
3064. TAX >100%
No asumir imposible globalmente, pero advertir/validar según tipo.
3065. CHARGE >100%
Mismo principio.
3066. PRICING CALCULATION ORDER
Debe quedar documentado y testeado.
3067. ITEM SUBTOTAL
Conceptualmente:
base product price × quantity
- modifiers
antes de descuentos/impuestos según reglas.
3068. ITEM DISCOUNT
Aplicar según engine.
3069. ORDER DISCOUNT
Distribuir/representar de forma determinista cuando sea necesario para impuestos/refunds.
3070. DISCOUNT ALLOCATION
Si un descuento de orden debe asignarse a líneas:
utilizar algoritmo determinista con manejo de centavos.
3071. ALLOCATION ROUNDING
La suma asignada debe ser exactamente igual al descuento total.
3072. TAX ALLOCATION
Mismo principio cuando sea necesario.
3073. REFUND ALLOCATION
Debe utilizar asignaciones originales.
3074. PAYMENT ALLOCATION
Split payment no necesita asignarse por línea salvo función futura.
3075. SPLIT CHECK FUTURE ALLOCATION
Sí.
3076. RECEIPT LINE TOTAL
Debe reconciliar.
3077. MODIFIER RECEIPT DISPLAY
Mostrar debajo de producto.
3078. ZERO-PRICE MODIFIER
Mostrar opcionalmente.
KDS sí debe verlo si afecta preparación.
3079. REMOVED INGREDIENT MODIFIER
Ejemplo:
Sin cebolla.
Puede precio 0.
Debe aparecer KDS.
3080. DEFAULT MODIFIERS FUTURE
Puede preseleccionar opciones.
No ocultar cambios.
3081. MODIFIER REQUIRED VALIDATION
No guardar/cobrar línea inválida.
3082. MODIFIER MAX VALIDATION
Sí.
3083. MODIFIER MIN VALIDATION
Sí.
3084. MODIFIER OPTION QUANTITY MAX
Configurable futuro.
3085. MODIFIER SOLD OUT
Deshabilitar opción.
3086. ALL MODIFIERS UNAVAILABLE
Si grupo requerido queda sin opciones:
producto no puede venderse hasta resolver.
Mostrar razón.
3087. PRODUCT AVAILABILITY DERIVED
Puede marcarse no vendible si required modifier group no tiene opciones válidas.
3088. KITCHEN MODIFIER ORDER
Mantener orden configurado/seleccionado.
3089. RECEIPT MODIFIER ORDER
Igual.
3090. CDS MODIFIER ORDER
Igual.
3091. MODIFIER GROUP DISPLAY
Puede mostrar nombre del grupo cuando ayude.
3092. MODIFIER COMMENT
No necesario.
3093. PRODUCT COMMENT LENGTH
Limitar razonablemente.
3094. COMMENT SANITIZATION
Sí.
3095. COMMENT MULTILINE
Sí.
3096. COMMENT KDS EMPHASIS
Mostrar claramente.
3097. COMMENT PRINT
Wrap.
3098. COMMENT RECEIPT CONFIG
Ya definido.
3099. COMMENT CDS
Solo comentarios customer-visible si se decide.
No kitchen/internal por defecto.
3100. CUSTOMER DISPLAY PRODUCT COMMENT
Por defecto no mostrar instrucciones internas de cocina.
3101. ORDER NOTE LENGTH
Limitar.
3102. CUSTOMER NAME LENGTH
Validar razonablemente.
3103. PRODUCT NAME LENGTH
Sí.
3104. RECEIPT NAME FALLBACK
Si demasiado largo:
wrap/abreviar mediante configured receiptName.
No cortar precio.
3105. KDS NAME FALLBACK
KitchenName.
3106. SEARCH NORMALIZATION
Unicode-safe.
3107. ACCENT INSENSITIVE SEARCH
Para español:
pechurina
puede encontrar variantes con acentos cuando corresponda.
3108. SEARCH TOKENIZATION
Simple y predecible.
No necesidad de motor de búsqueda externo para catálogo inicial.
3109. FUZZY SEARCH
Puede añadirse si mejora UX.
No devolver resultados peligrosamente irrelevantes para barcode.
3110. BARCODE EXACT ONLY
Sí.
3111. SKU EXACT/PREFIX
Sí.
3112. PRODUCT SEARCH OFFLINE INDEX
Room/SQLite index/FTS cuando sea útil.
3113. DASHBOARD PRODUCT SEARCH
DB index/full-text según escala.
3114. CUSTOMER SEARCH INDEX
Sí.
3115. RECEIPT SEARCH INDEX
Sí.
3116. AUDIT SEARCH INDEX
Sí.
3117. PAYMENT REFERENCE INDEX
Sí.
3118. FISCAL NUMBER INDEX
Sí.
3119. TURN NUMBER INDEX
Con businessDate/branch para desambiguar.
3120. TABLE NAME INDEX
Si muchas mesas, no crítico.
3121. ORDER NAME SEARCH
Sí.
3122. SEARCH RESULT LIMIT
No devolver miles.
3123. POS SEARCH TOP RESULTS
Mostrar cantidad razonable y scroll.
3124. SEARCH NO RESULTS
Claro.
3125. SEARCH LOADING
Local puede ser inmediato.
Cloud customer search puede mostrar loading.
3126. SEARCH STALE REQUEST
Cancelar/ignorar.
3127. BARCODE ADD QUANTITY
Escanear mismo producto repetidamente puede incrementar cantidad.
Configurable/comportamiento estándar.
3128. BARCODE PRODUCT WITH REQUIRED MODIFIERS
Cada scan abre modifier flow.
No fusionar automáticamente líneas con modificadores potencialmente diferentes.
3129. CART LINE MERGE
Productos idénticos pueden fusionarse solo si:
- mismo producto;
- mismo price snapshot;
- mismos modifiers;
- mismo comment;
- mismo discount context.
3130. CART LINE NO MERGE
Si cualquiera difiere.
3131. KITCHEN LINE ID
Cada line debe tener ID estable.
3132. SALE LINE ID
Sí.
3133. ORDER LINE ID
Puede persistir hacia SaleLine/reference.
3134. LINE REVISION
Útil para kitchen deltas.
3135. QUANTITY DELTA
Sí.
3136. KITCHEN DEDUP PER LINE EVENT
Sí.
3137. ORDER REVISION
Incrementar por cambios relevantes.
3138. PAYMENT START REVISION
Bloquear/validar que se cobra revisión actual.
3139. STALE PAYMENT SCREEN
Si orden cambió desde que abrió pago:
no cobrar total viejo.
Mostrar:
La orden cambió. Revise el total actualizado.
3140. CDS PAYMENT TOTAL REVISION
Actualizar antes de procesar.
3141. KDS DOES NOT AFFECT SALE TOTAL
Sí.
3142. RECEIPT SNAPSHOT AFTER FINAL REVISION
Sí.
3143. SALE FINALIZATION VALIDATION
Antes de commit:
- order valid;
- total valid;
- payment balance;
- employee;
- branch;
- register;
- shift cuando required;
- fiscal preconditions cuando required.
3144. SALE FINALIZATION TRANSACTION
Atómica.
3145. SALE FINALIZATION ID
Idempotency key.
3146. SALE FINALIZATION RETRY
Retorna resultado existente.
3147. SALE FINALIZATION RESPONSE
Debe incluir:
- saleId;
- receipt;
- total;
- payment status;
- fiscal status;
- sync/local state.
No necesita esperar printing.
3148. SALE COMPLETE LOCAL EVENT
Generar.
3149. RECEIPT PRINT REQUEST
Después.
3150. CDS COMPLETE MESSAGE
Después.
3151. INVENTORY EVENT
En transacción/outbox.
3152. CLOUD SYNC EVENT
Sí.
3153. ANALYTICS EVENT
No crítico.
3154. KITCHEN PAYMENT EVENT
Normalmente no necesario.
KDS ya tiene orden.
3155. TABLE RELEASE
Después de completar/cerrar orden según regla.
3156. OPEN TICKET STATUS
Actualizar.
3157. NEW SALE RESET
Solo después de completion state seguro.
3158. PAYMENT SCREEN BACK
Si no se procesó pago:
volver.
3159. PAYMENT SCREEN BACK AFTER PARTIAL SPLIT
No perder pagos ya completados.
Mostrar saldo restante.
3160. ABANDON PARTIAL PAYMENT
No permitir cancelar la venta como si nada.
Requiere refund/void de pagos según reglas.
3161. PARTIAL PAYMENT OPEN TICKET
Puede quedar PAYMENT_PENDING con pagos registrados.
Debe recuperarse.
3162. KDS WITH PARTIAL PAYMENT
No afecta.
3163. SHIFT WITH PARTIAL CASH PAYMENT
Cash movement existe cuando pago se completa.
3164. PARTIAL PAYMENT REPORT
No contar como venta completa hasta finalización, pero Payments deben ser rastreables.
3165. ORPHAN PAYMENT PREVENTION
Payment siempre vinculado a Order/Sale context.
3166. ORPHAN PAYMENT RECONCILIATION
Si provider confirma pero Sale no finalizó:
recovery workflow.
3167. PAYMENT BEFORE SALE MODEL
PaymentAttempt vinculado a Order.
Sale se crea/finaliza después.
3168. CASH PAYMENT ATOMICITY
Puede crearse dentro de Sale transaction.
3169. EXTERNAL PAYMENT TWO-PHASE NATURE
No es DB two-phase commit.
Utilizar saga/reconciliation.
3170. NO DISTRIBUTED TRANSACTION WITH BANK
Sí.
3171. PAYMENT COMPENSATION
Refund/void provider cuando sea necesario.
3172. PROVIDER VOID VS REFUND
Diferenciar según provider.
3173. PAYMENT PROVIDER CAPABILITIES
Adapter declara:
- sale;
- void;
- refund;
- partial refund;
- status query.
3174. FISCAL PROVIDER CAPABILITIES
Igual.
3175. PRINTER CAPABILITIES
Igual.
3176. KDS CAPABILITIES
Protocol version.
3177. CDS CAPABILITIES
Protocol version.
3178. CAPABILITY CHECK BEFORE ACTION
No mostrar acción unsupported.
3179. PAYMENT PROVIDER UNSUPPORTED REFUND
Mostrar procedimiento manual/config.
3180. FISCAL PROVIDER UNSUPPORTED ACTION
No inventar.
3181. RECEIPT PRINTER UNSUPPORTED QR
Fallback.
3182. KDS UNSUPPORTED ADVANCED STATE
Utilizar simple mode si compatible.
3183. CDS UNSUPPORTED PROMOTION
Ignorar optional capability.
3184. REQUIRED CAPABILITY FAILURE
Bloquear solo feature afectada.
3185. PROVIDER ADAPTER CONTRACT TEST
Cada adapter debe pasar suite común.
3186. PRINTER ADAPTER CONTRACT TEST
Sí.
3187. PAYMENT ADAPTER CONTRACT TEST
Sí.
3188. FISCAL ADAPTER CONTRACT TEST
Sí.
3189. STORAGE ADAPTER CONTRACT TEST
Si existe.
3190. CLOCK CONTRACT TEST
Sí.
3191. REPOSITORY CONTRACT TEST
Cuando existan múltiples implementaciones.
3192. LOCAL DB REPOSITORY
Room.
3193. CLOUD REPOSITORY
API.
3194. OFFLINE-FIRST REPOSITORY
Coordina local/cloud.


























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 18 | attachment=6d943667-b7aa-4371-860e-d46fea4492fd | rango=3195-3398 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
3195. OFFLINE-FIRST READ STRATEGY
Para datos operacionales del POS:
preferir lectura desde almacenamiento local.
Cloud actualiza/sincroniza el almacenamiento.
Esto reduce:
- latencia;
- dependencia de Internet;
- inconsistencias visuales durante reconexión.
3196. OFFLINE-FIRST WRITE STRATEGY
Operaciones autorizadas offline:
1. validar;
2. persistir localmente;
3. crear outbox;
4. actualizar UI;
5. sincronizar posteriormente.
3197. ONLINE-ONLY WRITE STRATEGY
Algunas acciones administrativas pueden requerir cloud.
Ejemplos:
- ownership;
- configuración fiscal productiva;
- gestión global de usuarios.
Mostrar claramente:
Se requiere conexión.
3198. HYBRID WRITE
Algunas acciones pueden persistir local + requerir confirmación cloud.
Documentar por caso.
3199. REPOSITORY SOURCE POLICY
Cada repository debe tener política explícita:
- local-only;
- remote-only;
- local-first;
- remote-first;
- synchronized.
No elegir implícitamente.
3200. PRODUCT REPOSITORY
POS:
local-first.
Dashboard:
remote.
3201. CUSTOMER REPOSITORY
POS:
local/cache + remote cuando disponible.
Dashboard:
remote.
3202. SALES REPOSITORY
POS:
local transactional + sync.
Dashboard:
central DB.
3203. CONFIG REPOSITORY
POS:
Last Known Good local + remote sync.
Dashboard:
central.
3204. DEVICE REPOSITORY
Cloud authority + local identity.
3205. KDS REPOSITORY
Local active orders + sync/history.
3206. CDS REPOSITORY
Local pairing/preferences; session realtime.
3207. REPORT REPOSITORY
Central.
3208. INVENTORY REPOSITORY
Central + local operational cache/ledger integration según arquitectura.
3209. SHIFT REPOSITORY
POS local + central sync.
3210. RECEIPT REPOSITORY
Local recent + central historical.
3211. DATA SOURCE COMMENTS
Documentar decisiones importantes en arquitectura, no llenar código con comentarios obvios.
3212. CODE COMMENTS
Explicar:
- por qué;
- invariantes;
- workarounds.
No describir línea por línea.
3213. TODO POLICY
Todo TODO debe incluir contexto/issue cuando sea importante.
No dejar:
TODO fix later
en código crítico.
3214. FIXME
No release con FIXME crítico.
3215. DEAD CODE
Eliminar.
Git conserva historial.
3216. COMMENTED-OUT CODE
Eliminar salvo razón temporal documentada.
3217. FEATURE FLAGGED CODE
Puede permanecer si feature futuro está claramente aislado.
3218. EXPERIMENTAL CODE
No production path por defecto.
3219. CODE FORMATTING
Automatizar.
3220. LINTING
Automatizar.
3221. TYPE CHECKING
Estricto donde sea razonable.
3222. NULL SAFETY
Kotlin.
TypeScript strict.
3223. ANY TYPE
Evitar any indiscriminado.
3224. MAGIC NUMBERS
Centralizar:
- thresholds;
- timeouts;
- limits.
3225. KDS THRESHOLDS CONFIG
Defaults:
- 10;
- 20;
-
  30.
3226. RETRY LIMITS
Configuración técnica.
3227. IMPORT LIMITS
Config.
3228. UPLOAD LIMITS
Config.
3229. SESSION TIMEOUT
Config.
3230. BUSINESS RULE CONFIG VS TECH CONFIG
Separar.
3231. BUSINESS CONFIG DASHBOARD
Editable.
3232. TECH CONFIG ENV/ADMIN
No exponer todo al usuario.
3233. SECURITY CONFIG
Solo roles altos/infra.
3234. TIMEOUT UI
No permitir que Owner configure timeouts de DB accidentalmente desde Dashboard.
3235. FEATURE CONFIG SCHEMA
Validado.
3236. CONFIG DEFAULTS
Documentados.
3237. CONFIG MIGRATIONS
Cuando schema cambia.
3238. CONFIG VALIDATION TEST
Sí.
3239. CONFIG SERIALIZATION
Versionada.
3240. CONFIG SECRET SEPARATION
Nunca incluir provider secret dentro del payload enviado a POS/KDS/CDS si no lo necesitan.
3241. DEVICE CONFIG MINIMIZATION
Cada dispositivo recibe subset.
3242. POS CONFIG SUBSET
- catalog;
- pricing;
- taxes;
- payments;
- permissions;
- kitchen routing;
- receipt;
- branch.
3243. KDS CONFIG SUBSET
- station;
- thresholds;
- sound;
- branding;
- auth.
3244. CDS CONFIG SUBSET
- branding;
- language;
- idle;
- auth.
3245. NO FISCAL SECRETS ON CDS
Sí.
3246. NO PAYMENT SECRETS ON KDS
Sí.
3247. NO CUSTOMER DATABASE ON CDS
Sí.
3248. NO EMPLOYEE PIN HASH ON KDS/CDS
Sí.
3249. POS SENSITIVE CONFIG
Proteger localmente.
3250. CONFIG DOWNLOAD AUTH
Device credential.
3251. CONFIG SIGNATURE FUTURE
Puede firmarse si threat model lo requiere.
3252. CONFIG ROLLBACK ATTACK
No aceptar versión antigua arbitrariamente si contiene reglas revocadas.
Utilizar version/issuedAt/policy.
3253. LAST KNOWN GOOD VS SECURITY REVOCATION
Last Known Good no debe ignorar indefinidamente una revocación recibida.
3254. CONFIG VERSION MONOTONIC
Por scope.
3255. CONFIG FORCE REFRESH
Admin puede solicitar.
3256. CONFIG CACHE CLEAR
No dejar POS sin config válida.
3257. FULL RESYNC
Herramienta administrativa:
- descarga snapshot;
- valida;
- reemplaza cache config/catalog;
- conserva transacciones locales.
3258. FULL RESYNC DOES NOT RESET SALES
Regla absoluta.
3259. FULL RESYNC DOES NOT RESET SHIFT
Sí.
3260. FULL RESYNC DOES NOT RESET OUTBOX
Sí.
3261. FULL RESYNC DOES NOT RESET PRINT JOBS
Sí.
3262. FULL RESYNC DOES NOT RESET KDS ACTIVE ORDERS
KDS resync debe reconciliar.
3263. DATABASE REBUILD CACHE
Puede reconstruir únicamente caches derivables.
3264. CACHE TABLES
Distinguir de transactional tables.
3265. TRANSACTIONAL TABLE DELETE PROTECTION
Sí.
3266. ROOM DATABASE BACKUP MIGRATION TEST
Sí.
3267. SQLITE WAL
Evaluar para concurrencia/performance.
Documentar.
3268. SQLITE TRANSACTIONS
Sí.
3269. SQLITE FOREIGN KEYS
Habilitar/verificar.
3270. SQLITE INDEXES
Sí.
3271. SQLITE VACUUM
No ejecutar durante servicio sin necesidad.
3272. SQLITE CORRUPTION CHECK
Herramienta técnica.
3273. SQLITE DB SIZE
Monitorear.
3274. SQLITE PRAGMA
Configurar conscientemente.
No copiar valores de Internet sin entenderlos.
3275. POSTGRESQL TRANSACTIONS
Sí.
3276. POSTGRESQL NUMERIC
Para Decimal si estrategia elegida.
3277. POSTGRESQL TIMESTAMPTZ
Preferible para timestamps absolutos.
3278. POSTGRESQL DATE
BusinessDate.
3279. POSTGRESQL JSONB
Puede utilizarse para snapshots/config.
No convertir todo el esquema relacional en JSON.
3280. JSON SNAPSHOT VALIDATION
Schema/version.
3281. POSTGRESQL UNIQUE PARTIAL INDEX
Puede ser útil para active entities.
3282. POSTGRESQL ADVISORY LOCK
Puede considerarse para secuencias/jobs.
No obligatorio.
3283. SEQUENCE SERVICE DB DESIGN
Debe garantizar unicidad bajo concurrencia.
3284. DATABASE GENERATED SEQUENCE
Puede utilizarse cuando el formato/ámbito lo permita.
3285. CUSTOM RANGE SEQUENCE
Para fiscal:
transactional row locking/atomic update.
3286. TURN NUMBER SEQUENCE
Puede utilizar atomic counter por:
- branch;
- businessDate;
- register/prefix.
3287. RECEIPT NUMBER SEQUENCE
Similar.
3288. SEQUENCE GAP
No prometer gapless salvo requisito legal y diseño específico.
3289. FISCAL GAP REQUIREMENT
Seguir provider/regulación.
3290. OFFLINE SEQUENCE
Requiere reservation/range/prefix cuando uniqueness central no está disponible.
3291. OFFLINE FISCAL SEQUENCE
Solo si oficialmente permitido.
3292. OFFLINE TURN SEQUENCE
Sí, mediante estrategia visual.
3293. OFFLINE RECEIPT NUMBER
Definir estrategia.
Puede usar register-prefixed local sequence y central identity.
3294. NUMBER FORMAT CONFIG
No permitir formatos que produzcan colisiones obvias sin advertencia.
3295. NUMBER FORMAT PREVIEW
Dashboard muestra ejemplo.
3296. NUMBER RESET POLICY
Configurable para turn number.
Receipt/fiscal según reglas.
3297. NUMBER RESET TIMEZONE
Branch timezone/businessDate.
3298. NUMBER RESET CONCURRENCY
Atómico.
3299. NUMBER AUDIT
Cambios de configuración.
3300. NUMBER SEARCH
Index.
3301. RECEIPT NUMBER CUSTOMER-FACING
Sí.
3302. INTERNAL SALE ID SUPPORT
Disponible para soporte.
3303. HUMAN ID COLLISION DISPLAY
Si dos sucursales tienen Receipt 100:
Dashboard debe mostrar sucursal.
3304. GLOBAL SEARCH DASHBOARD
Puede buscar:
- receipt;
- turn;
- customer;
- product;
- device.
P1.
3305. GLOBAL SEARCH PERMISSIONS
Resultados filtrados.
3306. SEARCH RESULT TYPES
Etiquetar.
3307. COMMAND PALETTE FUTURE
No P0.
3308. DASHBOARD HOME QUICK ACTIONS
Puede incluir:
- Agregar artículo
- Agregar empleado
- Ver ventas
- Ver dispositivos
según permisos.
3309. OWNER KPI
Ventas hoy.
3310. MANAGER KPI
Sucursal.
3311. INVENTORY KPI
Low stock.
3312. SYSTEM KPI
Critical alerts.
3313. DASHBOARD CUSTOMIZATION FUTURE
No P0.
3314. REPORT FAVORITES FUTURE
No P0.
3315. SCHEDULED REPORTS FUTURE
No P0.
3316. DAILY SUMMARY FUTURE
Puede enviar email.
3317. DASHBOARD FILTER DEFAULT
Current branch/date.
3318. OWNER ALL BRANCH DEFAULT
Puede mostrar consolidado.
3319. BRANCH SELECTOR
Persistente en Dashboard.
3320. BRANCH SELECTOR PERMISSIONS
Solo sucursales permitidas.
3321. BRANCH CONTEXT WARNING
En configuraciones sensibles mostrar branch actual claramente.
Evitar editar sucursal equivocada.
3322. GLOBAL CONFIG BADGE
Indicar cuando setting aplica a toda Organization.
3323. BRANCH OVERRIDE BADGE
Sí.
3324. RESET OVERRIDE
Permitir volver a configuración global.
3325. CONFIG INHERITANCE PREVIEW
Mostrar valor efectivo.
3326. CONFIG INHERITANCE COMPLEXITY
No utilizar para todo.
Solo donde aporte valor.
3327. TAX CONFIG BRANCH-SPECIFIC
Sí.
3328. FISCAL CONFIG BRANCH-SPECIFIC
Sí.
3329. KITCHEN CONFIG BRANCH-SPECIFIC
Sí.
3330. DEVICE CONFIG BRANCH-SPECIFIC
Sí.
3331. RECEIPT CONFIG BRANCH OVERRIDE
Sí.
3332. PRODUCT CATALOG GLOBAL
Puede ser Organization-level.
3333. PRODUCT AVAILABILITY BRANCH
Sí.
3334. PRODUCT PRICE BRANCH
Sí.
3335. MODIFIER GLOBAL/BRANCH
Global con availability override.
3336. EMPLOYEE ORGANIZATION
Con branch assignments.
3337. CUSTOMER ORGANIZATION
Puede compartirse entre sucursales según política.
3338. INVENTORY BRANCH
Sí.
3339. SALE BRANCH
Obligatorio.
3340. PAYMENT BRANCH
Derivado/vinculado.
3341. SHIFT BRANCH
Sí.
3342. AUDIT BRANCH
Cuando aplicable.
3343. KDS BRANCH
Sí.
3344. CDS BRANCH
Sí.
3345. REGISTER BRANCH
Sí.
3346. FISCAL DOCUMENT BRANCH
Sí.
3347. CROSS-BRANCH CUSTOMER SALE
Cliente puede comprar en varias.
Historial consolidado según permisos.
3348. CROSS-BRANCH PRODUCT REPORT
Sí.
3349. CROSS-BRANCH INVENTORY
No sumar unidades sin considerar ubicación, pero puede mostrar total consolidado.
3350. CROSS-BRANCH SHIFT
No combinar en un solo shift.
3351. CROSS-BRANCH DEVICE
No simultáneamente.
3352. BRANCH TRANSFER DEVICE
Ya definido.
3353. BRANCH ARCHIVE PRECHECK
No permitir si:
- open shifts;
- pending sync;
- active devices;
sin procedimiento.
3354. BRANCH ARCHIVE HISTORICAL
Reportes permanecen.
3355. ORGANIZATION ARCHIVE
Procedimiento administrativo especial.
3356. ORGANIZATION DELETE
No normal.
3357. DATA EXPORT BEFORE CLOSURE
Puede ser requerido.
3358. LEGAL RETENTION
Consultar requisitos aplicables.
3359. DATABASE TENANT KEY
organizationId en tablas multi-tenant relevantes.
3360. COMPOSITE UNIQUE CONSTRAINTS
Incluir organization/branch scope.
3361. QUERY SCOPE MIDDLEWARE
Puede ayudar, pero no confiar ciegamente.
3362. TENANT CONTEXT
Derivado de auth, no request body arbitrario.
3363. BRANCH CONTEXT
Validado contra membership/device.
3364. DEVICE CONTEXT
Derivado de credential.
3365. ACTOR CONTEXT
Employee/User.
3366. REQUEST CONTEXT
Correlation ID.
3367. DOMAIN COMMAND CONTEXT
Pasar actor/branch explícitamente.
3368. BACKGROUND JOB CONTEXT
Debe conservar organization/branch.
3369. OUTBOX CONTEXT
Sí.
3370. AUDIT CONTEXT
Sí.
3371. REPORT CONTEXT
Sí.
3372. TENANT TEST AUTOMATION
Cada repository/service crítico.
3373. MULTI-TENANT CACHE KEY
Debe incluir organization/branch.
3374. MULTI-TENANT REDIS FUTURE
Igual.
3375. FILE STORAGE PATH
Tenant-scoped.
3376. EXPORT STORAGE PATH
Tenant-scoped.
3377. PRODUCT IMAGE PATH
Organization-scoped.
3378. RECEIPT DOCUMENT PATH
Secure/scoped.
3379. BACKUP TENANT
Si backups globales, acceso infra-only.
3380. GDPR/PRIVACY FUTURE
No afirmar cumplimiento automático.
Diseñar buenas prácticas.
3381. DOMINICAN DATA REQUIREMENTS
Verificar legalmente cuando sea necesario.
No inventar.
3382. US DATA REQUIREMENTS FUTURE
Branch-specific.
3383. PRIVACY POLICY
Si el producto se distribuye externamente, preparar política.
3384. TERMS FUTURE
Según uso.
3385. EMPLOYEE PRIVACY NOTICE
Puede ser necesario para Time Clock/biometrics.
No almacenar biometrics.
3386. CUSTOMER CONSENT
Solo donde sea necesario.
3387. EMAIL MARKETING OPT-IN FUTURE
Separado.
3388. CUSTOMER PHONE MARKETING FUTURE
Separado.
3389. LOYALTY CONSENT FUTURE
Sí.
3390. RECEIPT EMAIL TRANSACTIONAL
No implica marketing.
3391. DATA MINIMIZATION
Guardar solo lo necesario.
3392. PII REDACTION UI
Para roles limitados puede ocultar parte de teléfono/email.
3393. PII EXPORT
Permiso.
3394. PII LOGGING
No.
3395. PII ANALYTICS
No.
3396. CUSTOMER ADDRESS KDS
No enviar salvo que una estación logística realmente la necesite.
Kitchen normalmente no.
3397. CUSTOMER PHONE KDS
No.
3398. CUSTOMER NAME KDS
Puede mostrar nombre corto de orden cuando operationalmente útil,

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 19 | attachment=a5230e08-3e5b-46ac-b2c5-c05a1f96e15e | rango=3398-3590 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
3398. CUSTOMER NAME KDS
Puede mostrar el nombre corto de la orden/cliente cuando sea operacionalmente útil.
Ejemplo:
Henry — Turno 084
Pero no enviar al KDS información personal adicional que cocina no necesita.
Preferir:
- número de turno;
- nombre corto de orden;
- mesa.
3399. CUSTOMER RNC KDS
No.
3400. CUSTOMER EMAIL KDS
No.
3401. CUSTOMER ADDRESS CDS
No mostrar por defecto.
3402. CUSTOMER PHONE CDS
No mostrar.
3403. CUSTOMER RNC CDS
No mostrar durante carrito salvo requerimiento explícito futuro.
3404. CUSTOMER NAME CDS
Opcional.
No necesario para el flujo principal.
3405. CUSTOMER DATA RECEIPT
Mostrar únicamente campos configurados/requeridos.
3406. CUSTOMER DATA DASHBOARD
Según permisos.
3407. CUSTOMER DATA POS
Mostrar lo necesario para seleccionar/confirmar.
3408. CUSTOMER DATA SEARCH RESULTS
Evitar mostrar dirección completa en lista.
3409. CUSTOMER DETAIL
Puede mostrar más.
3410. CUSTOMER DUPLICATE RESOLUTION
Mostrar candidatos.
No fusionar automáticamente.
3411. CUSTOMER RNC UNIQUE
Cuando corresponda, puede utilizarse como clave de duplicado dentro del ámbito apropiado.
Validar requisitos reales.
3412. CUSTOMER PHONE UNIQUE
No asumir universalmente.
Familias/empresas pueden compartir.
3413. CUSTOMER EMAIL UNIQUE
Puede advertir.
No siempre imponer salvo login/customer portal futuro.
3414. CUSTOMER INTERNAL ID
Siempre único.
3415. CUSTOMER EXTERNAL ID FUTURE
Para integraciones.
3416. CUSTOMER SOURCE
Puede registrar:
- POS;
- Dashboard;
- Import;
- Integration.
3417. CUSTOMER CREATED OFFLINE
Flag.
3418. CUSTOMER SYNC
Idempotente.
3419. CUSTOMER MERGE AUDIT
Sí.
3420. CUSTOMER FISCAL SNAPSHOT
Una venta fiscal debe guardar datos necesarios del cliente utilizados en ese documento.
3421. CUSTOMER CHANGE AFTER FISCAL
No reescribir documento.
3422. CUSTOMER RNC CORRECTION
Para documentos futuros.
Corrección de documento emitido sigue proceso fiscal correspondiente.
3423. FISCAL CUSTOMER LOOKUP
Puede facilitar selección.
3424. CUSTOMER BUSINESS NAME
Mostrar en recibo fiscal cuando corresponda.
3425. CUSTOMER TYPE INFERENCE
No inferir automáticamente empresa solo porque tiene RNC sin regla clara.
Permitir selección/validación.
3426. CUSTOMER REQUIRED FIELDS BY TYPE
Configurable.
3427. CUSTOMER FORM SIMPLE DEFAULT
No abrumar.
Mostrar campos fiscales avanzados cuando correspondan.
3428. CUSTOMER IMPORT TYPE
Puede inferirse con preview, pero usuario confirma reglas.
3429. CUSTOMER NOTES
Puede existir nota interna.
No CDS.
3430. CUSTOMER TAGS FUTURE
No P0.
3431. CUSTOMER LOYALTY ID FUTURE
Separado.
3432. CUSTOMER CREDIT FUTURE
Separado.
3433. CUSTOMER SALES SUMMARY
Dashboard.
3434. CUSTOMER REFUND HISTORY
Dashboard.
3435. CUSTOMER LAST PURCHASE
Sí.
3436. CUSTOMER AVERAGE TICKET
Puede calcularse.
3437. CUSTOMER ANALYTICS PERMISSION
No todos los roles.
3438. CUSTOMER EXPORT REDACTION
Según permiso.
3439. EMPLOYEE DATA KDS
KDS puede mostrar empleado/camarero si ayuda.
No PIN/email/teléfono.
3440. EMPLOYEE DATA CDS
No mostrar por defecto.
3441. EMPLOYEE DATA RECEIPT
Nombre/código configurable.
3442. EMPLOYEE DATA REPORT
Sí.
3443. EMPLOYEE HISTORICAL NAME
Guardar snapshot/referencia suficiente.
3444. EMPLOYEE NAME CHANGE
No perder atribución.
3445. EMPLOYEE ROLE CHANGE
Ventas históricas no cambian actor.
3446. EMPLOYEE BRANCH CHANGE
Histórico conserva branch de transacción.
3447. EMPLOYEE PIN SECURITY
Nunca en reports.
3448. EMPLOYEE AUTH EVENT
Puede registrar successful login de forma limitada.
3449. EMPLOYEE SESSION
Guardar:
- sessionId;
- employeeId;
- deviceId;
- startedAt;
- expiresAt.
3450. EMPLOYEE SESSION END
Logout/expiry/revocation.
3451. POS SESSION VS SHIFT
Separados.
3452. POS SESSION VS TIME CLOCK
Separados.
3453. SHIFT CAN OUTLIVE LOGIN SESSION
Sí.
El empleado puede bloquear/salir de UI sin cerrar caja.
3454. TIME CLOCK CAN OUTLIVE SHIFT
Sí.
Empleado puede seguir trabajando después de cerrar una caja.
3455. SHIFT CAN BE OPENED BY DIFFERENT AUTH SESSION
La identidad del opener queda registrada.
3456. SHIFT CLOSER
Guardar quién cerró.
Puede ser diferente con permiso.
3457. SHIFT CLOSER AUDIT
Sí.
3458. SHIFT OWNERSHIP POLICY
Definir si solo opener puede cerrar o manager puede.
3459. REGISTER ACTIVE SHIFT UNIQUE
Por defecto:
un solo shift abierto por Register.
Enforce DB constraint/transaction.
3460. MULTIPLE OPEN SHIFT ATTEMPT
Mostrar:
Esta caja ya tiene un turno abierto.
Permitir recuperar/continuar según permiso.
3461. SHIFT RECOVERY SCREEN
Mostrar:
- opened by;
- opened at;
- opening cash;
- status.
3462. SHIFT TRANSFER
Si negocio necesita transferir responsabilidad:
acción auditada.
3463. SHIFT TRANSFER DOES NOT RESET CASH
Sí.
3464. SHIFT CASH MOVEMENTS AFTER TRANSFER
Se atribuyen al actor actual, mismo Shift.
3465. SHIFT SALES ATTRIBUTION
Sales conservan empleados individuales.
3466. SHIFT REPORT BY EMPLOYEE
Puede desglosar.
3467. SHIFT PAYMENT TOTAL
Por método.
3468. SHIFT CASH EXPECTED
Solo movimientos cash-like apropiados.
3469. SHIFT NON-CASH
Mostrar por separado.
3470. SHIFT REFUNDS
Separar.
3471. SHIFT VOIDS
Puede reportar.
3472. SHIFT DISCOUNTS
Puede reportar.
3473. SHIFT OPEN TICKETS
Informativo.
3474. SHIFT KDS
No necesario.
3475. SHIFT RECEIPT NUMBER RANGE
Puede mostrar primero/último recibo.
3476. SHIFT FISCAL RANGE
Puede mostrar documentos emitidos.
3477. SHIFT CLOSE SNAPSHOT
Guardar resumen.
3478. SHIFT REPORT HISTORICAL
No recalcular con configuración actual.
3479. CASH MOVEMENT IMMUTABLE
Después de creado:
no editar directamente.
Corrección mediante adjustment/reversal.
3480. CASH MOVEMENT REVERSAL
Crear movimiento opuesto vinculado al original.
3481. CASH MOVEMENT VOID
No borrar.
3482. CASH MOVEMENT REASON
Sí.
3483. CASH MOVEMENT ATTACHMENT FUTURE
Sí.
3484. CASH MOVEMENT PRINT
Opcional.
3485. CASH MOVEMENT APPROVAL
Configurable por monto/tipo.
3486. CASH DRAWER BALANCE
Derivado.
3487. CASH DRAWER PHYSICAL COUNT
Input.
3488. CASH DIFFERENCE
Derivado.
3489. CASH DIFFERENCE ADJUSTMENT
No crear automáticamente.
3490. CASH DIFFERENCE REPORT
Sí.
3491. CASH DIFFERENCE TREND FUTURE
Por employee/register.
P1.
3492. CASH DIFFERENCE PRIVACY
Solo managers.
3493. SALES BY EMPLOYEE PRIVACY
Según roles.
3494. TIME CLOCK PRIVACY
Empleados pueden ver sus propias horas; managers las de su equipo cuando se implemente.
3495. TIME CLOCK EDIT HISTORY
Sí.
3496. TIME CLOCK ROUNDING
No aplicar reglas de redondeo laboral sin configuración/legal review.
3497. OVERTIME
No calcular nómina/horas extra automáticamente sin reglas configuradas.
3498. TIME CLOCK TOTAL HOURS
Duración básica.
3499. TIME CLOCK OPEN SESSION AT MIDNIGHT
Continúa.
3500. TIME CLOCK FORGOT CLOCK-OUT
Marcar incidencia.
No inventar hora.
3501. TIME CLOCK MANAGER FIX
Sí.
3502. TIME CLOCK REPORT APPROVAL FUTURE
Puede existir.
3503. PAYROLL EXPORT FUTURE
No P0.
3504. EMPLOYEE BIOMETRIC DEVICE SCOPE
La biometría puede depender del dispositivo.
No asumir enrollment central.
3505. NEW DEVICE BIOMETRIC
Puede requerir nuevo enrollment/uso de biometría del sistema.
3506. EMPLOYEE PIN PORTABLE
PIN verificado por sistema puede funcionar en POS autorizados según branch/policy.
3507. PIN OFFLINE CACHE
Solo para empleados necesarios.
3508. PIN BRUTE FORCE LOCAL
Rate limit/lockout.
3509. PIN LOCKOUT SYNC
Cuando online puede sincronizar security event.
3510. PIN LOCKOUT DOES NOT DELETE USER
Sí.
3511. PIN RESET INVALIDATES CACHE
Propagar.
3512. PIN CHANGE VERSION
Puede versionarse credential.
3513. OLD PIN OFFLINE
Un POS que no recibió cambio puede temporalmente aceptar old verifier según offline policy.
Documentar limitación.
3514. HIGH-RISK OFFLINE SECURITY
Acciones como refund grande pueden requerir supervisor local cacheado o conexión según política.
3515. OFFLINE OWNER ACTIONS
Minimizar.
3516. OFFLINE REFUND
Puede permitirse si venta original está localmente disponible y método lo soporta.
3517. OFFLINE REFUND CLOUD SALE NOT CACHED
No permitir sin obtener datos necesarios.
3518. OFFLINE CASH REFUND
Puede funcionar con snapshot local.
3519. OFFLINE INTEGRATED CARD REFUND
Depende provider; probablemente requiere conexión.
3520. OFFLINE FISCAL REFUND
Depende provider/regulación.
3521. OFFLINE VOID
Solo si estado local permite y no requiere provider externo.
3522. OFFLINE REPRINT
Si receipt snapshot local.
3523. OFFLINE CUSTOMER CREATION
Sí, según política.
3524. OFFLINE PRODUCT AVAILABILITY CHANGE
Local + outbox, con limitación multi-POS.
3525. OFFLINE CASH MOVEMENT
Sí.
3526. OFFLINE SHIFT CLOSE
Puede permitirse localmente.
Sincronizar después.
3527. OFFLINE SHIFT OPEN
Sí, si dispositivo provisionado/authorized.
3528. OFFLINE TIME CLOCK
Sí.
3529. OFFLINE KDS
LAN.
3530. OFFLINE CDS
LAN.
3531. OFFLINE PRINT
Local.
3532. OFFLINE REPORTS
Solo resumen local disponible.
3533. OFFLINE FISCAL
No asumir.
3534. OFFLINE INTEGRATED PAYMENTS
No asumir.
3535. OFFLINE LIMITATIONS UI
Documentar en:
Capacidades sin Internet
para administradores.
3536. OFFLINE CAPABILITY MATRIX
Crear:
Función	Offline	Condición
Cash Sale	Sí	POS provisionado
KDS	Sí	LAN disponible
CDS	Sí	LAN disponible
Receipt Print	Sí	Printer local
Integrated Card	Depende	Provider
Fiscal	Depende	Provider/regulación


Adaptar a implementación real.
3537. OFFLINE CLAIM
No escribir simplemente:
100% Offline
si algunas funciones requieren cloud.
3538. OFFLINE-FIRST CLAIM
Más preciso.
3539. NETWORK STATUS DETECTION
No asumir que Wi-Fi conectado = Internet disponible.
3540. INTERNET CHECK
Utilizar API health/validated connectivity.
3541. LAN CHECK
Separado.
3542. KDS CHECK
Separado.
3543. CDS CHECK
Separado.
3544. PRINTER CHECK
Separado.
3545. POS STATUS SUMMARY
Ejemplo:
Internet        Offline
Cloud Sync      14 pendientes
KDS Cocina      Conectado
CDS Caja        Conectado
Recibos         Conectado
3546. OFFLINE SALE COUNTER
Puede mostrar número de operaciones pendientes en diagnóstico.
3547. OFFLINE SALE AMOUNT
Admin only.
3548. RECONNECT AUTO SYNC
Sí.
3549. RECONNECT PRIORITY
Ventas/pagos primero.
3550. RECONNECT UI
No bloquear cajero con modal.
3551. RECONNECT CONFLICT
Alertar manager si requiere intervención.
3552. RECONNECT SUCCESS
Actualizar status discretamente.
3553. RECONNECT KDS
Replay.
3554. RECONNECT CDS
Snapshot.
3555. RECONNECT PRINTER
No reimprimir automáticamente todos los FAILED jobs si existe riesgo de duplicados físicos.
Definir política.
3556. PRINT RETRY POLICY
Para receipt:
puede requerir acción manual después de error ambiguo.
Para kitchen:
fallback/retry debe evitar doble preparación.
3557. PRINT UNKNOWN STATE
Si socket se cortó después de enviar bytes:
el sistema puede no saber si imprimió.
Estado:
UNKNOWN
cuando adapter no pueda determinarlo.
3558. PRINT UNKNOWN RECEIPT
Mostrar:
No se pudo confirmar si el recibo se imprimió. Verifique la impresora antes de reintentar.
3559. PRINT UNKNOWN KITCHEN
Más crítico.
Mostrar:
No se pudo confirmar la impresión de cocina. Verifique antes de reintentar para evitar una comanda duplicada.
3560. KDS ACK BETTER THAN PRINTER
KDS puede proporcionar confirmación lógica más robusta que una impresora simple.
3561. DUAL KDS + PRINTER
Si ambos están configurados como destinos intencionales:
cada uno recibe su propio delivery.
No considerar duplicación porque son destinos distintos.
3562. BACKUP PRINTER
Solo recibe cuando primary failure policy lo activa.
3563. KITCHEN DELIVERY LEDGER
Puede registrar por destination:
- eventId;
- destinationId;
- status;
- attempts.
3564. RECEIPT PRINT LEDGER
PrintJobs.
3565. REPRINT CREATES NEW PRINT JOB
Vinculado al mismo Receipt.
3566. REPRINT COUNT
Puede mostrarse.
3567. KITCHEN REPRINT
Debe marcar:
REIMPRESIÓN
y requerir permiso/confirmación.
3568. KITCHEN REPRINT AUDIT
Sí.
3569. KITCHEN REPRINT DOES NOT CREATE NEW ORDER
Sí.
3570. KDS RESTORE VS REPRINT
Diferentes.
3571. RECEIPT COPY
Reprint.
3572. FISCAL COPY
Debe indicar copia según reglas.
No emitir nuevo documento fiscal.
3573. RECEIPT NUMBER ON REPRINT
Mismo.
3574. FISCAL NUMBER ON REPRINT
Mismo.
3575. PRINT JOB CONTENT SNAPSHOT
Guardar/render determinísticamente.
3576. TEMPLATE CHANGE AFTER FAILED JOB
Un PrintJob pendiente debe definir si usa template snapshot original.
Recomendación:
sí para recibos históricos.
3577. KITCHEN JOB CONTENT SNAPSHOT
Sí.
3578. TEST PRINT TEMPLATE
Separado.
3579. PRINT QUEUE PRIORITY
Kitchen puede tener prioridad sobre report/administrative prints.
Receipt también alto.
3580. PRINT QUEUE PER PRINTER
Evitar interleaving de bytes de varios jobs.
3581. PRINTER SERIALIZATION
Un job a la vez por conexión cuando protocolo lo requiera.
3582. PRINTER CONNECTION POOL
No necesario para dispositivos simples.
3583. PRINTER TIMEOUT
Config técnica.
3584. PRINTER RETRY COUNT
Config técnica.
3585. PRINTER STATUS POLLING
No agresivo.
3586. BLUETOOTH PRINTER RECONNECT
Manejar lifecycle.
3587. USB PRINTER DETACH
Detectar.
3588. NETWORK PRINTER IP CHANGE
Config.
3589. PRINTER MAC ADDRESS
Puede ayudar discovery, no identidad empresarial principal.
3590. PRINTER DEVICE RECORD
Guardar:
- name;
- type;
- connection;
- capabilities;
- branch;
-

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 20 | attachment=b570dffe-3cd9-4409-a0b2-298784898c30 | rango=3590-3782 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
3590. PRINTER DEVICE RECORD
Guardar como mínimo:
- id;
- name;
- type;
- connectionType;
- IP/host cuando corresponda;
- port;
- capabilities;
- branchId;
- registerId opcional;
- stationId opcional;
- paperWidth;
- status;
- lastSuccessfulPrintAt;
- lastError;
- createdAt;
- updatedAt.
No almacenar contraseñas/credenciales de red sin protección.
3591. PRINTER TYPE
Distinguir:
- Receipt
- Kitchen
- General/Internal
No utilizar el nombre de la impresora para determinar su función.
3592. CONNECTION TYPE
Tipos posibles según adapters implementados:
- NETWORK
- BLUETOOTH
- USB
- VIRTUAL
No mostrar opciones sin adapter real.
3593. PRINTER PORT DEFAULT
Puede sugerir un valor común cuando el modelo/protocolo lo justifique.
El usuario puede modificarlo.
No asumir universalmente un único puerto.
3594. PRINTER PAPER WIDTH
Como mínimo:
- 58 mm
- 80 mm
3595. PRINTER COPIES
Configurable por destino.
Ejemplo:
Kitchen station puede requerir 2 copias.
3596. COPY LABEL
Si se imprimen múltiples copias intencionalmente:
puede indicar copia cuando corresponda.
3597. KITCHEN COPY COUNT
No debe provocar múltiples KitchenOrders.
Son copias físicas del mismo evento.
3598. PRINTER AUTO CUT
Solo si capability.
3599. PARTIAL CUT
Puede configurarse cuando soportado.
3600. CASH DRAWER PULSE
Config avanzada.
Solo cuando hardware lo requiera.
3601. PRINTER CHARACTER SET
Config/auto-detection según adapter.
3602. PRINTER CODE PAGE
Documentar modelos probados.
3603. PRINTER LOGO DITHERING
Optimizar imagen térmica cuando se utilice.
3604. PRINT QR SIZE
Configurable dentro de límites.
3605. PRINT BARCODE FUTURE
Puede utilizarse para receipt lookup.
No necesario.
3606. RECEIPT FOOTER
Configurable.
3607. RECEIPT HEADER
Configurable.
3608. RECEIPT BUSINESS DATA
Puede heredar Branch.
3609. RECEIPT SOCIAL LINKS FUTURE
Opcional.
3610. RECEIPT REVIEW QR
Puede configurarse.
No sustituir QR fiscal cuando sea requerido.
3611. MULTIPLE QR CODES
Evitar saturar recibo.
Configurable.
3612. RECEIPT PREVIEW WIDTH
Preview debe simular 58/80 mm.
3613. RECEIPT PREVIEW DATA
Utilizar datos ficticios claramente de preview.
3614. RECEIPT PREVIEW TAX
Mostrar reglas configuradas.
3615. RECEIPT PREVIEW FISCAL
Puede utilizar placeholders:
NCF DE PRUEBA
No números productivos reales.
3616. RECEIPT PREVIEW LANGUAGE
Cambiar dinámicamente.
3617. RECEIPT TEMPLATE VALIDATION
No permitir guardar template que omita campos obligatorios configurados/legalmente requeridos.
3618. RECEIPT COMMENTS SETTING
Exactamente incluir opción:
Mostrar comentarios de los productos en el recibo
ON/OFF.
3619. RECEIPT MODIFIERS SETTING
Puede ser configurable, default ON.
3620. RECEIPT SKU SETTING
Configurable.
3621. RECEIPT EMPLOYEE SETTING
Configurable.
3622. RECEIPT CUSTOMER SETTING
Configurable dentro de requisitos fiscales.
3623. RECEIPT TURN NUMBER SETTING
Default ON para WTF.
3624. RECEIPT DINING OPTION SETTING
Default ON.
3625. RECEIPT TABLE SETTING
Cuando aplica.
3626. RECEIPT PAYMENT METHOD SETTING
Default ON.
3627. RECEIPT CHANGE SETTING
Para cash.
3628. RECEIPT TAX BREAKDOWN SETTING
No permitir ocultar información obligatoria legalmente.
3629. RECEIPT SERVICE CHARGE SETTING
Igual.
3630. RECEIPT ORDER COMMENTS
Separar de product comments.
3631. RECEIPT INTERNAL NOTES
Default OFF.
3632. RECEIPT DELIVERY ADDRESS
Configurable para delivery.
3633. RECEIPT APPS DELIVERY REFERENCE
Puede imprimirse.
3634. RECEIPT CUSTOMER COPY VS INTERNAL COPY
Puede tener templates diferentes futuro.
No P0.
3635. RECEIPT PRINT AUTOMATIC
Configurable:
- Auto print after sale
- Ask
- Never
según negocio.
3636. AUTO PRINT FAILURE
No bloquea venta.
3637. RECEIPT PRINT BUTTON
Disponible en success screen cuando corresponda.
3638. RECEIPT EMAIL FUTURE
Separado.
3639. RECEIPT LANGUAGE PER SALE FUTURE
Puede permitir selección.
No necesario.
3640. RECEIPT DEFAULT LANGUAGE
Por Branch.
3641. KITCHEN PRINT TEMPLATE
Separado.
3642. KITCHEN HEADER
- station;
- turn;
- ticket;
- time.
3643. KITCHEN DINING OPTION
Prominente.
3644. KITCHEN TABLE
Prominente para Comer aquí.
3645. KITCHEN CUSTOMER ORDER NAME
Cuando útil.
3646. KITCHEN PRODUCT FONT
Grande.
3647. KITCHEN QUANTITY FONT
Muy visible.
3648. KITCHEN MODIFIER INDENT
Sí.
3649. KITCHEN COMMENT EMPHASIS
Sí.
3650. KITCHEN CHANGE HEADER
Ejemplo:
AGREGADO
CANCELADO
MODIFICADO
3651. KITCHEN REPRINT HEADER
REIMPRESIÓN
3652. KITCHEN TEST HEADER
PRUEBA — NO PREPARAR
3653. KITCHEN PRINT NO PRICE
Default.
3654. KITCHEN PRINT NO TAX
Default.
3655. KITCHEN PRINT NO PAYMENT
Default.
3656. KITCHEN PRINT NO CUSTOMER PII
Default.
3657. KITCHEN PRINTER GROUP
Un grupo lógico puede contener destinos.
3658. GROUP NAME
Ejemplo:
Cocina Principal
3659. GROUP CATEGORY ASSIGNMENT
Seleccionar múltiples categorías.
3660. GROUP PRODUCT OVERRIDE
Producto puede tener destino adicional/diferente.
3661. GROUP MULTIPLE DESTINATIONS
Ejemplo:
- KDS Cocina
- Printer Cocina Backup
3662. DESTINATION MODE
Configurar:
PRIMARY
ALWAYS
FALLBACK
cuando se implemente fallback.
3663. ALWAYS DESTINATION
Recibe siempre.
3664. PRIMARY DESTINATION
Destino principal.
3665. FALLBACK DESTINATION
Solo según failure policy.
3666. ROUTING DUPLICATE DETECTION
Dashboard debe advertir si una categoría se enviará accidentalmente a dos estaciones no deseadas.
3667. ROUTING PREVIEW
Ya definido.
Debe mostrar todos los destinos.
3668. ROUTING TEST ORDER
Permitir seleccionar artículo/categoría y enviar test.
3669. ROUTING VERSION
Guardar.
3670. ROUTING EFFECTIVE CONFIG
POS cache.
3671. KITCHEN ROUTING SERVER VALIDATION
Cloud puede validar eventos/histórico.
3672. LOCAL ROUTING
Debe funcionar sin Internet.
3673. ROUTING CONFIG CHANGE
No afecta eventos ya creados.
3674. KITCHEN EVENT SNAPSHOT
Guardar destino/routing result.
3675. KDS CARD ORDER IDENTIFIER
Mostrar:
Turno 084
y opcionalmente:
Ticket #000512
3676. KDS CARD TIME
Mostrar:
- hora;
- elapsed.
3677. KDS CARD DINING BADGE
- Comer aquí
- Para llevar
- Delivery
- Apps Delivery
3678. KDS CARD CHANNEL
Para Apps Delivery puede mostrar:
- Uber Eats;
- plataforma configurada;
si ayuda.
3679. KDS CARD TABLE
Sí.
3680. KDS CARD ORDER NAME
Sí cuando exista.
3681. KDS CARD EMPLOYEE
Opcional.
3682. KDS CARD ITEM COUNT
Opcional.
3683. KDS CARD PRIORITY
Sí.
3684. KDS CARD NEW CHANGE INDICATOR
Sí.
3685. KDS CARD CANCELLED LINE
Mostrar tachado/estado claro hasta acknowledgement cuando corresponda.
3686. KDS CARD PARTIAL CANCEL
No eliminar silenciosamente.
3687. KDS CARD LONG MODIFIERS
Wrap.
3688. KDS CARD LONG COMMENTS
Wrap/expand.
3689. KDS CARD SCROLL
Solo dentro de tarjeta cuando realmente sea necesario; evitar UX difícil.
3690. KDS PAGE LAYOUT
Calcular columnas según ancho.
3691. KDS LANDSCAPE TABLET
Prioridad.
3692. KDS PORTRAIT
Debe seguir siendo funcional si permitido.
3693. KDS MULTI-PAGE
Sí.
3694. KDS PAGE INDICATOR
Sí.
3695. KDS AUTO PAGE
No cambiar página automáticamente mientras cocinero está leyendo, salvo política específica.
3696. KDS NEW ORDER OTHER PAGE
Mostrar indicador:
2 nuevas
3697. KDS PAGE COMPACTION
Sí.
3698. KDS FILTER
Puede filtrar estación/status.
3699. KDS SEARCH ACTIVE
No necesario P0.
3700. KDS HISTORY FILTER
Por tiempo/status.
3701. KDS HISTORY RESTORE
Sí.
3702. KDS HISTORY DETAIL
Mostrar timeline básico.
3703. KDS RESTORE CONFIRMATION
Ejemplo:
¿Restaurar Turno 084 a la pantalla de cocina?
3704. KDS RESTORE DOES NOT RESEND TO OTHER STATIONS
Solo afecta la KitchenOrder correspondiente, salvo acción explícita.
3705. KDS RESTORE TIMER
Conserva tiempo original.
3706. KDS RESTORE BADGE
Puede mostrar:
RESTAURADA
3707. KDS RESTORE SOUND
Opcional.
3708. KDS DISPATCH ALL
No agregar acción masiva peligrosa por defecto.
3709. KDS CLEAR SCREEN
No debe eliminar comandas.
3710. KDS EMERGENCY RESET
Protegido y no debe borrar cloud history.
3711. KDS ACTIVE ORDER RECOVERY
Desde local + reconciliation.
3712. KDS HISTORY CLOUD FETCH
Cuando online.
3713. KDS LOCAL HISTORY LIMIT
Config técnica.
3714. KDS DATABASE CLEANUP
Nunca active orders.
3715. KDS DATABASE MIGRATION
Sí.
3716. KDS CONFIG MIGRATION
Sí.
3717. KDS PAIRING MIGRATION
Sí.
3718. KDS LOG ROTATION
Sí.
3719. KDS SUPPORT INFO
Version/device/station.
3720. KDS ABOUT
Sí.
3721. KDS SETTINGS
Como mínimo:
- Connection
- Station
- Display
- Sound
- Timer thresholds
- About
Según permisos.
3722. KDS SETTINGS PROTECTION
PIN/manager.
3723. KDS CONNECTION TEST
Sí.
3724. KDS DEMO ORDER
Test.
3725. KDS DISPLAY DENSITY
Opcional.
3726. KDS FONT SIZE
Puede tener presets.
No permitir ilegible.
3727. KDS SOUND VOLUME
No controlar globalmente más de lo permitido.
Puede seleccionar on/off/sound.
3728. KDS TIMER THRESHOLD VALIDATION
Debe cumplir:
warning < critical < overdue
Ejemplo default:
10 < 20 < 30.
3729. INVALID KDS THRESHOLDS
No guardar.
3730. KDS TIMER RESET
No resetear por configuración nueva para órdenes existentes salvo regla explícita.
3731. KDS CLOCK FORMAT
12/24 h según locale/config.
3732. KDS ELAPSED FORMAT
Ejemplo:
12 min
3733. KDS OVER 60 MIN
Mostrar:
1 h 05 min
o formato claro.
3734. KDS EXTREME AGE
No overflow.
3735. KDS BUSINESS DATE
No es necesario en tarjeta.
Historial/reportes sí.
3736. KDS ORDER GROUPING
No combinar dos órdenes diferentes aunque tengan mismo turno visible por conflicto offline.
Utilizar IDs internos.
3737. KDS VISUAL DUPLICATE GUARD
Si dos órdenes tienen mismo turn number:
mostrar contexto adicional.
3738. KDS SOURCE REGISTER BADGE
Puede aparecer en ese caso.
3739. KDS MULTI-BRANCH
No mezclar.
3740. KDS BRANCH CHANGE
Requiere reprovision/config.
3741. KDS STATION CHANGE WITH ACTIVE ORDERS
Advertir.
No perder órdenes.
3742. KDS STATION CHANGE POLICY
Resolver active orders antes o conservarlas hasta dispatch.
3743. KDS UNPAIR WITH ACTIVE ORDERS
Bloquear/advertir.
3744. KDS REVOKE
No borrar active orders inmediatamente.
Mostrar dispositivo no autorizado después de preservar estado.
3745. CDS SETTINGS
Como mínimo:
- Connection
- Display
- Language
- Branding/Idle
- About
3746. CDS SETTINGS PROTECTION
PIN/manager.
3747. CDS CONNECTION TEST
Sí.
3748. CDS TEST SALE
Sí.
3749. CDS DISPLAY MODE
Adaptar portrait/landscape.
3750. CDS FONT SIZE
Automático/presets.
3751. CDS BRAND LOGO
Branch/Organization.
3752. CDS IDLE MESSAGE
Configurable.
Ejemplo:
Bienvenido a WTF – What's That Food!
3753. CDS TRANSACTION MESSAGE
Durante venta:
Su orden
3754. CDS TOTAL LABEL
Total
3755. CDS TAX LABEL
Nombre configurado.
3756. CDS SUBTOTAL LABEL
Sí.
3757. CDS DISCOUNT LABEL
Sí.
3758. CDS CHARGE LABEL
Sí.
3759. CDS THANK-YOU EXACT REQUIREMENT
Al completar venta mostrar:
¡Gracias por su compra, WTFLover!
Mantener traducción equivalente en otros idiomas.
3760. CDS THANK-YOU DURATION
Configurable razonablemente.
3761. CDS NEW SALE
POS inicia nueva DisplaySession.
CDS limpia anterior.
3762. CDS ORDER SAVED
Si cajero guarda ticket:
CDS debe volver a idle o mostrar estado neutral.
No dejar carrito anterior visible indefinidamente.
3763. CDS REOPEN SAVED ORDER
Al reabrir:
nueva/recuperada DisplaySession muestra snapshot actual.
3764. CDS MULTIPLE SAVED ORDERS
Solo muestra la orden activa del POS asociado.
3765. CDS PAYMENT METHODS
No mostrar botones/opciones de selección.
Requisito explícito.
3766. CDS CASH RECEIVED
Puede mostrarlo después de que cajero lo introduzca, configurable.
3767. CDS CHANGE
Opcional.
3768. CDS CARD STATUS
No mostrar detalles de terminal.
3769. CDS PRIVACY AFTER TIMEOUT
Idle.
3770. CDS SCREEN LOCK
En modo dedicado no debería bloquearse durante servicio si configuración Android lo permite.
3771. CDS APP BACK BUTTON
Protegido/kiosk behavior.
3772. CDS EXIT
PIN administrativo.
3773. CDS REBOOT AUTO-START FUTURE
Puede configurarse mediante mecanismos permitidos/device management.
No hack.
3774. KDS AUTO-START FUTURE
Igual.
3775. POS AUTO-START
No necesario.
3776. BOOT RECEIVER
Solo si justificado y permitido.
3777. ANDROID BACKGROUND RESTRICTIONS
Respetar.
3778. CUSTOMER DISPLAY SECURITY TOKEN
Scope read-only session.
3779. CUSTOMER DISPLAY SESSION TOKEN
Puede ser efímero.
3780. CDS CANNOT REQUEST ARBITRARY ORDER
Solo session asociada.
3781. KDS CANNOT REQUEST SALES REPORT
Scope.
3782. POS DEVICE CLOUD SCOPE

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 21 | attachment=01fa0af7-794a-45e0-b430-5375ece05633 | rango=3782-3970 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
3782. POS DEVICE CLOUD SCOPE
La credencial del dispositivo WTF POS debe tener únicamente los permisos técnicos necesarios para operar como terminal autorizada.
La identidad del dispositivo no sustituye la identidad del empleado.
Conceptualmente:
Authorized POS Device
        +
Authenticated Employee
        +
Employee Permissions
        +
Branch/Register Context
        =
Authorized POS Operation
No conceder permisos administrativos globales únicamente porque el dispositivo sea un POS autorizado.
3783. POS DEVICE CANNOT SELF-AUTHORIZE
Un POS nuevo no puede agregarse a sí mismo como autorizado.
Debe existir aprobación administrativa/provisioning seguro.
3784. KDS DEVICE CANNOT SELF-CHANGE BRANCH
Requiere autorización.
3785. CDS DEVICE CANNOT SELF-CHANGE REGISTER
Requiere autorización.
3786. DEVICE CREDENTIAL LEAST PRIVILEGE
Cada tipo de aplicación recibe scopes diferentes.
3787. DEVICE CREDENTIAL ROTATION
Debe poder realizarse sin perder información local.
3788. DEVICE CREDENTIAL EXPIRATION
Definir política.
3789. DEVICE CREDENTIAL REFRESH
Cuando online.
3790. DEVICE CREDENTIAL OFFLINE
Utilizar autorización cacheada dentro de la ventana definida.
3791. DEVICE CREDENTIAL REVOKED
Bloquear nuevas operaciones cuando se conozca la revocación.
3792. DEVICE CREDENTIAL STORAGE
Keystore/almacenamiento seguro.
3793. DEVICE CREDENTIAL BACKUP
No copiar automáticamente credencial a otro dispositivo.
Nuevo hardware debe provisionarse.
3794. CLONED APK DATA
Si alguien copia la APK:
no obtiene automáticamente autorización.
3795. CLONED LOCAL DATABASE
La arquitectura debe reducir el riesgo de que copiar DB otorgue identidad completa.
Credenciales protegidas por dispositivo/Keystore cuando sea posible.
3796. DEVICE ID GENERATION
Generar identificador aleatorio robusto durante provisioning.
No utilizar:
- IMEI;
- MAC;
- Android hardware serial;
como único ID.
3797. DEVICE FRIENDLY NAME
Separado.
3798. DEVICE REGISTRATION TIME
Guardar.
3799. DEVICE AUTHORIZED BY
Guardar actor.
3800. DEVICE REVOKED BY
Guardar.
3801. DEVICE REVOKED AT
Guardar.
3802. DEVICE REVOKE REASON
Opcional/recomendado.
3803. DEVICE LAST EMPLOYEE
Puede mostrarse para soporte.
No es owner del dispositivo.
3804. DEVICE REGISTER HISTORY
Puede auditar cambios.
3805. DEVICE BRANCH HISTORY
Sí.
3806. DEVICE APP HISTORY
Versiones vistas.
3807. DEVICE CONFIG HISTORY
Versiones aplicadas.
3808. DEVICE HEALTH HISTORY
No almacenar cada segundo.
Agregar eventos significativos.
3809. DEVICE ONLINE STATE
Derivado de heartbeat.
No persistir como verdad histórica crítica.
3810. DEVICE OFFLINE THRESHOLD
Config técnica.
3811. DEVICE DEGRADED
Puede significar:
- cloud unavailable;
- KDS issue;
- sync backlog.
Definir claramente.
3812. DEVICE STATUS SUMMARY
No mezclar autorización con conectividad.
3813. AUTHORIZATION STATUS
- PENDING
- AUTHORIZED
- BLOCKED
- REVOKED
- ARCHIVED
3814. CONNECTIVITY STATUS
- ONLINE
- DEGRADED
- OFFLINE
- UNKNOWN
3815. SOFTWARE STATUS
- CURRENT
- UPDATE_AVAILABLE
- UPDATE_REQUIRED
- UNSUPPORTED
3816. CONFIG STATUS
- CURRENT
- PENDING
- FAILED
- UNKNOWN
3817. DEVICE DASHBOARD CARD
Puede mostrar los cuatro estados sin confundirlos.
3818. DEVICE BULK ACTION
Puede permitir:
- solicitar sync;
- solicitar config refresh;
sobre varios dispositivos.
No bulk revoke accidental.
3819. BULK REVOKE
Si se implementa:
confirmación fuerte.
3820. DEVICE SEARCH
Por:
- name;
- branch;
- register;
- type;
- status;
- version.
3821. DEVICE FILTER
Sí.
3822. DEVICE SORT
Last seen/status/name.
3823. DEVICE DETAIL
Mostrar:
- identity;
- assignment;
- connectivity;
- software;
- config;
- diagnostics;
- audit.
3824. DEVICE SECRET
Nunca mostrar.
3825. DEVICE TOKEN LAST CHARACTERS
No necesario.
3826. DEVICE REPROVISION BUTTON
Acción protegida.
3827. DEVICE REPROVISION DOES NOT DELETE CLOUD HISTORY
Sí.
3828. DEVICE LOCAL RESET INSTRUCTION
Solo después de verificar pendientes.
3829. POS FACTORY RESET CHECKLIST
Antes:
- sync queue = 0;
- no open payment unknown;
- no unsent kitchen events;
- no open shift, o procedimiento;
- backup/support export cuando corresponda.
3830. KDS RESET CHECKLIST
- no active orders sin respaldo;
- cloud/POS reachable;
- pairing info conocida.
3831. CDS RESET CHECKLIST
Menor riesgo.
3832. DEVICE DECOMMISSION CHECKLIST
Sí.
3833. REGISTER DECOMMISSION CHECKLIST
- no open shift;
- no open tickets asignados;
- history preserved.
3834. KITCHEN STATION DECOMMISSION
- no routing activo sin replacement;
- no active orders.
3835. PRINTER DECOMMISSION
- reassign destinations;
- test replacement.
3836. PAYMENT METHOD DECOMMISSION
- no new payments;
- historical remains.
3837. TAX DECOMMISSION
Effective end date/archive.
3838. FISCAL RANGE DECOMMISSION
Según reglas.
3839. PRODUCT DECOMMISSION
Archive.
3840. CUSTOMER DECOMMISSION
Archive/anonymization policy.
3841. EMPLOYEE DECOMMISSION
Deactivate/archive.
3842. BRANCH DECOMMISSION
Archive after checklist.
3843. ORGANIZATION DECOMMISSION
Special process.
3844. DATA RETENTION AFTER DECOMMISSION
Seguir política/legal.
3845. RECEIPT ACCESS AFTER PRODUCT ARCHIVE
Sí.
3846. RECEIPT ACCESS AFTER EMPLOYEE ARCHIVE
Sí.
3847. REPORT ACCESS AFTER BRANCH ARCHIVE
Sí.
3848. AUDIT ACCESS AFTER DEVICE ARCHIVE
Sí.
3849. FISCAL ACCESS AFTER RANGE ARCHIVE
Sí.
3850. DATABASE FOREIGN KEY POLICY
Archivar evita romper relaciones.
3851. HARD DELETE TEST DATA
Permitido en test/dev mediante herramientas controladas.
3852. PRODUCTION TEST DATA CLEANUP
Solo entidades marcadas test/training.
No utilizar DELETE masivo sin filtros seguros.
3853. TEST DATA FLAG
Guardar claramente.
3854. TRAINING DATA FLAG
Sí.
3855. REPORT DEFAULT EXCLUDES TEST
Sí.
3856. REPORT DEFAULT EXCLUDES TRAINING
Sí.
3857. AUDIT TEST DATA
Puede incluir environment marker.
3858. TEST RECEIPT NUMBER
Separado cuando sea posible.
3859. TEST FISCAL NUMBER
Sandbox.
3860. TEST INVENTORY
Separado.
3861. TEST SHIFT
Separado.
3862. TEST DEVICE
Environment-specific.
3863. TEST CUSTOMER
Ficticio.
3864. TEST EMPLOYEE
Ficticio.
3865. TEST PAYMENT
Fake/sandbox.
3866. TEST KDS
Puede utilizar tablet staging.
3867. TEST CDS
Igual.
3868. ENVIRONMENT DATA ISOLATION
No compartir DB entre staging y production.
3869. ENVIRONMENT DEVICE ISOLATION
Un KDS production no debe emparejarse accidentalmente con POS staging.
3870. ENVIRONMENT MARKER IN PAIRING
Handshake incluye environment.
Mismatch:
rechazar.
3871. ENVIRONMENT MARKER IN CONFIG
Sí.
3872. ENVIRONMENT MARKER IN EVENTS
Cuando sea útil.
3873. STAGING VISUAL THEME
Puede incluir badge:
STAGING
3874. PRODUCTION NO TEST BANNER
Sí.
3875. DEVELOPMENT MENU
Solo debug/staging.
3876. PRODUCTION DEVELOPMENT MENU
No.
3877. FAKE PROVIDER MENU
No production.
3878. DATABASE INSPECTOR
No production UI.
3879. MOCK KDS BUTTON
No production.
3880. MOCK CDS BUTTON
No production.
3881. TEST SALE PRODUCTION
Si Training Mode está implementado y seguro, puede utilizarse.
De lo contrario, no crear test sales casuales en production.
3882. HARDWARE TEST PRODUCTION
Test prints/KDS messages deben estar claramente marcados y no afectar ventas.
3883. DIAGNOSTIC TEST KDS
No crea Order/Sale.
3884. DIAGNOSTIC TEST CDS
No crea Sale.
3885. DIAGNOSTIC TEST PRINTER
No crea Receipt transaction.
3886. DIAGNOSTIC TEST CASH DRAWER
No crea CashMovement.
3887. DIAGNOSTIC TEST CLOUD
Health only.
3888. DIAGNOSTIC TEST PAYMENT PROVIDER
Solo provider-supported sandbox/health.
No cobrar una tarjeta real.
3889. DIAGNOSTIC TEST FISCAL
No emitir documento real salvo procedimiento controlado.
3890. DIAGNOSTIC TEST STORAGE
No destruir.
3891. DIAGNOSTIC TEST DATABASE
Read/write safe health record si necesario.
No alterar ventas.
3892. DIAGNOSTIC RESULT TIMESTAMP
Mostrar.
3893. DIAGNOSTIC RESULT ERROR CODE
Sí.
3894. DIAGNOSTIC EXPORT
Sanitizado.
3895. DIAGNOSTIC USER ACTION
Puede sugerir:
- revisar cable;
- verificar Wi-Fi;
- comprobar papel;
- contactar administrador.
3896. NO GENERIC “SOMETHING WENT WRONG”
Cuando pueda darse información accionable.
3897. NO TECHNICAL OVERLOAD CASHIER
No mostrar stack/protocol details.
3898. MANAGER DETAIL
Más información.
3899. SUPPORT DETAIL
Completa/sanitizada.
3900. ROLE-BASED ERROR DETAIL
Sí.
3901. USER-FACING LANGUAGE
Claro, corto y consistente.
3902. BUTTON LANGUAGE
Verbos:
- Guardar
- Cobrar
- Despachar
- Restaurar
- Reintentar
3903. NO AMBIGUOUS “OK”
En acciones críticas.
3904. CONFIRM PAYMENT BUTTON
Puede mostrar:
Cobrar RD$1,250.00
3905. CONFIRM REFUND BUTTON
Devolver RD$500.00
3906. CONFIRM VOID BUTTON
Anular venta
3907. CONFIRM SHIFT CLOSE
Cerrar turno
3908. CONFIRM ARCHIVE
Archivar
3909. CONFIRM DEVICE REVOKE
Revocar dispositivo
3910. DANGEROUS CONFIRMATION
Puede requerir escribir nombre/código para acciones de alto impacto, no para operación diaria.
3911. OWNER TRANSFER CONFIRMATION
Fuerte.
3912. ORGANIZATION ARCHIVE CONFIRMATION
Fuerte.
3913. FISCAL RESET/SEQUENCE ACTION
Fuerte.
3914. NORMAL PRODUCT ARCHIVE
Confirmación simple.
3915. CASHIER FLOW SPEED
No agregar confirmación extra a cada producto.
3916. KDS FLOW SPEED
Despachar debe ser rápido.
Historial permite recuperar.
3917. CDS NO INTERACTION
V1 read-only.
3918. DASHBOARD FORMS
Más validación/confirmación apropiada.
3919. MOBILE POS NAVIGATION
Drawer oculto.
3920. DRAWER GESTURE
Puede abrirse con icono/hamburger.
No interferir con swipe de otras pantallas.
3921. DRAWER ITEMS
Como mínimo requerimiento original:
- Ventas
- Recibos
- Turnos
- Artículos
- Configuración
3922. DRAWER OPTIONAL ITEMS
Según features/permissions:
- Clientes
- Time Clock
- Diagnóstico
No convertirlo en Dashboard completo.
3923. DRAWER CURRENT ITEM
Destacado.
3924. DRAWER EMPLOYEE
Puede mostrar nombre/rol.
3925. DRAWER BRANCH
Sí.
3926. DRAWER LOGOUT/LOCK
Al final.
3927. POS SALES ROUTE
Default después de login/open shift.
3928. POS RECEIPTS ROUTE
Lista.
3929. POS SHIFTS ROUTE
Current shift + actions.
3930. POS ARTICLES ROUTE
Si empleado tiene permiso administrativo local.
Puede ser read-only/limited.
3931. POS SETTINGS ROUTE
Hardware/general.
3932. ARTICLE SUBMENU
Exactamente:
- Artículos
- Categorías
- Modificadores
- Descuentos
Si la administración principal reside en Dashboard, POS puede enlazar/mostrar según permisos.
3933. CONFIGURATION SUBMENU POS
Como mínimo:
- General
- Impresoras
- Pantallas de Cocina
- Pantallas de Clientes
- Conexiones/Dispositivos
- Diagnóstico
- Acerca de
Adaptar para no duplicar Dashboard.
3934. GENERAL SETTINGS POS
Debe contener requerimientos originales:
- cámara barcode ON/OFF;
- dark mode;
- grid/list;
- language integration.
3935. CAMERA SETTING OFF
No solicitar permiso de cámara.
Ocultar botón camera scanner.
3936. CAMERA SETTING ON
Solicitar permiso cuando se use, no necesariamente al iniciar.
3937. DARK MODE SETTING
Tres opciones exactas.
3938. GRID/LIST SETTING
Modal central con previews.
3939. LANGUAGE SETTING
Puede mostrar:
Cambiar idioma en ajustes de la aplicación
y abrir mecanismo oficial cuando Android lo permita.
3940. LANGUAGE UNSUPPORTED OS
Proporcionar fallback dentro de la app si técnicamente necesario.
3941. POS PRINTER SETTINGS
Agregar/editar/test.
3942. POS KDS SETTINGS
Agregar/pair/test.
3943. POS CDS SETTINGS
Agregar/pair/test.
3944. POS TAX SETTINGS
El requerimiento original menciona impuestos dentro de Configuración APK.
Puede ofrecer vista/configuración según permisos, pero la fuente central debe permanecer sincronizada con Dashboard.
Evitar configuraciones fiscales divergentes por dispositivo.
3945. POS LOCAL TAX EDIT
Preferir no permitir cambios fiscales offline/locales independientes.
Si se permite editar desde POS:
debe publicar a configuración central y seguir permisos/versionado.
3946. POS TAX VIEW
Puede mostrar reglas efectivas.
3947. POS PAYMENT METHODS VIEW
Puede mostrar activos.
Administración central preferiblemente Dashboard.
3948. POS KITCHEN ROUTING VIEW
Puede mostrar destinos.
3949. POS FEATURE STATUS
Puede mostrar features activas.
3950. POS BRANCH CONFIG
Read-only para cashier.
3951. POS DEVICE CONFIG
Manager/admin.
3952. POS REGISTER CONFIG
Manager/admin.
3953. POS FIRST-RUN REGISTER ASSIGNMENT
Después de autorización:
seleccionar/asignar register.
3954. POS FIRST-RUN PRINTER
Puede configurarse inmediatamente.
3955. POS FIRST-RUN KDS/CDS
Opcional.
No bloquear ventas si features desactivadas.
3956. POS FIRST-RUN VALIDATION
Verificar config mínima.
3957. POS READY SCREEN
Mostrar:
WTF POS está listo para operar.
3958. POS NOT READY SCREEN
Lista de blockers.
3959. POS BLOCKER EXAMPLE
- dispositivo no autorizado;
- branch faltante;
- register faltante;
- config crítica inválida.
3960. POS WARNING EXAMPLE
- CDS no conectado;
- printer no probado.
3961. POS READY OFFLINE
Solo si ya provisionado y dentro de policy.
3962. POS INITIAL SYNC
Debe completar configuración crítica antes de declarar ready.
3963. POS CATALOG INITIAL SYNC
Sí.
3964. POS EMPLOYEE INITIAL SYNC
Sí.
3965. POS PERMISSION INITIAL SYNC
Sí.
3966. POS TAX INITIAL SYNC
Sí.
3967. POS PAYMENT INITIAL SYNC
Sí.
3968. POS RECEIPT INITIAL SYNC
Sí.
3969. POS ROUTING INITIAL SYNC
Si kitchen active.
3970. POS INITIAL SYNC PROGRESS

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 22 | attachment=2ec21c54-fd18-4e7d-b75d-4d8d6fac62c8 | rango=3970-4164 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
3970. POS INITIAL SYNC PROGRESS
Durante la configuración inicial mostrar progreso comprensible.
Ejemplo:
Configurando WTF POS

✓ Sucursal
✓ Caja
✓ Empleados
✓ Catálogo
✓ Precios
✓ Impuestos
✓ Métodos de pago
✓ Recibos
✓ Configuración de cocina
○ Finalizando
No mostrar únicamente un spinner indefinido.
3971. INITIAL SYNC RETRY
Si una sección falla:
permitir reintentar.
No volver a descargar innecesariamente todo lo completado si puede continuarse de forma segura.
3972. INITIAL SYNC ATOMIC CRITICAL CONFIG
Aunque el progreso sea por secciones:
no declarar POS listo hasta tener un conjunto coherente de configuración crítica.
3973. INITIAL SYNC CANCEL
Si el usuario cancela antes de completar:
el dispositivo permanece no listo.
3974. INITIAL SYNC RESUME
Al volver:
continuar/revalidar.
3975. INITIAL SYNC ERROR DETAILS
Manager puede ver.
3976. INITIAL SYNC STORAGE CHECK
Antes:
verificar espacio suficiente.
3977. INITIAL SYNC APP VERSION CHECK
Verificar compatibilidad.
3978. INITIAL SYNC DEVICE AUTH CHECK
Sí.
3979. INITIAL SYNC BRANCH CHECK
Sí.
3980. INITIAL SYNC REGISTER CHECK
Sí.
3981. INITIAL SYNC CONFIG VERSION
Guardar.
3982. INITIAL SYNC COMPLETE TIMESTAMP
Guardar.
3983. POS STARTUP AFTER PROVISIONING
Secuencia recomendada:
1. abrir local DB;
2. migrations;
3. validar device identity;
4. cargar Last Known Good;
5. recuperar shift/drafts/outbox;
6. iniciar UI;
7. sincronizar en background.
No bloquear inicio esperando cloud cuando ya está provisionado y offline autorizado.
3984. STARTUP DATABASE FAILURE
Bloqueante.
3985. STARTUP CONFIG MISSING
Si nunca se provisionó:
setup.
Si debería existir pero está corrupta:
recovery/error.
3986. STARTUP SHIFT RECOVERY
Sí.
3987. STARTUP OPEN TICKET RECOVERY
Sí.
3988. STARTUP PAYMENT RECOVERY
Detectar PaymentAttempts no resueltos.
3989. STARTUP PRINT RECOVERY
Queue.
3990. STARTUP SYNC RECOVERY
Outbox.
3991. STARTUP KITCHEN DELIVERY RECOVERY
Pending events.
3992. STARTUP CDS SESSION
No restaurar una venta finalizada como activa.
3993. STARTUP EMPLOYEE SESSION
Puede requerir nuevo PIN después de restart por seguridad.
No cerrar Shift.
3994. STARTUP LOCK SCREEN
Recomendado.
3995. STARTUP BACKGROUND SYNC
Después de UI disponible.
3996. STARTUP CLOUD CONFIG CHECK
Asíncrono.
3997. STARTUP UPDATE CHECK
Asíncrono.
3998. STARTUP HARDWARE CHECK
No esperar indefinidamente.
Mostrar status.
3999. STARTUP KDS CHECK
Asíncrono.
4000. STARTUP CDS CHECK
Asíncrono.
4001. STARTUP PRINTER CHECK
Asíncrono.
4002. STARTUP PERFORMANCE
Medir cold start.
4003. STARTUP SPLASH
Breve.
No ocultar errores detrás de splash infinito.
4004. POS LOCK SCREEN
Mostrar:
- WTF POS;
- branch/register;
- empleados autorizados;
- PIN/biometric.
4005. POS LOCK SCREEN NETWORK
Puede mostrar indicador discreto.
4006. POS LOCK SCREEN SHIFT
Puede indicar:
Caja abierta
sin mostrar monto.
4007. POS LOCK SCREEN SECURITY
No mostrar ventas/totales.
4008. POS EMPLOYEE SELECT
Optimizado para pocos/muchos empleados.
4009. POS EMPLOYEE SEARCH
Si lista grande.
4010. POS EMPLOYEE FAVORITES
No necesario.
4011. POS PIN KEYPAD RANDOMIZATION
No necesario para operación normal.
Puede perjudicar velocidad.
4012. POS PIN ATTEMPTS
Rate limit.
4013. POS PIN FAILURE
Mensaje genérico.
4014. POS PIN LOCKOUT
Temporal.
4015. POS SUPERVISOR PIN
Mismo componente con contexto de autorización.
4016. POS BIOMETRIC BUTTON
Mostrar solo si disponible/configurado.
4017. POS BIOMETRIC CANCEL
Volver a PIN.
4018. POS LOGIN SUCCESS
Ir a:
- POS si shift abierto;
- apertura de turno si requerido;
- Time Clock prompt según política.
4019. TIME CLOCK PROMPT
No confundir con login.
Puede mostrar:
No ha marcado entrada. ¿Desea marcar ahora?
según feature.
4020. SHIFT OPEN PROMPT
Si Shifts ON y Register sin turno:
solicitar apertura.
4021. SHIFT OPEN FORM
Mostrar:
- Register;
- Employee;
- Opening cash.
4022. SHIFT OPEN CASH KEYPAD
Numérico.
4023. SHIFT OPEN ZERO
Permitido si negocio inicia sin fondo.
4024. SHIFT OPEN NEGATIVE
No.
4025. SHIFT OPEN CONFIRM
Abrir turno — RD$X
4026. SHIFT OPEN IDEMPOTENCY
Doble toque no abre dos.
4027. SHIFT OPEN RECEIPT
Opcional.
4028. SHIFT OPEN AUDIT
Sí.
4029. SHIFT OPEN OFFLINE
Sí.
4030. POS MAIN SCREEN HEADER
Como mínimo:
- menu;
- branch/register;
- employee;
- order context;
- connectivity.
4031. POS MAIN SCREEN DINING OPTION
Visible y fácil de cambiar.
4032. POS MAIN SCREEN CUSTOMER
Botón:
Seleccionar cliente
4033. POS MAIN SCREEN CATEGORY
Visible.
4034. POS MAIN SCREEN SEARCH
Visible.
4035. POS MAIN SCREEN SCANNER
Visible si feature/capability.
4036. POS MAIN SCREEN PRODUCTS
Grid/list.
4037. POS MAIN SCREEN CART
Visible/accessible.
4038. POS MAIN SCREEN TOTAL
Prominente.
4039. POS MAIN SCREEN SAVE
Cuando Open Tickets ON.
4040. POS MAIN SCREEN PAY
Prominente.
4041. POS EMPTY CART PAY
Disabled.
4042. POS INVALID CART PAY
Disabled/validation.
4043. POS CUSTOMER REQUIRED PAY
Si fiscal/flow lo requiere:
solicitar.
4044. POS DINING REQUIRED PAY
Sí.
4045. POS SHIFT REQUIRED PAY
Sí cuando feature.
4046. POS PRODUCT TAP FEEDBACK
Inmediato.
4047. POS ADD PRODUCT FAILURE
Mostrar razón.
4048. POS CART SCROLL
Sí.
4049. POS CART TOTAL STICKY
Sí en expanded.
4050. POS MOBILE CART
Puede abrir bottom sheet/pantalla.
4051. POS CART BADGE
Cantidad de líneas/items.
4052. POS CART LINE
Mostrar:
- quantity;
- name;
- modifiers;
- comment indicator;
- price;
- line total.
4053. POS CART LINE DISCOUNT
Mostrar.
4054. POS CART LINE TAX
No necesariamente mostrar individualmente en lista.
Disponible en detail.
4055. POS CART EDIT MODAL
Permitir editar.
4056. POS PRODUCT MODIFIER MODAL
Central/fullscreen según tamaño.
4057. POS MODIFIER REQUIRED INDICATOR
Sí.
4058. POS MODIFIER SELECTION COUNT
Ejemplo:
Seleccione 1
Seleccione hasta 3
4059. POS MODIFIER VALIDATION LIVE
Sí.
4060. POS MODIFIER PRICE DELTA
Mostrar:
+ RD$50
4061. POS MODIFIER TOTAL
Botón:
Agregar — RD$650.00
4062. POS MODIFIER CANCEL
No agrega producto.
4063. POS PRODUCT COMMENT
Dentro del modal/cart line.
4064. POS PRODUCT QUANTITY
Puede definirse antes/después.
4065. POS PRODUCT ADD MULTIPLE
Sí.
4066. POS PRODUCT SOLD OUT
Disabled.
4067. POS PRODUCT LOW STOCK
No necesariamente disabled.
4068. POS PRODUCT NEGATIVE STOCK BLOCK
Según feature.
4069. POS PRICE DISPLAY BY MODE
Sí.
4070. POS APPS DELIVERY MODE
Al seleccionarlo:
si existen canales configurados, solicitar/mostrar plataforma.
4071. POS APPS DELIVERY PRICE
Aplicar PriceBook alternativo.
4072. POS APPS DELIVERY TAX
Aplicar reglas configuradas.
4073. POS APPS DELIVERY REFERENCE
Campo opcional/requerido según channel.
4074. POS DELIVERY MODE
Puede requerir cliente/dirección según configuración.
4075. POS TAKEOUT MODE
Puede requerir nombre/turn number.
4076. POS DINE-IN MODE
Puede permitir mesa.
4077. POS MODE SWITCH
Recalcular.
4078. POS MODE SWITCH CONFIRMATION
Si cambia total:
mostrar actualización de manera clara.
No necesariamente modal salvo cambios sensibles.
4079. POS MODE SWITCH KITCHEN
Si todavía no se envió:
normal.
Si ya se envió:
event delta cuando relevante.
4080. POS SELECT CUSTOMER MODAL
Buscar.
4081. POS CUSTOMER SEARCH RESULTS
Nombre + teléfono parcial/RNC cuando útil.
4082. POS CUSTOMER CREATE
Permiso.
4083. POS CUSTOMER REMOVE
Sí antes de pago.
4084. POS CUSTOMER CHANGE
Sí antes de finalización.
4085. POS CUSTOMER FISCAL BADGE
Puede indicar:
Datos fiscales completos
4086. POS CUSTOMER INCOMPLETE
Advertir solo cuando se necesita.
4087. POS OPEN TICKET SAVE
Al pulsar Guardar:
si no tiene mesa/predefined ticket:
solicitar nombre cuando configuración lo requiera.
4088. POS OPEN TICKET SAVE VALIDATION
Debe tener al menos una línea.
4089. POS OPEN TICKET SAVE KITCHEN
Enviar nuevas líneas/deltas según routing.
4090. POS OPEN TICKET SAVE LOCAL
Persistir antes de considerar guardado.
4091. POS OPEN TICKET SAVE CLOUD
Sync async.
4092. POS OPEN TICKET SAVE SUCCESS
Volver a pantalla principal/lista según UX.
4093. POS OPEN TICKET SAVE CDS
Limpiar DisplaySession.
4094. POS OPEN TICKET REOPEN
Cargar desde local/cloud.
4095. POS OPEN TICKET REOPEN CDS
Mostrar snapshot.
4096. POS OPEN TICKET REOPEN KITCHEN
No reenviar líneas anteriores.
4097. POS OPEN TICKET EDIT
Revision.
4098. POS OPEN TICKET RESAVE
Enviar solo deltas.
4099. POS OPEN TICKET PAY
Mismo orderId.
4100. POS OPEN TICKET COMPLETION
Marcar cerrado.
4101. POS OPEN TICKET LIST
Accesible desde:
- botón;
- menu.
4102. POS OPEN TICKET COUNT
Puede mostrar badge.
4103. POS TABLE SCREEN
Cuando predefinidos activos.
4104. POS TABLE FREE
Abrir nuevo ticket.
4105. POS TABLE OCCUPIED
Abrir existente.
4106. POS TABLE LONG PRESS
No necesario.
4107. POS TABLE MOVE
Action dentro del ticket.
4108. POS TABLE RENAME
Dashboard/config, no durante venta normal.
4109. POS MANUAL TICKET NAME
Sí.
4110. POS ORDER TURN NUMBER
Asignar según estrategia.
4111. POS TURN NUMBER DISPLAY
Visible en open order después de asignarse.
4112. POS TURN NUMBER BEFORE SAVE
Puede asignarse al primer envío/guardado según estrategia.
No consumir números innecesariamente si se abandona draft.
4113. POS TURN NUMBER AT PAYMENT DIRECT SALE
Si venta nunca se guardó:
asignar antes de kitchen/payment según flujo.
4114. POS TURN NUMBER KDS
Mismo.
4115. POS TURN NUMBER RECEIPT
Mismo.
4116. POS TURN NUMBER CDS
Opcional/configurable.
4117. POS PAYMENT SCREEN ENTRY
Antes de abrir:
validar order revision.
4118. POS PAYMENT SCREEN LAYOUT
Mostrar:
Total a cobrar
RD$X
Debajo:
- subtotal;
- discounts;
- taxes;
- charges;
expandible/visible.
4119. POS PAYMENT METHODS
Botones/tarjetas grandes.
4120. POS PAYMENT METHOD ORDER
Configurado.
4121. POS CASH BUTTON
Sí.
4122. POS CASH SCREEN
Mostrar:
- total;
- recibido;
- cambio.
4123. POS CASH QUICK AMOUNTS
Puede mostrar denominaciones/montos:
- Exacto
- RD$500
- RD$1,000
- etc.
Generarlos contextualmente.
4124. POS CASH EXACT
Botón:
Exacto
4125. POS CASH RECEIVED LESS
No completar.
4126. POS CASH RECEIVED EQUAL
Cambio 0.
4127. POS CASH RECEIVED GREATER
Cambio positivo.
4128. POS CASH CONFIRM
Cobrar RD$X
4129. POS CASH COMPLETE
Atomic local transaction.
4130. POS CASH DRAWER
Abrir después de commit cuando configurado.
4131. POS CASH RECEIPT
Print job.
4132. POS CASH CDS
Thank-you/change.
4133. POS MANUAL CARD SCREEN
Mostrar:
Registre el pago realizado en la terminal externa.
4134. POS MANUAL CARD REFERENCE
Campo según configuración.
4135. POS MANUAL CARD CONFIRM
Confirmar pago registrado
No:
Procesar tarjeta
si no la procesa.
4136. POS TRANSFER SCREEN
Referencia.
4137. POS APPS PAYMENT
Puede ser método configurado.
4138. POS CUSTOM PAYMENT
Render según metadata.
4139. POS SPLIT PAYMENT BUTTON
Dividir pago
cuando feature implementada.
4140. POS SPLIT PAYMENT SCREEN
Mostrar:
- total;
- paid;
- remaining;
- payments list.
4141. POS SPLIT ADD PAYMENT
Seleccionar método + monto.
4142. POS SPLIT CASH
Puede dar cambio solo bajo regla clara.
4143. POS SPLIT REMOVE UNPROCESSED
Sí.
4144. POS SPLIT REMOVE PROCESSED
No.
Requiere void/refund.
4145. POS SPLIT COMPLETE
Cuando remaining = 0.
4146. POS SPLIT RECOVERY
Persistir.
4147. POS PAYMENT PROCESSING SCREEN
Bloquear double tap.
4148. POS PAYMENT SUCCESS SCREEN
Exactamente:
Cobrado
Mostrar:
Monto Total: RD$X
Botones:
Nueva Venta
Órdenes Guardadas
Puede incluir:
- Imprimir recibo;
- Ver recibo;
como acciones secundarias.
4149. POS PAYMENT SUCCESS NEW SALE
Limpia contexto y abre venta nueva.
4150. POS PAYMENT SUCCESS SAVED ORDERS
Abre lista.
4151. POS PAYMENT SUCCESS AUTO RESET
No regresar automáticamente tan rápido que el cajero no vea confirmación/cambio.
4152. POS PAYMENT SUCCESS CASH CHANGE
Mostrar prominentemente cuando exista.
4153. POS PAYMENT SUCCESS RECEIPT STATUS
Puede mostrar:
- Impreso
- Pendiente
- Error
sin cambiar estado de venta.
4154. POS PAYMENT SUCCESS FISCAL STATUS
Solo si útil y permitido.
4155. POS PAYMENT FAILURE SCREEN
No borrar orden.
4156. POS PAYMENT UNKNOWN SCREEN
No permitir nuevo cobro hasta resolver/acción segura.
4157. POS PAYMENT CANCELLED
Regresa con order intacta.
4158. POS NEW SALE WITH PRINT PENDING
Permitido.
Print queue continúa.
4159. POS NEW SALE WITH SYNC PENDING
Permitido.
4160. POS NEW SALE WITH CDS DISCONNECTED
Permitido.
4161. POS NEW SALE WITH KDS DELIVERY FAILURE
Puede requerir alerta/fallback antes de ocultar incidencia.
No necesariamente bloquear caja.
4162. POS RECEIPTS SCREEN
Mostrar:
- receipt number;
- turn;
- date/time;
- total;
- payment;
- status.
4163. POS RECEIPT SEARCH
Sí.
4164. POS RECEIP

<!-- PARTE 23 | attachment=9987c795-a0eb-4ab3-aa1c-985dbb8e3e4f | rango=4164-4328 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
4164. POS RECEIPT FILTERS
En WTF POS mantener filtros operacionales simples:
- Hoy
- Este turno
- Fecha
- Empleado cuando el permiso lo permita
- Método de pago
- Estado
Filtros administrativos avanzados permanecen en WTF Dashboard.
4165. POS RECEIPT DETAIL
Mostrar:
- receipt number;
- turn number;
- date/time;
- employee;
- customer;
- dining option;
- table/order name;
- items;
- modifiers;
- comments según permisos;
- subtotal;
- discounts;
- taxes;
- charges;
- total;
- payments;
- change;
- fiscal information;
- print status;
- refund status.
4166. POS RECEIPT REPRINT
Acción:
Reimprimir
Debe crear nuevo PrintJob.
No modificar Sale.
4167. POS RECEIPT REFUND
Acción disponible según permiso.
4168. POS RECEIPT VOID
Solo cuando el estado/reglas permitan.
4169. POS RECEIPT CUSTOMER
Puede abrir ficha básica cuando el empleado tenga permiso.
4170. POS RECEIPT OFFLINE
Recibos locales/cacheados disponibles.
4171. POS RECEIPT CLOUD FETCH
Para históricos no locales.
4172. POS RECEIPT CLOUD OFFLINE MESSAGE
Este recibo no está almacenado en este dispositivo. Conéctese a Internet para recuperarlo.
4173. POS REFUND SCREEN
Mostrar venta original.
Permitir seleccionar:
- devolución completa;
- artículos/cantidades.
4174. POS REFUND REMAINING QUANTITY
Mostrar cuánto todavía puede devolverse.
4175. POS REFUND OVER LIMIT
Bloquear.
4176. POS REFUND REASON
Solicitar.
4177. POS REFUND SUPERVISOR
Según permisos/monto.
4178. POS REFUND INVENTORY
Por línea puede indicar:
¿Regresa al inventario?
cuando aplique.
4179. POS REFUND PAYMENT METHOD
Utilizar método original/proceso apropiado.
4180. POS REFUND CASH
Afecta Shift.
4181. POS REFUND EXTERNAL
Provider/manual workflow.
4182. POS REFUND FISCAL
Provider/reglas.
4183. POS REFUND CONFIRMATION
Mostrar:
Total a devolver: RD$X
4184. POS REFUND IDEMPOTENCY
Obligatoria.
4185. POS REFUND SUCCESS
Mostrar:
Devolución completada
con monto.
4186. POS REFUND RECEIPT
Crear documento/PrintJob correspondiente.
4187. POS REFUND FAILURE
No alterar la venta como devuelta si el proceso crítico falló.
4188. POS REFUND UNKNOWN
Especialmente provider externo:
reconciliar.
4189. POS VOID SCREEN
Mostrar:
- receipt;
- total;
- reason;
- authorization.
4190. POS VOID RESTRICTIONS
No permitir después de estados donde corresponda utilizar refund.
4191. POS VOID INVENTORY
Revertir mediante movimientos compensatorios apropiados.
4192. POS VOID CASH
Revertir/ajustar ledger según flujo.
4193. POS VOID FISCAL
Seguir provider.
4194. POS VOID KITCHEN
Si todavía operacionalmente relevante:
cancel event.
4195. POS VOID AUDIT
Sí.
4196. POS SHIFTS SCREEN
Mostrar:
- Register;
- openedAt;
- openedBy;
- opening cash;
- cash movements;
- sales summary;
- expected cash cuando permitido;
- sync status.
4197. POS SHIFT CASH IN
Botón:
Entrada de efectivo
4198. POS SHIFT CASH OUT
Botón:
Salida de efectivo
4199. POS SHIFT SAFE DROP
Si feature.
4200. POS SHIFT CASH MOVEMENT FORM
Campos:
- amount;
- reason;
- note opcional.
4201. POS SHIFT CASH MOVEMENT CONFIRM
Mostrar tipo/monto claramente.
4202. POS SHIFT CASH MOVEMENT SUCCESS
Actualizar resumen.
4203. POS SHIFT CASH MOVEMENT IDEMPOTENCY
Sí.
4204. POS SHIFT CLOSE BUTTON
Prominente pero separado de movimientos normales.
4205. POS SHIFT CLOSE PRECHECK
Verificar:
- payment unknown;
- sync warnings;
- open tickets;
- cash movements;
- policy.
No necesariamente bloquear por sync pending si offline close está permitido.
4206. POS SHIFT CLOSE COUNT
Solicitar efectivo contado.
4207. POS SHIFT CLOSE BLIND
Según setting.
4208. POS SHIFT CLOSE SUMMARY
Mostrar:
- opening;
- cash sales;
- cash refunds;
- cash in;
- cash out;
- safe drops;
- expected;
- counted;
- difference.
4209. POS SHIFT CLOSE DIFFERENCE
Visual clara.
4210. POS SHIFT CLOSE REASON
Si diferencia según política.
4211. POS SHIFT CLOSE SUPERVISOR
Si excede threshold.
4212. POS SHIFT CLOSE CONFIRM
Cerrar turno
4213. POS SHIFT CLOSE ATOMICITY
Persistir cierre + snapshot de reconciliación.
4214. POS SHIFT CLOSE OFFLINE
Outbox.
4215. POS SHIFT CLOSE SUCCESS
Mostrar resumen.
4216. POS SHIFT CLOSE PRINT
Opcional.
4217. POS AFTER SHIFT CLOSE
Bloquear nuevos cobros hasta abrir otro turno cuando Shifts ON.
4218. POS TIME CLOCK SCREEN
Cuando feature activa:
- estado actual;
- last clock-in;
- button Clock In/Out;
- historial propio reciente opcional.
4219. POS TIME CLOCK CLOCK-IN
Autenticación/identity.
4220. POS TIME CLOCK CLOCK-OUT
Sí.
4221. POS TIME CLOCK IDEMPOTENCY
Sí.
4222. POS TIME CLOCK OFFLINE
Sí.
4223. POS ARTICLES SCREEN
Si se habilita administración local:
mostrar catálogo.
Pero las funciones completas pueden residir en Dashboard.
4224. POS ARTICLE CREATE
Solo manager/admin si se decide incluir.
No requisito obligatorio del flujo de caja si Dashboard cubre creación.
4225. ORIGINAL ARTICLE MENU REQUIREMENT
Aunque WTF Dashboard sea la administración principal, el menú lateral WTF POS debe conservar la estructura solicitada:
Artículos
- Artículos
- Categorías
- Modificadores
- Descuentos
Las pantallas pueden ser:
- completas;
- simplificadas;
- read-only/enlace administrativo;
según permisos y arquitectura final.
No eliminar esta estructura sin una razón documentada.
4226. POS CATEGORY MANAGEMENT
Si se permite:
- create;
- edit;
- reorder;
- archive.
Sync central.
4227. POS MODIFIER MANAGEMENT
Si se permite:
- groups;
- options;
- min/max;
- required;
- prices.
4228. POS DISCOUNT MANAGEMENT
Si se permite:
- create;
- edit;
- archive.
Permisos altos.
4229. POS TAX MANAGEMENT
El requerimiento original también solicita impuestos dentro de configuración.
Implementar al menos visualización/configuración autorizada sincronizada con el sistema central.
4230. POS PRINTER MANAGEMENT
Completo localmente.
4231. POS KDS MANAGEMENT
Pair/config/test.
4232. POS CDS MANAGEMENT
Pair/config/test.
4233. POS DEVICE MANAGEMENT
Mostrar este dispositivo y asociaciones.
Autorización global desde Dashboard.
4234. POS GENERAL SETTINGS
Ya definidos.
4235. POS SETTINGS PERSISTENCE
Local + sync según scope.
4236. POS SETTINGS RESET
Restablecer preferencias locales, no configuración empresarial crítica.
4237. POS ABOUT SCREEN
Versión.
4238. POS DIAGNOSTIC SCREEN
Sí.
4239. POS SUPPORT SCREEN
Puede incluir:
- support code;
- copy diagnostics;
- documentation.
4240. WTF DASHBOARD — SALES MODULE
Crear módulo completo de ventas.
Lista con:
- receipt;
- turn;
- date/time;
- branch;
- employee;
- customer;
- dining option;
- channel;
- total;
- payment;
- status.
4241. DASHBOARD SALES FILTERS
- date/businessDate;
- branch;
- employee;
- customer;
- dining option;
- channel;
- payment method;
- status;
- receipt/turn.
4242. DASHBOARD SALE DETAIL
Mostrar snapshot completo + timeline.
4243. DASHBOARD SALE ACTIONS
Según permiso:
- reprint/export;
- refund;
- void cuando válido;
- view fiscal;
- view audit.
4244. DASHBOARD SALE EDIT
No permitir editar totales de venta completada.
4245. DASHBOARD SALES EXPORT
Sí.
4246. DASHBOARD RECEIPTS MODULE
Puede reutilizar Sale/Receipt read model, pero conservar navegación solicitada de recibos.
4247. DASHBOARD REPORTS MODULE
Todos los reportes solicitados.
4248. DASHBOARD ARTICLES MODULE
Submódulos:
- Articles
- Categories
- Modifiers
- Discounts
4249. DASHBOARD ARTICLE LIST
Columnas:
- Name
- SKU
- Barcode
- Category
- Price
- Apps Delivery Price
- Stock
- Availability
- Status.
Responsive.
4250. DASHBOARD ARTICLE FORM
Incluir todos los campos definidos.
4251. DASHBOARD ARTICLE IMAGE
Upload/preview.
4252. DASHBOARD ARTICLE TAX
Seleccionar reglas.
4253. DASHBOARD ARTICLE MODIFIERS
Asignar groups.
4254. DASHBOARD ARTICLE KITCHEN
Asignar station/routing override.
4255. DASHBOARD ARTICLE INVENTORY
- track inventory;
- inventory item mapping;
- minimum stock.
4256. DASHBOARD ARTICLE PRICE
Regular.
4257. DASHBOARD ARTICLE APPS PRICE
Alternativo.
4258. DASHBOARD ARTICLE BRANCH OVERRIDE
Cuando aplica.
4259. DASHBOARD ARTICLE PREVIEW
Opcional.
4260. DASHBOARD ARTICLE ARCHIVE
Sí.
4261. DASHBOARD CATEGORY LIST
- name;
- order;
- products;
- kitchen routing;
- status.
4262. DASHBOARD CATEGORY REORDER
Drag/drop o controles accesibles.
4263. DASHBOARD CATEGORY ARCHIVE
Sí.
4264. DASHBOARD MODIFIER GROUP LIST
- name;
- required;
- min;
- max;
- products;
- status.
4265. DASHBOARD MODIFIER GROUP FORM
Completo.
4266. DASHBOARD MODIFIER OPTION FORM
- name;
- kitchen name;
- price;
- availability;
- order.
4267. DASHBOARD DISCOUNT LIST
- name;
- type;
- value;
- scope;
- authorization;
- status.
4268. DASHBOARD DISCOUNT FORM
Completo.
4269. DASHBOARD CUSTOMERS MODULE
Lista + agregar/importar.
4270. DASHBOARD CUSTOMER LIST
- name;
- business name;
- RNC;
- phone;
- email;
- last purchase;
- status.
Ocultar columnas sensibles según permiso.
4271. DASHBOARD CUSTOMER FORM
Campos originales exactos:
- Nombre
- Razón Social
- RNC
- Correo
- Teléfono
- Dirección
- Ciudad
- Estado/Provincia
Más type/status cuando sea necesario.
4272. DASHBOARD CUSTOMER IMPORT
Completo.
4273. DASHBOARD CUSTOMER DETAIL
Historial.
4274. DASHBOARD EMPLOYEES MODULE
Lista + roles.
4275. DASHBOARD EMPLOYEE LIST
- name;
- email;
- phone;
- role;
- branches;
- status.
4276. DASHBOARD EMPLOYEE FORM
Campos originales:
- Nombre
- Correo
- Número
- Rol
Luego:
- PIN 4–6 dígitos;
- biometría compatible como opción de autenticación del dispositivo;
- branch;
- status.
Botones:
Guardar
Cancelar
4277. DASHBOARD EMPLOYEE PIN
No mostrar PIN existente.
4278. DASHBOARD EMPLOYEE BIOMETRIC
No registrar biometría desde navegador como si almacenara rostro/huella.
Mostrar capability/policy e instrucciones de enrollment en dispositivo.
4279. DASHBOARD ROLE MANAGEMENT
Sí.
4280. DASHBOARD TIME CLOCK
Cuando feature activa.
4281. DASHBOARD SHIFTS
Lista/histórico.
4282. DASHBOARD INVENTORY
Cuando integrado.
4283. DASHBOARD CONFIGURATION ROOT
Secciones:
- Features
- General/Organization
- Branches
- Dining Options
- Payment Methods
- Loyalty
- Taxes/Charges
- Receipts
- Open Tickets
- Kitchen
- Customer Displays
- POS Devices
- Roles/Permissions
- Fiscal
- System/Integrations
Adaptar navegación sin perder requerimientos.
4284. DASHBOARD FEATURES EXACT LIST
Debe incluir los switches solicitados:
Shifts
Time Clock
Open Tickets
Kitchen Printers
Customer Displays
Dining Options
Low Stock Notifications
Negative Stock Alerts
Cada uno con descripción/“Más información”.
4285. DASHBOARD PAYMENT METHODS
Completo.
4286. DASHBOARD LOYALTY
Mostrar módulo/config aunque pueda estar:
No habilitado en v1
si no se implementa.
No presentar una funcionalidad falsa.
4287. DASHBOARD TAXES
Completo.
4288. DASHBOARD CHARGES
Si se separa 10% service charge.
4289. DASHBOARD RECEIPTS CONFIG
Completo.
4290. DASHBOARD OPEN TICKETS CONFIG
Switch predefinidos.
Administrar:
- tables;
- order names;
- areas futuro.
4291. DASHBOARD KITCHEN CONFIG
- stations/groups;
- categories;
- products overrides;
- printers;
- KDS;
- fallback.
4292. DASHBOARD CUSTOMER DISPLAY CONFIG
- CDS devices;
- associations;
- branding;
- thank-you;
- idle.
4293. DASHBOARD DINING OPTIONS CONFIG
Crear/editar:
- Comer aquí
- Para llevar
- Delivery
- Apps Delivery
- personalizados futuros.
4294. DASHBOARD DINING OPTION FORM
Campos:
- name;
- code;
- active;
- default;
- applicable PriceBook;
- tax rules;
- charge rules;
- customer requirements;
- kitchen behavior cuando corresponda.
4295. DASHBOARD APPS DELIVERY OPTION
Debe permitir:
- alternative PriceBook;
- channel selection;
- tax configuration.
4296. DASHBOARD DINE-IN OPTION
Debe permitir 18% + 10% inicial configurable, no hardcoded.
4297. DASHBOARD TAKEOUT OPTION
18% inicial configurable.
4298. DASHBOARD DELIVERY OPTION
18% inicial configurable.
4299. DASHBOARD INCLUDED TAX OPTION
Por regla/precio según engine.
4300. DASHBOARD TAX PREVIEW
Sí.
4301. DASHBOARD BRANCHES
Completo.
4302. DASHBOARD BRANCH FORM
- Name
- Code
- Address
- Phone
- Country
- Timezone
- Currency
- Business day cutoff
- Status.
4303. DASHBOARD BRANCH DETAIL
Tabs:
- General
- Sales
- Fiscal
- Kitchen
- Devices
- Inventory
- Reports.
4304. DASHBOARD POS DEVICES
Completo.
4305. DASHBOARD DEVICE AUTHORIZATION
Pending → Authorized.
4306. DASHBOARD DEVICE REVOKE
Sí.
4307. DASHBOARD DEVICE ASSIGN REGISTER
Sí.
4308. DASHBOARD DEVICE DIAGNOSTICS
Sí.
4309. DASHBOARD KDS DEVICES
Puede estar dentro de Devices/Kitchen.
4310. DASHBOARD CDS DEVICES
Sí.
4311. DASHBOARD PRINTERS
Puede estar dentro de Kitchen/Hardware.
4312. DASHBOARD AUDIT
Completo.
4313. DASHBOARD SYSTEM STATUS
Completo.
4314. DASHBOARD CONFIG HISTORY
Sí.
4315. DASHBOARD CONFIG PUBLISH
Sí.
4316. DASHBOARD CONFIG DIFF
Sí.
4317. DASHBOARD CONFIG ROLLBACK
Sí.
4318. DASHBOARD GO-LIVE VALIDATOR
Sí.
4319. DASHBOARD READINESS
Mostrar blockers/warnings.
4320. DASHBOARD IMPORT CENTER
Puede centralizar imports.
4321. DASHBOARD EXPORT CENTER
Puede centralizar jobs.
4322. DASHBOARD ALERT CENTER
Sí.
4323. DASHBOARD PAYMENT RECONCILIATION
Cuando aplica.
4324. DASHBOARD FISCAL RECONCILIATION
Cuando aplica.
4325. DASHBOARD SYNC MONITOR
Mostrar devices/operations.
4326. DASHBOARD DEAD LETTER
Admin/support.
4327. DASHBOARD NO RAW PAYLOAD EDIT
Sí.
4328. DASHBOARD INVENTORY ALERTS
Sí

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 24 | attachment=0098e172-8b55-43c6-88de-43c81a4ed5dd | rango=4329-4524 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
4329. DASHBOARD INVENTORY OVERVIEW
Cuando el inventario esté habilitado/integrado, mostrar por sucursal:
- artículos inventariables;
- stock actual;
- stock reservado;
- stock disponible;
- stock mínimo;
- artículos bajos;
- artículos agotados;
- artículos negativos;
- movimientos recientes.
No convertir este panel en un sistema completo de compras si esa función pertenece al gestor de inventario existente.
4330. DASHBOARD INVENTORY SOURCE OF TRUTH
Debe quedar explícitamente documentado si:
1. WTF POS mantiene el ledger principal; o
2. el gestor de inventario WTF existente es la fuente central y WTF POS publica movimientos.
Nunca mantener dos cantidades independientes sin reconciliación.
4331. DASHBOARD INVENTORY MOVEMENTS
Mostrar:
- type;
- item;
- quantity;
- unit;
- branch;
- source;
- reference;
- employee;
- date/time.
4332. DASHBOARD INVENTORY MOVEMENT DETAIL
Debe permitir rastrear:
InventoryMovement → Sale/Refund/Waste/Adjustment
cuando exista referencia.
4333. DASHBOARD INVENTORY ADJUSTMENT
Acción autorizada.
Solicitar:
- item;
- quantity;
- direction/reason;
- comment.
Crear movimiento.
4334. DASHBOARD INVENTORY ADJUSTMENT PREVIEW
Mostrar:
Stock actual: 18
Ajuste: -3
Stock resultante: 15
antes de confirmar.
4335. DASHBOARD INVENTORY ADJUSTMENT AUDIT
Obligatorio.
4336. DASHBOARD INVENTORY WASTE
Permitir registrar merma cuando forme parte del alcance integrado.
4337. DASHBOARD INVENTORY WASTE REASON
Sí.
4338. DASHBOARD INVENTORY LOW STOCK
Lista.
4339. DASHBOARD INVENTORY NEGATIVE
Lista prioritaria.
4340. DASHBOARD INVENTORY RESERVATIONS
Puede mostrar reservas activas de Open Tickets cuando se implemente.
4341. DASHBOARD INVENTORY RECONCILIATION
Mostrar inconsistencias entre ledger/snapshot.
4342. DASHBOARD INVENTORY REBUILD
Acción técnica protegida.
No botón normal.
4343. DASHBOARD INVENTORY IMPORT
Si se utiliza para opening balance:
preview + movement creation.
4344. DASHBOARD INVENTORY EXPORT
Sí.
4345. DASHBOARD INVENTORY COST
Solo permisos autorizados.
4346. DASHBOARD INVENTORY MARGIN FUTURE
Puede calcularse posteriormente.
4347. DASHBOARD RECIPE FUTURE
No P0.
4348. DASHBOARD SUPPLIERS FUTURE
No P0.
4349. DASHBOARD PURCHASES FUTURE
No P0 si gestor existente lo cubre.
4350. WTF DASHBOARD RESPONSIVE NAVIGATION
Desktop:
sidebar.
Tablet:
collapsible sidebar.
Mobile:
drawer/bottom patterns apropiados.
4351. DASHBOARD CURRENT BRANCH
Visible persistentemente cuando el usuario trabaja dentro de una sucursal.
4352. DASHBOARD ORGANIZATION CONTEXT
Visible cuando administra configuración global.
4353. DASHBOARD BREADCRUMBS
Sí.
4354. DASHBOARD PAGE TITLE
Claro.
4355. DASHBOARD PAGE DESCRIPTION
Breve para configuración compleja.
4356. DASHBOARD PRIMARY CTA
Uno principal.
4357. DASHBOARD SECONDARY ACTIONS
No competir visualmente.
4358. DASHBOARD DANGEROUS ACTION
Separada.
4359. DASHBOARD SAVE BAR
Para formularios largos puede permanecer visible.
4360. DASHBOARD CANCEL
Sí.
4361. DASHBOARD UNSAVED WARNING
Sí.
4362. DASHBOARD FORM SECTIONS
Dividir formularios grandes.
4363. DASHBOARD INLINE HELP
Sí.
4364. DASHBOARD ADVANCED SETTINGS
Colapsables.
No ocultar settings críticos de forma confusa.
4365. DASHBOARD PERMISSION-BASED NAV
Ocultar módulos sin acceso.
Backend igualmente protege.
4366. DASHBOARD EMPTY MODULE
No mostrar módulo sin permiso.
4367. DASHBOARD FEATURE-BASED NAV
Si feature OFF:
puede ocultar módulo operacional, pero Configuración debe permitir activarlo a roles autorizados.
4368. DASHBOARD SEARCH PARAMETERS
Persistir en URL cuando útil.
4369. DASHBOARD TABLE COLUMN SETTINGS FUTURE
No P0.
4370. DASHBOARD SAVED VIEWS FUTURE
No P0.
4371. DASHBOARD BULK SELECTION
Para artículos/clientes cuando útil.
4372. DASHBOARD BULK ACTION CONFIRM
Mostrar cantidad afectada.
4373. DASHBOARD BULK ARCHIVE
Sí, con cuidado.
4374. DASHBOARD BULK PRICE
Sí.
4375. DASHBOARD BULK TAX
Sí.
4376. DASHBOARD BULK CATEGORY
Sí.
4377. DASHBOARD BULK AVAILABILITY
Sí.
4378. DASHBOARD BULK EMPLOYEE ROLE
Puede existir, pero requiere confirmación fuerte.
4379. DASHBOARD BULK DEVICE REVOKE
No P0/requiere fuerte confirmación.
4380. DASHBOARD PAGINATION SIZE
Opciones razonables.
4381. DASHBOARD EXPORT ALL
No depender de la página visible.
Export job usa filtros completos.
4382. DASHBOARD SORT SERVER-SIDE
Para datasets grandes.
4383. DASHBOARD FILTER SERVER-SIDE
Sí.
4384. DASHBOARD SEARCH SERVER-SIDE
Sí.
4385. DASHBOARD SMALL REFERENCE DATA
Puede cachearse client-side.
4386. DASHBOARD MUTATION INVALIDATION
Actualizar listas/KPIs relevantes.
4387. DASHBOARD STALE DATA
Mostrar refresh cuando sea necesario.
4388. DASHBOARD CONCURRENT EDIT
Utilizar version/ETag cuando corresponda.
4389. DASHBOARD CONCURRENT EDIT ERROR
Este registro fue modificado por otro usuario. Recargue para revisar los cambios.
4390. DASHBOARD FORCE OVERWRITE
No ofrecer por defecto en configuración crítica.
4391. DASHBOARD MERGE
Solo para entidades donde tenga sentido.
4392. DASHBOARD CONFIG CONCURRENT PUBLISH
Version lock.
4393. DASHBOARD REPORT SNAPSHOT TIME
Mostrar cuándo se calculó.
4394. DASHBOARD LIVE KPI
Etiquetar realtime/near realtime.
4395. DASHBOARD CURRENCY KPI
Formateado.
4396. DASHBOARD PERCENT KPI
Precisión razonable.
4397. DASHBOARD NEGATIVE KPI
Refund/net values pueden ser negativos cuando corresponda.
4398. DASHBOARD TREND
Comparación período anterior puede añadirse.
P1.
4399. DASHBOARD NO MISLEADING TREND
No comparar períodos de distinta duración sin indicarlo.
4400. DASHBOARD SALES CHART
Puede mostrar ventas por hora/día.
4401. DASHBOARD PAYMENT CHART
Distribución por método.
4402. DASHBOARD CATEGORY CHART
Top categorías.
4403. DASHBOARD ITEM CHART
Top productos.
4404. DASHBOARD EMPLOYEE CHART
Según permisos.
4405. DASHBOARD KDS CHART FUTURE
Tiempos.
4406. DASHBOARD INVENTORY CHART FUTURE
No necesario.
4407. DASHBOARD CHART SOURCE
Mismos datos que reportes.
4408. DASHBOARD CHART TOTAL
Debe reconciliar.
4409. DASHBOARD PRINT REPORT
Puede utilizar browser/PDF.
4410. DASHBOARD REPORT PDF
Server/client según arquitectura, pero reproducible.
4411. DASHBOARD REPORT XLSX
Sí.
4412. DASHBOARD REPORT CSV
Sí.
4413. DASHBOARD EXPORT STATUS
Mostrar jobs.
4414. DASHBOARD EXPORT DOWNLOAD
Secure.
4415. DASHBOARD EXPORT EXPIRY
Sí.
4416. DASHBOARD EXPORT RETRY
Si job falló.
4417. DASHBOARD EXPORT CANCEL
Si todavía procesando.
4418. DASHBOARD EXPORT AUDIT
Sí.
4419. REPORT DAILY SALES
Campos sugeridos:
- businessDate;
- transactions;
- grossSales;
- discounts;
- netSales;
- taxes;
- charges;
- refunds;
- finalNet;
- averageTicket.
Definiciones documentadas.
4420. REPORT SALES BY ITEM
Campos:
- product;
- quantity;
- gross;
- discounts;
- net;
- taxes/charges según vista.
4421. REPORT SALES BY CATEGORY
Igual agregado.
4422. REPORT SALES BY EMPLOYEE
Campos según attribution.
4423. REPORT SALES BY PAYMENT
- method;
- transactions;
- amount;
- refunds;
- net.
4424. REPORT RECEIPTS
Detalle.
4425. REPORT MODIFIERS
- option;
- quantity;
- additional revenue.
4426. REPORT DISCOUNTS
- discount;
- uses;
- amount;
- employees;
- approvals.
4427. REPORT TAXES
- tax;
- taxable base;
- tax amount.
4428. REPORT CHARGES
Separado cuando corresponda.
4429. REPORT SHIFTS
- register;
- employee;
- open;
- close;
- opening;
- expected;
- counted;
- difference.
4430. REPORT DINING OPTIONS
- mode;
- tickets;
- sales.
4431. REPORT SALES CHANNEL
- channel;
- orders;
- sales.
4432. REPORT REFUNDS
- original receipt;
- refund;
- amount;
- reason;
- employee.
4433. REPORT VOIDS
Sí.
4434. REPORT CASH MOVEMENTS
Sí.
4435. REPORT TIME CLOCK
Sí.
4436. REPORT INVENTORY
Sí.
4437. REPORT KDS PERFORMANCE
P1.
4438. REPORT DEVICE HEALTH
Technical, not business.
4439. REPORT AUDIT
Security/administrative.
4440. REPORT FILTER BUSINESS DATE
Default para financial reports.
4441. REPORT FILTER TRANSACTION TIMESTAMP
Puede existir opción avanzada.
4442. REPORT FILTER BRANCH
Sí.
4443. REPORT FILTER REGISTER
Sí donde aplica.
4444. REPORT FILTER EMPLOYEE
Sí.
4445. REPORT FILTER DINING
Sí.
4446. REPORT FILTER CHANNEL
Sí.
4447. REPORT FILTER PAYMENT
Sí.
4448. REPORT FILTER PRODUCT
Sí.
4449. REPORT FILTER CATEGORY
Sí.
4450. REPORT FILTER CUSTOMER
Para receipt/customer reports.
4451. REPORT FILTER STATUS
Sí.
4452. REPORT FILTER TEST DATA
Admin puede incluir test/training explícitamente.
Default no.
4453. REPORT TIME RANGE VALIDATION
From <= To.
4454. REPORT MAX RANGE
No imponer límite pequeño arbitrario.
Para rangos enormes usar async job.
4455. REPORT timezone
Mostrar Branch timezone.
4456. REPORT MULTI-BRANCH TIMEZONE
Si consolidado entre zonas:
definir agrupación claramente.
4457. REPORT MULTI-CURRENCY FUTURE
Separar por currency.
4458. REPORT ROUNDING
No sumar valores visualmente redondeados si internamente existen valores exactos distintos.
Utilizar stored Money.
4459. REPORT TOTAL FOOTER
Sí.
4460. REPORT GRAND TOTAL
Sí.
4461. REPORT GROUP SUBTOTAL
Cuando útil.
4462. REPORT REFUND SIGN
Mostrar claramente negativo/refund.
4463. REPORT VOID ZERO IMPACT
Según definición.
4464. REPORT TAX EXCLUDED FROM NET SALES
Según definición documentada.
4465. REPORT CHARGE TREATMENT
Documentar.
4466. REPORT PAYMENT TIPS FUTURE
Separado.
4467. REPORT PROVIDER FEES FUTURE
Separado.
4468. REPORT COST/MARGIN FUTURE
Solo con cost data fiable.
4469. NO FAKE PROFIT REPORT
No calcular utilidad si no existe costo completo.
4470. REPORT DATA QUALITY WARNING
Si datos están incompletos por sync backlog:
mostrar warning.
4471. REPORT UNSYNCED BRANCH
Dashboard central no conoce operaciones locales pendientes.
Mostrar:
Hay dispositivos con operaciones pendientes de sincronización. Los totales pueden cambiar.
4472. REPORT FINALIZED DAY
Puede marcarse reconciliado/cerrado futuro.
4473. DAILY CLOSE FUTURE
No confundir con Shift close.
Puede existir proceso de cierre de día.
4474. DAILY CLOSE RECONCILIATION
P1.
4475. REPORT AUDIT TRAIL
Cambios de definición/version.
4476. REPORT DEFINITION VERSION
Sí.
4477. REPORT EXPORT DEFINITION VERSION
Puede incluir metadata.
4478. DASHBOARD REPORT DOCUMENTATION
Cada reporte con:
¿Qué incluye?
4479. WTF KDS APK PACKAGE
Utilizar applicationId/package único.
No compartir el mismo package con WTF POS.
4480. WTF CDS APK PACKAGE
Único.
4481. WTF POS APK PACKAGE
Único.
4482. APP DISPLAY NAMES
Exactos:
WTF POS
WTF KDS
WTF CDS
4483. KDS SUBTITLE
Pantalla de Cocina
4484. CDS SUBTITLE
Pantalla para Clientes
4485. APP ICONS
Marca WTF, diferenciables entre apps.
4486. KDS ICON DIFFERENTIATION
Puede incluir símbolo cocina/display.
4487. CDS ICON DIFFERENTIATION
Sí.
4488. APP SPLASH BRANDING
Consistente.
4489. APP ACCESSIBILITY LABEL
Correcto.
4490. APK ARCHITECTURE SUPPORT
Definir ABIs según hardware.
No generar APK innecesariamente enorme si se puede optimizar.
4491. UNIVERSAL APK
Puede generarse si distribución manual simplifica.
4492. APP BUNDLE FUTURE
Si Play Store.
4493. APK MIN SDK
Documentado.
4494. APK TARGET SDK
Documentado.
4495. APK COMPILE SDK
Documentado.
4496. APK PERMISSIONS LIST
Documentar por app.
4497. WTF POS PERMISSIONS
Solo según features:
- Camera
- Bluetooth
- Network
- USB handling
- Notifications cuando aplique.
No location/microphone sin necesidad.
4498. WTF KDS PERMISSIONS
Network + notifications/wake behavior cuando corresponda.
4499. WTF CDS PERMISSIONS
Network + display-related minimum.
4500. INTERNET PERMISSION
Sí para cloud/LAN networking.
4501. LOCAL NETWORK DISCOVERY
Implementar según APIs.
4502. WAKE LOCK
Solo si necesario y correctamente gestionado.
4503. KEEP SCREEN ON
Preferible mediante window flags durante KDS/CDS foreground.
4504. BOOT PERMISSION
Solo si auto-start feature real.
4505. FILE PERMISSION
Minimizar.
4506. CAMERA PERMISSION POS
Runtime.
4507. BIOMETRIC PERMISSION/API
Según Android.
4508. BLUETOOTH PERMISSIONS
Version-aware.
4509. USB HOST FEATURE
Manifest optional si hardware no obligatorio.
4510. CAMERA FEATURE OPTIONAL
No impedir instalación en dispositivos sin cámara si scanner camera puede desactivarse.
4511. BIOMETRIC FEATURE OPTIONAL
Sí.
4512. KDS TOUCHSCREEN
Asumir interacción táctil, pero botones accesibles.
4513. CDS TOUCHSCREEN
No necesario para operación v1.
4514. CDS READ-ONLY HARDENING
No exponer navegación administrativa mediante taps accidentales.
Config access mediante gesto/botón protegido.
4515. KDS ADMIN ENTRY
Puede utilizar long press en logo + PIN o botón protegido.
Debe estar documentado.
4516. CDS ADMIN ENTRY
Similar.
4517. NO SECRET GESTURE AS SECURITY
El gesto solo abre login/PIN.
No es autorización por sí mismo.
4518. KDS FULLSCREEN IMMERSIVE
Puede utilizarse.
4519. CDS FULLSCREEN IMMERSIVE
Sí.
4520. SYSTEM BARS
Ocultar cuando modo dedicado, recuperables según Android.
4521. POS SYSTEM BARS
Normal.
4522. KDS NOTIFICATION INTERRUPTION
Minimizar mediante configuración del dispositivo, no controlar otras apps sin permiso.
4523. CDS NOTIFICATION INTERRUPTION
Igual.
4524. DEDICATED TABLET GUIDE
Recomendar:
- charger;
- screen timeout;
- Wi

<!-- PARTE 25 | attachment=e3ccae8e-dab6-46ac-93f2-e612cd47c1bd | rango=4524-4699 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
4524. DEDICATED TABLET GUIDE
Crear una guía específica para tablets dedicadas a WTF KDS y WTF CDS.
Recomendar configurar:
- cargador permanente/estable;
- screen timeout apropiado;
- Wi-Fi estable;
- DHCP reservation cuando se utilice IP;
- orientación;
- brillo;
- actualización automática controlada;
- bloqueo de pantalla;
- notificaciones innecesarias desactivadas;
- battery optimization según necesidad;
- Screen Pinning/Kiosk cuando sea apropiado.
No pedir desactivar mecanismos de seguridad innecesariamente.
4525. KDS TABLET CHARGING
Como la pantalla puede permanecer activa durante horas:
recomendar alimentación estable.
El software no debe asumir batería infinita.
4526. CDS TABLET CHARGING
Mismo principio.
4527. BATTERY HEALTH
No intentar gestionar carga/batería fuera de APIs normales.
4528. SCREEN BRIGHTNESS
Puede sugerirse configuración manual.
No forzar brillo máximo permanentemente.
4529. KDS SCREEN TIMEOUT
Mantener pantalla activa mientras app está en foreground cuando configurado.
4530. CDS SCREEN TIMEOUT
Igual.
4531. DEVICE SLEEP RECOVERY
Si pantalla/dispositivo entra en sleep:
al volver:
- KDS recupera órdenes;
- CDS solicita session snapshot;
- POS conserva estado.
4532. WIFI SLEEP
Probar en hardware real.
4533. KDS WIFI RECONNECT
Automático.
4534. CDS WIFI RECONNECT
Automático.
4535. POS WIFI RECONNECT
Cloud/KDS/CDS.
4536. NETWORK SWITCH
Si cambia de Wi-Fi:
revalidar LAN peers.
4537. WRONG NETWORK
Si KDS/CDS están en otra red:
mostrar:
No se encuentra el dispositivo en esta red.
4538. PAIRING NETWORK CHECK
Antes de pairing:
verificar reachability.
4539. IP DISPLAY FORMAT
Ejemplo:
192.168.1.45
No mostrar dirección IPv6 compleja como única opción si el flujo manual espera IPv4, salvo soporte explícito.
4540. IPV6
La arquitectura puede soportarlo cuando sea práctico.
No requisito inicial si LAN objetivo usa IPv4.
4541. HOSTNAME INPUT
Puede aceptar IP/hostname si networking lo soporta.
4542. CONNECTION URL VALIDATION
No permitir esquemas/URLs arbitrarias peligrosas.
4543. PORT VALIDATION
1–65535.
4544. LOCAL ADDRESS VALIDATION
No confiar únicamente en regex; probar conexión.
4545. KDS CONNECTION MANUAL FORM
Campos:
- Nombre
- Dirección IP/Host
- Puerto
- Código de emparejamiento cuando aplique.
4546. CDS CONNECTION MANUAL FORM
Igual.
4547. CONNECTION AUTO-DISCOVERY
Mostrar dispositivos encontrados.
4548. DISCOVERED DEVICE CARD
- app type;
- name;
- IP;
- branch si ya autorizado;
- status.
4549. DISCOVERY WRONG APP TYPE
No ofrecer un CDS como KDS.
4550. DISCOVERY ENVIRONMENT FILTER
Production solo production.
4551. DISCOVERY BRANCH FILTER
Preferir misma Branch.
4552. DISCOVERY UNAUTHORIZED DEVICE
Puede mostrar:
Pendiente de autorización
según flow.
4553. PAIRING FLOW — KDS
Secuencia recomendada:
KDS muestra identidad/IP/QR
        ↓
POS → Agregar pantalla de cocina
        ↓
Descubrir o introducir IP
        ↓
Handshake
        ↓
Código temporal
        ↓
Confirmar
        ↓
Guardar pairing
        ↓
Enviar comanda de prueba
4554. PAIRING FLOW — CDS
Equivalente.
4555. PAIRING SUCCESS KDS
Mostrar:
WTF KDS conectado correctamente.
Botón:
Enviar comanda de prueba
4556. PAIRING SUCCESS CDS
WTF CDS conectado correctamente.
Botón:
Mostrar venta de prueba
4557. PAIRING FAILURE RECOVERY
No dejar credenciales parciales.
Limpiar estado temporal.
4558. PAIRING INTERRUPTED
Nonce expira.
4559. PAIRING DUPLICATE
Si ya está emparejado:
mostrar asociación existente.
4560. KDS MULTIPLE POS PAIRING
Permitir cuando misma Branch/station.
4561. CDS MULTIPLE POS PAIRING
No por defecto.
4562. PAIRING CLOUD REGISTRATION
Cuando cloud disponible:
registrar asociación.
4563. PAIRING LOCAL PERSISTENCE
Ambos dispositivos guardan información necesaria.
4564. PAIRING CLOUD OUTAGE
Si v1 requiere autorización central:
no completar nuevo pairing sin cloud.
Una asociación existente puede continuar LAN según policy.
4565. KDS WELCOME SCREEN ORIGINAL REQUIREMENT
En primer inicio WTF KDS debe mostrar una pantalla de bienvenida con:
WTF KDS — Pantalla de Cocina
Debe incluir claramente:
Dirección IP de este dispositivo
Ejemplo:
192.168.1.45
Estado de red
Nombre del dispositivo
Botón “Cómo conectar con WTF POS”
Botón “Emparejar”
Puede incluir QR.
4566. KDS WELCOME IP LABEL
Por precisión técnica utilizar:
Dirección IP actual
y añadir:
Para mantenerla estable, configure una reserva DHCP en su router.
Esto satisface el objetivo de “IP fija” sin afirmar falsamente que DHCP es estático.
4567. KDS WELCOME INSTRUCTIONS
Guía paso a paso:
1. conecte WTF POS y WTF KDS a la misma red local;
2. abra WTF POS;
3. vaya a Configuración;
4. seleccione Pantallas de Cocina/Impresoras de Cocina;
5. pulse Agregar;
6. seleccione el KDS encontrado o introduzca su IP;
7. confirme el código de emparejamiento;
8. asigne estación/categorías;
9. envíe una prueba.
4568. KDS WELCOME DEMONSTRATIVE IMAGES
Incluir imágenes/capturas demostrativas de:
- menú WTF POS;
- pantalla Configuración;
- agregar KDS;
- campo IP;
- código de pairing;
- prueba.
Las imágenes finales deben generarse a partir de la interfaz real.
4569. KDS WELCOME AFTER PAIRING
Después de completar correctamente:
no mostrar bienvenida en cada inicio.
Abrir KDS operacional.
4570. KDS CONNECTION SETTINGS AFTER PAIRING
Configuración → Conexión permite volver a ver:
- IP;
- port;
- pairing;
- POS asociados;
- station;
- status.
Requisito explícito.
4571. KDS RESET PAIRING
Acción protegida.
4572. KDS CHANGE NETWORK
IP puede cambiar.
Pairing debe poder recuperarse por device identity/discovery.
4573. KDS NO INTERNET
Puede seguir recibiendo desde POS por LAN.
4574. KDS NO LAN
No puede recibir localmente.
Mantiene órdenes existentes.
4575. KDS ACTIVE SCREEN
Cuadros/tarjetas de comandas.
4576. KDS CARD REQUIRED CONTENT
Cada comanda debe mostrar como mínimo:
- número de turno;
- número de ticket;
- hora;
- tiempo transcurrido;
- modalidad;
- mesa/nombre cuando aplique;
- artículos;
- cantidades;
- modificadores;
- comentarios;
- estado.
4577. KDS TIMER 0–9:59
Estado normal.
4578. KDS TIMER 10–19:59
Cronómetro/indicador amarillo.
4579. KDS TIMER 20–29:59
Rojo.
4580. KDS TIMER ≥30
Rojo crítico + parpadeo accesible según configuración.
4581. KDS TIMER CONFIGURABLE
Defaults anteriores, pero Dashboard/KDS config puede cambiarlos.
4582. KDS TIMER SOURCE
Timestamp original.
4583. KDS TIMER AFTER RESTART
No reset.
4584. KDS TIMER AFTER RESTORE
No reset.
4585. KDS DISPATCH BUTTON
Acción clara:
Despachar
4586. KDS DISPATCH RESULT
Mover a historial.
4587. KDS HISTORY
Accesible.
4588. KDS HISTORY REQUIRED DATA
- turn;
- ticket;
- received;
- dispatched;
- items;
- status.
4589. KDS HISTORY RESTORE
Acción:
Restaurar a cocina
4590. KDS HISTORY RESTORE CONFIRM
Sí.
4591. KDS MULTIPLE COMMANDS
Distribuir por tarjetas.
4592. KDS MANY COMMANDS
Permitir deslizar entre páginas/hojas.
4593. KDS PAGE COUNT
Aumenta según comandas.
4594. KDS PAGE COUNT REDUCTION
Al despachar comandas:
reorganizar y reducir páginas automáticamente.
Requisito explícito.
4595. KDS PAGE NO EMPTY GAPS
Sí.
4596. KDS PAGE NAVIGATION
Swipe + controles opcionales.
4597. KDS PAGE CURRENT
Indicador.
4598. KDS NEW ORDER PAGE INDICATOR
Sí.
4599. KDS ORDER ARRIVAL SOUND
Configurable.
4600. KDS ORDER ARRIVAL VISUAL
Sí.
4601. KDS ORDER UPDATE VISUAL
Sí.
4602. KDS ORDER CANCEL VISUAL
Sí.
4603. KDS SIMPLE DISPATCH
Un toque/acción segura.
4604. KDS ACCIDENTAL DISPATCH RECOVERY
Historial + restore.
4605. KDS PREPARING STATE
Opcional configurable.
4606. KDS READY STATE
Opcional configurable.
4607. KDS SIMPLE MODE DEFAULT
Puede utilizar:
Nueva → Despachada.
4608. KDS ADVANCED MODE
Nueva → Preparando → Lista → Despachada.
4609. KDS MODE CONFIG
Por station.
4610. KDS STATE REPORTING
Guardar timestamps correspondientes.
4611. KDS NO PAYMENT INFO
Nunca mostrar métodos de pago/tarjetas.
4612. KDS NO SALE TOTAL
Default.
4613. KDS NO TAX INFO
Default.
4614. KDS CUSTOMER PRIVACY
Solo order name cuando útil.
4615. KDS MODIFIER EMPHASIS
Sí.
4616. KDS COMMENT EMPHASIS
Sí.
4617. KDS QUANTITY EMPHASIS
Sí.
4618. KDS CANCELLED ITEM EMPHASIS
Sí.
4619. KDS ADDED ITEM EMPHASIS
Sí.
4620. KDS ORDER PRIORITY
Manager puede marcar.
4621. KDS PRIORITY VISUAL
Sí.
4622. KDS PRIORITY AUDIT
Puede registrarse.
4623. KDS STATION HEADER
Mostrar nombre de estación.
4624. KDS CONNECTION HEADER
Icono discreto.
4625. KDS CLOCK
Puede mostrar hora actual.
4626. KDS FULLSCREEN
Sí.
4627. KDS EMPTY STATE
Sin comandas pendientes — Cocina al día ✓
4628. KDS OFFLINE STATE
Mantener tarjetas + banner.
4629. KDS UPDATE REQUIRED
Pantalla bloqueante si protocolo incompatible.
4630. KDS STORAGE CRITICAL
Bloquear recepción nueva si no puede persistir de forma segura.
4631. KDS DATABASE FAILURE
Mostrar critical error.
4632. KDS RESTORE FROM SERVER
Después de pérdida local recuperable:
solicitar snapshot de active orders.
4633. KDS SNAPSHOT SAFETY
No borrar órdenes locales no sincronizadas sin reconciliar.
4634. KDS TEST SUITE
Automatizar todos los estados.
4635. WTF CDS WELCOME SCREEN
Primer inicio:
WTF CDS — Pantalla para Clientes
Mostrar:
- nombre;
- IP actual;
- network status;
- pairing QR/code;
- instrucciones.
4636. CDS WELCOME INSTRUCTIONS
1. misma red;
2. WTF POS → Configuración;
3. Pantallas de Clientes;
4. Agregar;
5. seleccionar/introducir IP;
6. pairing;
7. asignar al Register;
8. prueba.
4637. CDS WELCOME IMAGES
Capturas reales.
4638. CDS AFTER PAIRING
Ir a idle branding.
4639. CDS CONNECTION SETTINGS
Permite ver IP/asociación.
4640. CDS IDLE SCREEN
Mostrar branding WTF profesional.
4641. CDS SALE START
Al primer artículo:
mostrar orden.
4642. CDS REQUIRED LINE CONTENT
- nombre;
- quantity;
- unit price cuando corresponda;
- line total.
4643. CDS MODIFIER CONTENT
Mostrar modificadores con impacto/selección relevante.
4644. CDS SUBTOTAL
Sí.
4645. CDS DISCOUNTS
Sí.
4646. CDS TAXES
Sí.
4647. CDS CHARGES
Sí.
4648. CDS TOTAL
Muy prominente.
4649. CDS EXACT TOTAL
Debe coincidir con POS.
4650. CDS CART UPDATE
Cada cambio relevante.
4651. CDS REMOVE ITEM
Desaparece/actualiza.
4652. CDS QUANTITY CHANGE
Actualiza.
4653. CDS MODE CHANGE
Actualiza precio/taxes.
4654. CDS CUSTOMER CHANGE
No necesita mostrar PII.
4655. CDS PAYMENT SCREEN
Puede mostrar:
Total a pagar
pero NO métodos seleccionables.
4656. CDS PAYMENT PROCESSING
Puede mostrar:
Procesando...
4657. CDS PAYMENT SUCCESS
Mostrar:
¡Gracias por su compra, WTFLover!
4658. CDS SUCCESS AMOUNT
Puede mostrar total pagado.
4659. CDS SUCCESS TURN
Puede mostrar:
Su turno: 084
si configurado.
4660. CDS SUCCESS CHANGE
Para efectivo, opcional:
Su cambio: RD$X
4661. CDS SUCCESS TIMEOUT
Después vuelve a idle.
4662. CDS PAYMENT FAILURE
Consulte con el cajero.
4663. CDS PAYMENT UNKNOWN
No mostrar “Pago aprobado”.
Mostrar estado neutral.
4664. CDS SAVED ORDER
Volver idle.
4665. CDS CANCELLED ORDER
Volver idle.
4666. CDS DISCONNECTED
Branding + estado discreto.
4667. CDS RECONNECTED
Solicitar snapshot.
4668. CDS WRONG SESSION
Ignorar.
4669. CDS SESSION REVISION
Sí.
4670. CDS MULTIPLE POS PROTECTION
Sí.
4671. CDS FULLSCREEN
Sí.
4672. CDS EMPTY/IDLE
No mostrar información anterior.
4673. CDS NO PAYMENT CONTROLS
Reiteración explícita del requisito.
4674. CDS NO ADMIN CONTROLS PUBLIC
Sí.
4675. CDS SETTINGS PIN
Sí.
4676. CDS DISPLAY TEST
Sí.
4677. CDS TEST CONTENT
Debe decir:
MODO DE PRUEBA
4678. CDS TEST DOES NOT CREATE SALE
Sí.
4679. CDS TEST AUTO-END
Sí.
4680. CDS ACCESSIBILITY
Texto grande/contraste.
4681. CDS CUSTOMER DISTANCE
Diseñar para lectura a distancia típica de mostrador.
4682. CDS CURRENCY
Formateada.
4683. CDS LONG ORDER
Scroll.
4684. CDS TOTAL STICKY
Sí.
4685. CDS DARK MODE
Puede seguir theme/branding configurado.
4686. CDS PROMOTION IDLE FUTURE
Sí.
4687. CDS REVIEW QR FUTURE
Sí.
4688. CDS LOYALTY FUTURE
Sí.
4689. CDS TIPPING FUTURE
No v1.
4690. WTF DASHBOARD DEPLOYMENT
Debe ser una Web.App segura y responsive.
4691. DASHBOARD DOMAIN
Configurable mediante environment.
4692. DASHBOARD HTTPS
Production obligatorio.
4693. DASHBOARD LOGIN
Email/username + password.
4694. DASHBOARD MFA
Recomendado para Owner/Admin.
4695. DASHBOARD PASSWORD RESET
Seguro.
4696. DASHBOARD SESSION
Seguro.
4697. DASHBOARD LOGOUT
Sí.
4698. DASHBOARD ALL SESSIONS
Owner/User puede revocar sesiones cuando se implemente.
4699. DASHBOARD CURRENT USER
Profile

<!-- PARTE 26 | attachment=2467c362-1a88-4988-ae6a-7e5a370089c4 | rango=4699-4890 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
4699. DASHBOARD CURRENT USER
En la parte superior o menú de usuario mostrar:
- nombre;
- rol;
- organización;
- sucursal activa cuando corresponda;
- acceso a perfil;
- cerrar sesión.
No mostrar información sensible innecesaria.
4700. DASHBOARD PROFILE
Permitir administrar:
- nombre;
- correo cuando corresponda;
- idioma;
- preferencias visuales;
- contraseña.
Los cambios de rol/permisos no se realizan desde el perfil personal.
4701. DASHBOARD PASSWORD CHANGE
Requerir contraseña actual o reautenticación apropiada.
4702. DASHBOARD EMAIL CHANGE
Si el email funciona como identidad de login:
requerir proceso seguro de verificación.
4703. DASHBOARD PROFILE AUDIT
Cambios de seguridad relevantes deben registrarse.
4704. DASHBOARD LOGIN PAGE
Debe ser limpia, profesional y centrada en WTF.
No mostrar navegación administrativa antes de autenticación.
4705. DASHBOARD LOGIN ERROR
No revelar información excesiva.
4706. DASHBOARD ACCOUNT LOCKOUT
Aplicar rate limiting y protección contra brute force.
4707. DASHBOARD PASSWORD POLICY
Definir política razonable.
No limitar a contraseñas débiles ni exigir reglas arbitrariamente complejas que reduzcan usabilidad.
4708. DASHBOARD PASSWORD HASH
Servidor.
Algoritmo moderno.
4709. DASHBOARD RESET TOKEN
Expirable y single-use.
4710. DASHBOARD RESET TOKEN STORAGE
Seguro.
4711. DASHBOARD RESET SUCCESS
Invalidar tokens anteriores cuando corresponda.
4712. DASHBOARD SESSION REVOCATION
Después de cambio de contraseña sensible puede revocar sesiones.
4713. DASHBOARD OWNER SECURITY
Owner debe poder revisar:
- sesiones;
- dispositivos;
- cambios de roles;
- alertas de seguridad.
4714. DASHBOARD SECURITY PAGE
Puede contener:
- password;
- MFA;
- sessions;
- security events.
4715. DASHBOARD MFA RECOVERY
Si se implementa:
recovery codes seguros.
No mostrar permanentemente.
4716. DASHBOARD MFA RESET
Proceso administrativo fuerte.
4717. DASHBOARD LOGIN AUDIT
Registrar eventos relevantes.
4718. DASHBOARD SUSPICIOUS LOGIN
Puede generar security event.
4719. DASHBOARD IP LOGGING
Si se registra:
tratar como dato sensible/operacional.
No mostrar a roles innecesarios.
4720. DASHBOARD USER AGENT
Puede utilizarse para sesiones/seguridad.
4721. DASHBOARD SESSION LIST
Mostrar:
- device/browser;
- approximate last activity;
- createdAt;
- current session.
4722. DASHBOARD SESSION TERMINATE
Sí.
4723. DASHBOARD ALL SESSION TERMINATE
Sí.
4724. DASHBOARD OWNER ROLE CHANGE
Reauth.
4725. DASHBOARD FISCAL CONFIG CHANGE
Reauth/permission fuerte.
4726. DASHBOARD PAYMENT PROVIDER CONFIG
Reauth/permission fuerte.
4727. DASHBOARD SECRET DISPLAY
Nunca mostrar secret completo después de guardarlo.
4728. DASHBOARD SECRET UPDATE
Campo:
Reemplazar credencial
No rellenar con valor existente.
4729. DASHBOARD SECRET TEST
Botón:
Probar conexión
sin revelar secret.
4730. DASHBOARD SECRET AUDIT
Registrar que cambió, no el valor.
4731. DASHBOARD API KEY FUTURE
Mismo principio.
4732. DASHBOARD WEBHOOK SECRET FUTURE
Mismo.
4733. DASHBOARD INTEGRATIONS PAGE
Preparar para:
- fiscal;
- payments;
- inventory;
- delivery;
- accounting;
sin implementar integraciones ficticias.
4734. INTEGRATION STATUS
- Not configured
- Connected
- Degraded
- Error
- Disabled
4735. INTEGRATION TEST
Sí.
4736. INTEGRATION LAST SUCCESS
Mostrar.
4737. INTEGRATION LAST ERROR
Código/mensaje sanitizado.
4738. INTEGRATION DISABLE
No borrar configuración inmediatamente.
4739. INTEGRATION DELETE CREDENTIAL
Acción separada.
4740. INTEGRATION SANDBOX MODE
Visible.
4741. INTEGRATION PRODUCTION MODE
Requiere confirmación.
4742. FISCAL SANDBOX → PRODUCTION
Checklist.
4743. PAYMENT SANDBOX → PRODUCTION
Checklist.
4744. DELIVERY SANDBOX FUTURE
Sí.
4745. INVENTORY INTEGRATION
Si WTF Inventory Web.App ya existe:
crear adapter/API formal.
No compartir credenciales de DB con Android.
4746. INVENTORY INTEGRATION AUTH
Service-to-service credential.
4747. INVENTORY INTEGRATION EVENT
Idempotent.
4748. INVENTORY INTEGRATION HEALTH
Sí.
4749. INVENTORY INTEGRATION BACKLOG
Monitor.
4750. INVENTORY INTEGRATION FAILURE
No pierde sale.
4751. INVENTORY INTEGRATION REPLAY
Sí.
4752. INVENTORY INTEGRATION MAPPING
Mapear:
POS Product/Recipe → Inventory Item(s)
4753. INVENTORY MAPPING UI
Dashboard puede administrar.
4754. INVENTORY UNMAPPED PRODUCT
Si track inventory requerido:
warning.
4755. INVENTORY PARTIAL MAPPING
No descontar ingredientes incompletos silenciosamente si receta se considera authoritative.
Generar validation/warning.
4756. INVENTORY RECIPE VERSION
Futuro.
4757. INVENTORY RECIPE SNAPSHOT
Puede ser necesario para consumo histórico.
4758. INVENTORY CONSUMPTION EVENT
Debe contener suficiente información para reproducir movimiento.
4759. INVENTORY SALES REVERSAL
Refund/void genera eventos compensatorios.
4760. INVENTORY WASTE EVENT
Sí.
4761. INVENTORY TRANSFER EVENT
Futuro.
4762. INVENTORY PURCHASE EVENT
Puede venir del sistema existente.
4763. INVENTORY STOCK SNAPSHOT
Materialized.
4764. INVENTORY STOCK RECONCILIATION
Sí.
4765. INVENTORY SYSTEM OF RECORD ADR
Obligatorio antes de producción.
4766. LEGACY ICG ADAPTER
Si se mantiene temporalmente:
debe ser un módulo separado.
4767. ICG DIRECT DB WRITE
Evitar.
4768. ICG NATIVE IMPORT/EXPORT
Si se integra, utilizar mecanismos documentados/seguros cuando sea posible.
4769. ICG SYNC IDEMPOTENCY
Sí.
4770. ICG SYNC MONITOR
Si continúa.
4771. ICG MIGRATION PLAN
Definir cuándo deja de ser dependencia.
4772. ICG FALLBACK
No convertirlo en fallback automático si puede duplicar ventas.
4773. WTF POS SOURCE OF SALE
Cuando WTF POS entre en producción:
definir claramente quién es sistema oficial de venta.
4774. LEGACY PARALLEL MODE
Solo controlado.
4775. LEGACY DATA IMPORT
Mapping.
4776. LEGACY RECEIPT HISTORY
Puede importarse read-only si necesario.
4777. LEGACY CUSTOMER IMPORT
Sí.
4778. LEGACY PRODUCT IMPORT
Sí.
4779. LEGACY EMPLOYEE IMPORT
Sí.
4780. LEGACY STOCK IMPORT
Opening balance.
4781. LEGACY FISCAL DATA
No migrar/reemitir sin reglas.
4782. LEGACY IDENTIFIER
Guardar legacyId opcional.
4783. LEGACY ID UNIQUE
Por source.
4784. LEGACY SOURCE FIELD
Ejemplo:
ICG_FRONTREST
4785. MIGRATION REPEATABILITY
Scripts deben poder ejecutarse en staging repetidamente.
4786. MIGRATION CHECKSUM
Puede registrar source file/hash.
4787. MIGRATION DRY RUN REPORT
Sí.
4788. MIGRATION ACCEPTANCE
Owner/admin valida.
4789. MIGRATION CUTOVER TIME
Documentar.
4790. MIGRATION FREEZE
Puede requerir congelar cambios en legacy durante corte.
4791. MIGRATION DELTA
Si existe período entre export/import:
capturar cambios.
4792. MIGRATION ROLLBACK
No destruir source legacy.
4793. MIGRATION ARCHIVE
Conservar archivos/reportes según política.
4794. MIGRATION SECURITY
Proteger dumps con datos.
4795. MIGRATION TEMP FILE CLEANUP
Sí.
4796. WTF DASHBOARD FISCAL MODULE
Debe permitir gestionar configuración fiscal sin mezclarla con simples impuestos.
4797. FISCAL DOCUMENT TYPES
Modelo extensible.
Configuración inicial solicitada:
- Consumidor Final B02/E32
- Crédito Fiscal B01/E31
No asumir equivalencias definitivas sin validar el esquema fiscal vigente/provider.
4798. FISCAL LEGACY VS ELECTRONIC
Distinguir tipos/series según configuración real.
4799. FISCAL TYPE LABEL
Humano.
4800. FISCAL TYPE CODE
Separado.
4801. FISCAL SEQUENCE CONFIG
Campos conceptuales:
- documentType;
- prefix/series;
- current;
- rangeStart;
- rangeEnd;
- expiration cuando aplique;
- branch;
- status.
4802. FISCAL SEQUENCE CONCURRENCY
Atómica.
4803. FISCAL SEQUENCE RANGE VALIDATION
Start <= current <= end.
4804. FISCAL RANGE OVERLAP
Bloquear.
4805. FISCAL RANGE EXHAUSTION
Alertar antes.
4806. FISCAL RANGE EXHAUSTED
Bloquear emisión de ese tipo o seguir provider workflow real.
No inventar número.
4807. FISCAL RANGE EXPIRY
Alertar.
4808. FISCAL NUMBER UNIQUE
Sí.
4809. FISCAL NUMBER IMMUTABLE
Sí.
4810. FISCAL DOCUMENT STATUS
Como mínimo adaptable:
- PENDING
- ISSUED
- ACCEPTED
- REJECTED
- UNKNOWN
- CANCELLED/VOIDED cuando aplique.
4811. FISCAL PROVIDER RESPONSE
Guardar metadata necesaria.
No guardar secretos.
4812. FISCAL RAW RESPONSE
Puede guardarse sanitizada/segura para troubleshooting cuando legalmente apropiado.
4813. FISCAL RETRY
Idempotente.
4814. FISCAL DUPLICATE PREVENTION
Sí.
4815. FISCAL REQUEST ID
Sí.
4816. FISCAL SALE LINK
Obligatorio.
4817. FISCAL CUSTOMER SNAPSHOT
Sí.
4818. FISCAL TAX SNAPSHOT
Sí.
4819. FISCAL RECEIPT
Receipt refleja status/document.
4820. FISCAL QR
Provider/regulación.
4821. FISCAL PRINT COPY
No nueva emisión.
4822. FISCAL RECONCILIATION SCREEN
Mostrar:
- pending;
- rejected;
- unknown;
- accepted.
4823. FISCAL RECONCILIATION FILTERS
- branch;
- type;
- date;
- status;
- receipt.
4824. FISCAL RECONCILIATION ACTION
- Verify status
- Retry when safe
- View details
4825. FISCAL MANUAL MARK ACCEPTED
No permitir salvo procedimiento explícito y evidencia.
4826. FISCAL REJECTION
No editar documento emitido como si nada.
Seguir correction flow.
4827. FISCAL CREDIT NOTE
Adapter future/required depending provider.
4828. FISCAL CANCEL
Según reglas.
4829. FISCAL TESTS
Golden vectors + sandbox.
4830. FISCAL LEGAL REVIEW
Antes de producción en República Dominicana:
validar reglas vigentes con documentación oficial/proveedor/asesoría fiscal.
4831. TAX VS FISCAL DOCUMENT
Separados.
TaxEngine calcula.
Fiscal module documenta/emite.
4832. FISCAL MODULE DOES NOT RECALCULATE SALE
Consume snapshots.
4833. FISCAL CONFIG PER BRANCH
Sí.
4834. FISCAL PROVIDER PER BRANCH
Puede variar.
4835. FISCAL TEST MODE PER BRANCH
No mezclar con production.
4836. FISCAL CREDENTIAL ROTATION
Sí.
4837. FISCAL CERTIFICATE UPLOAD
Si provider requiere:
secure file handling.
4838. FISCAL CERTIFICATE PASSWORD
Secret.
4839. FISCAL CERTIFICATE EXPIRY
Alert.
4840. FISCAL CERTIFICATE DOWNLOAD
No permitir private key download casualmente.
4841. FISCAL CERTIFICATE AUDIT
Sí.
4842. FISCAL PROVIDER HEALTH
Sí.
4843. FISCAL OUTAGE RUNBOOK
Sí.
4844. FISCAL DAILY RECONCILIATION
Recomendado.
4845. FISCAL REPORT
Documentos por status/type.
4846. TAX REPORT VS FISCAL REPORT
Diferentes.
4847. WTF DASHBOARD PAYMENT MODULE
Además de Payment Methods config, puede existir operational payment view/reconciliation.
4848. PAYMENT METHODS CONFIG FIELDS
Como mínimo:
- name;
- type;
- active;
- order;
- requiresReference;
- opensDrawer;
- offlineCapability;
- provider;
- branch scope.
4849. PAYMENT TYPE
Enums conceptuales:
- CASH
- CARD
- TRANSFER
- DELIVERY_PLATFORM
- CUSTOM
- INTEGRATED
No depender del nombre visible.
4850. PAYMENT METHOD CASH
Configurar cashLike.
4851. PAYMENT METHOD CARD MANUAL
Manual external terminal.
4852. PAYMENT METHOD TRANSFER
Reference.
4853. PAYMENT METHOD APPS
Puede representar settlement de plataforma si operación lo requiere.
4854. PAYMENT METHOD CUSTOM
Metadata.
4855. PAYMENT METHOD PROVIDER
Opcional.
4856. PAYMENT METHOD ARCHIVE
Sí.
4857. PAYMENT METHOD SORT
Sí.
4858. PAYMENT METHOD ICON
Opcional.
4859. PAYMENT METHOD BRANCH
Sí.
4860. PAYMENT METHOD PERMISSION FUTURE
Puede restringirse a roles.
4861. PAYMENT METHOD TEST
Para integrated provider.
4862. PAYMENT RECONCILIATION LIST
- paymentId;
- sale;
- method;
- provider;
- amount;
- status;
- reference;
- time.
4863. PAYMENT UNKNOWN FILTER
Sí.
4864. PAYMENT FAILED FILTER
Sí.
4865. PAYMENT DUPLICATE DETECTION
Provider reference/idempotency.
4866. PAYMENT DUPLICATE ALERT
Critical.
4867. PAYMENT MANUAL RESOLUTION
Sí.
4868. PAYMENT MANUAL RESOLUTION PERMISSION
Muy sensible.
4869. PAYMENT MANUAL RESOLUTION REAUTH
Recomendado.
4870. PAYMENT REFUND VIEW
Sí.
4871. PAYMENT REFUND STATUS
Sí.
4872. PAYMENT SETTLEMENT FUTURE
No P0.
4873. PAYMENT PROVIDER FEE FUTURE
No afectar sale total.
4874. PAYMENT CASH HAS NO PROVIDER
Sí.
4875. PAYMENT CASH STATUS
SUCCEEDED después de local commit.
4876. PAYMENT CASH IDEMPOTENCY
Sale transaction.
4877. PAYMENT CASH REFUND
Local cash ledger.
4878. PAYMENT CASH SHIFT
Required when shifts enabled.
4879. PAYMENT TRANSFER OFFLINE
Puede registrarse manualmente según policy.
4880. PAYMENT CARD MANUAL OFFLINE
Puede registrarse si terminal externa funciona independientemente y política lo permite.
4881. PAYMENT INTEGRATED OFFLINE
Provider capability.
4882. PAYMENT METHOD UI AVAILABILITY
Derivar de:
- active;
- branch;
- connectivity;
- provider health;
- permissions.
4883. PAYMENT METHOD DISABLED REASON
Mostrar.
4884. PAYMENT SCREEN NO METHODS
Error claro.
4885. WTF DASHBOARD TAX MODULE
Debe permitir crear reglas fiscales/cargos de manera comprensible.
4886. TAX RULE FIELDS
Conceptualmente:
- name;
- code;
- rate;
- included/excluded;
- scope;
- applicable dining options;
- products/categories;
- effective dates;
- branch;
- active.
4887. TAX RULE INCLUDED
Sí.
4888. TAX RULE ADDITIVE
Sí.
4889. TAX RULE PRODUCT SCOPE
Sí.
4890.

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 27 | attachment=a69ad44b-884e-4e9b-95ef-244b23f39df6 | rango=4890-5076 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
4890. TAX RULE CATEGORY SCOPE
Una regla de impuesto puede aplicarse a una o varias categorías.
La resolución final debe respetar la precedencia definida entre:
- regla específica del producto;
- regla de categoría;
- regla de modalidad;
- regla general de sucursal.
No aplicar dos veces el mismo impuesto por herencia duplicada.
4891. TAX RULE DINING OPTION SCOPE
Permitir asociar reglas a:
- Comer aquí;
- Para llevar;
- Delivery;
- Apps Delivery;
- modalidades personalizadas futuras.
4892. TAX RULE BRANCH SCOPE
Una regla puede ser:
- global con overrides;
- específica de Branch.
4893. TAX RULE EFFECTIVE DATE
Soportar:
- effectiveFrom;
- effectiveTo opcional.
4894. TAX RULE PRIORITY
Si el motor requiere prioridad explícita:
mostrarla/configurarla de manera comprensible.
No depender del orden físico de registros en DB.
4895. TAX RULE EXCLUSIVE CONFLICT
Dashboard debe detectar configuraciones mutuamente incompatibles.
4896. TAX RULE DUPLICATE
Advertir si se crea una regla equivalente sobre el mismo scope.
4897. TAX RULE PREVIEW
Antes de guardar/publicar:
permitir introducir un precio de ejemplo.
Mostrar:
Precio ingresado: RD$1,000.00

Base imponible
RD$847.46

ITBIS 18%
RD$152.54

Total
RD$1,000.00
El ejemplo debe provenir del TaxEngine real.
4898. TAX RULE MULTIPLE PREVIEW
Si existen múltiples impuestos/cargos:
mostrar todos.
4899. TAX INCLUDED PREVIEW
Sí.
4900. TAX ADDED PREVIEW
Ejemplo:
Precio base
RD$1,000.00

ITBIS 18%
RD$180.00

Total
RD$1,180.00
4901. TAX + CHARGE PREVIEW
Ejemplo conceptual para Comer aquí:
Base
RD$1,000.00

ITBIS
RD$180.00

Cargo/Servicio
RD$100.00

Total
RD$1,280.00
La fórmula real depende de cómo se configure la base de cada regla.
4902. TAX COMPOUNDING
Si un impuesto/cargo se calcula sobre otro:
modelarlo explícitamente.
No asumir.
4903. TAX BASE DEFINITION
Cada regla debe conocer sobre qué base se calcula.
4904. TAX ENGINE GRAPH
Si existen dependencias complejas entre reglas:
validar ciclos.
No permitir:
Tax A depende de B y B depende de A.
4905. TAX ENGINE SIMPLE FIRST
Para v1 mantener reglas tan simples como permita la operación real.
4906. TAX RULE ARCHIVE
Sí.
4907. TAX RULE HISTORICAL
Snapshots.
4908. TAX RULE TEST
Botón:
Probar cálculo
4909. TAX RULE PUBLISH
Config version.
4910. TAX RULE DRAFT
Puede editarse antes de publicar.
4911. TAX RULE CHANGE IMPACT
Mostrar:
- productos afectados;
- modalidades;
- sucursales.
4912. TAX RULE CHANGE WARNING
Especialmente si afecta ventas actuales.
4913. TAX RULE ACTIVE ORDERS
No reprice silenciosamente.
4914. TAX RULE VERSION HISTORY
Sí.
4915. TAX RULE ROLLBACK
Publicar una nueva versión equivalente a la anterior.
No reescribir historial.
4916. CHARGE RULE MODULE
Si el 10% se modela separado:
mismos principios que TaxRule.
4917. CHARGE RULE FIELDS
- name;
- code;
- rate/fixed amount futuro;
- included/additional;
- scope;
- dining options;
- products/categories;
- branch;
- effective dates;
- active.
4918. CHARGE RULE DINE-IN
Configurar inicialmente el 10% correspondiente según operación WTF, sujeto a validación fiscal/legal.
4919. CHARGE RULE TAKEOUT
Puede estar desactivado.
4920. CHARGE RULE DELIVERY
Puede estar desactivado.
4921. CHARGE RULE APPS DELIVERY
Puede estar desactivado.
4922. CHARGE REPORTING
Separado.
4923. CHARGE RECEIPT
Separado.
4924. CHARGE CDS
Separado.
4925. CHARGE REFUND
Snapshot.
4926. CHARGE DISCOUNT INTERACTION
Especificación.
4927. TAX/CHARGE GOLDEN TESTS
Obligatorios.
4928. WTF DASHBOARD DINING OPTIONS MODULE
Crear pantalla administrativa clara.
4929. DINING OPTION LIST
Columnas:
- Name
- Code
- PriceBook
- Taxes
- Charges
- Active
- Default.
4930. DINING OPTION CREATE
Sí.
4931. DINING OPTION EDIT
Sí.
4932. DINING OPTION ARCHIVE
Sí.
4933. DINING OPTION REORDER
Sí.
4934. DINING OPTION DEFAULT
Solo una default por scope.
4935. DINING OPTION CODE
Interno estable.
Ejemplos:
- DINE_IN
- TAKEOUT
- DELIVERY
- DELIVERY_APP
4936. DINING OPTION NAME
Localizable/personalizable.
4937. DINING OPTION PRICEBOOK
Seleccionar.
4938. DINING OPTION TAXES
Seleccionar.
4939. DINING OPTION CHARGES
Seleccionar.
4940. DINING OPTION CUSTOMER REQUIRED
Toggle.
4941. DINING OPTION ADDRESS REQUIRED
Toggle para delivery.
4942. DINING OPTION TABLE ENABLED
Para dine-in.
4943. DINING OPTION CHANNEL REQUIRED
Para Apps Delivery.
4944. DINING OPTION KITCHEN LABEL
Puede personalizarse.
4945. DINING OPTION RECEIPT LABEL
Puede personalizarse.
4946. DINING OPTION COLOR
Opcional para UI.
No usar color como única identificación.
4947. DINING OPTION PREVIEW
Mostrar ejemplo de total.
4948. DINING OPTION VALIDATION
No guardar sin PriceBook/reglas mínimas cuando sean requeridas.
4949. DINING OPTION DELETE
Archive.
4950. DINING OPTION ACTIVE ORDER
Histórico unaffected.
4951. DEFAULT WTF DINING OPTIONS SEED
En setup inicial puede crear:
- Comer aquí
- Para llevar
- Delivery
- Apps Delivery
pero como registros configurables, no hardcoded.
4952. DEFAULT WTF TAX CONFIG SEED
Puede ofrecer plantilla inicial:
Comer aquí
ITBIS 18% + cargo 10%.
Para llevar
ITBIS 18%.
Delivery
ITBIS 18%.
Apps Delivery
ITBIS 18%.
El administrador debe revisar/confirmar antes de producción.
4953. TAX TEMPLATE NOT LEGAL CERTIFICATION
Mostrar advertencia administrativa:
Revise esta configuración conforme a las obligaciones fiscales aplicables antes de operar en producción.
4954. PRICE INCLUDED OPTION PER DINING
Permitir definir si los precios del PriceBook:
- incluyen impuestos/cargos;
- son base antes de impuestos;
según engine/config.
4955. PRICE MODE CONSISTENCY
Evitar que dos reglas interpreten el mismo precio de forma incompatible.
4956. PRICEBOOK MODEL
Crear:
- id;
- name;
- currency;
- branch scope;
- channel;
- status.
4957. DEFAULT PRICEBOOK
Ejemplo:
Precio Regular
4958. APPS DELIVERY PRICEBOOK
Ejemplo:
Apps Delivery
4959. PRODUCT PRICE ENTRY
Cada PriceBook puede tener precio por producto.
4960. MISSING PRICE
Producto no vendible en modalidad que requiere ese PriceBook.
4961. MISSING APPS PRICE
Puede utilizar fallback a regular únicamente si administrador lo configura explícitamente.
No asumir.
4962. PRICE FALLBACK
Configurable.
4963. PRICEBOOK EFFECTIVE DATE FUTURE
Sí.
4964. PRICEBOOK ARCHIVE
Sí.
4965. PRICEBOOK HISTORICAL
Snapshots.
4966. PRICEBOOK BULK UPDATE
Sí.
4967. PRICEBOOK IMPORT
Sí.
4968. PRICEBOOK EXPORT
Sí.
4969. PRICEBOOK COMPARISON
Dashboard puede comparar regular vs Apps Delivery.
4970. PRICEBOOK MARGIN FUTURE
Solo si costs fiables.
4971. PRICEBOOK ROUNDING
Money.
4972. PRICEBOOK ZERO PRICE
Warning.
4973. PRICEBOOK NEGATIVE
Block.
4974. PRICEBOOK CHANGE AUDIT
Sí.
4975. PRICEBOOK PUBLISH
Config sync.
4976. PRICEBOOK ACTIVE CART
No auto reprice.
4977. WTF DASHBOARD OPEN TICKETS MODULE
Configuración + visualización operacional cuando sea útil.
4978. OPEN TICKETS FEATURE TOGGLE
Exacto.
4979. PREDEFINED TICKETS TOGGLE
Dentro de Open Tickets.
4980. PREDEFINED TABLE CREATION
Permitir crear manualmente:
- Mesa 1
- Mesa 2
- Barra 1
- Patio 1
No auto-enumerar obligatoriamente.
4981. TABLE NAME
Libre, con validación.
4982. TABLE CODE
Interno opcional.
4983. TABLE ORDER
Manual.
4984. TABLE ACTIVE
Sí.
4985. TABLE ARCHIVE
Sí.
4986. TABLE OCCUPANCY
Derivada de open ticket.
4987. TABLE CAPACITY FUTURE
Opcional.
4988. TABLE AREA FUTURE
Opcional.
4989. TABLE MAP FUTURE
No P0.
4990. OPEN TICKET DEFAULT NAME
Si no hay mesa:
puede usar nombre cliente/order.
4991. OPEN TICKET REQUIRE NAME
Configurable.
4992. OPEN TICKET AUTO NAME
Puede utilizar:
Turno 084
como fallback.
4993. OPEN TICKET LIST DASHBOARD
Mostrar tickets abiertos por Branch.
4994. OPEN TICKET DASHBOARD READ
Manager puede ver.
4995. OPEN TICKET DASHBOARD EDIT
No necesario P0.
Evitar edición remota que complique cocina.
4996. OPEN TICKET STALE ALERT
Puede existir.
4997. OPEN TICKET TRANSFER
POS.
4998. OPEN TICKET CANCEL
POS/manager.
4999. OPEN TICKET AUDIT
Cambios sensibles.
5000. WTF DASHBOARD KITCHEN MODULE
Debe administrar de manera central:
- estaciones;
- grupos;
- impresoras;
- WTF KDS;
- routing;
- fallback;
- test.
5001. KITCHEN STATION ENTITY
Campos:
- id;
- name;
- branch;
- mode;
- active;
- timer thresholds;
- sound;
- display settings.
5002. KITCHEN STATION EXAMPLES
- Cocina Principal
- Bar
- Postres
- Expedición
No hardcodear.
5003. KITCHEN STATION MODE
- KDS
- PRINTER
- BOTH
o modelar destinations independientemente.
5004. KITCHEN STATION KDS
Asignar uno/múltiples devices.
5005. KITCHEN STATION PRINTER
Asignar.
5006. KITCHEN STATION CATEGORIES
Seleccionar.
5007. KITCHEN STATION PRODUCTS
Overrides.
5008. KITCHEN STATION FALLBACK
Sí.
5009. KITCHEN STATION TEST
Sí.
5010. KITCHEN STATION STATUS
Mostrar devices/destinations.
5011. KITCHEN STATION ARCHIVE
No con active routing sin reasignar.
5012. KITCHEN ROUTING MATRIX
Dashboard puede mostrar:
Category	Station	KDS	Printer


5013. KITCHEN ROUTING CONFLICT WARNING
Sí.
5014. KITCHEN UNROUTED CATEGORY WARNING
Si Kitchen feature ON y una categoría que requiere preparación no tiene destino:
warning/block según setup.
5015. NON-KITCHEN PRODUCT
Puede marcarse:
sendToKitchen = false
Ejemplo:
producto que no requiere preparación.
5016. KITCHEN PRODUCT OVERRIDE
Sí.
5017. KITCHEN ROUTING TEST MATRIX
Probar todas categorías.
5018. KITCHEN CONFIG PUBLISH
Version.
5019. KITCHEN CONFIG POS SYNC
Sí.
5020. KITCHEN CONFIG KDS SYNC
Station settings.
5021. KITCHEN DEVICE AUTH
Sí.
5022. KITCHEN DEVICE STATUS
Sí.
5023. KITCHEN DEVICE REPLACE
Sí.
5024. KITCHEN DEVICE TEST
Sí.
5025. KITCHEN DEVICE UPDATE
Version.
5026. KITCHEN DEVICE IP
Diagnostic.
5027. KITCHEN DEVICE LAST SEEN
Sí.
5028. KITCHEN DEVICE ACTIVE ORDERS
Puede mostrar count.
5029. KITCHEN DEVICE HISTORY
Operational.
5030. KITCHEN DEVICE RESET
Protected.
5031. KITCHEN DEVICE UNPAIR
Protected.
5032. WTF DASHBOARD CUSTOMER DISPLAYS MODULE
Administrar WTF CDS.
5033. CDS DEVICE LIST
- name;
- branch;
- register;
- status;
- IP;
- version;
- last seen.
5034. CDS ASSIGN REGISTER
Sí.
5035. CDS TEST
Sí.
5036. CDS BRANDING
Organization/Branch.
5037. CDS IDLE CONTENT
Configurable.
5038. CDS THANK-YOU MESSAGE
Default:
¡Gracias por su compra, WTFLover!
5039. CDS THANK-YOU CUSTOMIZATION
Puede permitir editar, pero mantener default WTF.
5040. CDS THANK-YOU DURATION
Config.
5041. CDS TURN NUMBER DISPLAY
Toggle.
5042. CDS CHANGE DISPLAY
Toggle.
5043. CDS DISCOUNT DISPLAY
Default ON.
5044. CDS TAX DISPLAY
Default ON.
5045. CDS CHARGE DISPLAY
Default ON.
5046. CDS MODIFIER DISPLAY
Default ON.
5047. CDS PRODUCT IMAGE DISPLAY FUTURE
Opcional.
5048. CDS PROMOTIONS FUTURE
Sí.
5049. CDS QR FUTURE
Sí.
5050. CDS CONFIG PUBLISH
Sí.
5051. CDS CONFIG SYNC
Sí.
5052. CDS DEVICE REPLACE
Sí.
5053. CDS DEVICE REVOKE
Sí.
5054. CDS DEVICE RESET
Protected.
5055. WTF DASHBOARD RECEIPTS MODULE
Configuración y consulta deben estar separadas.
5056. RECEIPT CONFIG PAGE
Sections:
Business Information
Layout
Content
Fiscal
Language
Printer
Preview
5057. RECEIPT BUSINESS INFORMATION
Puede heredar Branch.
5058. RECEIPT LOGO
Upload.
5059. RECEIPT HEADER TEXT
Optional.
5060. RECEIPT FOOTER TEXT
Optional.
5061. RECEIPT COMMENTS OPTION
Sí.
5062. RECEIPT CUSTOMER OPTION
Sí.
5063. RECEIPT PAYMENT OPTION
Sí.
5064. RECEIPT TURN OPTION
Sí.
5065. RECEIPT LANGUAGE OPTION
Sí.
5066. RECEIPT PAPER WIDTH
Sí.
5067. RECEIPT TAX OPTION
Según legal requirements.
5068. RECEIPT FISCAL OPTION
Required fields cannot be hidden.
5069. RECEIPT PREVIEW
Realtime.
5070. RECEIPT SAVE
Versioned config.
5071. RECEIPT TEST PRINT
Sí.
5072. RECEIPT TEST PRINT PRINTER SELECT
Sí.
5073. RECEIPT TEST PRINT NO SALE
Sí.
5074. WTF DASHBOARD FEATURES MODULE
Cada feature debe tener:
- toggle;
- description;
- dependencies;
- current status;
- Learn More/Más información.
5075. FEATURE SHIFTS DESCRIPTION
Controla el efectivo que entra y sale de la gaveta y permite realizar apertura y cierre de caja.
5076. FEATURE TIME CLOCK DESCRIPTION
**Registra las entradas y salidas de

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 28 | attachment=349c3e46-54d8-42e9-8536-5ae7613a9123 | rango=5076-5280 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
5076. FEATURE TIME CLOCK DESCRIPTION
Registra las entradas y salidas de los empleados y calcula el total de horas registradas.
No presentar esta función como un sistema completo de nómina.
5077. FEATURE OPEN TICKETS DESCRIPTION
Permite guardar y editar órdenes antes de completar el pago.
5078. FEATURE KITCHEN PRINTERS DESCRIPTION
Envía los artículos de una orden a impresoras de cocina o pantallas WTF KDS según las reglas de preparación configuradas.
5079. FEATURE CUSTOMER DISPLAYS DESCRIPTION
Muestra al cliente los artículos, precios y totales de su orden mediante WTF CDS durante el proceso de venta.
5080. FEATURE DINING OPTIONS DESCRIPTION
Permite identificar las órdenes como Comer aquí, Para llevar, Delivery, Apps Delivery u otras modalidades configuradas.
5081. FEATURE LOW STOCK DESCRIPTION
Genera alertas cuando un artículo alcanza o baja de su nivel mínimo de inventario configurado.
Puede incluir resumen diario por correo cuando el servicio esté configurado.
5082. FEATURE NEGATIVE STOCK DESCRIPTION
Advierte o bloquea, según la política configurada, cuando se intenta vender una cantidad mayor que el inventario disponible.
5083. FEATURE TOGGLE HELP
Cada feature debe incluir:
Más información
con:
- qué hace;
- qué cambia al activarla;
- dependencias;
- impacto de desactivarla.
5084. FEATURE TOGGLE CONFIRMATION
No solicitar confirmación para cada toggle trivial.
Sí solicitarla cuando desactivar pueda afectar datos/operación activa.
5085. FEATURE SHIFTS ENABLE
Al activar:
verificar Registers.
5086. FEATURE SHIFTS DISABLE
Verificar open shifts.
5087. FEATURE TIME CLOCK ENABLE
No requiere modificar ventas.
5088. FEATURE TIME CLOCK DISABLE
Conservar historial.
5089. FEATURE OPEN TICKETS ENABLE
Activar Save/Open Orders.
5090. FEATURE OPEN TICKETS DISABLE
Resolver open tickets.
5091. FEATURE KITCHEN ENABLE
Solicitar configurar destinations.
5092. FEATURE KITCHEN DISABLE
Resolver active orders/routing.
5093. FEATURE CDS ENABLE
Solicitar pairing opcional.
5094. FEATURE CDS DISABLE
CDS idle.
5095. FEATURE DINING ENABLE
Solicitar al menos una modalidad activa.
5096. FEATURE DINING DISABLE
Conservar historical dining option.
5097. FEATURE LOW STOCK ENABLE
Requiere minimumStock en productos relevantes.
5098. FEATURE NEGATIVE STOCK ENABLE
Requiere inventory tracking.
5099. FEATURE DEPENDENCY UI
Ejemplo:
Negative Stock Alerts requiere Inventory Tracking.
5100. FEATURE CASCADE ENABLE
No activar automáticamente múltiples features sensibles sin mostrarlo.
5101. FEATURE CONFIG STATUS
Puede mostrar:
- Ready
- Needs setup
- Active
- Disabled
- Error
5102. FEATURE NEEDS SETUP
Ejemplo:
Kitchen ON pero sin destination.
5103. FEATURE READY VALIDATION
Go-Live Validator.
5104. WTF DASHBOARD GENERAL SETTINGS
Debe incluir información de Organization y preferencias globales apropiadas.
5105. ORGANIZATION NAME
WTF – What's That Food!
Configurable.
5106. ORGANIZATION LEGAL NAME
Separado.
5107. ORGANIZATION TAX ID
Según país.
5108. ORGANIZATION LOGO
Sí.
5109. ORGANIZATION DEFAULT LANGUAGE
Sí.
5110. ORGANIZATION DEFAULT CURRENCY
Sí.
5111. ORGANIZATION COUNTRY
Sí.
5112. ORGANIZATION CONTACT
Opcional.
5113. ORGANIZATION SETTINGS AUDIT
Sí.
5114. ORGANIZATION SETTINGS BRANCH OVERRIDE
Cuando aplique.
5115. WTF DASHBOARD LOYALTY SETTINGS
Como el requerimiento original menciona Loyalty settings, crear sección en Configuración.
Si Loyalty no forma parte del release v1:
mostrar estado claramente:
Próximamente / No habilitado en esta versión
sin botones falsos.
5116. LOYALTY FEATURE FLAG
Preparar.
5117. LOYALTY V1 DECISION
No retrasar el núcleo POS por Loyalty.
5118. LOYALTY FUTURE CONFIG
Podrá incluir:
- earn rate;
- redemption;
- expiration;
- customer identification.
5119. LOYALTY LEDGER
Cuando se implemente.
5120. WTF DASHBOARD FISCAL RECEIPT SEQUENCES
La configuración debe permitir las dos familias solicitadas inicialmente:
Crédito Fiscal
B01 o E31 según configuración válida.
Consumidor Final
B02 o E32 según configuración válida.
No hardcodear que ambos formatos pueden utilizarse simultáneamente sin reglas.
5121. FISCAL SEQUENCE TYPE SELECTOR
Seleccionar tipo/document scheme.
5122. FISCAL SEQUENCE PREFIX
Validar según provider/config.
5123. FISCAL SEQUENCE START
Sí.
5124. FISCAL SEQUENCE END
Sí.
5125. FISCAL SEQUENCE CURRENT
Read-only/controlled.
5126. FISCAL SEQUENCE EXPIRATION
Cuando aplique.
5127. FISCAL SEQUENCE REMAINING
Mostrar.
5128. FISCAL SEQUENCE WARNING THRESHOLD
Configurable.
5129. FISCAL SEQUENCE TEST
No consumir número productivo.
5130. FISCAL SEQUENCE MANUAL CHANGE
Muy sensible.
5131. FISCAL SEQUENCE MANUAL CHANGE REAUTH
Sí.
5132. FISCAL SEQUENCE MANUAL CHANGE REASON
Obligatorio.
5133. FISCAL SEQUENCE AUDIT
Obligatorio.
5134. FISCAL SEQUENCE HISTORY
Sí.
5135. FISCAL SEQUENCE DEVICE ALLOCATION
Solo si offline architecture/legal rules lo requieren.
5136. FISCAL SEQUENCE NO MAX+1
Reiteración.
5137. FISCAL SEQUENCE CONCURRENCY TEST
Sí.
5138. WTF DASHBOARD POS DEVICE AUTHORIZATION FLOW
Cuando un WTF POS nuevo solicite autorización:
Dashboard muestra:
- device name;
- app version;
- device model;
- request time;
- requested branch;
- verification code cuando se utilice.
5139. DEVICE AUTH APPROVE
Admin selecciona:
- Branch;
- Register;
- permissions/profile técnico cuando corresponda.
5140. DEVICE AUTH REJECT
Sí.
5141. DEVICE AUTH REQUEST EXPIRY
Sí.
5142. DEVICE AUTH REQUEST REPLAY
No.
5143. DEVICE AUTH SUCCESS
POS recibe autorización.
5144. DEVICE AUTH DOWNLOAD CONFIG
Después.
5145. DEVICE AUTH QR FUTURE
Puede simplificar provisioning.
5146. DEVICE AUTH OWNER APPROVAL
Puede requerir Owner/Admin.
5147. DEVICE AUTH BRANCH MANAGER
Puede autorizar únicamente en su Branch si permiso.
5148. DEVICE AUTH REGISTER CONFLICT
No asignar dos POS al mismo Register si la política lo impide.
5149. MULTIPLE POS PER REGISTER
Definir.
Recomendación:
un Register lógico puede tener un dispositivo activo principal a la vez, salvo diseño explícito.
5150. DEVICE REPLACEMENT FLOW
Dashboard:
Reemplazar dispositivo
5151. DEVICE REPLACEMENT STEPS
1. seleccionar Register;
2. seleccionar device anterior;
3. verificar pendientes;
4. autorizar nuevo;
5. revocar anterior;
6. descargar config;
7. test.
5152. DEVICE REPLACEMENT HISTORY
Sí.
5153. DEVICE AUTH WITHOUT REGISTER
Puede autorizar como pending setup, pero no vender si Register required.
5154. KDS AUTHORIZATION FLOW
Similar, asignando Station.
5155. CDS AUTHORIZATION FLOW
Similar, asignando Register.
5156. PRINTER AUTHORIZATION
No necesariamente cloud auth.
Config/association.
5157. WTF DASHBOARD ROLES MODULE
Crear pantalla:
Roles y permisos
5158. ROLE LIST
- Name
- Employees
- Scope
- Status.
5159. ROLE CREATE
Sí.
5160. ROLE EDIT
Sí.
5161. ROLE DUPLICATE
Sí.
5162. ROLE ARCHIVE
Sí.
5163. ROLE PERMISSION MATRIX
Checkbox/toggles agrupados.
5164. ROLE PERMISSION SEARCH
Sí.
5165. ROLE PERMISSION SELECT ALL
Solo por grupo y con cuidado.
5166. ROLE DANGEROUS PERMISSIONS
Destacar.
5167. ROLE SAVE IMPACT
Mostrar empleados afectados.
5168. ROLE BUILT-IN
Puede existir plantilla, pero permitir custom.
5169. OWNER ROLE
Protegido.
5170. CASHIER DEFAULT PERMISSIONS
Ejemplo conceptual:
- sales.create;
- openTickets;
- receipts basic;
- cash shift operations según política.
No refunds/admin por defecto.
5171. MANAGER DEFAULT PERMISSIONS
Más amplios.
5172. KITCHEN ROLE
KDS.
5173. ADMIN ROLE
Configuración.
5174. PERMISSION SALES CREATE
Sí.
5175. PERMISSION SALES VOID
Separado.
5176. PERMISSION SALES REFUND
Separado.
5177. PERMISSION SALES DISCOUNT
Separado.
5178. PERMISSION SALES PRICE_OVERRIDE
Separado.
5179. PERMISSION RECEIPT REPRINT
Separado.
5180. PERMISSION SHIFT OPEN
Sí.
5181. PERMISSION SHIFT CLOSE
Sí.
5182. PERMISSION CASH IN
Sí.
5183. PERMISSION CASH OUT
Sí.
5184. PERMISSION DRAWER OPEN
Sí.
5185. PERMISSION PRODUCTS VIEW
Sí.
5186. PERMISSION PRODUCTS MANAGE
Sí.
5187. PERMISSION PRICES MANAGE
Puede separarse.
5188. PERMISSION TAX MANAGE
Muy sensible.
5189. PERMISSION FISCAL MANAGE
Muy sensible.
5190. PERMISSION CUSTOMERS VIEW
Sí.
5191. PERMISSION CUSTOMERS MANAGE
Sí.
5192. PERMISSION CUSTOMERS EXPORT
Separado.
5193. PERMISSION EMPLOYEES VIEW
Sí.
5194. PERMISSION EMPLOYEES MANAGE
Sí.
5195. PERMISSION ROLES MANAGE
Muy sensible.
5196. PERMISSION REPORTS VIEW
Sí.
5197. PERMISSION REPORTS EXPORT
Sí.
5198. PERMISSION COSTS VIEW
Sí.
5199. PERMISSION DEVICES VIEW
Sí.
5200. PERMISSION DEVICES MANAGE
Sí.
5201. PERMISSION KITCHEN CONFIG
Sí.
5202. PERMISSION CDS CONFIG
Sí.
5203. PERMISSION RECEIPT CONFIG
Sí.
5204. PERMISSION BRANCH MANAGE
Sí.
5205. PERMISSION AUDIT VIEW
Sí.
5206. PERMISSION SYNC ADMIN
Sí.
5207. PERMISSION PAYMENT RECONCILE
Muy sensible.
5208. PERMISSION FISCAL RECONCILE
Muy sensible.
5209. PERMISSION TIME_CLOCK_CORRECT
Sí.
5210. PERMISSION INVENTORY_ADJUST
Sí.
5211. PERMISSION INVENTORY_COST
Sí.
5212. PERMISSION SETTINGS_FEATURES
Sí.
5213. PERMISSION ORGANIZATION_MANAGE
Owner/Admin.
5214. PERMISSION OWNER_MANAGE
Owner only.
5215. PERMISSION ENFORCEMENT TEST
Cada uno.
5216. WTF DASHBOARD EMPLOYEE CREATE FLOW
Secuencia:
1. datos personales;
2. rol;
3. sucursales;
4. acceso POS;
5. PIN;
6. Dashboard access cuando aplique;
7. guardar.
5217. EMPLOYEE CREATE NAME
Required.
5218. EMPLOYEE CREATE EMAIL
Según account type.
5219. EMPLOYEE CREATE PHONE
Según policy.
5220. EMPLOYEE CREATE ROLE
Required.
5221. EMPLOYEE CREATE BRANCH
Al menos una si POS employee.
5222. EMPLOYEE CREATE PIN
4–6 dígitos.
5223. EMPLOYEE CREATE BIOMETRIC
No se registra desde Dashboard.
Mostrar:
El empleado podrá habilitar biometría en un dispositivo compatible después de iniciar sesión con su PIN.
si esa es la arquitectura elegida.
5224. EMPLOYEE CREATE SAVE
Sí.
5225. EMPLOYEE CREATE CANCEL
Sí.
5226. EMPLOYEE CREATE DOUBLE SUBMIT
Un empleado.
5227. EMPLOYEE EDIT
No mostrar PIN.
5228. EMPLOYEE RESET PIN
Acción.
5229. EMPLOYEE DEACTIVATE
Acción.
5230. EMPLOYEE ARCHIVE
Sí.
5231. EMPLOYEE TERMINATION DATE
Sí.
5232. EMPLOYEE REACTIVATE
Validar role/branch/PIN.
5233. EMPLOYEE SALES HISTORY
No borrar.
5234. EMPLOYEE TIME CLOCK HISTORY
No borrar.
5235. EMPLOYEE AUDIT HISTORY
Sí.
5236. EMPLOYEE CURRENT SESSIONS
Admin puede revocar.
5237. EMPLOYEE ACTIVE SHIFT
Al desactivar:
advertir si tiene shift/operations.
5238. EMPLOYEE DEACTIVATE WITH OPEN SHIFT
No cerrar automáticamente.
Manager debe resolver/transferir.
5239. EMPLOYEE DEACTIVATE WITH OPEN TICKETS
No borrar.
5240. WTF DASHBOARD CUSTOMER CREATE FLOW
Formulario sencillo inicialmente.
5241. CUSTOMER FORM BASIC SECTION
- Nombre
- Teléfono
- Correo
5242. CUSTOMER FORM BUSINESS/FISCAL SECTION
- Razón Social
- RNC
5243. CUSTOMER FORM ADDRESS SECTION
- Dirección
- Ciudad
- Estado/Provincia
5244. CUSTOMER FORM TYPE
Persona/Empresa.
5245. CUSTOMER FORM SAVE
Sí.
5246. CUSTOMER FORM CANCEL
Sí.
5247. CUSTOMER FORM VALIDATION
Inline.
5248. CUSTOMER DUPLICATE CHECK
Sí.
5249. CUSTOMER IMPORT BUTTON
Visible.
5250. CUSTOMER IMPORT FILE TYPES
Como mínimo:
- CSV;
- XLSX;
si las librerías/arquitectura lo permiten de forma segura.
5251. CUSTOMER IMPORT STEP 1
Seleccionar archivo.
5252. CUSTOMER IMPORT STEP 2
Mapear columnas.
5253. CUSTOMER IMPORT STEP 3
Validar/preview.
5254. CUSTOMER IMPORT STEP 4
Confirmar.
5255. CUSTOMER IMPORT STEP 5
Resultado.
5256. CUSTOMER IMPORT RESULT
- total;
- imported;
- updated;
- skipped;
- errors.
5257. CUSTOMER IMPORT ERROR DOWNLOAD
Sí.
5258. CUSTOMER IMPORT HISTORY
Sí.
5259. WTF DASHBOARD REPORT HOME
Mostrar tarjetas de reportes solicitados.
5260. REPORT SALES DAILY CARD
Sí.
5261. REPORT SALES BY ITEM CARD
Sí.
5262. REPORT SALES BY CATEGORY CARD
Sí.
5263. REPORT SALES BY EMPLOYEE CARD
Sí.
5264. REPORT SALES BY PAYMENT CARD
Sí.
5265. REPORT RECEIPTS CARD
Sí.
5266. REPORT MODIFIERS CARD
Sí.
5267. REPORT DISCOUNTS CARD
Sí.
5268. REPORT TAXES CARD
Sí.
5269. REPORT SHIFTS CARD
Sí.
5270. REPORT ADDITIONAL CARDS
Puede incluir:
- Refunds
- Voids
- Dining Options
- Sales Channels
- Inventory
- Time Clock
según features.
5271. REPORT HOME DATE FILTER
Global.
5272. REPORT HOME BRANCH FILTER
Global.
5273. REPORT CARD PREVIEW
Puede mostrar mini KPI.
5274. REPORT OPEN
Detalle.
5275. REPORT EXPORT
Sí.
5276. REPORT PRINT
Opcional.
5277. REPORT PERMISSION
Sí.
5278. WTF DASHBOARD HOME
Puede mostrar resumen ejecutivo:
- ventas hoy;
- tickets;
- average ticket;
- open shifts;
- low stock;
- system alerts.
5279. DASHBOARD HOME SALES TODAY
BusinessDate.
5280. DASHBOARD HOME YESTERDAY COMPARISON

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 29 | attachment=19ee6680-73b6-4849-ad7c-f45cce72f14c | rango=5280-5481 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
5280. DASHBOARD HOME YESTERDAY COMPARISON
Puede mostrar comparación con el businessDate anterior.
Ejemplo:
Ventas de hoy
RD$124,850.00

vs. día anterior
+8.4%
No mostrar porcentaje cuando el período anterior no tenga una base válida.
5281. DASHBOARD HOME TICKETS
Cantidad de ventas completadas.
5282. DASHBOARD HOME AVERAGE TICKET
Según definición oficial del sistema.
5283. DASHBOARD HOME REFUNDS
Mostrar cuando existan.
5284. DASHBOARD HOME DISCOUNTS
Puede mostrar monto.
5285. DASHBOARD HOME OPEN SHIFTS
Cantidad.
5286. DASHBOARD HOME OPEN TICKETS
Cantidad cuando feature activa.
5287. DASHBOARD HOME LOW STOCK
Cantidad.
5288. DASHBOARD HOME DEVICES
Resumen:
- online;
- offline;
- attention required.
5289. DASHBOARD HOME KDS
Estado.
5290. DASHBOARD HOME SYNC
Mostrar devices con backlog.
5291. DASHBOARD HOME FISCAL
Mostrar critical issues únicamente.
5292. DASHBOARD HOME PAYMENT
Mostrar unknown/failed reconciliations.
5293. DASHBOARD HOME ALERTS
Prioridad.
5294. DASHBOARD HOME QUICK LINKS
Según rol.
5295. DASHBOARD HOME DATA FRESHNESS
Sí.
5296. DASHBOARD HOME BRANCH CONTEXT
Sí.
5297. DASHBOARD HOME MULTI-BRANCH
Owner puede consolidar.
5298. DASHBOARD HOME PERFORMANCE
No ejecutar 20 queries pesadas por cada refresh.
Utilizar agregados/caching apropiado.
5299. DASHBOARD HOME ERROR ISOLATION
Si Inventory widget falla:
Sales widget puede seguir.
5300. DASHBOARD HOME EMPTY STATE
Para nueva organización:
mostrar onboarding/setup, no gráficos vacíos sin explicación.
5301. WTF DASHBOARD ONBOARDING
Para una instalación nueva:
crear checklist:
1. Organización
2. Sucursal
3. Impuestos/cargos
4. Modalidades
5. Métodos de pago
6. Catálogo
7. Empleados
8. Caja/Register
9. Dispositivo POS
10. Cocina
11. CDS
12. Recibos
13. Validar configuración
5302. ONBOARDING PROGRESS
Mostrar porcentaje/pasos.
5303. ONBOARDING OPTIONAL STEPS
KDS/CDS pueden marcarse opcionales si features OFF.
5304. ONBOARDING BLOCKERS
Fiscal puede ser obligatorio según Branch.
5305. ONBOARDING COMPLETE
No significa automáticamente Production Ready.
Debe pasar validator/tests.
5306. ONBOARDING RESUME
Sí.
5307. ONBOARDING SKIP
Solo pasos realmente opcionales.
5308. ONBOARDING DEMO DATA
Opcional únicamente en non-production/training.
5309. ONBOARDING DEFAULT WTF TEMPLATE
Puede ofrecer:
Configurar una sucursal WTF con valores iniciales recomendados
pero debe mostrar qué se creará.
5310. DEFAULT WTF TEMPLATE CONTENT
Puede incluir:
- Comer aquí
- Para llevar
- Delivery
- Apps Delivery
- PriceBook Regular
- PriceBook Apps Delivery
- ITBIS template
- Service charge template
- payment method Cash
No incluir credenciales/fiscal sequence inventada.
5311. DEFAULT WTF TEMPLATE REVIEW
Antes de guardar:
mostrar:
Revise impuestos y configuración fiscal antes de operar.
5312. ONBOARDING CATALOG IMPORT
Puede importar productos.
5313. ONBOARDING CUSTOMER IMPORT
Opcional.
5314. ONBOARDING EMPLOYEE CREATE
Al menos Owner/Admin + cashier.
5315. ONBOARDING REGISTER CREATE
Sí.
5316. REGISTER ENTITY
Campos:
- id;
- branchId;
- name;
- code;
- status;
- default receipt printer;
- cash drawer config;
- settings.
5317. REGISTER NAME
Ejemplo:
Caja Principal
5318. REGISTER CODE
Ejemplo:
CAJA01
5319. REGISTER STATUS
- ACTIVE
- INACTIVE
- ARCHIVED
5320. REGISTER ACTIVE SHIFT
Relación.
5321. REGISTER DEVICE
Association.
5322. REGISTER CDS
Association.
5323. REGISTER RECEIPT PRINTER
Association.
5324. REGISTER CASH DRAWER
Association.
5325. REGISTER TURN PREFIX
Puede configurarse.
5326. REGISTER RECEIPT PREFIX
Puede configurarse.
5327. REGISTER DEFAULT DINING OPTION
Opcional.
5328. REGISTER DEFAULT PAYMENT
No recomendar auto-seleccionar método que pueda causar error.
Puede ordenar favoritos.
5329. REGISTER ARCHIVE
Precheck.
5330. REGISTER CREATE DASHBOARD
Sí.
5331. REGISTER EDIT DASHBOARD
Sí.
5332. REGISTER TEST HARDWARE
Sí.
5333. REGISTER READINESS
Mostrar:
- POS device;
- printer;
- drawer;
- CDS.
5334. REGISTER NO POS DEVICE
Puede existir como setup incompleto.
5335. REGISTER NO PRINTER
Puede operar digital/sin impresión si policy.
5336. REGISTER NO CASH DRAWER
Puede operar.
5337. REGISTER NO CDS
Puede operar.
5338. REGISTER NO KDS
KDS es Branch/station, no necesariamente register.
5339. REGISTER MULTIPLE DEVICES
Definir active assignment.
5340. REGISTER DEVICE HISTORY
Sí.
5341. WTF DASHBOARD BRANCH ONBOARDING
Después de crear Branch:
sugerir:
- dining;
- taxes;
- payments;
- register;
- kitchen.
5342. BRANCH CLONE CONFIG
Puede existir P1.
5343. BRANCH DEFAULTS
Organization.
5344. BRANCH FISCAL REQUIRED FLAG
Según country/config.
5345. BRANCH INVENTORY INTEGRATION
Sí.
5346. BRANCH SALES CHANNELS
Config.
5347. BRANCH RECEIPT
Config.
5348. BRANCH KITCHEN
Config.
5349. BRANCH DEVICES
Config.
5350. BRANCH REPORTS
Context.
5351. BRANCH ARCHIVE
Checklist.
5352. WTF DASHBOARD SALES CHANNELS
Puede existir dentro de Dining/Integrations.
5353. SALES CHANNEL ENTITY
- id;
- name;
- code;
- type;
- active;
- branch;
- PriceBook.
5354. SALES CHANNEL TYPES
- DIRECT_POS
- DELIVERY_APP
- OTHER
5355. SALES CHANNEL DELIVERY APP
Ejemplos configurables:
- Uber Eats
- PedidosYa
- DoorDash
- Otro
No hardcodear como únicos.
5356. SALES CHANNEL PRICEBOOK
Sí.
5357. SALES CHANNEL PAYMENT DEFAULT
Puede configurarse, pero no asumir siempre.
5358. SALES CHANNEL TAX
Normalmente Dining Option/TaxRule.
5359. SALES CHANNEL EXTERNAL REFERENCE
Sí.
5360. SALES CHANNEL ARCHIVE
Sí.
5361. SALES CHANNEL REPORT
Sí.
5362. SALES CHANNEL INTEGRATION FUTURE
Adapter.
5363. DELIVERY APP MANUAL MODE
V1.
5364. DELIVERY APP INTEGRATED MODE FUTURE
Sí.
5365. DELIVERY APP ORDER IMPORT FUTURE
Debe ser idempotente por external order ID.
5366. DELIVERY APP MENU SYNC FUTURE
Sí.
5367. DELIVERY APP PRICE SYNC FUTURE
Sí.
5368. DELIVERY APP AVAILABILITY SYNC FUTURE
Sí.
5369. DELIVERY APP ACCEPT/REJECT FUTURE
Sí.
5370. DELIVERY APP DOES NOT BLOCK V1
Manual mode.
5371. WTF DASHBOARD AUDIT MODULE
Crear interfaz de auditoría de solo lectura para usuarios autorizados.
5372. AUDIT LIST COLUMNS
- date/time;
- actor;
- action;
- entity;
- branch;
- summary.
5373. AUDIT FILTERS
- date;
- actor;
- action;
- entity type;
- branch.
5374. AUDIT DETAIL
Mostrar:
- before;
- after;
- reason;
- correlation;
- device;
- metadata sanitizada.
5375. AUDIT SECRET REDACTION
Sí.
5376. AUDIT EXPORT
Permission.
5377. AUDIT IMMUTABLE UI
No Edit/Delete.
5378. AUDIT RETENTION DISPLAY
No necesario al usuario salvo policy.
5379. AUDIT HIGH-RISK FILTER
Puede filtrar:
- refunds;
- voids;
- role changes;
- fiscal;
- devices;
- price overrides.
5380. AUDIT SEARCH
Por entity/reference.
5381. WTF DASHBOARD ALERT CENTER
Lista:
- severity;
- type;
- branch;
- resource;
- created;
- status.
5382. ALERT DETAIL
- description;
- impact;
- recommended action;
- timeline.
5383. ALERT ACKNOWLEDGE
Sí.
5384. ALERT RESOLVE
Automático/manual según type.
5385. ALERT ASSIGN FUTURE
Puede asignarse a usuario.
No P0.
5386. ALERT COMMENT FUTURE
Puede añadirse.
5387. ALERT EMAIL SETTINGS
Config.
5388. ALERT THRESHOLDS
Config técnica/business según type.
5389. LOW STOCK THRESHOLD
Por product.
5390. CASH DIFFERENCE THRESHOLD
Config.
5391. SYNC BACKLOG THRESHOLD
Technical config.
5392. DEVICE OFFLINE THRESHOLD
Technical.
5393. FISCAL RANGE THRESHOLD
Business.
5394. ALERT DUPLICATE SUPPRESSION
Sí.
5395. ALERT RESOLUTION EVENT
Guardar.
5396. WTF DASHBOARD SYSTEM STATUS PAGE
Secciones:
Cloud
Branches
Devices
Integrations
Sync
Backups
5397. CLOUD STATUS
- API;
- DB;
- workers.
5398. BRANCH STATUS
- last sync;
- POS;
- KDS;
- CDS.
5399. DEVICE STATUS
Sí.
5400. INTEGRATION STATUS
- fiscal;
- payments;
- inventory.
5401. SYNC STATUS
Pending/failures.
5402. BACKUP STATUS
Last successful.
5403. SYSTEM STATUS PERMISSION
Admin/Owner/support.
5404. SYSTEM STATUS AUTO REFRESH
Razonable.
5405. SYSTEM STATUS INCIDENT LINK
Sí.
5406. SYSTEM STATUS NO SECRET
Sí.
5407. WTF DASHBOARD BACKUP STATUS
No necesariamente permitir descargar raw DB.
Mostrar:
- last backup;
- status;
- next scheduled;
- restore test last date.
5408. BACKUP DOWNLOAD
Infra-only cuando sea necesario.
5409. BACKUP RESTORE BUTTON
No botón casual.
Proceso técnico/Owner protegido.
5410. BACKUP RESTORE CONFIRMATION
Fuerte.
5411. BACKUP RESTORE TARGET
Preferir ambiente separado.
5412. BACKUP RESTORE PRODUCTION
Procedimiento.
5413. WTF DASHBOARD CONFIGURATION HISTORY
Mostrar versiones publicadas.
5414. CONFIG HISTORY ENTRY
- version;
- publishedAt;
- actor;
- summary;
- scope.
5415. CONFIG HISTORY DIFF
Sí.
5416. CONFIG HISTORY ROLLBACK
Crear nueva versión basada en anterior.
5417. CONFIG HISTORY DEVICE ADOPTION
Mostrar cuántos devices aplicaron versión.
5418. CONFIG HISTORY PENDING DEVICES
Sí.
5419. CONFIG HISTORY FAILED DEVICES
Sí.
5420. CONFIG ROLLBACK ACTIVE ORDER
No modifica historical/open snapshot automáticamente.
5421. WTF DASHBOARD GO-LIVE VALIDATOR PAGE
Debe producir un reporte de preparación.
5422. GO-LIVE VALIDATOR CATEGORIES
Organization
Branch
Catalog
Employees
Payments
Taxes
Fiscal
Registers
Devices
Kitchen
CDS
Printing
Inventory
Backup
Security
5423. VALIDATOR BLOCKER
Rojo.
5424. VALIDATOR WARNING
Amarillo.
5425. VALIDATOR PASS
Verde + texto/icon.
No depender solo del color.
5426. VALIDATOR ORGANIZATION
Verificar datos mínimos.
5427. VALIDATOR BRANCH
Timezone/currency.
5428. VALIDATOR CATALOG
Productos vendibles tienen precio.
5429. VALIDATOR MODIFIERS
Required groups válidos.
5430. VALIDATOR TAX
No conflicts.
5431. VALIDATOR PAYMENT
At least one.
5432. VALIDATOR EMPLOYEE
At least one authorized cashier/admin.
5433. VALIDATOR REGISTER
At least one.
5434. VALIDATOR DEVICE
Authorized POS.
5435. VALIDATOR KITCHEN
Si feature ON.
5436. VALIDATOR CDS
Si feature ON.
5437. VALIDATOR PRINTER
Si required.
5438. VALIDATOR INVENTORY
Si feature ON.
5439. VALIDATOR FISCAL
Si required.
5440. VALIDATOR BACKUP
Configured/healthy.
5441. VALIDATOR SECURITY
No default credentials/test providers.
5442. VALIDATOR TEST MODE
Production Branch no debe quedar en training/test accidentalmente.
5443. VALIDATOR OUTPUT
Botón:
Descargar reporte de validación
5444. VALIDATOR TIMESTAMP
Sí.
5445. VALIDATOR VERSION
Config/app/backend versions.
5446. VALIDATOR DOES NOT REPLACE QA
Sí.
5447. WTF DASHBOARD PRODUCTION READINESS
Puede enlazar:
- validator;
- QA;
- hardware;
- pilot.
5448. WTF DASHBOARD HELP CENTER
Puede integrar documentación.
5449. HELP SEARCH
P1.
5450. HELP CONTEXTUAL
Links desde settings.
5451. HELP KDS PAIRING
Sí.
5452. HELP CDS PAIRING
Sí.
5453. HELP PRINTER
Sí.
5454. HELP OFFLINE
Sí.
5455. HELP PAYMENT UNKNOWN
Sí.
5456. HELP FISCAL
Admin.
5457. HELP SHIFT
Sí.
5458. HELP IMPORT
Sí.
5459. HELP LANGUAGE
Sí.
5460. HELP VERSION
Actualizar con release.
5461. API — AUTHENTICATION ENDPOINTS
Implementar según auth architecture.
Como mínimo conceptualmente:
- login;
- refresh;
- logout;
- password reset;
- current user.
No utilizar exactamente estos paths si el framework existente ya tiene convención válida.
5462. API — DEVICE ENDPOINTS
Conceptualmente:
- request authorization;
- approve/reject;
- list;
- detail;
- revoke;
- heartbeat;
- config acknowledgement.
5463. API — BRANCH ENDPOINTS
CRUD/archive según permissions.
5464. API — REGISTER ENDPOINTS
CRUD/archive.
5465. API — EMPLOYEE ENDPOINTS
CRUD/deactivate/reset PIN.
5466. API — ROLE ENDPOINTS
CRUD/archive.
5467. API — PRODUCT ENDPOINTS
CRUD/archive/import/export.
5468. API — CATEGORY ENDPOINTS
CRUD/order/archive.
5469. API — MODIFIER ENDPOINTS
CRUD.
5470. API — DISCOUNT ENDPOINTS
CRUD.
5471. API — CUSTOMER ENDPOINTS
CRUD/import/search.
5472. API — DINING OPTION ENDPOINTS
CRUD/config.
5473. API — PRICEBOOK ENDPOINTS
CRUD/prices.
5474. API — TAX ENDPOINTS
CRUD/test/publish.
5475. API — CHARGE ENDPOINTS
CRUD/test/publish.
5476. API — PAYMENT METHOD ENDPOINTS
CRUD.
5477. API — SALE ENDPOINTS
Create/sync/detail/refund/void according to architecture.
5478. API — OPEN TICKET ENDPOINTS
Create/update/list/cancel/transfer.
5479. API — RECEIPT ENDPOINTS
Detail/retrieve/reprint metadata.
5480. API — SHIFT ENDPOINTS
Open/movements/close/list.
5481. API — TIME CLOCK ENDPOINTS
Clock in/out/corrections

























GPT 5.6 Instant















FuentesAún no hay fuentes





















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.












⋮⋮⋮⋮
⋮⋮⋮⋮

<!-- PARTE 30 | attachment=b1d4ccb7-ead2-4881-9e8a-e01918060da7 | rango=5481-5680 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
5481. API — TIME CLOCK ENDPOINTS
Implementar conceptualmente operaciones para:
- Clock In;
- Clock Out;
- estado actual;
- historial;
- correcciones autorizadas;
- reportes/exportación.
Las rutas exactas deben respetar la convención del backend real.
5482. API — KITCHEN ENDPOINTS
Conceptualmente:
- stations;
- routing;
- active orders;
- history;
- events;
- device associations;
- test order.
La operación LAN no debe depender de una request cloud para cada comanda.
5483. API — CDS ENDPOINTS
Principalmente administración/configuración:
- devices;
- associations;
- branding;
- settings;
- status.
Las actualizaciones de carrito pueden ser LAN directas.
5484. API — PRINTER ENDPOINTS
Configuración central cuando corresponda.
La impresión local no debe enviar cada ticket al cloud para después regresar a la misma impresora LAN salvo arquitectura justificada.
5485. API — INVENTORY ENDPOINTS
Según integración:
- stock;
- movements;
- adjustments;
- alerts;
- mappings.
5486. API — REPORT ENDPOINTS
Cada reporte debe aceptar filtros server-side.
5487. API — EXPORT ENDPOINTS
Crear job/consultar/download.
5488. API — AUDIT ENDPOINTS
Read-only.
5489. API — ALERT ENDPOINTS
List/detail/acknowledge.
5490. API — CONFIG ENDPOINTS
Draft/publish/history/effective config.
5491. API — SYNC ENDPOINTS
Batch push/pull/checkpoint según arquitectura.
5492. API — FISCAL ENDPOINTS
Config/status/reconciliation.
5493. API — PAYMENT RECONCILIATION ENDPOINTS
Cuando integrated provider.
5494. API VERSION PREFIX
Ejemplo:
/api/v1
si corresponde.
5495. API PAGINATION
Estándar consistente.
5496. API FILTER FORMAT
Consistente.
5497. API SORT FORMAT
Consistente.
5498. API ERROR FORMAT
Definir estructura:
{
  "code": "PRODUCT_BARCODE_DUPLICATE",
  "message": "...",
  "field": "barcode",
  "correlationId": "..."
}
No incluir stack trace.
5499. API VALIDATION ERROR
Puede contener lista de field errors.
5500. API IDEMPOTENCY HEADER/KEY
Para operaciones críticas.
5501. API IDEMPOTENCY STORAGE
Persistir resultado suficiente.
5502. API IDEMPOTENCY EXPIRY
Definir según operación.
No expirar demasiado pronto para retries reales.
5503. API IDEMPOTENCY CONFLICT
Misma key + payload diferente:
rechazar.
5504. API CORRELATION ID
Aceptar/generar.
5505. API REQUEST ID
Puede ser diferente.
5506. API AUTHORIZATION
Server-side.
5507. API TENANT CONTEXT
Server-side.
5508. API BRANCH CONTEXT
Validado.
5509. API DEVICE CONTEXT
Para POS sync/device requests.
5510. API RATE LIMIT RESPONSE
Claro.
5511. API RETRY-AFTER
Cuando apropiado.
5512. API CACHE HEADERS
Para catálogo/assets cuando útil.
No cachear respuestas sensibles incorrectamente.
5513. API ETAG
Puede utilizarse para config/catalog.
5514. API CONDITIONAL GET
Sí.
5515. API COMPRESSION
Sí.
5516. API CONTENT TYPE
JSON.
Uploads multipart/appropriate.
5517. API MAX BODY
Config.
5518. API DATE FORMAT
ISO 8601.
5519. API MONEY FORMAT
Definir exactamente.
Ejemplo:
minor units + currency
o decimal string.
No JSON floating point ambiguo.
5520. API QUANTITY FORMAT
Decimal string cuando necesario.
5521. API ENUM FORMAT
Stable codes.
5522. API BOOLEAN
Boolean real.
5523. API NULL SEMANTICS
Documentar.
5524. API PATCH
Si se utiliza:
distinguir missing vs null.
5525. API DELETE
Para business entities preferir archive endpoint/status.
5526. API SECURITY HEADERS
Sí.
5527. API CORS
Exact.
5528. API DOCUMENTATION
OpenAPI.
5529. API EXAMPLES
Utilizar datos ficticios.
5530. API DEPRECATION
Documentar.
5531. API BREAKING CHANGE TEST
Sí.
5532. REALTIME — CLOUD
Si Dashboard necesita realtime:
WebSocket/SSE según stack.
5533. REALTIME — LAN
POS↔KDS/CDS protocol.
5534. REALTIME MESSAGE ENVELOPE
Conceptualmente:
{
  "messageId": "...",
  "type": "...",
  "protocolVersion": 1,
  "deviceId": "...",
  "sentAt": "...",
  "payload": {...}
}
Añadir auth/context según diseño.
5535. REALTIME MESSAGE ID
Global unique.
5536. REALTIME MESSAGE TYPE
Stable.
5537. REALTIME PROTOCOL VERSION
Sí.
5538. REALTIME PAYLOAD VERSION
Puede existir.
5539. REALTIME ACK
Debe referenciar messageId/eventId.
5540. REALTIME NACK
Puede indicar error.
5541. REALTIME HEARTBEAT
Sí.
5542. REALTIME AUTH HANDSHAKE
Sí.
5543. REALTIME RECONNECT
Sí.
5544. REALTIME RESUME
Puede utilizar last sequence/revision.
5545. REALTIME SNAPSHOT REQUEST
Sí.
5546. REALTIME SNAPSHOT RESPONSE
Sí.
5547. REALTIME DELTA
Sí.
5548. REALTIME DUPLICATE
Ignore/idempotent.
5549. REALTIME OUT OF ORDER
Sequence/revision.
5550. REALTIME INVALID MESSAGE
Reject/log.
5551. REALTIME UNKNOWN TYPE
Si optional:
ignore/log.
Si required:
version incompatibility.
5552. REALTIME MAX MESSAGE SIZE
Sí.
5553. REALTIME COMPRESSION
No necesaria inicialmente.
5554. REALTIME BINARY
No necesario para órdenes simples.
JSON/protobuf según decisión.
5555. REALTIME PROTOCOL ADR
Obligatorio.
5556. KDS MESSAGE TYPES
Como mínimo conceptualmente:
- KITCHEN_ORDER_SNAPSHOT
- KITCHEN_ORDER_CREATED
- KITCHEN_ORDER_UPDATED
- KITCHEN_ORDER_CANCELLED
- KITCHEN_ORDER_STATUS_CHANGED
- ACK
- SNAPSHOT_REQUEST
5557. CDS MESSAGE TYPES
- DISPLAY_SESSION_STARTED
- DISPLAY_SNAPSHOT
- DISPLAY_DELTA
- PAYMENT_STATUS
- DISPLAY_COMPLETED
- DISPLAY_CANCELLED
- ACK
- SNAPSHOT_REQUEST
5558. KDS ORDER CREATED PAYLOAD
Debe contener todos los snapshots de preparación necesarios.
5559. KDS ORDER UPDATED PAYLOAD
Delta/revision.
5560. KDS ORDER CANCELLED PAYLOAD
Reason/context.
5561. KDS STATUS EVENT
KDS → POS/cloud.
5562. KDS ACK AFTER DB
Sí.
5563. CDS ACK AFTER APPLY
Puede ser útil.
5564. CDS NO BUSINESS WRITE
No envía cambios de Sale.
5565. LAN DISCOVERY PROTOCOL
Documentar.
5566. LAN DISCOVERY PAYLOAD
Mínimo:
- appType;
- deviceId;
- friendlyName;
- IP/port;
- protocolVersion;
- environment.
No secret.
5567. LAN DISCOVERY AUTH
Discovery puede ser visible localmente; pairing/auth protege operaciones.
5568. LAN DISCOVERY SPOOF
Handshake evita confiar en anuncio.
5569. LAN PAIRING NONCE
Sí.
5570. LAN PAIRING CODE
Temporal.
5571. LAN PAIRING QR
Puede contener endpoint + nonce.
No permanent secret.
5572. LAN PAIRING CODE LENGTH
Suficiente para uso temporal.
Ejemplo 6 dígitos.
5573. LAN PAIRING RATE LIMIT
Sí.
5574. LAN PAIRING REPLAY
No.
5575. LAN PAIRING CONFIRM BOTH SIDES
Recomendado.
5576. LAN PAIRING CLOUD APPROVAL
Puede combinarse con device authorization.
5577. LAN SESSION KEY
Derivada/provisionada de forma segura.
5578. LAN SESSION KEY ROTATION
Sí.
5579. LAN SESSION EXPIRY
Sí.
5580. LAN RECONNECT AUTH
No repetir pairing cada vez.
5581. LAN UNPAIR REVOCATION
Sí.
5582. LAN MESSAGE ENCRYPTION
Implementar según ADR/security review.
5583. LAN PLAINTEXT SENSITIVE DATA
Evitar.
5584. LAN CERTIFICATE PINNING
Puede utilizarse si estrategia sostenible.
5585. LAN CLOCK SKEW
No depender excesivamente de sentAt para auth sin tolerancia.
5586. LAN REPLAY CACHE
messageId/nonce.
5587. LAN ORDER REPLAY
Idempotent.
5588. LAN CONNECTION MULTIPLEX
Puede enviar múltiples orders sobre una conexión.
5589. LAN CONNECTION LOSS
Persisted queue.
5590. LAN CONNECTION RESTORE
Replay pending.
5591. LAN KDS BACKPRESSURE
Si KDS lento:
queue.
No bloquear UI indefinidamente.
5592. LAN CDS BACKPRESSURE
Solo latest snapshot/deltas; puede coalescer.
5593. CDS COALESCE
Si carrito cambia 10 veces rápidamente:
puede enviar snapshot/revision actual en vez de todas las animaciones.
5594. KDS MUST NOT COALESCE SEMANTIC EVENTS UNSAFELY
Cancel/add events deben preservarse/reconciliarse.
5595. LAN TEST TOOL
Crear diagnostic simulator.
5596. LAN PROTOCOL LOG
Debug sanitized.
5597. LAN PROTOCOL PRODUCTION LOG
Minimal.
5598. LAN CONNECTION METRIC
Latency/reconnect count.
5599. KDS DELIVERY METRIC
Time to ACK.
5600. CDS DELIVERY METRIC
Optional.
5601. PRINTING ARCHITECTURE
Crear abstracción:
PrintService
   ↓
PrintQueue
   ↓
PrinterAdapter
   ├── NetworkEscPosAdapter
   ├── BluetoothAdapter
   ├── UsbAdapter
   └── VirtualPrinterAdapter
Solo adapters realmente implementados.
5602. PRINT JOB ENTITY
Campos conceptuales:
- id;
- type;
- printerId;
- sourceEntityId;
- contentSnapshot;
- status;
- attempts;
- createdAt;
- lastAttemptAt;
- errorCode.
5603. PRINT JOB TYPE
- RECEIPT
- KITCHEN
- KITCHEN_DELTA
- SHIFT_SUMMARY
- TEST
5604. PRINT JOB STATUS
- PENDING
- PRINTING
- SUCCEEDED
- FAILED
- UNKNOWN
- CANCELLED
5605. PRINT JOB RETRYABLE
Derivar de error.
5606. PRINT JOB PRIORITY
Kitchen/receipt high.
5607. PRINT JOB PERSISTENCE
Durable.
5608. PRINT JOB CRASH RECOVERY
Sí.
5609. PRINT JOB DUPLICATE PHYSICAL LIMITATION
Documentar.
5610. PRINT JOB MANUAL RETRY
Sí.
5611. PRINT JOB AUTO RETRY
Solo cuando safe enough.
5612. PRINT JOB UNKNOWN
Manual verification.
5613. PRINT JOB CANCEL
Solo pending, no asumir que puede detener bytes ya enviados.
5614. PRINT JOB HISTORY
Sí.
5615. PRINT JOB CLEANUP
Procesados después de retention.
5616. RECEIPT RENDERER
Separado de transport.
5617. KITCHEN RENDERER
Separado.
5618. RENDERER TEST
Golden/snapshot.
5619. ESC/POS COMMANDS
Encapsular.
5620. ESC/POS MODEL DIFFERENCES
Adapter/capabilities.
5621. RAW TCP PRINT
Solo para impresoras/protocolos compatibles.
5622. BLUETOOTH PRINT
Solo si implementado.
5623. USB PRINT
Solo si implementado.
5624. WINDOWS PRINT FUTURE
Adapter separado.
5625. PRINT PREVIEW
Renderer puede generar representación visual/text.
5626. PRINT PREVIEW ≠ HARDWARE TEST
Sí.
5627. PRINT IMAGE RESOLUTION
Optimizar.
5628. PRINT QR ERROR CORRECTION
Config apropiada.
5629. PRINT TEXT WRAP
Determinista.
5630. PRINT COLUMN WIDTH
Calcular por paper width.
5631. PRINT PRICE ALIGNMENT
Derecha.
5632. PRINT QUANTITY ALIGNMENT
Claro.
5633. PRINT TOTAL EMPHASIS
Sí.
5634. PRINT CUT
Capability.
5635. PRINT DRAWER
Separate command/action.
5636. PRINT DRAWER AFTER SALE
Only configured payment.
5637. PRINT DRAWER FAILURE
Non-fatal.
5638. PRINT TEST PAGE
Debe incluir:
- printer name;
- date;
- special chars;
- QR test si supported;
- cutter test optional.
5639. PRINT TEST SPECIAL CHARS
á é í ó ú ñ Ñ ¿ ¡ RD$
5640. PRINT TEST NOT RECEIPT
Header:
PRUEBA DE IMPRESORA
5641. PRINT TEST KITCHEN
PRUEBA — NO PREPARAR
5642. PRINT HARDWARE MATRIX
Actualizar después de tests físicos.
5643. WTF POS LOCAL DATABASE
Debe contener únicamente las entidades necesarias para operación local y recuperación.
5644. POS LOCAL SALE
Sí.
5645. POS LOCAL ORDER
Sí.
5646. POS LOCAL PAYMENT
Sí.
5647. POS LOCAL SHIFT
Sí.
5648. POS LOCAL RECEIPT
Sí.
5649. POS LOCAL OUTBOX
Sí.
5650. POS LOCAL PRINT JOB
Sí.
5651. POS LOCAL CATALOG CACHE
Sí.
5652. POS LOCAL CONFIG CACHE
Sí.
5653. POS LOCAL EMPLOYEE CACHE
Sí.
5654. POS LOCAL CUSTOMER CACHE
Según strategy.
5655. POS LOCAL KITCHEN DELIVERY
Sí.
5656. POS LOCAL DISPLAY SESSION
Puede ser transient/persisted minimally.
5657. POS LOCAL AUDIT EVENTS
Pending events.
5658. POS LOCAL INVENTORY CACHE
Sí cuando integrated.
5659. POS LOCAL DATABASE TRANSACTION
Critical.
5660. POS LOCAL DATABASE MIGRATIONS
Sí.
5661. POS LOCAL DATABASE INDEXES
Sí.
5662. POS LOCAL DATABASE ENCRYPTION
ADR.
5663. POS LOCAL DATABASE BACKUP
Not user-facing normal.
5664. POS LOCAL DATABASE PURGE
Only synced/derivable.
5665. POS LOCAL DATABASE TEST
Migration + corruption handling.
5666. KDS LOCAL DATABASE
Debe contener:
- active orders;
- history recent;
- events/outbox;
- pairing;
- config.
5667. CDS LOCAL DATABASE
Puede ser más ligera:
- pairing;
- config;
- asset cache;
- current session recovery metadata.
5668. DASHBOARD DATABASE
Central via backend.
5669. BACKEND DATABASE MODEL
Normalizado donde corresponda.
Snapshots JSON solo donde aporten valor.
5670. DATABASE MIGRATION NAMING
Descriptiva.
5671. DATABASE MIGRATION ORDER
Versioned.
5672. DATABASE MIGRATION NO EDIT OLD
Una migration aplicada no se modifica; crear nueva.
5673. DATABASE MIGRATION CI
From zero + upgrade.
5674. DATABASE MIGRATION PRODUCTION LOG
Registrar version/time/result.
5675. DATABASE SEED
Dev/test only.
5676. DATABASE REFERENCE DATA
Enums/config defaults mediante migrations/seed controlado.
5677. DATABASE TEST DATA
Separate.
5678. DATABASE CONSTRAINT — MONEY
No negative where invalid.
5679. DATABASE CONSTRAINT — QUANTITY
Según entity.
5680. DATABASE CONSTRAINT — PIN

<!-- PARTE 31 | attachment=9a36ee84-a84f-4990-ac9c-c8137c2ac100 | rango=5680-5892 -->

CONTINUACIÓN DEL PROMPT MAESTRO CONSOLIDADO
5680. DATABASE CONSTRAINT — PIN
Nunca guardar el PIN como número/texto plano.
La longitud de 4–6 dígitos se valida antes de generar el verifier/hash.
No utilizar una columna integer como almacenamiento del PIN.
5681. DATABASE CONSTRAINT — EMPLOYEE
Debe existir Organization.
Branch assignments mediante relación.
5682. DATABASE CONSTRAINT — DEVICE
Device ID único.
5683. DATABASE CONSTRAINT — REGISTER
Code único dentro de Branch.
5684. DATABASE CONSTRAINT — ACTIVE SHIFT
Solo uno abierto por Register cuando esa sea la política.
5685. DATABASE CONSTRAINT — PRODUCT SKU
Unique dentro del scope definido.
5686. DATABASE CONSTRAINT — BARCODE
Unique dentro del catálogo/scope definido.
5687. DATABASE CONSTRAINT — SALE
saleId unique.
5688. DATABASE CONSTRAINT — RECEIPT NUMBER
Unique dentro de sequence scope.
5689. DATABASE CONSTRAINT — FISCAL NUMBER
Unique dentro del scope fiscal.
5690. DATABASE CONSTRAINT — PAYMENT PROVIDER REFERENCE
Unique cuando provider lo garantice.
5691. DATABASE CONSTRAINT — IDEMPOTENCY KEY
Unique por operation/scope.
5692. DATABASE CONSTRAINT — OUTBOX EVENT
eventId unique.
5693. DATABASE CONSTRAINT — KITCHEN EVENT
eventId unique.
5694. DATABASE CONSTRAINT — AUDIT
append-only enforcement a nivel application/DB permissions.
5695. DATABASE CONSTRAINT — INVENTORY MOVEMENT
movementId unique.
5696. DATABASE CONSTRAINT — CUSTOMER
No imponer nombre unique.
5697. DATABASE CONSTRAINT — EMPLOYEE NAME
No unique.
5698. DATABASE CONSTRAINT — ROLE NAME
Puede ser unique por Organization.
5699. DATABASE CONSTRAINT — BRANCH CODE
Unique por Organization.
5700. DATABASE CONSTRAINT — PAYMENT METHOD NAME
Puede ser unique por Branch/Organization si ayuda.
5701. DATABASE CONSTRAINT — DINING OPTION CODE
Unique por scope.
5702. DATABASE CONSTRAINT — PRICEBOOK
Name/code unique por scope.
5703. DATABASE CONSTRAINT — TAX CODE
Unique por scope.
5704. DATABASE CONSTRAINT — MODIFIER OPTION
No necesariamente global unique.
5705. DATABASE CONSTRAINT — TABLE NAME
Puede ser unique dentro de Branch/area cuando sea útil.
5706. DATABASE CONSTRAINT — KITCHEN STATION
Name/code unique por Branch.
5707. DATABASE CONSTRAINT — CDS ASSOCIATION
Un CDS no puede tener múltiples asociaciones activas incompatibles.
5708. DATABASE CONSTRAINT — DEVICE ENVIRONMENT
No mezclar.
5709. DATABASE CHECKS
Utilizar checks para invariantes simples.
No trasladar toda la lógica empresarial a constraints complejos difíciles de mantener.
5710. DATABASE CASCADE POLICY
Revisar cada FK.
No cascade delete financiero.
5711. DATABASE INDEX STRATEGY
Indexar:
- FKs;
- search keys;
- date filters;
- status;
- organization/branch.
5712. DATABASE INDEX OVERUSE
No indexar cada columna.
Medir.
5713. DATABASE QUERY PLAN
Revisar reportes lentos.
5714. DATABASE N+1
Evitar en APIs/reportes.
5715. DATABASE PAGINATION
Cursor para grandes datasets.
5716. DATABASE REPORT AGGREGATES
Materialize cuando sea necesario.
5717. DATABASE REPORT SOURCE
Transacciones.
5718. DATABASE RECONCILIATION QUERIES
Versionadas/testeadas.
5719. DATABASE MANUAL SCRIPT
Stored in /scripts/maintenance o estructura equivalente.
5720. DATABASE MANUAL SCRIPT SAFETY
Require environment confirmation.
5721. DATABASE SCRIPT DRY RUN
Cuando sea posible.
5722. DATABASE SCRIPT TRANSACTION
Cuando corresponda.
5723. DATABASE SCRIPT BACKUP
Antes de destructive repair.
5724. DATABASE SCRIPT AUDIT
Document execution.
5725. BACKEND SALE COMMAND
Crear un único caso de uso authoritative para finalizar venta.
No tener:
- /cash-sale;
- /card-sale;
- /delivery-sale;
con lógica financiera duplicada.
Método de pago/modalidad son componentes del comando.
5726. COMPLETE SALE COMMAND INPUT
Conceptualmente:
- orderId;
- revision;
- device;
- employee;
- branch;
- register;
- payments;
- idempotencyKey;
- config versions.
5727. COMPLETE SALE COMMAND VALIDATION
Debe validar estado actual.
5728. COMPLETE SALE COMMAND PRICING
Verificar snapshot/total.
5729. COMPLETE SALE COMMAND AUTH
Sí.
5730. COMPLETE SALE COMMAND SHIFT
Sí.
5731. COMPLETE SALE COMMAND PAYMENT
Sí.
5732. COMPLETE SALE COMMAND FISCAL
Según policy.
5733. COMPLETE SALE COMMAND INVENTORY EVENT
Sí.
5734. COMPLETE SALE COMMAND RECEIPT
Snapshot.
5735. COMPLETE SALE COMMAND OUTBOX
Sí.
5736. COMPLETE SALE COMMAND RESULT
Stable/idempotent.
5737. COMPLETE SALE COMMAND NO PRINT
Printing después.
5738. COMPLETE SALE COMMAND NO EMAIL
Después.
5739. COMPLETE SALE COMMAND NO ANALYTICS
Después.
5740. COMPLETE SALE COMMAND NO CDS DEPENDENCY
Sí.
5741. COMPLETE SALE COMMAND KITCHEN
Si kitchen order ya fue enviado, no reenviar.
Si direct sale requiere envío al completar, crear evento exactamente una vez.
5742. CREATE ORDER COMMAND
Crea draft local/domain.
5743. ADD ORDER LINE COMMAND
Valida product.
5744. UPDATE ORDER LINE COMMAND
Valida revision.
5745. REMOVE ORDER LINE COMMAND
Kitchen delta cuando aplica.
5746. CHANGE DINING OPTION COMMAND
Reprice.
5747. SELECT CUSTOMER COMMAND
Actualiza order context.
5748. APPLY DISCOUNT COMMAND
Authorization.
5749. OVERRIDE PRICE COMMAND
Authorization.
5750. SAVE OPEN TICKET COMMAND
Persist + kitchen.
5751. CANCEL OPEN TICKET COMMAND
Persist + release + kitchen cancel.
5752. TRANSFER OPEN TICKET COMMAND
Audit.
5753. START PAYMENT COMMAND
Lock/revision.
5754. ADD PAYMENT COMMAND
Según method.
5755. RESOLVE PAYMENT COMMAND
Reconciliation.
5756. REFUND SALE COMMAND
Authoritative.
5757. VOID SALE COMMAND
Authoritative.
5758. REPRINT RECEIPT COMMAND
PrintJob.
5759. OPEN SHIFT COMMAND
Authoritative.
5760. CLOSE SHIFT COMMAND
Authoritative.
5761. CASH MOVEMENT COMMAND
Authoritative.
5762. CLOCK IN COMMAND
Authoritative.
5763. CLOCK OUT COMMAND
Authoritative.
5764. KDS STATUS COMMAND
Authoritative Kitchen state transition.
5765. RESTORE KDS ORDER COMMAND
Authoritative.
5766. CONFIG PUBLISH COMMAND
Authoritative.
5767. DEVICE AUTHORIZE COMMAND
Authoritative.
5768. DEVICE REVOKE COMMAND
Authoritative.
5769. INVENTORY ADJUST COMMAND
Authoritative.
5770. COMMAND NAMING
Usar verbos empresariales.
5771. QUERY NAMING
Ejemplos:
- GetSale
- ListReceipts
- GetShiftSummary
- SearchCustomers.
5772. CQRS
No es necesario implementar infraestructura CQRS compleja.
Separar conceptualmente commands/queries cuando ayude.
5773. DOMAIN ENTITY — ORDER
Mutable hasta finalización según state machine.
5774. DOMAIN ENTITY — SALE
Inmutable financieramente después de completion, salvo estados/refunds relacionados.
5775. DOMAIN ENTITY — PAYMENT
State machine.
5776. DOMAIN ENTITY — SHIFT
State machine.
5777. DOMAIN ENTITY — KITCHEN ORDER
State machine.
5778. DOMAIN ENTITY — DEVICE
Lifecycle.
5779. DOMAIN ENTITY — CONFIG VERSION
Immutable published version.
5780. DOMAIN VALUE OBJECT — MONEY
Sí.
5781. DOMAIN VALUE OBJECT — QUANTITY
Sí cuando útil.
5782. DOMAIN VALUE OBJECT — TAX RATE
Sí.
5783. DOMAIN VALUE OBJECT — PIN
Solo transient input, no persistent plaintext.
5784. DOMAIN VALUE OBJECT — BUSINESS DATE
Puede ayudar.
5785. DOMAIN VALUE OBJECT — RECEIPT NUMBER
Sí.
5786. DOMAIN VALUE OBJECT — FISCAL NUMBER
Sí.
5787. DOMAIN VALUE OBJECT — BARCODE
Sí.
5788. DOMAIN VALUE OBJECT — SKU
Sí.
5789. DOMAIN INVARIANTS
Deben estar testeadas.
5790. ORDER INVARIANT
No negative quantity.
5791. ORDER INVARIANT
Required modifiers.
5792. ORDER INVARIANT
Valid dining option.
5793. ORDER INVARIANT
Valid prices.
5794. SALE INVARIANT
Total reconciles.
5795. SALE INVARIANT
Payments reconcile.
5796. SALE INVARIANT
Completed only once.
5797. SHIFT INVARIANT
One close.
5798. PAYMENT INVARIANT
No success twice.
5799. REFUND INVARIANT
Cannot exceed refundable.
5800. INVENTORY INVARIANT
Movement immutable.
5801. KITCHEN INVARIANT
No duplicate event effect.
5802. CONFIG INVARIANT
Published version immutable.
5803. DEVICE INVARIANT
Revoked credential cannot authorize new session.
5804. FISCAL INVARIANT
Number unique.
5805. STATE MACHINE — ORDER
Documentar diagrama.
5806. STATE MACHINE — SALE
Documentar.
5807. STATE MACHINE — PAYMENT
Documentar.
5808. STATE MACHINE — SHIFT
Documentar.
5809. STATE MACHINE — KITCHEN
Documentar.
5810. STATE MACHINE — DEVICE
Documentar.
5811. STATE MACHINE TESTS
Todas transiciones.
5812. INVALID STATE TRANSITION
Domain error.
5813. STATE TRANSITION AUDIT
Solo sensibles.
5814. EVENT TIMELINE
Derived.
5815. SALE EVENT TIMELINE
Sí.
5816. PAYMENT EVENT TIMELINE
Sí.
5817. KITCHEN EVENT TIMELINE
Sí.
5818. DEVICE EVENT TIMELINE
Sí.
5819. SHIFT EVENT TIMELINE
Sí.
5820. EVENT STORE
No es necesario implementar event sourcing completo.
5821. LEDGERS ARE APPEND-ONLY
Inventory/Cash/Audit.
5822. SALE SNAPSHOT
Relational + snapshot where needed.
5823. NO EVENT SOURCING OVERENGINEERING
Sí.
5824. BACKEND FRAMEWORK
Antes de elegir:
inspeccionar repositorio.
Si ya existe stack sólido:
continuar.
No migrar framework por preferencia.
5825. BACKEND LANGUAGE
Mismo principio.
5826. DASHBOARD FRAMEWORK
Mismo principio.
5827. ANDROID STACK
Preferir Kotlin + Jetpack Compose si proyecto nuevo Android nativo, salvo restricción existente.
5828. ANDROID ARCHITECTURE
Modern Android:
- ViewModel;
- Coroutines/Flow;
- Room;
- WorkManager;
- Navigation;
- DI.
Elegir librerías mantenidas.
5829. ANDROID DEPENDENCY INJECTION
Hilt/Koin/manual según proyecto.
No añadir framework innecesario.
5830. ANDROID NETWORK
Retrofit/Ktor/otro mantenido.
5831. ANDROID SERIALIZATION
kotlinx.serialization/Moshi/etc.
Consistente.
5832. ANDROID DATABASE
Room recomendado.
5833. ANDROID BACKGROUND WORK
WorkManager.
5834. ANDROID BIOMETRIC
AndroidX Biometric.
5835. ANDROID CAMERA
CameraX + barcode library apropiada cuando sea compatible.
5836. BARCODE LIBRARY
Preferir librería estable/local.
5837. ANDROID IMAGE LOADING
Coil/otro mantenido.
5838. ANDROID LOGGING
Structured/sanitized.
5839. ANDROID TESTING
JUnit + appropriate Android/Compose tests.
5840. ANDROID BUILD
Gradle Kotlin DSL si proyecto nuevo/preferencia.
No reescribir existente solo por esto.
5841. ANDROID VERSION CATALOG
Puede utilizarse.
5842. ANDROID FLAVORS
- dev;
- staging;
- production;
si aporta.
5843. ANDROID BUILD TYPES
Debug/release.
5844. ANDROID R8
Release.
Probar.
5845. ANDROID PROGUARD RULES
Solo necesarias.
5846. ANDROID CRASH REPORTING
Optional/appropriate.
5847. ANDROID ANALYTICS
Minimal.
5848. ANDROID FIREBASE
Si proyecto ya usa Firebase:
evaluar.
No convertirlo automáticamente en fuente financiera si no ofrece garantías requeridas.
5849. FIREBASE AUTH
Puede utilizarse si encaja.
5850. FIREBASE CLOUD MESSAGING
Puede utilizarse para non-critical push/config wake.
No depender de FCM para KDS LAN.
5851. FIREBASE REMOTE CONFIG
No utilizar para reglas fiscales críticas salvo versioning/validation adecuado.
5852. FIREBASE FIRESTORE
Si ya existe, evaluar cuidadosamente para dominios no financieros o arquitectura actual.
5853. RELATIONAL DB PREFERENCE
Para POS financiero complejo, una DB relacional transaccional central puede simplificar:
- sales;
- payments;
- sequences;
- reports.
5854. FIREBASE + RELATIONAL HYBRID
Puede existir si cada uno tiene responsabilidad clara.
5855. NO DUAL SOURCE OF TRUTH
Sí.
5856. DASHBOARD FRONTEND
Si nuevo:
TypeScript.
Framework moderno/mantenido.
5857. DASHBOARD COMPONENT LIBRARY
Puede utilizarse si permite branding/accessibility.
No depender de componentes abandonados.
5858. DASHBOARD FORM LIBRARY
Opcional.
5859. DASHBOARD DATA FETCHING
Tooling consistente.
5860. DASHBOARD CHART LIBRARY
Mantenida/accessibility.
5861. DASHBOARD XLSX
Library segura/mantenida.
5862. DASHBOARD PDF
Según arquitectura.
5863. DASHBOARD I18N
Library estable.
5864. DASHBOARD TESTING
Unit/component/E2E.
5865. BACKEND ORM
Utilizar ORM/query builder según stack.
No dejar que ORM oculte transacciones críticas.
5866. BACKEND RAW SQL
Permitido para queries complejas/performance, parametrizado.
5867. BACKEND MIGRATIONS
Framework migration.
5868. BACKEND VALIDATION
Schema library.
5869. BACKEND JOBS
Queue/DB worker.
5870. BACKEND REALTIME
WebSocket/SSE.
5871. BACKEND LOGGING
Structured JSON production.
5872. BACKEND METRICS
Sí.
5873. BACKEND TRACING FUTURE
Sí.
5874. BACKEND TEST CONTAINERS
Si tooling lo permite.
5875. BACKEND SECURITY LIBRARIES
Mantenidas.
5876. PASSWORD HASH LIBRARY
Modern.
5877. TOKEN LIBRARY
Mantenida.
5878. NO CUSTOM CRYPTO
No implementar criptografía casera.
5879. TLS
Standard.
5880. LAN SECURITY CRYPTO
Utilizar primitives/libraries establecidas.
5881. QR GENERATION
Library mantenida.
5882. BARCODE GENERATION FUTURE
Library.
5883. DATE/TIME LIBRARY
Standard/robust.
5884. DECIMAL LIBRARY
Native Decimal/BigDecimal.
5885. MONEY LIBRARY
Puede crear value object encima.
5886. UUID LIBRARY
Secure.
5887. DEPENDENCY REVIEW
Antes de añadir:
- maintenance;
- license;
- size;
- security.
5888. APK SIZE
No prioridad sobre confiabilidad, pero evitar assets/dependencies innecesarios.
5889. STARTUP DEPENDENCY INITIALIZATION
Lazy donde sea posible.
5890. DATABASE INIT
Early.
5891. CRASH REPORT INIT
Early but non-blocking.
5892. ANALYTICS INIT
Lazy/non-blocking

<!-- PARTE 32 | attachment=62ed07fa-7a46-43bb-b351-c4ad109c6ba8 | rango=5892-6028 -->

FASE FINAL DEL PROMPT MAESTRO CONSOLIDADO
5892. ANALYTICS INITIALIZATION
Cualquier servicio de analytics/telemetría debe inicializarse de forma no bloqueante.
Nunca impedir:
- apertura de WTF POS;
- ventas;
- KDS;
- CDS;
- impresión;
porque analytics no esté disponible.
5893. PRODUCTION OBSERVABILITY
Implementar observabilidad suficiente para detectar:
- crashes;
- API failures;
- database failures;
- sync backlog;
- payment reconciliation;
- fiscal reconciliation;
- KDS delivery failures;
- printer failures;
- device connectivity.
No registrar información sensible innecesariamente.
5894. FINAL PROJECT STRUCTURE
Codex debe organizar el repositorio de manera que WTF Ecosystem pueda mantenerse como un único producto compuesto por aplicaciones claramente separadas.
Estructura conceptual recomendada:
wtf-pos-ecosystem/
│
├── apps/
│   ├── wtf-pos-android/
│   ├── wtf-kds-android/
│   ├── wtf-cds-android/
│   └── wtf-dashboard/
│
├── services/
│   ├── api/
│   └── workers/
│
├── packages/
│   ├── domain/
│   ├── contracts/
│   ├── pricing/
│   ├── fiscal/
│   └── shared/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── docs/
├── tests/
├── scripts/
└── infrastructure/
No imponer esta estructura si el repositorio existente ya posee una organización equivalente y correcta.
5895. APPLICATION BOUNDARIES
Deben existir como productos diferenciados:
WTF POS
Aplicación principal de caja.
WTF KDS
APK de cocina.
WTF CDS
APK para clientes.
WTF Dashboard
Web.App administrativa.
WTF Backend
API, sincronización y servicios centrales.
5896. SHARED BUSINESS CONTRACTS
Centralizar contratos compartidos para evitar que cada aplicación interprete de forma diferente:
- Money;
- IDs;
- Order;
- Kitchen events;
- Display events;
- config versions;
- protocol versions.
5897. NO SHARED UI BETWEEN UNRELATED APPS
Compartir design tokens/componentes cuando ayude.
No acoplar WTF KDS a la navegación de WTF POS.
5898. BUILD INDEPENDENCE
Cada aplicación debe poder:
- compilarse;
- probarse;
- versionarse;
de forma independiente cuando sea posible.
5899. RELEASE MANIFEST
Cada release debe registrar:
WTF POS version
WTF KDS version
WTF CDS version
WTF Dashboard version
Backend version
Database schema version
Protocol version
ORDEN OBLIGATORIO DE IMPLEMENTACIÓN
5900. CODEX MUST NOT IMPLEMENT RANDOMLY
Codex NO debe comenzar creando pantallas aisladas en cualquier orden.
Debe implementar siguiendo dependencias técnicas.
5901. PHASE 0 — REPOSITORY INSPECTION
Antes de modificar código:
1. inspeccionar repositorio completo;
2. identificar tecnologías existentes;
3. ejecutar proyecto;
4. ejecutar tests;
5. identificar errores existentes;
6. revisar DB/schema;
7. revisar Firebase/config si existe;
8. revisar arquitectura actual;
9. identificar código reutilizable;
10. identificar deuda técnica que bloquee WTF POS.
5902. BASELINE REPORT
Crear:
docs/BASELINE_REPORT.md
Con:
- estado inicial;
- proyectos existentes;
- stack;
- builds;
- tests;
- errores;
- riesgos.
5903. REQUIREMENTS TRACEABILITY
Crear:
docs/REQUIREMENTS_TRACEABILITY.md
Mapear requisitos del Prompt Maestro a:
- módulo;
- implementación;
- test;
- estado.
No es necesario crear una fila para cada micro-punto repetitivo; agrupar por feature.
5904. GAP ANALYSIS
Crear:
docs/GAP_ANALYSIS.md
Clasificar:
- Already implemented
- Partial
- Missing
- Incorrect
- Requires migration
- Requires hardware validation
- Requires external provider.
5905. NO DESTRUCTIVE REWRITE
Si existe código útil:
refactorizar/integrar.
No borrar todo y comenzar nuevamente sin justificación técnica.
5906. PHASE 1 — ARCHITECTURE FOUNDATION
Implementar primero:
- project structure;
- environments;
- database;
- migrations;
- Money;
- IDs;
- auth;
- Organization;
- Branch;
- Employee;
- Roles;
- Devices;
- config versioning;
- logging;
- error model.
5907. FOUNDATION ACCEPTANCE
No continuar con venta completa hasta que:
- DB migre;
- auth funcione;
- branch isolation funcione;
- Money tests pasen;
- device model funcione.
5908. PHASE 2 — CATALOG
Implementar:
- Articles;
- Categories;
- Modifiers;
- Discounts;
- PriceBooks;
- barcode;
- search;
- availability.
5909. CATALOG ACCEPTANCE
Probar:
- create;
- edit;
- archive;
- duplicate barcode;
- modifiers;
- Apps Delivery price;
- offline cache.
5910. PHASE 3 — PRICING / TAX / DINING
Implementar juntos:
- Dining Options;
- PricingEngine;
- TaxEngine;
- ChargeEngine;
- included/additional;
- Apps Delivery pricing;
- calculation snapshots.
5911. FINANCIAL ENGINE GATE
Antes de construir payment UI final:
todos los financial golden tests deben pasar.
5912. PHASE 4 — POS ORDER ENGINE
Implementar:
- cart;
- order;
- customer selection;
- dining option;
- comments;
- modifiers;
- discounts;
- price override;
- turn number;
- open ticket persistence.
5913. POS ORDER RECOVERY GATE
Matar aplicación con una orden abierta.
Al reabrir:
la orden debe recuperarse correctamente.
5914. PHASE 5 — SHIFTS
Implementar:
- Register;
- Open Shift;
- Cash In;
- Cash Out;
- Safe Drop si se utiliza;
- expected cash;
- counted cash;
- Close Shift.
5915. SHIFT GATE
Los cálculos de caja deben reconciliar automáticamente en tests.
5916. PHASE 6 — PAYMENTS
Implementar primero:
Cash
Manual Card
Transfer
Custom/manual methods
Después integrar providers reales si existen.
5917. PAYMENT GATE
Debe ser imposible que doble toque genere doble Payment/Sale.
5918. PHASE 7 — SALE FINALIZATION
Implementar transacción final:
Order
→ Payments
→ Sale
→ Receipt Snapshot
→ Inventory Event
→ Outbox.
5919. SALE CRASH TEST GATE
Matar app en puntos críticos.
Nunca:
- perder venta confirmada;
- cobrar dos veces;
- crear dos recibos financieros.
5920. PHASE 8 — RECEIPTS
Implementar:
- receipt renderer;
- configuration;
- history;
- reprint;
- 58/80 mm;
- print queue.
5921. RECEIPT GATE
Verificar reconciliación exacta:
Subtotal
- Discounts
+ Taxes
+ Charges
= Total
5922. PHASE 9 — KITCHEN DOMAIN
Antes de WTF KDS UI:
implementar:
- KitchenStation;
- routing;
- KitchenOrder;
- events;
- delivery status;
- deltas;
- history.
5923. PHASE 10 — WTF KDS APK
Implementar la APK completa según este Prompt Maestro.
5924. KDS ACCEPTANCE
Debe funcionar:
POS → KDS → Dispatch → History → Restore.
5925. KDS OFFLINE ACCEPTANCE
Apagar Internet manteniendo LAN.
Debe seguir funcionando.
5926. KDS RESTART ACCEPTANCE
Reiniciar tablet/app.
Comandas activas permanecen.
5927. KDS TIMER ACCEPTANCE
Fake clock:
- <10 normal;
- ≥10 amarillo;
- ≥20 rojo;
- ≥30 crítico/parpadeo.
5928. PHASE 11 — WTF CDS APK
Implementar.
5929. CDS ACCEPTANCE
Debe reflejar exactamente:
- artículos;
- quantity;
- modifiers;
- subtotal;
- discounts;
- taxes;
- charges;
- total.
5930. CDS PAYMENT PRIVACY GATE
WTF CDS no debe mostrar controles para seleccionar métodos de pago.
5931. CDS SUCCESS GATE
Después de completar:
¡Gracias por su compra, WTFLover!
5932. PHASE 12 — OFFLINE SYNC
Implementar/terminar:
- local DB;
- outbox;
- retries;
- dedup;
- config sync;
- catalog sync;
- conflict handling.
5933. OFFLINE SALE GATE
Prueba obligatoria:
Internet OFF
→ 10 ventas
→ cerrar app
→ abrir app
→ ventas permanecen
→ Internet ON
→ sync
→ Dashboard muestra exactamente 10
No 9.
No 11.
5934. PHASE 13 — INVENTORY INTEGRATION
Implementar ledger/integration conforme a la arquitectura decidida.
5935. INVENTORY GATE
Una venta debe producir una sola salida.
Retry no produce dos.
5936. PHASE 14 — WTF DASHBOARD CORE
Implementar:
- Home;
- Sales;
- Reports;
- Articles;
- Customers;
- Employees;
- Settings;
- Devices.
5937. PHASE 15 — DASHBOARD ADVANCED CONFIG
Implementar:
- Features;
- Dining;
- Taxes;
- Charges;
- Payments;
- Receipts;
- Open Tickets;
- Kitchen;
- CDS;
- Branches;
- Roles;
- Audit.
5938. PHASE 16 — FISCAL
Solo después de estabilizar Sale/Receipt.
Integrar reglas/provider reales.
5939. FISCAL GATE
No producción hasta completar:
- provider sandbox;
- sequence concurrency;
- duplicate prevention;
- rejection handling;
- reconciliation;
- legal/config review.
5940. PHASE 17 — REPORTS
Completar todos los reportes solicitados.
5941. REPORT RECONCILIATION GATE
Para dataset conocido:
Sales Report
=
Sale transactions.
Payment Report
=
Payments.
Tax Report
=
TaxSnapshots.
Shift Report
=
Cash ledger.
5942. PHASE 18 — SECURITY HARDENING
Ejecutar:
- authorization tests;
- tenant isolation;
- IDOR;
- injection;
- XSS;
- secrets review;
- Android storage review;
- LAN protocol review.
5943. PHASE 19 — HARDWARE VALIDATION
Utilizar el punto 532 corregido como especificación oficial de Hardware Matrix.
5944. PHASE 20 — PERFORMANCE
Medir:
- startup;
- product search;
- cart;
- KDS latency;
- CDS latency;
- reports;
- sync.
Optimizar problemas reales.
5945. PHASE 21 — PILOT
Instalar en hardware real y ejecutar UAT.
PRUEBAS FINALES OBLIGATORIAS
5946. TEST — CASH SALE
PASS obligatorio.
5947. TEST — DINE-IN
PASS.
5948. TEST — TAKEOUT
PASS.
5949. TEST — DELIVERY
PASS.
5950. TEST — APPS DELIVERY
PASS.
5951. TEST — APPS DELIVERY ALTERNATE PRICE
PASS.
5952. TEST — ITBIS
PASS.
5953. TEST — SERVICE CHARGE
PASS.
5954. TEST — TAX INCLUDED
PASS.
5955. TEST — TAX ADDED
PASS.
5956. TEST — MODIFIERS
PASS.
5957. TEST — REQUIRED MODIFIER
PASS.
5958. TEST — DISCOUNT
PASS.
5959. TEST — SUPERVISOR DISCOUNT
PASS.
5960. TEST — CUSTOMER
PASS.
5961. TEST — FISCAL CUSTOMER
PASS cuando fiscal configurado.
5962. TEST — OPEN TICKET
PASS.
5963. TEST — TABLE
PASS.
5964. TEST — REOPEN ORDER
PASS.
5965. TEST — MODIFY SENT ORDER
PASS.
5966. TEST — KITCHEN DELTA
PASS.
5967. TEST — KDS DISPATCH
PASS.
5968. TEST — KDS RESTORE
PASS.
5969. TEST — KDS TIMER
PASS.
5970. TEST — KDS MANY ORDERS
PASS.
5971. TEST — KDS PAGES COMPACT
PASS.
5972. TEST — CDS LIVE CART
PASS.
5973. TEST — CDS EXACT TOTAL
PASS.
5974. TEST — CDS THANK YOU
PASS.
5975. TEST — CDS NO PAYMENT BUTTONS
PASS.
5976. TEST — RECEIPT PRINT
PASS on supported hardware.
5977. TEST — RECEIPT REPRINT
PASS.
5978. TEST — KITCHEN PRINT
PASS on supported hardware.
5979. TEST — PRINTER FAILURE
PASS recovery behavior.
5980. TEST — CASH DRAWER
PASS when hardware supported.
5981. TEST — BARCODE CAMERA
PASS on supported hardware.
5982. TEST — BARCODE HID
PASS on supported hardware.
5983. TEST — SHIFT OPEN
PASS.
5984. TEST — CASH IN/OUT
PASS.
5985. TEST — SHIFT CLOSE
PASS.
5986. TEST — CASH DIFFERENCE
PASS.
5987. TEST — TIME CLOCK
PASS.
5988. TEST — REFUND
PASS.
5989. TEST — PARTIAL REFUND
PASS.
5990. TEST — VOID
PASS.
5991. TEST — OFFLINE SALE
PASS.
5992. TEST — OFFLINE RESTART
PASS.
5993. TEST — OFFLINE SYNC
PASS.
5994. TEST — DUPLICATE SYNC
PASS.
5995. TEST — DEVICE AUTHORIZATION
PASS.
5996. TEST — DEVICE REVOCATION
PASS.
5997. TEST — KDS PAIRING
PASS.
5998. TEST — CDS PAIRING
PASS.
5999. TEST — KDS IP CHANGE
PASS recovery.
6000. TEST — CDS IP CHANGE
PASS recovery.
6001. TEST — DARK MODE
PASS.
6002. TEST — DEVICE THEME MODE
PASS.
6003. TEST — GRID
PASS.
6004. TEST — LIST
PASS.
6005. TEST — LANGUAGE
PASS.
6006. TEST — CAMERA DISABLED
PASS.
6007. TEST — CAMERA PERMISSION DENIED
PASS fallback.
6008. TEST — EMPLOYEE PIN
PASS.
6009. TEST — BIOMETRIC FALLBACK
PASS.
6010. TEST — ROLE PERMISSIONS
PASS.
6011. TEST — TENANT ISOLATION
PASS mandatory.
6012. TEST — BRANCH ISOLATION
PASS mandatory.
6013. TEST — PAYMENT IDEMPOTENCY
PASS mandatory.
6014. TEST — SALE IDEMPOTENCY
PASS mandatory.
6015. TEST — INVENTORY IDEMPOTENCY
PASS mandatory.
6016. TEST — FISCAL IDEMPOTENCY
PASS when fiscal active.
6017. TEST — REPORT TOTALS
PASS.
6018. TEST — CUSTOMER IMPORT
PASS.
6019. TEST — PRODUCT IMPORT
PASS if implemented.
6020. TEST — BACKUP
PASS.
6021. TEST — RESTORE
PASS.
CRITERIOS DE BLOQUEO
6022. BLOCKER — LOST SALE
Cualquier escenario donde una venta confirmada desaparezca es:
RELEASE BLOCKER
6023. BLOCKER — DUPLICATE SALE
RELEASE BLOCKER
6024. BLOCKER — DOUBLE CHARGE
RELEASE BLOCKER
6025. BLOCKER — WRONG TOTAL
RELEASE BLOCKER
6026. BLOCKER — WRONG TAX
RELEASE BLOCKER
6027. BLOCKER — TENANT DATA LEAK
RELEASE BLOCKER
6028. BLOCKER — AUTH

<!-- PARTE 33 | attachment=521d08b9-2346-4b39-940f-b2dabc801642 | rango=6028-6132 -->

CIERRE FINAL DEL PROMPT MAESTRO CONSOLIDADO
6028. BLOCKER — AUTHORIZATION BYPASS
Cualquier escenario donde un usuario pueda ejecutar una operación para la cual no posee permiso es:
RELEASE BLOCKER
Especialmente:
- refund;
- void;
- price override;
- discount protegido;
- cash drawer;
- fiscal;
- roles;
- devices;
- configuration.
6029. BLOCKER — PAYMENT UNKNOWN HANDLED AS FAILED
Si un pago cuyo resultado real es desconocido permite inmediatamente volver a cobrar sin reconciliación:
RELEASE BLOCKER
6030. BLOCKER — FINANCIAL FLOAT ERROR
Cualquier discrepancia monetaria causada por utilizar float/double de forma inapropiada:
RELEASE BLOCKER
6031. BLOCKER — DUPLICATE INVENTORY MOVEMENT
Una misma venta no puede descontar inventario dos veces debido a retry/sync.
RELEASE BLOCKER
6032. BLOCKER — KITCHEN ORDER LOSS
Si WTF POS confirma que una comanda fue entregada cuando realmente nunca fue:
RELEASE BLOCKER para instalaciones donde KDS/impresión de cocina sea obligatoria y no exista fallback aceptable.
6033. BLOCKER — ACTIVE KDS ORDER LOSS AFTER RESTART
RELEASE BLOCKER
6034. BLOCKER — CDS WRONG CUSTOMER ORDER
Si WTF CDS muestra la orden de otra caja/cliente:
RELEASE BLOCKER
6035. BLOCKER — FISCAL DUPLICATE
Cuando fiscal esté activo:
RELEASE BLOCKER
6036. BLOCKER — FISCAL NUMBER COLLISION
RELEASE BLOCKER
6037. BLOCKER — DATABASE CORRUPTION
RELEASE BLOCKER
6038. BLOCKER — FAILED DATABASE MIGRATION WITH DATA LOSS
RELEASE BLOCKER
6039. BLOCKER — UNSYNCED DATA DELETION
Nunca perder ventas pendientes por:
- logout;
- update;
- clear cache;
- config refresh;
- full resync;
- device restart.
Cualquier caso:
RELEASE BLOCKER
6040. BLOCKER — PRODUCTION TEST PROVIDER
Production no puede utilizar accidentalmente:
- fake payment provider;
- fake fiscal provider;
- development DB;
- staging endpoint.
6041. BLOCKER — DEFAULT PRODUCTION CREDENTIALS
No liberar con:
- contraseña default;
- PIN default global;
- master password;
- token hardcodeado.
6042. BLOCKER — SECRET IN REPOSITORY
No liberar si existen credenciales productivas en Git/source.
6043. BLOCKER — REQUIRED HARDWARE UNVALIDATED
Si un dispositivo físico es indispensable para producción y continúa:
HARDWARE_VALIDATION_PENDING
no declarar ese flujo Production Ready.
CRITERIOS DE ACEPTACIÓN DEL PRODUCTO
6044. WTF POS ACCEPTANCE
WTF POS se considera funcional cuando un empleado autorizado puede:
1. autenticarse;
2. abrir turno;
3. seleccionar modalidad;
4. seleccionar/agregar cliente;
5. buscar/escanear artículos;
6. seleccionar modificadores;
7. agregar comentarios;
8. aplicar descuentos autorizados;
9. guardar una orden;
10. reabrirla;
11. enviarla a cocina;
12. cobrarla;
13. seleccionar método de pago;
14. imprimir recibo;
15. completar la venta;
16. continuar con Nueva Venta;
17. consultar Órdenes Guardadas;
18. operar offline dentro de las capacidades definidas.
6045. WTF KDS ACCEPTANCE
WTF KDS se considera funcional cuando:
1. puede instalarse como APK independiente;
2. muestra IP/instrucciones en first-run;
3. se empareja con WTF POS;
4. recibe órdenes;
5. muestra turno/ticket/hora;
6. muestra artículos;
7. muestra cantidades;
8. muestra modificadores;
9. muestra comentarios;
10. aplica timer 10/20/30;
11. permite despachar;
12. mantiene historial;
13. permite restaurar;
14. soporta múltiples comandas/páginas;
15. compacta páginas;
16. recupera órdenes tras restart;
17. continúa por LAN sin Internet.
6046. WTF CDS ACCEPTANCE
WTF CDS se considera funcional cuando:
1. instala como APK independiente;
2. se empareja;
3. recibe la orden correcta;
4. muestra artículos;
5. cantidades;
6. precios;
7. modificadores;
8. subtotal;
9. descuentos;
10. impuestos;
11. cargos;
12. total exacto;
13. no permite seleccionar método de pago;
14. muestra estado final;
15. muestra:
¡Gracias por su compra, WTFLover!
16. vuelve a idle;
17. nunca mezcla sesiones de diferentes clientes.
6047. WTF DASHBOARD ACCEPTANCE
WTF Dashboard se considera funcional cuando permite administrar y consultar:
- ventas;
- recibos;
- reportes;
- artículos;
- categorías;
- modificadores;
- descuentos;
- empleados;
- roles;
- clientes;
- sucursales;
- modalidades;
- métodos de pago;
- impuestos;
- cargos;
- recibos;
- Open Tickets;
- cocina;
- WTF KDS;
- WTF CDS;
- dispositivos POS;
- features;
- turnos;
- Time Clock;
- inventario integrado;
- auditoría;
- alertas;
- estado del sistema.
6048. REPORTING ACCEPTANCE
Deben existir como mínimo los reportes solicitados originalmente:
- Ventas diarias;
- Ventas por artículos;
- Ventas por categorías;
- Ventas por empleados;
- Ventas por métodos de pago;
- Recibos;
- Ventas por modificadores;
- Descuentos;
- Impuestos;
- Turnos.
6049. DINING ACCEPTANCE
Las modalidades iniciales deben ser:
- Comer aquí;
- Para llevar;
- Delivery;
- Apps Delivery.
Todas configurables.
6050. APPS DELIVERY ACCEPTANCE
Apps Delivery debe permitir:
- precio alternativo;
- PriceBook;
- plataforma/canal;
- impuestos propios;
- reporting separado.
6051. TAX ACCEPTANCE
El sistema debe soportar:
Precio con impuesto incluido
y
Impuesto agregado después del precio.
Los cálculos deben ser exactos y testeados.
6052. WTF INITIAL TAX MODEL
Debe poder representar la configuración solicitada:
Comer aquí
18% ITBIS + 10% correspondiente configurado.
Para llevar
18% ITBIS.
Delivery
18% ITBIS.
Apps Delivery
18% ITBIS.
Estos valores deben ser configurables y revisados antes de producción.
6053. OPEN TICKET ACCEPTANCE
Cuando feature activa:
- Guardar;
- Reabrir;
- Editar;
- Guardar nuevamente;
- Cobrar.
6054. TABLE ACCEPTANCE
Cuando tickets predefinidos activos:
el administrador puede crear/numerar manualmente mesas.
6055. CUSTOMER ACCEPTANCE
Formulario:
- Nombre;
- Razón Social;
- RNC;
- Correo;
- Teléfono;
- Dirección;
- Ciudad;
- Estado/Provincia.
Importación incluida.
6056. EMPLOYEE ACCEPTANCE
Formulario:
- Nombre;
- Correo;
- Número/Teléfono;
- Rol;
- PIN de 4–6 dígitos;
- biometría compatible.
Guardar/Cancelar.
6057. FEATURES ACCEPTANCE
Los ocho switches originales deben existir y funcionar:
1. Shifts
2. Time Clock
3. Open Tickets
4. Kitchen Printers
5. Customer Displays
6. Dining Options
7. Low Stock Notifications
8. Negative Stock Alerts
6058. GENERAL POS SETTINGS ACCEPTANCE
Debe existir:
Cámara para código de barras
ON/OFF.
Modo oscuro
- Usar ajuste del dispositivo
- Activado
- Desactivado
Distribución de artículos
- Cuadrícula
- Lista
con preview y:
- Aceptar
- Cancelar.
Idioma
Integrado con ajustes de idioma de la aplicación/sistema cuando la plataforma lo permita.
6059. RECEIPT ACCEPTANCE
Debe poder configurar:
- contenido;
- logo;
- idioma;
- comentarios;
- cliente;
- impuestos;
- cargos;
- turno;
- fiscal;
- printer;
- 58/80 mm.
6060. FISCAL ACCEPTANCE
La arquitectura debe soportar las secuencias/tipos solicitados:
- B01/E31;
- B02/E32;
pero la implementación productiva debe respetar las reglas vigentes reales.
DOCUMENTACIÓN FINAL OBLIGATORIA
6061. README
Crear README principal con:
- arquitectura;
- apps;
- requisitos;
- instalación;
- desarrollo;
- tests;
- builds.
6062. ARCHITECTURE DOCUMENT
docs/ARCHITECTURE.md
6063. POS DOCUMENT
docs/WTF_POS.md
6064. KDS DOCUMENT
docs/WTF_KDS.md
6065. CDS DOCUMENT
docs/WTF_CDS.md
6066. DASHBOARD DOCUMENT
docs/WTF_DASHBOARD.md
6067. OFFLINE DOCUMENT
docs/OFFLINE_SYNC.md
6068. FINANCIAL SPEC
docs/PRICING_AND_TAX_SPEC.md
6069. KITCHEN PROTOCOL
docs/KITCHEN_PROTOCOL.md
6070. CDS PROTOCOL
docs/CDS_PROTOCOL.md
6071. PRINTING DOCUMENT
docs/PRINTING.md
6072. SECURITY DOCUMENT
docs/SECURITY.md
6073. THREAT MODEL
docs/THREAT_MODEL.md
6074. PERMISSIONS DOCUMENT
docs/PERMISSIONS.md
6075. DATABASE DOCUMENT
docs/DATABASE.md
6076. API DOCUMENT
OpenAPI + docs/API.md.
6077. DEPLOYMENT DOCUMENT
docs/DEPLOYMENT.md
6078. BACKUP DOCUMENT
docs/BACKUP_RESTORE.md
6079. HARDWARE DOCUMENT
docs/SUPPORTED_HARDWARE.md
Utilizar el punto 532 corregido como criterio.
6080. INSTALLATION GUIDE
docs/INSTALLATION_GUIDE.md
Debe incluir instalación de:
- WTF POS;
- WTF KDS;
- WTF CDS;
- Dashboard/backend;
- printers;
- network.
6081. KDS PAIRING GUIDE
Con imágenes reales.
6082. CDS PAIRING GUIDE
Con imágenes reales.
6083. TROUBLESHOOTING GUIDE
Por error/síntoma.
6084. UAT CHECKLIST
Sí.
6085. RELEASE CHECKLIST
Sí.
6086. CUTOVER PLAN
Sí.
6087. DISASTER RECOVERY
Sí.
6088. CHANGELOG
Sí.
ENTREGABLES DE CODEX
6089. CODEX MUST DELIVER WORKING CODE
No quiero únicamente:
- explicación;
- arquitectura;
- pseudocódigo;
- mockups;
- TODOs.
Debe implementar el sistema en el repositorio.
6090. CODEX MUST BUILD
Debe ejecutar builds reales.
6091. CODEX MUST TEST
Debe ejecutar tests.
6092. CODEX MUST FIX ITS OWN ERRORS
Si una compilación/test falla por cambios realizados:
investigar y corregir.
No detenerse inmediatamente para preguntarme qué hacer.
6093. CODEX MUST INSPECT BEFORE ASSUMING
Nunca asumir que un archivo/tabla/API existe.
Inspeccionar.
6094. CODEX MUST NOT INVENT EXTERNAL CREDENTIALS
Si falta:
- fiscal credentials;
- payment credentials;
- signing secrets;
- production domain;
crear interfaces/config placeholders seguros y continuar con todo lo que no dependa de ellos.
6095. EXTERNAL BLOCKER
Solo considerar bloqueo real cuando se necesita algo que no puede obtenerse del repositorio ni simularse correctamente.
6096. CODEX MUST USE SIMULATORS
Para hardware no disponible:
- VirtualPrinter;
- Fake KDS;
- Fake CDS;
- sandbox/fake provider.
6097. CODEX MUST MARK HARDWARE PENDING
No fingir prueba física.
6098. CODEX MUST NOT ASK AFTER EVERY STEP
Trabajar autónomamente por fases.
6099. CODEX MUST NOT STOP AT FIRST MILESTONE
Después de completar una fase:
ejecutar tests y continuar con la siguiente salvo bloqueo real.
6100. CODEX PROGRESS FILE
Mantener:
docs/IMPLEMENTATION_STATUS.md
Con:
- Completed
- In progress
- Pending
- Blocked
- Tests
- Hardware pending.
6101. CODEX TODO PRIORITY
Prioridad:
P0
Core production.
P1
Important.
P2
Future.
6102. CODEX NO FAKE COMPLETE
No marcar Completed si:
- solo existe UI;
- backend no funciona;
- datos no persisten;
- test falla.
6103. FEATURE DEFINITION OF DONE
Una feature está completa cuando:
1. domain;
2. persistence;
3. API/protocol;
4. UI;
5. permissions;
6. error handling;
7. tests;
8. documentation;
están resueltos según aplique.
6104. CODEX BUILD ARTIFACTS
Al finalizar generar:
- WTF POS APK;
- WTF KDS APK;
- WTF CDS APK;
- WTF Dashboard production build;
- Backend production build/container según stack.
6105. APK NAMES
Ejemplo:
WTF-POS-v1.0.0.apk
WTF-KDS-v1.0.0.apk
WTF-CDS-v1.0.0.apk
6106. APK SIGNING
Release signing correctamente configurado mediante secrets seguros.
Si production key no está disponible:
generar unsigned/staging artifact y documentar exactamente qué falta.
6107. CHECKSUMS
Generar SHA-256 de release artifacts.
6108. RELEASE NOTES
Generar.
6109. TEST REPORT
Generar:
docs/FINAL_TEST_REPORT.md
6110. TEST REPORT CONTENT
Incluir:
- unit;
- integration;
- E2E;
- security;
- offline;
- hardware;
- failed/skipped;
- reasons.
6111. HARDWARE TEST REPORT
Separar:
- simulated;
- physically tested.
6112. FINAL KNOWN LIMITATIONS
Crear:
docs/KNOWN_LIMITATIONS.md
No ocultar limitaciones.
6113. FINAL BLOCKERS
Crear sección:
Production Blockers
Si está vacía:
indicar:
None identified by automated/simulated validation.
Eso no sustituye hardware/pilot.
INSTRUCCIONES FINALES PARA CODEX
6114. SINGLE SOURCE OF TRUTH
Este PROMPT MAESTRO CONSOLIDADO — WTF POS ECOSYSTEM es la especificación principal.
No utilizar versiones anteriores del prompt para sobrescribirlo.
6115. REQUIREMENT INTERPRETATION
Cuando dos puntos parezcan repetidos:
interpretarlos como refuerzo del mismo requisito, no como dos implementaciones distintas.
6116. REQUIREMENT CONFLICT
Si existe un conflicto real:
prioridad:
1. integridad financiera;
2. seguridad;
3. fiscalidad/legalidad;
4. persistencia;
5. requisito explícito de negocio;
6. UX;
7. optimización.
Documentar la decisión.
6117. NO SILENT REQUIREMENT REMOVAL
No eliminar un requisito porque sea complejo.
Si no puede implementarse por dependencia externa:
marcarlo BLOCKED y construir interfaces/tests/simulator cuando sea posible.
6118. NO UNREQUESTED ERP EXPANSION
No convertir WTF POS en:
- ERP completo;
- contabilidad completa;
- payroll completo;
- CRM completo;
salvo módulos explícitamente especificados.
6119. SIMPLICITY RULE
Cuando existan dos soluciones igualmente correctas:
elegir la más simple, mantenible y verificable.
6120. FINANCIAL CORRECTNESS RULE
Nunca sacrificar exactitud monetaria por simplificar código.
6121. OFFLINE RULE
Nunca sacrificar persistencia local de ventas para simplificar sincronización.
6122. HARDWARE RULE
Nunca afirmar compatibilidad sin prueba correspondiente.
6123. SECURITY RULE
Nunca resolver un problema desactivando:
- TLS validation;
- authentication;
- authorization;
- certificate validation;
globalmente.
6124. ERROR RULE
Nunca ocultar un error crítico únicamente para que un test/build parezca exitoso.
6125. TEST RULE
No modificar tests correctos únicamente para hacerlos pasar cuando el código esté equivocado.
6126. MOCK RULE
Mocks/fakes son válidos para pruebas.
No presentarlos como providers/hardware production.
6127. DATA RULE
Nunca borrar datos productivos para corregir un bug sin procedimiento explícito.
6128. MIGRATION RULE
Cambios de schema mediante migrations.
6129. GIT RULE
Commits pequeños/coherentes cuando el entorno lo permita.
6130. DOCUMENTATION RULE
Actualizar documentación junto al código.
6131. COMPLETION RULE
No declarar WTF POS terminado únicamente porque las pantallas compilan.
6132. PRODUCTION READY DEFINITION
Solo utilizar:
PRODUCTION READY
cuando:
- P0 completo;
- builds pasan;
- tests críticos pasan;
- security checks pasan;
-

<!-- PARTE 34 | attachment=847f8989-1327-4bba-aba1-8b247dbccda0 | rango=6132-6245 -->

FINAL DEFINITIVO DEL PROMPT MAESTRO CONSOLIDADO
6132. PRODUCTION READY DEFINITION
Solo utilizar el estado:
PRODUCTION READY
cuando se cumplan simultáneamente:
- todos los requisitos P0 implementados;
- builds de producción exitosos;
- tests financieros críticos aprobados;
- tests de idempotencia aprobados;
- tests offline aprobados;
- tests de recuperación aprobados;
- tests de seguridad críticos aprobados;
- tenant/branch isolation aprobado;
- migrations verificadas;
- backup verificado;
- restore probado;
- hardware obligatorio físicamente validado;
- WTF POS probado;
- WTF KDS probado;
- WTF CDS probado;
- Dashboard probado;
- impresión obligatoria probada;
- fiscalidad productiva validada cuando corresponda;
- providers externos requeridos validados;
- UAT completado;
- Pilot completado cuando corresponda;
- ningún RELEASE BLOCKER abierto.
Compilar correctamente NO equivale a estar listo para producción.
6133. READY FOR PILOT
Si:
- software P0 está implementado;
- tests automáticos pasan;
- simuladores pasan;
- pero todavía falta validación operacional/hardware;
utilizar:
READY FOR PILOT
No:
PRODUCTION READY.
6134. READY FOR HARDWARE VALIDATION
Si el código está completo pero faltan dispositivos físicos:
READY FOR HARDWARE VALIDATION
6135. BLOCKED BY EXTERNAL DEPENDENCY
Si falta:
- credencial fiscal;
- terminal/provider;
- certificado;
- hardware específico;
marcar exactamente:
BLOCKED BY EXTERNAL DEPENDENCY
e indicar cuál dependencia.
Continuar con todo lo demás.
6136. PARTIALLY IMPLEMENTED
Utilizar únicamente cuando la feature realmente tiene partes funcionales.
6137. NOT IMPLEMENTED
No ocultar funciones inexistentes detrás de botones que no hacen nada.
6138. NO PLACEHOLDER SUCCESS
Un botón que muestra:
Guardado correctamente
sin persistir datos constituye un bug.
6139. NO MOCK SUCCESS PRODUCTION
Un provider fake que responde SUCCESS no demuestra integración productiva.
6140. NO VISUAL-ONLY IMPLEMENTATION
Una pantalla completa visualmente pero sin:
- domain;
- persistence;
- authorization;
- validation;
no se considera feature completa.
SECUENCIA FINAL DE TRABAJO PARA CODEX
6141. STEP 1 — READ EVERYTHING
Antes de implementar:
leer el Prompt Maestro Consolidado completo.
No comenzar después de leer únicamente la primera parte.
6142. STEP 2 — INSPECT REPOSITORY
Inspeccionar:
- directorios;
- source;
- dependencies;
- build files;
- environment;
- DB;
- migrations;
- tests;
- Firebase;
- existing APIs;
- existing apps.
6143. STEP 3 — RUN BASELINE
Ejecutar:
- builds;
- tests;
- lint/typecheck;
antes de modificar.
Registrar qué ya estaba fallando.
6144. STEP 4 — CREATE BASELINE REPORT
Crear:
docs/BASELINE_REPORT.md
6145. STEP 5 — CREATE GAP ANALYSIS
Crear:
docs/GAP_ANALYSIS.md
6146. STEP 6 — CREATE IMPLEMENTATION STATUS
Crear:
docs/IMPLEMENTATION_STATUS.md
6147. STEP 7 — CREATE ARCHITECTURE DECISIONS
Crear ADRs para decisiones importantes.
Como mínimo:
- database;
- offline sync;
- Money;
- auth;
- fiscal;
- LAN protocol;
- inventory source of truth.
6148. STEP 8 — IMPLEMENT FOUNDATION
No comenzar por animaciones/branding.
Primero integridad.
6149. STEP 9 — IMPLEMENT VERTICAL SLICES
Después de foundation, cada módulo debe avanzar de extremo a extremo:
Domain
  ↓
Persistence
  ↓
API / Protocol
  ↓
UI
  ↓
Tests
Evitar crear 100 pantallas sin backend funcional.
6150. STEP 10 — RUN TESTS CONTINUOUSLY
Después de cambios importantes:
- compile;
- unit;
- integration;
- relevant E2E.
6151. STEP 11 — FIX REGRESSIONS
No acumular cientos de errores para el final.
6152. STEP 12 — USE SIMULATORS
Mientras no exista hardware:
- VirtualPrinter;
- Fake KDS;
- Fake CDS;
- payment sandbox/fake;
- fiscal sandbox/fake.
6153. STEP 13 — BUILD REAL APKs
Cuando cada aplicación alcance estado funcional:
generar builds instalables.
6154. STEP 14 — TEST APK INTEROPERABILITY
Probar:
WTF POS
   │
   ├──── WTF KDS
   │
   └──── WTF CDS
No probarlas únicamente de forma aislada.
6155. STEP 15 — TEST COMPLETE SALE PIPELINE
Probar:
Employee Login
      ↓
Open Shift
      ↓
Create Order
      ↓
Dining Option
      ↓
Customer
      ↓
Products
      ↓
Modifiers
      ↓
Kitchen
      ↓
CDS
      ↓
Payment
      ↓
Sale
      ↓
Receipt
      ↓
Inventory
      ↓
Sync
      ↓
Dashboard / Reports
6156. STEP 16 — BREAK THE SYSTEM INTENTIONALLY
Ejecutar chaos/recovery tests.
No probar únicamente happy path.
6157. STEP 17 — TEST OFFLINE
Obligatorio.
6158. STEP 18 — TEST CONCURRENCY
Obligatorio para:
- sale;
- payment;
- sequences;
- tickets;
- inventory.
6159. STEP 19 — SECURITY REVIEW
Obligatorio.
6160. STEP 20 — HARDWARE VALIDATION
Aplicar Hardware Matrix del punto 532.
6161. STEP 21 — UAT
Con flujos reales de restaurante.
6162. STEP 22 — PILOT
Antes del rollout completo.
6163. STEP 23 — FINAL TEST REPORT
Generar.
6164. STEP 24 — RELEASE ARTIFACTS
Generar:
- WTF POS APK;
- WTF KDS APK;
- WTF CDS APK;
- Dashboard build;
- Backend build;
- checksums;
- release notes.
6165. STEP 25 — FINAL STATUS
Codex debe entregar un resumen final con exactamente estas categorías:
COMPLETED
TESTED
HARDWARE TESTED
HARDWARE VALIDATION PENDING
EXTERNAL DEPENDENCIES
KNOWN LIMITATIONS
PRODUCTION BLOCKERS
FINAL READINESS STATUS
REQUISITOS QUE NO DEBEN PERDERSE DURANTE LA IMPLEMENTACIÓN
6166. WTF POS CORE REMINDER
No olvidar:
- menú lateral oculto;
- Ventas;
- Recibos;
- Turnos;
- Artículos;
- Categorías;
- Modificadores;
- Descuentos;
- Configuración.
6167. WTF POS DINING REMINDER
No olvidar:
- Comer aquí;
- Para llevar;
- Delivery;
- Apps Delivery.
6168. WTF POS CUSTOMER REMINDER
Seleccionar cliente antes/durante orden.
6169. WTF POS SAVE REMINDER
Debe existir:
Guardar
cuando Open Tickets esté activo.
6170. WTF POS PAYMENT REMINDER
Debe existir:
Cobrar
6171. WTF POS REOPEN REMINDER
Orden guardada:
abrir
→ editar
→ Guardar
o
→ Cobrar.
6172. WTF POS PAYMENT SUCCESS REMINDER
Después del pago:
Cobrado
Mostrar monto total.
Opciones:
Nueva Venta
Órdenes Guardadas
6173. WTF CDS REMINDER
Nunca mostrar selección de método de pago al cliente.
6174. WTF CDS FINAL REMINDER
Mostrar:
¡Gracias por su compra, WTFLover!
6175. TURN NUMBER REMINDER
El mismo número de turno debe poder aparecer en:
- POS;
- factura;
- KDS;
- CDS opcional.
6176. WTF KDS REMINDER
Debe mostrar:
- turno;
- ticket;
- hora;
- elapsed time;
- artículos;
- quantity;
- modifiers;
- comments.
6177. WTF KDS TIMER REMINDER
Defaults:
- 10 min → amarillo;
- 20 min → rojo;
- 30 min → rojo crítico/parpadeo.
6178. WTF KDS HISTORY REMINDER
Despachar
→ Historial
→ Restaurar.
6179. WTF KDS PAGES REMINDER
Muchas comandas:
varias páginas.
Al cerrar comandas:
las páginas disminuyen/reorganizan.
6180. WTF KDS IP REMINDER
First-run muestra IP e instrucciones.
Después:
Configuración → Conexión.
6181. WTF CDS ORDER REMINDER
Mostrar:
- productos;
- prices;
- quantities;
- subtotal;
- taxes;
- charges;
- total.
6182. CAMERA REMINDER
Configuración:
Utilizar cámara para escanear códigos de barras
ON/OFF.
6183. DARK MODE REMINDER
Opciones:
- Usar ajuste del dispositivo
- Activado
- Desactivado
6184. LAYOUT REMINDER
Modal central:
Cuadrícula
Lista
con preview correspondiente al dispositivo.
Botones:
Aceptar
Cancelar
6185. LANGUAGE REMINDER
Utilizar ajustes de idioma de la aplicación/sistema operativo cuando corresponda.
6186. DASHBOARD REPORT REMINDER
No olvidar ninguno:
- ventas diarias;
- artículos;
- categorías;
- empleados;
- métodos de pago;
- recibos;
- modificadores;
- descuentos;
- impuestos;
- turnos.
6187. EMPLOYEE REMINDER
- nombre;
- correo;
- número;
- rol;
- PIN 4–6;
- biometría compatible.
6188. CUSTOMER REMINDER
- nombre;
- razón social;
- RNC;
- correo;
- teléfono;
- dirección;
- ciudad;
- estado/provincia;
- import.
6189. FEATURES REMINDER
No olvidar:
- Shifts
- Time Clock
- Open Tickets
- Kitchen Printers
- Customer Displays
- Dining Options
- Low Stock Notifications
- Negative Stock Alerts
6190. PAYMENT METHODS REMINDER
Configurable.
No hardcodear únicamente Cash/Card.
6191. RECEIPT REMINDER
Configurable:
- comments;
- language;
- fiscal;
- customer;
- layout.
6192. FISCAL REMINDER
Preparar:
- B01/E31;
- B02/E32.
Validar reglas reales antes de producción.
6193. OPEN TICKETS REMINDER
Tickets predefinidos/mesas opcionales.
Numeración/nombres manuales.
6194. KITCHEN ROUTING REMINDER
Grupos/estaciones asociados a categorías.
6195. TAX REMINDER
Los impuestos pueden aplicarse a artículos específicos.
6196. APPS DELIVERY PRICE REMINDER
Precio diferente.
6197. BRANCH REMINDER
Configuración multi-sucursal.
6198. POS DEVICES REMINDER
Solo dispositivos autorizados pueden operar.
6199. OFFLINE REMINDER
Local-first.
No perder ventas.
6200. IDEMPOTENCY REMINDER
No duplicar:
- sales;
- payments;
- inventory;
- fiscal;
- kitchen events.
CRITERIO FINAL DE CALIDAD
6201. NO “HAPPY PATH ONLY”
La aplicación debe manejar:
- offline;
- timeout;
- restart;
- double tap;
- duplicate messages;
- stale configuration;
- printer failure;
- KDS failure;
- CDS failure;
- provider failure.
6202. NO SILENT FAILURE
Toda operación importante debe:
- completarse;
- quedar pendiente;
- fallar claramente;
- quedar en estado desconocido reconciliable.
Nunca desaparecer.
6203. NO SILENT DATA LOSS
Regla absoluta.
6204. NO SILENT DUPLICATION
Regla absoluta.
6205. NO SILENT FINANCIAL CORRECTION
Regla absoluta.
6206. NO SILENT CONFIG OVERRIDE
Regla absoluta para configuración crítica.
6207. NO SILENT SECURITY BYPASS
Regla absoluta.
6208. USER EXPERIENCE STANDARD
A pesar de la complejidad interna, el cajero debe percibir WTF POS como:
- rápido;
- sencillo;
- claro;
- táctil;
- predecible.
6209. KITCHEN EXPERIENCE STANDARD
WTF KDS debe ser:
- legible;
- rápido;
- resistente a errores;
- visible a distancia;
- fácil de despachar.
6210. CUSTOMER EXPERIENCE STANDARD
WTF CDS debe ser:
- limpio;
- profesional;
- preciso;
- sin controles innecesarios;
- coherente con la marca WTF.
6211. ADMIN EXPERIENCE STANDARD
WTF Dashboard debe ser:
- organizado;
- responsive;
- searchable;
- auditable;
- seguro;
- comprensible.
6212. ENGINEERING STANDARD
El sistema debe priorizar:
1. exactitud;
2. integridad;
3. seguridad;
4. resiliencia;
5. mantenibilidad;
6. rendimiento;
7. estética.
La estética es importante, pero nunca por encima de la integridad financiera.
INSTRUCCIÓN DE ARRANQUE PARA CODEX
6213. DO NOT RETURN ANOTHER GIANT PLAN
Después de recibir este Prompt Maestro completo, Codex NO debe responder creando otro documento de miles de puntos.
Debe pasar a ejecución.
6214. FIRST CODEX RESPONSE
La primera respuesta después de recibir autorización para comenzar debe ser breve y operacional:
- qué encontró en el repositorio;
- baseline;
- principales gaps;
- primera fase que comenzará.
Después debe trabajar sobre los archivos.
6215. AUTONOMOUS EXECUTION
Codex debe continuar trabajando fase por fase sin solicitar confirmación para decisiones técnicas rutinarias.
6216. WHEN CODEX SHOULD ASK
Solo preguntar cuando exista una decisión empresarial que no pueda inferirse de este Prompt Maestro y que cambie significativamente el comportamiento.
6217. WHEN CODEX SHOULD NOT ASK
No preguntar:
- qué nombre poner a una variable;
- qué carpeta usar;
- si debe corregir un test roto por su cambio;
- si debe continuar después de una fase;
- si debe compilar.
Resolver profesionalmente.
6218. EXTERNAL DEPENDENCY BEHAVIOR
Si falta una dependencia externa:
documentarla y continuar con otras fases.
6219. EXISTING CODE WINS WHEN CORRECT
Si el repositorio ya implementa correctamente un requisito:
reutilizarlo.
No reconstruirlo únicamente para que coincida con un patrón sugerido aquí.
6220. SPECIFICATION WINS WHEN EXISTING CODE IS WRONG
Si el código existente contradice un requisito crítico:
corregirlo mediante migration/refactor seguro.
6221. SECURITY WINS OVER CONVENIENCE
No implementar atajos inseguros porque sean más rápidos.
6222. DATA INTEGRITY WINS OVER DEADLINE
No aceptar riesgo conocido de duplicación/pérdida financiera para terminar más rápido.
6223. FINAL CODE REVIEW
Antes de declarar finalizado:
revisar código crítico manualmente:
- Money;
- Pricing;
- Taxes;
- Sale;
- Payment;
- Refund;
- Shift;
- Sync;
- Fiscal;
- Device authorization.
6224. FINAL DEAD CODE REVIEW
Eliminar:
- mocks accidentales;
- temporary bypasses;
- debug buttons;
- hardcoded test data;
- TODO críticos.
6225. FINAL SECRET SCAN
Obligatorio.
6226. FINAL DEPENDENCY AUDIT
Obligatorio.
6227. FINAL MIGRATION TEST
Obligatorio.
6228. FINAL CLEAN INSTALL TEST
Instalar desde cero.
6229. FINAL UPGRADE TEST
Actualizar desde versión anterior/pilot cuando exista.
6230. FINAL OFFLINE TEST
Obligatorio.
6231. FINAL RESTART TEST
Obligatorio.
6232. FINAL MULTI-DEVICE TEST
POS + KDS + CDS.
6233. FINAL REPORT RECONCILIATION
Obligatorio.
6234. FINAL CASH RECONCILIATION
Obligatorio.
6235. FINAL INVENTORY RECONCILIATION
Cuando inventory activo.
6236. FINAL FISCAL RECONCILIATION
Cuando fiscal activo.
6237. FINAL PAYMENT RECONCILIATION
Obligatorio.
6238. FINAL BACKUP
Verificar.
6239. FINAL RESTORE
Verificar.
6240. FINAL HARDWARE MATRIX
Actualizar punto 532/SUPPORTED_HARDWARE.
6241. FINAL DOCUMENTATION
Debe coincidir con implementación real.
6242. FINAL RELEASE MANIFEST
Generar.
6243. FINAL RELEASE STATUS
Solo uno:
NOT READY
READY FOR DEVELOPMENT TESTING
READY FOR HARDWARE VALIDATION
READY FOR PILOT
PRODUCTION READY
6244. FINAL STATUS MUST BE EVIDENCE-BASED
No seleccionar PRODUCTION READY por optimismo.
FIN DE LA ESPECIFICACIÓN
6245.

<!-- PARTE 35 | attachment=e7525b0b-fd2e-47f2-b7b3-b1d031685588 | rango=6245-10 -->


## 6245. DECLARACIÓN DE FINALIZACIÓN

# PROMPT MAESTRO CONSOLIDADO FINALIZADO

A partir de este punto, **NO agregar nuevos requisitos automáticamente**.

Los puntos **1 al 6245**, incluyendo la **corrección completa del punto 532 — Hardware Matrix**, conforman una única especificación denominada:

# WTF POS ECOSYSTEM — PROMPT MAESTRO CONSOLIDADO

Esta especificación cubre integralmente:

- WTF POS;
- WTF KDS;
- WTF CDS;
- WTF Dashboard;
- Backend/API;
- base de datos;
- sincronización offline;
- impresión;
- cocina;
- pantallas para clientes;
- empleados;
- roles y permisos;
- clientes;
- sucursales;
- turnos;
- Time Clock;
- artículos;
- categorías;
- modificadores;
- descuentos;
- modalidades de consumo;
- PriceBooks;
- Apps Delivery;
- métodos de pago;
- impuestos;
- cargos;
- recibos;
- comprobantes fiscales;
- inventario;
- dispositivos;
- seguridad;
- auditoría;
- reportes;
- resiliencia;
- recuperación;
- testing;
- deployment;
- hardware;
- documentación;
- criterios de aceptación;
- criterios de Production Readiness.

---

# INSTRUCCIÓN DEFINITIVA PARA CODEX

Una vez que hayas recibido **todas las partes anteriores de este Prompt Maestro Consolidado**, debes considerar la especificación completa.

No vuelvas a generar otro plan gigantesco.

No me devuelvas simplemente pseudocódigo.

No te limites a diseñar mockups.

No me preguntes si deseas que continúes después de cada fase.

Debes comenzar a trabajar directamente sobre el repositorio.

---

# PRIMERA ACCIÓN OBLIGATORIA

Antes de modificar archivos:

1. inspecciona completamente el repositorio;
2. identifica todas las aplicaciones, servicios y librerías existentes;
3. identifica el stack tecnológico actual;
4. identifica la base de datos;
5. identifica Firebase u otros servicios ya configurados;
6. identifica las APIs existentes;
7. identifica módulos reutilizables;
8. identifica tests existentes;
9. identifica configuraciones de Android;
10. identifica cualquier sistema de inventario/POS ya conectado;
11. ejecuta los builds actuales;
12. ejecuta los tests actuales;
13. ejecuta lint/typecheck cuando corresponda;
14. registra cualquier error preexistente;
15. NO atribuyas al nuevo trabajo errores que ya existían antes.

---

# DESPUÉS DEL BASELINE

Genera y mantén:

```text
docs/BASELINE_REPORT.md
docs/GAP_ANALYSIS.md
docs/IMPLEMENTATION_STATUS.md
docs/REQUIREMENTS_TRACEABILITY.md
```

No te detengas después de crear estos documentos.

Inmediatamente después comienza la implementación.

---

# REGLA DE IMPLEMENTACIÓN

Trabaja siguiendo el orden de dependencias establecido en este Prompt Maestro:

```text
Foundation
    ↓
Authentication / Organization / Branches / Devices
    ↓
Employees / Roles / Permissions
    ↓
Catalog
    ↓
Pricing
    ↓
Taxes / Charges
    ↓
Dining Options
    ↓
Orders
    ↓
Open Tickets
    ↓
Shifts
    ↓
Payments
    ↓
Sale Finalization
    ↓
Receipts
    ↓
Kitchen Routing
    ↓
WTF KDS
    ↓
WTF CDS
    ↓
Offline Sync
    ↓
Inventory Integration
    ↓
WTF Dashboard
    ↓
Fiscal
    ↓
Reports
    ↓
Security Hardening
    ↓
Hardware Validation
    ↓
UAT / Pilot
```

Cuando técnicamente sea más eficiente trabajar dos componentes relacionados conjuntamente, puedes hacerlo siempre que respetes sus dependencias e invariantes.

---

# REGLA DE PROGRESO

Después de cada fase:

```text
IMPLEMENT
→ BUILD
→ TEST
→ FIX
→ REGRESSION TEST
→ UPDATE IMPLEMENTATION_STATUS
→ CONTINUE
```

No detenerte simplemente para informarme que terminaste una fase.

Continúa automáticamente.

---

# REGLA DE ERRORES

Si algo falla:

```text
FAIL
↓
INVESTIGATE
↓
IDENTIFY ROOT CAUSE
↓
FIX
↓
RUN TEST AGAIN
↓
RUN REGRESSION TESTS
↓
CONTINUE
```

No ocultes errores.

No desactives tests correctos.

No elimines validaciones únicamente para conseguir un build verde.

---

# REGLA DE DEPENDENCIAS EXTERNAS

Si necesitas algo que realmente no existe en el repositorio, por ejemplo:

- credenciales fiscales productivas;
- certificado fiscal;
- credenciales de payment provider;
- signing key productiva;
- hardware físico;
- acceso a infraestructura externa;

NO detengas todo el proyecto.

Implementa:

- interface;
- adapter;
- configuration;
- validation;
- fake/sandbox;
- tests;
- documentación.

Marca únicamente esa integración como:

`BLOCKED BY EXTERNAL DEPENDENCY`

y continúa.

---

# REGLA DE HARDWARE

Si no tienes físicamente:

- impresora;
- gaveta;
- scanner;
- tablet KDS;
- tablet CDS;
- terminal externa;

utiliza simuladores/adapters de prueba.

Después marca:

`HARDWARE_VALIDATION_PENDING`

Nunca:

`HARDWARE_TESTED`

sin prueba física.

Aplicar específicamente el **punto 532 corregido**.

---

# REGLA DE BASE DE DATOS

Nunca borres o recrees una base de datos existente para simplificar una migration salvo que el entorno sea inequívocamente de desarrollo/test y sea seguro hacerlo.

En producción:

```text
Schema Change
→ Migration
→ Validation
→ Backup when required
→ Deployment
```

---

# REGLA FINANCIERA

Para dinero:

- no usar float;
- no usar double como representación financiera;
- utilizar Money/Decimal/minor units;
- definir rounding;
- utilizar snapshots;
- aplicar idempotencia;
- utilizar transacciones;
- reconciliar resultados.

Debe cumplirse siempre:

```text
Subtotal
- Discounts
+ Taxes
+ Charges
= Total
```

y:

```text
Sum(Payments)
= Amount Due
```

para una venta completamente pagada, considerando las reglas definidas para split payments/refunds.

---

# REGLA DE VENTAS

Nunca puede ocurrir:

```text
Payment succeeded
+
Sale disappeared
```

ni:

```text
User tapped twice
=
Two charges
```

ni:

```text
Sync retry
=
Duplicate sale
```

ni:

```text
App restart
=
Lost transaction
```

---

# REGLA OFFLINE

WTF POS debe tratar la conectividad como una capacidad degradable.

Internet caído no significa automáticamente:

`POS DOWN`

Si el dispositivo está correctamente provisionado y la operación está autorizada offline:

```text
Sale
→ Local DB
→ Outbox
→ Continue operation
→ Internet returns
→ Sync
→ Deduplicate
→ Reconcile
```

---

# REGLA KDS

WTF KDS no debe depender del cloud para recibir una orden cuando WTF POS y KDS están correctamente conectados en la misma LAN y la arquitectura local está activa.

---

# REGLA CDS

WTF CDS debe ser una pantalla de presentación.

No convertirla accidentalmente en una segunda caja.

No permitir desde WTF CDS:

- seleccionar método de pago;
- aplicar descuento;
- borrar productos;
- modificar cantidades;
- cobrar;
- anular.

---

# REGLA DE SEGURIDAD

Toda autorización debe verificarse server-side/domain-side según corresponda.

Ocultar un botón NO constituye seguridad.

---

# REGLA FISCAL

Nunca inventar:

- NCF;
- secuencias;
- estados;
- respuestas de DGII/provider;
- reglas fiscales.

La arquitectura debe soportar B01/E31 y B02/E32 conforme a la configuración solicitada, pero la operación productiva debe utilizar las reglas vigentes y la integración/provider realmente configurado.

---

# REGLA DE INVENTARIO

Una venta puede generar una única salida lógica correspondiente.

Un retry:

```text
InventoryEvent X
→ Retry
→ Retry
```

debe seguir representando:

```text
1 movimiento lógico
```

no tres.

---

# REGLA DE COCINA

Un retry de una comanda no debe producir una segunda preparación accidental.

Utilizar IDs, ACKs y deduplicación.

---

# REGLA DE IMPRESIÓN

No asumir que:

`bytes enviados = papel confirmado`

cuando el hardware/protocolo no puede demostrarlo.

Modelar estados ambiguos correctamente.

---

# REGLA DE REPORTES

Los reportes deben derivarse de las transacciones reales.

Nunca almacenar manualmente un “Total de ventas del día” como fuente primaria si puede reconstruirse de ventas.

---

# REGLA DE AUDITORÍA

No modificar/eliminar silenciosamente:

- ventas;
- pagos;
- movimientos de caja;
- movimientos de inventario;
- fiscal;
- acciones administrativas sensibles.

Utilizar:

- estados;
- reversals;
- adjustments;
- refunds;
- audit events.

---

# REGLA DE UX

La complejidad de la arquitectura NO debe trasladarse al cajero.

El cajero debe poder trabajar principalmente mediante:

```text
Login
→ Venta
→ Productos
→ Guardar / Cobrar
→ Pago
→ Cobrado
→ Nueva Venta
```

---

# REGLA DE CODEX

Cuando encuentres un detalle técnico no especificado explícitamente:

1. revisa el contexto completo;
2. revisa arquitectura existente;
3. selecciona una solución estándar y mantenible;
4. documenta decisiones importantes;
5. continúa.

No preguntes por decisiones triviales de ingeniería.

---

# RESULTADO FINAL ESPERADO

Al finalizar deben existir realmente:

### Aplicaciones

```text
WTF POS.apk
WTF KDS.apk
WTF CDS.apk
```

### Web

```text
WTF Dashboard
```

### Backend

```text
WTF Backend/API + Workers
```

### Persistencia

```text
Central Database
+
Local Offline Databases
```

### Integraciones

```text
Printers
KDS
CDS
Inventory
Fiscal adapter
Payment adapters
```

según las capacidades implementadas/configuradas.

---

# REPORTE FINAL DE CODEX

Al terminar, Codex debe responder con un resumen conciso estructurado exactamente así:

```text
WTF POS ECOSYSTEM — FINAL IMPLEMENTATION REPORT

1. COMPLETED
2. TESTED
3. HARDWARE TESTED
4. HARDWARE VALIDATION PENDING
5. EXTERNAL DEPENDENCIES
6. KNOWN LIMITATIONS
7. PRODUCTION BLOCKERS
8. BUILD ARTIFACTS
9. TEST RESULTS
10. FINAL READINESS STATUS
```

---

# FINAL READINESS STATUS

Seleccionar únicamente uno:

```text
NOT READY
READY FOR DEVELOPMENT TESTING
READY FOR HARDWARE VALIDATION
READY FOR PILOT
PRODUCTION READY
```

Debe basarse en evidencia.

---

# CONDICIÓN PARA PRODUCTION READY

No declarar `PRODUCTION READY` mientras exista cualquier `RELEASE BLOCKER`.

Especialmente:

- riesgo de doble cobro;
- riesgo de venta perdida;
- totales incorrectos;
- impuestos incorrectos;
- secuencias duplicadas;
- pérdida de comandas;
- fuga de datos entre organizaciones;
- bypass de permisos;
- migrations inseguras;
- hardware obligatorio sin validar;
- fiscalidad obligatoria sin validar.

---

# INSTRUCCIÓN FINAL DE EJECUCIÓN

Cuando el usuario escriba:

# PROMPT MAESTRO CONSOLIDADO FINALIZADO — PUEDES COMENZAR LA IMPLEMENTACIÓN

debes considerar que ya recibiste la especificación completa.

En ese momento:

**NO vuelvas a preguntarle al usuario si deseas que comiences.**

**NO generes otro Prompt Maestro.**

**NO generes únicamente un plan.**

**NO te detengas después del análisis.**

Comienza inspeccionando el repositorio y ejecuta la implementación siguiendo todas las reglas anteriores.

---

# FIN

**WTF POS ECOSYSTEM — PROMPT MAESTRO CONSOLIDADO**

**Puntos 1–6245**

**Incluye corrección oficial del punto 532 — Hardware Matrix.**

**ESTADO DE LA ESPECIFICACIÓN: FINALIZADA.**

# PROMPT MAESTRO CONSOLIDADO FINALIZADO — PUEDES COMENZAR LA IMPLEMENTACIÓN
