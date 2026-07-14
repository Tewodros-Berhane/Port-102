We are continuing the Port-102 Hotel Operating System backend.

Work only inside apps/backend unless root-level tree.md or docs must be updated.

Read and strictly follow apps/backend/AGENTS.md before making changes.

Important project rules:

* Use the Nest CLI whenever generating NestJS framework files.
* Follow Controller → Service → Repository → PrismaService architecture.
* Do not put Prisma queries in controllers.
* Use DTOs with class-validator and Swagger decorators.
* Add/update unit and e2e tests where needed.
* Update tree.md if source-controlled files/folders change.
* Do not make broad unrelated refactors.

Context:
The backend has completed:

* single-hotel auth/RBAC
* users, roles, permissions, employees, guests, approvals, audit logs
* rooms/floors/room types/room status
* reservations/date availability/booking calendar
* front desk stay lifecycle
* folios, billing, payments, invoices, receipts
* housekeeping operations
* maintenance operations
* POS / restaurant / cafe / store operations

Task:
Implement the next hotel operations module:

Inventory + Store + Procurement

This stage should implement:

1. Inventory item master
2. Stock balances
3. Stock receiving
4. Stock issuing to departments/outlets
5. Stock transfers
6. Stock adjustments
7. Reorder levels and low-stock alerts
8. Stock movement history
9. Suppliers
10. Purchase requests
11. Purchase orders
12. Goods received notes
13. Basic procurement approval flow
14. Inventory dashboard and reports

Do NOT implement advanced accounting integration yet.
Do NOT implement automatic POS stock deduction yet unless it can be done safely as an optional hook.
Do NOT implement barcode scanning yet.
Do NOT implement advanced costing methods beyond basic average/unit cost unless already simple.
Do NOT implement multi-warehouse complexity unless the model supports it cleanly.

This is backend-only and API-first.

---

1. Generate NestJS modules using Nest CLI

---

Use Nest CLI where applicable.

Generate/complete these modules if they are still placeholders:

```bash
nest g module modules/inventory
nest g controller modules/inventory
nest g service modules/inventory

nest g module modules/procurement
nest g controller modules/procurement
nest g service modules/procurement
```

Manual files are allowed for:

* DTOs
* repositories
* constants/enums
* tests
* helper types

Recommended structure:

* `inventory` handles stock items, stock balances, movements, receiving, issuing, transfers, adjustments, reorder alerts.
* `procurement` handles suppliers, purchase requests, purchase orders, and goods received notes.

---

2. Prisma schema design

---

Add inventory/procurement models and enums.

Recommended enums:

```prisma
enum InventoryItemStatus {
  ACTIVE
  INACTIVE
}

enum InventoryItemType {
  FOOD
  BEVERAGE
  HOUSEKEEPING_SUPPLY
  LINEN
  ROOM_AMENITY
  CLEANING_SUPPLY
  MAINTENANCE_PART
  OFFICE_SUPPLY
  STORE_PRODUCT
  OTHER
}

enum StockMovementType {
  RECEIPT
  ISSUE
  TRANSFER_IN
  TRANSFER_OUT
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  POS_CONSUMPTION
  WASTE
  RETURN
}

enum StockAdjustmentStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum PurchaseRequestStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  CANCELLED
  CONVERTED_TO_PO
}

enum PurchaseOrderStatus {
  DRAFT
  SUBMITTED
  APPROVED
  ORDERED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

enum GoodsReceivedStatus {
  DRAFT
  POSTED
  CANCELLED
}

enum SupplierStatus {
  ACTIVE
  INACTIVE
}
```

Recommended models:

