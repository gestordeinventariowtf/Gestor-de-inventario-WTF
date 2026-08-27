# Gap Analysis - WTF POS Ecosystem

## EXISTING_AND_VALID

- Web.App actual productiva con Firebase Hosting.
- Firebase Functions para notificaciones/IA.
- Firestore/Storage configurados.
- App Android WebView existente para la Web.App.
- Servicio local ICG Host con TypeScript.
- Modulos operativos actuales de inventario, produccion, finanzas, RRHH y activos.

## EXISTING_NEEDS_CHANGE

- Android actual: sirve como contenedor de la Web.App, pero no como POS dedicado.
- Servicio ICG Host: puede servir como referencia para integracion local, pero no debe ser el nucleo transaccional POS.
- Dashboard actual: puede reutilizar datos/reportes, pero debe aislarse de ventas POS transaccionales hasta tener contratos.
- Firebase: debe usarse con cuidado para evitar limites/costos por escrituras frecuentes.

## MISSING

- WTF POS dedicado.
- WTF KDS dedicado.
- WTF CDS dedicado.
- Backend/API transaccional POS.
- Base local POS offline-first.
- Outbox/Inbox POS durable.
- Motor formal de pricing/taxes.
- Payment attempts con idempotencia.
- Printer adapters.
- KDS/CDS LAN protocol.
- Modelo de turnos POS.
- Catalogo POS.
- Ordenes abiertas POS.
- Matriz de hardware validado.
- Suite de pruebas POS/KDS/CDS.

## BLOCKED_EXTERNAL

- Validacion con impresoras fisicas.
- Validacion con tablets KDS/CDS reales.
- Decision fiscal definitiva.
- Proveedor de pagos real.
- Decision final de si POS reemplaza o convive con ICG FrontRest.
- Hardware de scanner/barcode.

## FUTURE_SCOPE

- Certificacion fiscal completa.
- Integracion bancaria/Verifone real.
- Loyalty.
- Analitica avanzada IA.
- Multi-sucursal completa.
- Automatizacion avanzada de inventario predictivo.

## Decision inicial recomendada

No construir WTF POS dentro de `index.html`.

Crear un proyecto aislado para WTF POS Ecosystem y conectar con el sistema existente mediante adaptadores:

- `CatalogAdapter`
- `InventoryBridgeAdapter`
- `SalesSyncAdapter`
- `NotificationAdapter`
- `UserPermissionAdapter`

## Criterio para iniciar codigo

Antes de programar:

1. Definir el primer vertical slice.
2. Definir estructura del proyecto.
3. Definir estrategia Android: nativo Kotlin vs Capacitor separado.
4. Definir backend inicial.
5. Definir almacenamiento local.
6. Definir limites de integracion con la Web.App actual.
