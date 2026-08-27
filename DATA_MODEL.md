# Data Model - WTF POS Ecosystem

## Entidades base

### Employee

- `employeeId`
- `name`
- `role`
- `pinHash`
- `active`
- `permissions`

### PosSession

- `sessionId`
- `userId`
- `name`
- `role`
- `permissions`
- `startedAt`

### PosAuditEvent

- `eventId`
- `type`
- `aggregateId`
- `createdAt`
- `actorUserId`
- `actorName`
- `payload`

### Device

- `deviceId`
- `name`
- `type`
- `branchId`
- `authorized`
- `lastSeenAt`

### Shift

- `shiftId`
- `employeeId`
- `deviceId`
- `openedAt`
- `closedAt`
- `openingCash`
- `closingCash`
- `status`

### ShiftCloseReport

- `closeReportId`
- `shiftId`
- `employeeId`
- `deviceId`
- `openedAt`
- `closedAt`
- `salesCount`
- `subtotal`
- `itbis`
- `ley`
- `grossTotal`
- `paymentTotals`
- `openingCash`
- `cashExpected`
- `countedCash`
- `difference`
- `status`

### Product

- `productId`
- `sku`
- `barcode`
- `name`
- `categoryId`
- `price`
- `taxPolicyId`
- `active`

### OpenTicket

- `ticketId`
- `shiftId`
- `employeeId`
- `customerLabel`
- `zoneId`
- `zoneName`
- `tableId`
- `tableLabel`
- `diningOption`
- `lines`
- `pricingSnapshot`
- `status`

### DiningZone

- `zoneId`
- `name`
- `active`

### DiningTable

- `tableId`
- `label`
- `zoneId`
- `zoneName`
- `seats`
- `active`

### DashboardSnapshot

- `salesCount`
- `grossTotal`
- `subtotal`
- `itbis`
- `ley`
- `openTickets`
- `paidTickets`
- `outboxPending`
- `outboxSent`
- `paymentMethods`

### KdsCommand

- `commandId`
- `ticketId`
- `shiftId`
- `employeeId`
- `station`
- `status`
- `lines`
- `attempts`
- `acknowledgedAt`
- `nextRetryAt`

### KdsCommandLine

- `lineId`
- `productId`
- `name`
- `quantity`
- `modifiers`
- `notes`
- `status`

### CdsSnapshot

- `snapshotId`
- `ticketId`
- `updatedAt`
- `status`
- `customerLabel`
- `tableLabel`
- `diningOption`
- `message`
- `lines`
- `totals`

### CdsSnapshotLine

- `lineId`
- `name`
- `qty`
- `unitPrice`
- `subtotal`
- `total`

### Sale

- `saleId`
- `ticketId`
- `shiftId`
- `employeeId`
- `deviceId`
- `createdAt`
- `lines`
- `totals`
- `payments`
- `status`

### SaleReversal

- `reversalId`
- `saleId`
- `type`
- `reason`
- `actorUserId`
- `actorName`
- `createdAt`
- `lines`
- `totals`
- `status`

### PaymentAttempt

- `paymentAttemptId`
- `saleId`
- `method`
- `amount`
- `received`
- `change`
- `status`
- `idempotencyKey`
- `providerResponse`

### PrintJob

- `printJobId`
- `saleId`
- `printerId`
- `type`
- `content`
- `status`
- `attempts`
- `createdAt`
- `updatedAt`
- `idempotencyKey`

### OutboxEvent

- `eventId`
- `aggregateId`
- `type`
- `payload`
- `createdAt`
- `status`
- `attempts`
- `nextRetryAt`
- `lastError`

### BackendBatchAck

- `batchId`
- `receivedAt`
- `count`
- `acknowledgements`

### BackendEventAck

- `eventId`
- `idempotencyKey`
- `status`

### InventoryBridge

- `bridgeId`
- `posProductId`
- `wtfProductId`
- `wtfProductName`
- `wtfArea`
- `wtfLocation`
- `qtyPerSale`
- `sourceUnit`
- `targetUnit`
- `active`

### InventoryMovement

- `movementId`
- `saleId`
- `lineId`
- `bridgeId`
- `posProductId`
- `wtfProductId`
- `wtfArea`
- `wtfLocation`
- `qty`
- `unit`
- `direction`
- `status`
- `idempotencyKey`

### InventoryBridgeAlert

- `alertId`
- `type`
- `saleId`
- `lineId`
- `posProductId`
- `posProductName`
- `status`

## Reglas de datos

- No borrar ventas fisicamente.
- No modificar snapshots historicos silenciosamente.
- Toda anulacion debe ser evento separado.
- Todo descuento de inventario debe apuntar al evento de venta que lo origino.
- Todo impacto de inventario debe ser idempotente por `saleId`, `lineId` y `bridgeId`.