```prisma
model InventoryLocation {
  id          Int      @id @default(autoincrement())
  name        String
  code        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  balances    StockBalance[]
  movements   StockMovement[] @relation("StockMovementLocation")
  fromTransfers StockMovement[] @relation("StockTransferFromLocation")
  toTransfers   StockMovement[] @relation("StockTransferToLocation")

  @@index([isActive])
  @@map("inventory_locations")
}

model InventoryItem {
  id             Int                 @id @default(autoincrement())
  itemNumber     String              @unique
  name           String
  type           InventoryItemType
  category       String?
  unitOfMeasure  String
  reorderLevel   Decimal?            @db.Decimal(12, 2)
  reorderQuantity Decimal?           @db.Decimal(12, 2)
  averageCost    Decimal?            @db.Decimal(12, 2)
  status         InventoryItemStatus @default(ACTIVE)
  description    String?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  balances       StockBalance[]
  movements      StockMovement[]
  purchaseRequestItems PurchaseRequestItem[]
  purchaseOrderItems   PurchaseOrderItem[]
  goodsReceivedItems   GoodsReceivedItem[]

  @@index([type])
  @@index([status])
  @@index([category])
  @@map("inventory_items")
}

model StockBalance {
  id          Int      @id @default(autoincrement())
  itemId      Int
  locationId  Int
  quantity    Decimal  @default(0) @db.Decimal(12, 2)
  updatedAt   DateTime @updatedAt

  item        InventoryItem     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  location    InventoryLocation @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([itemId, locationId])
  @@index([itemId])
  @@index([locationId])
  @@map("stock_balances")
}

model StockMovement {
  id              Int               @id @default(autoincrement())
  movementNumber  String            @unique
  itemId          Int
  locationId      Int?
  fromLocationId  Int?
  toLocationId    Int?
  type            StockMovementType
  quantity        Decimal           @db.Decimal(12, 2)
  unitCost        Decimal?          @db.Decimal(12, 2)
  totalCost       Decimal?          @db.Decimal(12, 2)
  referenceType   String?
  referenceId     Int?
  reason          String?
  notes           String?
  createdByUserId Int?
  createdAt       DateTime          @default(now())

  item            InventoryItem     @relation(fields: [itemId], references: [id], onDelete: Restrict)
  location        InventoryLocation? @relation("StockMovementLocation", fields: [locationId], references: [id], onDelete: SetNull)
  fromLocation    InventoryLocation? @relation("StockTransferFromLocation", fields: [fromLocationId], references: [id], onDelete: SetNull)
  toLocation      InventoryLocation? @relation("StockTransferToLocation", fields: [toLocationId], references: [id], onDelete: SetNull)
  createdBy       User?             @relation("StockMovementCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([itemId])
  @@index([type])
  @@index([createdAt])
  @@index([locationId])
  @@index([fromLocationId])
  @@index([toLocationId])
  @@map("stock_movements")
}

model StockAdjustment {
  id              Int                   @id @default(autoincrement())
  adjustmentNumber String                @unique
  itemId          Int
  locationId      Int
  status          StockAdjustmentStatus  @default(PENDING)
  quantity        Decimal                @db.Decimal(12, 2)
  reason          String
  requestedByUserId Int?
  approvedByUserId  Int?
  rejectedByUserId  Int?
  decidedAt       DateTime?
  decisionNote    String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  item            InventoryItem          @relation(fields: [itemId], references: [id], onDelete: Restrict)
  location        InventoryLocation      @relation(fields: [locationId], references: [id], onDelete: Restrict)
  requestedBy     User?                  @relation("StockAdjustmentRequestedBy", fields: [requestedByUserId], references: [id], onDelete: SetNull)
  approvedBy      User?                  @relation("StockAdjustmentApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  rejectedBy      User?                  @relation("StockAdjustmentRejectedBy", fields: [rejectedByUserId], references: [id], onDelete: SetNull)

  @@index([itemId])
  @@index([locationId])
  @@index([status])
  @@map("stock_adjustments")
}

model Supplier {
  id          Int            @id @default(autoincrement())
  supplierNumber String      @unique
  name        String
  contactName String?
  phone       String?
  email       String?
  address     String?
  status      SupplierStatus @default(ACTIVE)
  notes       String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  purchaseOrders PurchaseOrder[]

  @@index([status])
  @@map("suppliers")
}

model PurchaseRequest {
  id              Int                   @id @default(autoincrement())
  requestNumber   String                @unique
  status          PurchaseRequestStatus @default(DRAFT)
  departmentId    Int?
  requestedByUserId Int?
  approvedByUserId  Int?
  rejectedByUserId  Int?
  submittedAt     DateTime?
  decidedAt       DateTime?
  reason          String?
  decisionNote    String?
  notes           String?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  department      Department?           @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  requestedBy     User?                 @relation("PurchaseRequestRequestedBy", fields: [requestedByUserId], references: [id], onDelete: SetNull)
  approvedBy      User?                 @relation("PurchaseRequestApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  rejectedBy      User?                 @relation("PurchaseRequestRejectedBy", fields: [rejectedByUserId], references: [id], onDelete: SetNull)

  items           PurchaseRequestItem[]

  @@index([status])
  @@index([departmentId])
  @@index([requestedByUserId])
  @@map("purchase_requests")
}

model PurchaseRequestItem {
  id                Int      @id @default(autoincrement())
  purchaseRequestId Int
  itemId            Int
  quantity          Decimal  @db.Decimal(12, 2)
  estimatedUnitCost Decimal? @db.Decimal(12, 2)
  notes             String?

  purchaseRequest   PurchaseRequest @relation(fields: [purchaseRequestId], references: [id], onDelete: Cascade)
  item              InventoryItem   @relation(fields: [itemId], references: [id], onDelete: Restrict)

  @@index([purchaseRequestId])
  @@index([itemId])
  @@map("purchase_request_items")
}

model PurchaseOrder {
  id              Int                 @id @default(autoincrement())
  orderNumber     String              @unique
  supplierId      Int?
  purchaseRequestId Int?
  status          PurchaseOrderStatus @default(DRAFT)
  orderedAt       DateTime?
  expectedAt      DateTime?
  approvedByUserId Int?
  createdByUserId Int?
  notes           String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  supplier        Supplier?           @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  purchaseRequest PurchaseRequest?     @relation(fields: [purchaseRequestId], references: [id], onDelete: SetNull)
  approvedBy      User?               @relation("PurchaseOrderApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  createdBy       User?               @relation("PurchaseOrderCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  items           PurchaseOrderItem[]
  goodsReceived   GoodsReceived[]

  @@index([supplierId])
  @@index([purchaseRequestId])
  @@index([status])
  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id              Int      @id @default(autoincrement())
  purchaseOrderId Int
  itemId          Int
  quantity        Decimal  @db.Decimal(12, 2)
  unitCost        Decimal? @db.Decimal(12, 2)
  receivedQuantity Decimal @default(0) @db.Decimal(12, 2)
  notes           String?

  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  item            InventoryItem @relation(fields: [itemId], references: [id], onDelete: Restrict)

  @@index([purchaseOrderId])
  @@index([itemId])
  @@map("purchase_order_items")
}

model GoodsReceived {
  id              Int                 @id @default(autoincrement())
  grnNumber       String              @unique
  purchaseOrderId Int?
  supplierId      Int?
  locationId      Int
  status          GoodsReceivedStatus @default(DRAFT)
  receivedByUserId Int?
  postedAt        DateTime?
  notes           String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  purchaseOrder   PurchaseOrder?      @relation(fields: [purchaseOrderId], references: [id], onDelete: SetNull)
  supplier        Supplier?           @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  location        InventoryLocation   @relation(fields: [locationId], references: [id], onDelete: Restrict)
  receivedBy      User?               @relation("GoodsReceivedBy", fields: [receivedByUserId], references: [id], onDelete: SetNull)

  items           GoodsReceivedItem[]

  @@index([purchaseOrderId])
  @@index([supplierId])
  @@index([locationId])
  @@index([status])
  @@map("goods_received")
}

model GoodsReceivedItem {
  id              Int      @id @default(autoincrement())
  goodsReceivedId Int
  itemId          Int
  quantity        Decimal  @db.Decimal(12, 2)
  unitCost        Decimal? @db.Decimal(12, 2)
  notes           String?

  goodsReceived   GoodsReceived @relation(fields: [goodsReceivedId], references: [id], onDelete: Cascade)
  item            InventoryItem @relation(fields: [itemId], references: [id], onDelete: Restrict)

  @@index([goodsReceivedId])
  @@index([itemId])
  @@map("goods_received_items")
}
```

Update User/Department relations if Prisma requires them.

Important:

* Do not add hotelId.
* Do not add HotelUser.
* Do not reintroduce multi-hotel logic.

---

3. Permissions to use

---

Use existing seeded permissions:

Inventory:

* inventory.items.create
* inventory.items.read
* inventory.items.update
* inventory.items.delete
* inventory.stock.receive
* inventory.stock.issue
* inventory.stock.transfer
* inventory.stock.adjust
* inventory.stock.adjust.request
* inventory.stock.adjust.approve
* inventory.reorder_alerts.read
* inventory.movements.read
* inventory.counts.create
* inventory.counts.read
* inventory.counts.approve

Procurement:

* purchase_requests.create
* purchase_requests.read
* purchase_requests.update
* purchase_requests.approve
* purchase_requests.reject
* purchase_orders.create
* purchase_orders.read
* purchase_orders.update
* purchase_orders.approve
* purchase_orders.cancel
* goods_received.create
* goods_received.read
* suppliers.create
* suppliers.read
* suppliers.update
* suppliers.delete

Reports:

* reports.inventory.read
* reports.procurement.read

Every protected route should normally use:

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('resource.action')
```

Do not use HotelAccessGuard.
Do not use CurrentHotel.
Do not expect hotelId in CurrentUser.

---

4. API endpoints

---

Inventory locations:

```txt
POST   /inventory/locations
GET    /inventory/locations
GET    /inventory/locations/:id
PATCH  /inventory/locations/:id
DELETE /inventory/locations/:id
```

Inventory items:

```txt
POST   /inventory/items
GET    /inventory/items
GET    /inventory/items/:id
PATCH  /inventory/items/:id
DELETE /inventory/items/:id
```

Stock balances and movements:

```txt
GET  /inventory/balances
GET  /inventory/balances/:itemId
GET  /inventory/movements
POST /inventory/receive
POST /inventory/issue
POST /inventory/transfer
```

Stock adjustments:

```txt
POST  /inventory/adjustments
GET   /inventory/adjustments
GET   /inventory/adjustments/:id
PATCH /inventory/adjustments/:id/approve
PATCH /inventory/adjustments/:id/reject
PATCH /inventory/adjustments/:id/cancel
```

Reorder alerts / dashboard:

```txt
GET /inventory/reorder-alerts
GET /inventory/dashboard
```

Suppliers:

```txt
POST   /procurement/suppliers
GET    /procurement/suppliers
GET    /procurement/suppliers/:id
PATCH  /procurement/suppliers/:id
DELETE /procurement/suppliers/:id
```

Purchase requests:

```txt
POST  /procurement/purchase-requests
GET   /procurement/purchase-requests
GET   /procurement/purchase-requests/:id
PATCH /procurement/purchase-requests/:id
PATCH /procurement/purchase-requests/:id/submit
PATCH /procurement/purchase-requests/:id/approve
PATCH /procurement/purchase-requests/:id/reject
PATCH /procurement/purchase-requests/:id/cancel
```

Purchase orders:

```txt
POST  /procurement/purchase-orders
GET   /procurement/purchase-orders
GET   /procurement/purchase-orders/:id
PATCH /procurement/purchase-orders/:id
POST  /procurement/purchase-orders/from-request/:purchaseRequestId
PATCH /procurement/purchase-orders/:id/approve
PATCH /procurement/purchase-orders/:id/mark-ordered
PATCH /procurement/purchase-orders/:id/cancel
```

Goods received:

```txt
POST  /procurement/goods-received
GET   /procurement/goods-received
GET   /procurement/goods-received/:id
PATCH /procurement/goods-received/:id/post
PATCH /procurement/goods-received/:id/cancel
```

Reports:

```txt
GET /procurement/dashboard
```

---

5. DTO requirements

---

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

Required DTOs:

Inventory:

* CreateInventoryLocationDto
* UpdateInventoryLocationDto
* GetInventoryLocationsQueryDto
* CreateInventoryItemDto
* UpdateInventoryItemDto
* GetInventoryItemsQueryDto
* GetStockBalancesQueryDto
* GetStockMovementsQueryDto
* ReceiveStockDto
* IssueStockDto
* TransferStockDto
* CreateStockAdjustmentDto
* ApproveStockAdjustmentDto
* RejectStockAdjustmentDto
* CancelStockAdjustmentDto
* InventoryDashboardQueryDto

Procurement:

* CreateSupplierDto
* UpdateSupplierDto
* GetSuppliersQueryDto
* CreatePurchaseRequestDto
* UpdatePurchaseRequestDto
* GetPurchaseRequestsQueryDto
* SubmitPurchaseRequestDto
* ApprovePurchaseRequestDto
* RejectPurchaseRequestDto
* CancelPurchaseRequestDto
* CreatePurchaseOrderDto
* UpdatePurchaseOrderDto
* GetPurchaseOrdersQueryDto
* ApprovePurchaseOrderDto
* MarkPurchaseOrderOrderedDto
* CancelPurchaseOrderDto
* CreateGoodsReceivedDto
* PostGoodsReceivedDto
* CancelGoodsReceivedDto
* GetGoodsReceivedQueryDto
* ProcurementDashboardQueryDto

Validation rules:

* quantity must be positive.
* transfer requires different fromLocationId and toLocationId.
* issue cannot make stock negative unless explicitly allowed. Default: reject.
* itemNumber must be unique.
* location code must be unique.
* supplierNumber must be unique.
* purchase request must have at least one item.
* purchase order must have at least one item.
* goods received must have at least one item.
* cannot approve already approved/rejected/cancelled records.
* rejection/cancellation requires reason.
* posting goods received should be idempotent or safely rejected if already posted.

Query DTOs should support:

* page
* limit
* search
* status
* type
* itemId
* locationId
* supplierId
* date ranges

Use maximum limit 100.

---

6. Repository/service architecture

---

Follow:

Controller
↓
Service
↓
Repository
↓
PrismaService

Required repositories:

```txt
inventory/repositories/inventory-items.repository.ts
inventory/repositories/inventory-locations.repository.ts
inventory/repositories/stock-balances.repository.ts
inventory/repositories/stock-movements.repository.ts
inventory/repositories/stock-adjustments.repository.ts

procurement/repositories/suppliers.repository.ts
procurement/repositories/purchase-requests.repository.ts
procurement/repositories/purchase-orders.repository.ts
procurement/repositories/goods-received.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

7. Business rules

---

Inventory item:

* itemNumber must be unique.
* unitOfMeasure is required.
* reorderLevel and reorderQuantity cannot be negative.
* soft-delete by setting status = INACTIVE.
* inactive items cannot be received/issued/transferred.
* create audit logs.

Inventory location:

* code must be unique.
* inactive location cannot receive/issue/transfer stock.
* create audit logs.

Stock receive:

* item and location must be active.
* quantity must be positive.
* increase stock balance.
* create stock movement type RECEIPT.
* update averageCost if unitCost provided.
* use transaction.
* create audit log.

Stock issue:

* item and location must be active.
* quantity must be positive.
* stock balance must be enough.
* decrease stock balance.
* create stock movement type ISSUE.
* use transaction.
* create audit log.

Stock transfer:

* item and both locations must be active.
* from and to locations must differ.
* from location must have enough stock.
* decrease from balance.
* increase to balance.
* create TRANSFER_OUT and TRANSFER_IN movements.
* use transaction.
* create audit log.

Stock adjustment:

* request creates PENDING adjustment.
* approve applies stock change.
* positive quantity increases stock.
* negative quantity decreases stock.
* negative adjustment cannot make stock negative.
* create adjustment movement.
* reject/cancel should not change stock.
* use transaction when applying.
* create audit log.

Reorder alerts:

* show active items where total quantity or location quantity is less than or equal to reorderLevel.
* include item, current quantity, reorderLevel, reorderQuantity.

Purchase request:

* must have at least one item.
* items must exist and be active.
* DRAFT can be updated.
* SUBMITTED can be approved/rejected.
* APPROVED can be converted to purchase order.
* rejected/cancelled requests cannot be converted.
* create audit logs.

Purchase order:

* must have at least one item.
* supplier must be active if provided.
* can be created directly or from approved purchase request.
* from-request should copy approved request items.
* approve sets status APPROVED.
* mark-ordered sets status ORDERED and orderedAt.
* cancel requires reason.
* create audit logs.

Goods received:

* can be created with or without purchase order.
* posting goods received:

  * increases stock at target location.
  * creates stock movement type RECEIPT.
  * updates PO item receivedQuantity if linked to purchase order.
  * updates purchase order status to PARTIALLY_RECEIVED or RECEIVED.
  * uses transaction.
  * creates audit log.
* posted GRN cannot be posted again.
* cancelled GRN cannot be posted.

Dashboards:
Inventory dashboard should return:

* totalActiveItems
* lowStockItems
* totalStockValue if averageCost available
* recentMovements
* stockByItemType

Procurement dashboard should return:

* pendingPurchaseRequests
* approvedPurchaseRequests
* openPurchaseOrders
* partiallyReceivedOrders
* receivedOrders
* activeSuppliers

---

8. Audit logging

---

Use existing AuditLogsService.

Audit these actions:

* inventory item created/updated/deactivated
* inventory location created/updated/deactivated
* stock received
* stock issued
* stock transferred
* stock adjustment requested/approved/rejected/cancelled
* supplier created/updated/deactivated
* purchase request created/submitted/approved/rejected/cancelled
* purchase order created/approved/ordered/cancelled
* goods received created/posted/cancelled

Do not create audit logs directly in controllers.

---

9. Swagger requirements

---

Every endpoint must include:

* @ApiTags
* @ApiBearerAuth where protected
* @ApiOperation
* response decorators
* DTO property decorators

Swagger must show:

* request body schemas
* query parameters
* auth requirements
* clear endpoint descriptions

---

10. Tests

---

Add/update unit tests and e2e tests.

Unit tests should cover:

* item create/update/deactivate
* location create/update/deactivate
* receive stock increases balance
* issue stock decreases balance
* issue rejects insufficient stock
* transfer moves stock between locations
* transfer rejects same location
* adjustment request/approve/reject
* negative adjustment rejects insufficient stock
* reorder alerts
* supplier create/update/deactivate
* purchase request submit/approve/reject/cancel
* purchase order from request
* purchase order approve/mark ordered/cancel
* goods received post increases stock
* goods received updates purchase order received status
* duplicate posting rejected
* dashboard counts

E2E tests should cover at least:

* unauthorized user rejected
* user without permission rejected
* create inventory location
* create inventory item
* receive stock
* issue stock
* transfer stock
* low stock alert
* create supplier
* create purchase request
* approve purchase request
* create purchase order from request
* approve/mark ordered purchase order
* create and post goods received
* posted goods received increases stock balance

Use existing auth/test helpers if available.

---

11. Documentation

---

Add:

```txt
docs/inventory-procurement-module.md
```

Include:

* purpose of inventory and procurement module
* inventory item model
* stock balance and movement model
* receiving/issuing/transfer/adjustment flows
* reorder alert logic
* supplier model
* purchase request lifecycle
* purchase order lifecycle
* goods received lifecycle
* dashboard fields
* main permissions
* intentional limitations

Intentional limitations to document:

* no automatic POS stock deduction yet
* no accounting integration yet
* no barcode scanning yet
* no advanced costing methods yet
* no multi-warehouse complexity beyond inventory locations

Update README if needed.
Update tree.md after source-controlled structure changes.

---

12. Definition of done

---

This task is complete only when:

* Prisma models/enums are added.
* Migration is created.
* Prisma client generates.
* Inventory locations API works.
* Inventory items API works.
* Stock receive/issue/transfer works.
* Stock balances update correctly.
* Stock movements are recorded.
* Stock adjustment workflow works.
* Reorder alerts work.
* Suppliers API works.
* Purchase request workflow works.
* Purchase order workflow works.
* Goods received workflow works.
* Goods received posting increases stock.
* Purchase order received status updates correctly.
* Inventory dashboard works.
* Procurement dashboard works.
* Audit logs are created for sensitive inventory/procurement actions.
* All endpoints are protected with JwtAuthGuard + PermissionsGuard where appropriate.
* No multi-hotel logic is reintroduced.
* No hotelId or HotelUser references are added.
* DTO validation exists.
* Swagger docs are complete.
* Unit tests pass.
* E2E tests pass.
* npm run build passes.
* npm run test passes.
* npm run test:e2e passes.
* tree.md is updated.

After completion, provide a concise report with:

* files changed
* models added
* endpoints added
* permissions used
* tests added/updated
* verification results
* remaining caveats if any

```
```
