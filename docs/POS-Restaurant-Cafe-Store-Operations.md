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

Task:
Implement the next hotel operations module:

POS / Restaurant / Cafe / Store Operations

This stage should implement:

1. Outlets
2. POS menu/product items
3. POS orders
4. POS order line items
5. Direct payment sales
6. Charge-to-room flow
7. POS receipt generation
8. Outlet sales summary
9. Traditional Ethiopian hotel workflow:

   * waiter takes order manually
   * waiter gives order to cashier
   * cashier enters order in POS
   * kitchen prepares food outside the system
   * waiter delivers food
10. Folio integration for charge-to-room

Do NOT implement full kitchen display system.
Do NOT implement inventory stock deduction yet.
Do NOT implement procurement yet.
Do NOT implement waiter mobile ordering yet.
Do NOT implement external payment gateway integration yet.

This is backend-only and API-first.

---

1. Generate NestJS module using Nest CLI

---

Use Nest CLI where applicable.

Generate/complete the restaurant/POS module:

```bash
nest g module modules/restaurant
nest g controller modules/restaurant
nest g service modules/restaurant
```

If there is already a `pos` module or `restaurant` module, use the existing structure and keep naming consistent.

Recommended naming:

* `restaurant` module can manage cafe/restaurant/bar/store POS for now.
* Use domain names like `outlets`, `posOrders`, `menuItems` internally.

Manual files are allowed for:

* DTOs
* repositories
* constants/enums
* tests
* helper types

---

2. Prisma schema design

---

Add POS/outlet models and enums.

Recommended enums:

```prisma
enum OutletType {
  RESTAURANT
  CAFE
  BAR
  STORE
  ROOM_SERVICE
  OTHER
}

enum PosOrderStatus {
  OPEN
  CLOSED
  CANCELLED
}

enum PosOrderPaymentStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  CHARGED_TO_ROOM
  VOIDED
}

enum PosOrderSource {
  WALK_IN
  TABLE_SERVICE
  ROOM_SERVICE
  MANUAL
}

enum MenuItemStatus {
  ACTIVE
  INACTIVE
  OUT_OF_STOCK
}

enum PosPaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  MOBILE_MONEY
  QR_PAYMENT
  ROOM_CHARGE
  OTHER
}
```

Recommended models:

```prisma
model Outlet {
  id          Int        @id @default(autoincrement())
  name        String
  code        String     @unique
  type        OutletType
  description String?
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  menuItems   MenuItem[]
  orders      PosOrder[]

  @@index([type])
  @@index([isActive])
  @@map("outlets")
}

model MenuItem {
  id          Int            @id @default(autoincrement())
  outletId    Int
  name        String
  code        String
  category    String?
  description String?
  price       Decimal        @db.Decimal(12, 2)
  status      MenuItemStatus @default(ACTIVE)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  outlet      Outlet         @relation(fields: [outletId], references: [id], onDelete: Restrict)
  orderItems  PosOrderItem[]

  @@unique([outletId, code])
  @@index([outletId])
  @@index([status])
  @@index([category])
  @@map("menu_items")
}

model PosOrder {
  id                 Int                   @id @default(autoincrement())
  orderNumber        String                @unique
  outletId           Int
  status             PosOrderStatus        @default(OPEN)
  paymentStatus      PosOrderPaymentStatus @default(UNPAID)
  source             PosOrderSource        @default(MANUAL)

  tableNumber        String?
  roomId             Int?
  stayId             Int?
  folioId            Int?

  subtotalAmount     Decimal               @default(0) @db.Decimal(12, 2)
  discountAmount     Decimal               @default(0) @db.Decimal(12, 2)
  taxAmount          Decimal               @default(0) @db.Decimal(12, 2)
  serviceAmount      Decimal               @default(0) @db.Decimal(12, 2)
  totalAmount        Decimal               @default(0) @db.Decimal(12, 2)
  paidAmount         Decimal               @default(0) @db.Decimal(12, 2)
  balanceAmount      Decimal               @default(0) @db.Decimal(12, 2)

  notes              String?
  cancelledReason    String?

  createdByUserId    Int?
  closedByUserId     Int?
  cancelledByUserId  Int?

  closedAt           DateTime?
  cancelledAt        DateTime?
  createdAt          DateTime              @default(now())
  updatedAt          DateTime              @updatedAt

  outlet             Outlet                @relation(fields: [outletId], references: [id], onDelete: Restrict)
  room               Room?                 @relation(fields: [roomId], references: [id], onDelete: SetNull)
  stay               Stay?                 @relation(fields: [stayId], references: [id], onDelete: SetNull)
  folio              Folio?                @relation(fields: [folioId], references: [id], onDelete: SetNull)

  createdBy          User?                 @relation("PosOrderCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  closedBy           User?                 @relation("PosOrderClosedBy", fields: [closedByUserId], references: [id], onDelete: SetNull)
  cancelledBy        User?                 @relation("PosOrderCancelledBy", fields: [cancelledByUserId], references: [id], onDelete: SetNull)

  items              PosOrderItem[]
  payments           PosOrderPayment[]

  @@index([outletId])
  @@index([status])
  @@index([paymentStatus])
  @@index([source])
  @@index([roomId])
  @@index([stayId])
  @@index([folioId])
  @@index([createdAt])
  @@map("pos_orders")
}

model PosOrderItem {
  id           Int      @id @default(autoincrement())
  orderId      Int
  menuItemId   Int
  description  String?
  quantity     Int      @default(1)
  unitPrice    Decimal  @db.Decimal(12, 2)
  totalAmount  Decimal  @db.Decimal(12, 2)
  notes        String?
  isVoided     Boolean  @default(false)
  voidReason   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  order        PosOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItem     MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([menuItemId])
  @@map("pos_order_items")
}

model PosOrderPayment {
  id               Int              @id @default(autoincrement())
  paymentNumber    String           @unique
  orderId          Int
  amount           Decimal          @db.Decimal(12, 2)
  method           PosPaymentMethod
  reference        String?
  notes            String?
  recordedByUserId Int?
  recordedAt       DateTime         @default(now())
  isVoided         Boolean          @default(false)
  voidReason       String?
  voidedAt         DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  order            PosOrder         @relation(fields: [orderId], references: [id], onDelete: Restrict)
  recordedBy       User?            @relation("PosOrderPaymentRecordedBy", fields: [recordedByUserId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([method])
  @@index([recordedAt])
  @@map("pos_order_payments")
}
```

Update relations if Prisma requires them:

* Room should have posOrders.
* Stay should have posOrders.
* Folio should have posOrders.
* User should have POS order/payment relation fields.

Important:

* Do not add hotelId.
* Do not add HotelUser.
* Do not reintroduce multi-hotel logic.

---

3. Permissions to use

---

Use existing seeded permissions:

POS:

* pos.dashboard.read
* pos.orders.create
* pos.orders.read
* pos.orders.update
* pos.orders.close
* pos.orders.cancel
* pos.payments.record
* pos.receipts.generate
* pos.charge_to_room
* pos.menu_items.create
* pos.menu_items.read
* pos.menu_items.update
* pos.menu_items.delete

Outlet sales:

* outlet_sales.read
* outlet_sales.read.own_outlet

Folios:

* folios.read
* folios.manual_charge.create

Rooms/stays:

* rooms.read
* in_house_guests.read

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

Implement these endpoints.

Outlets:

```txt
POST   /restaurant/outlets
GET    /restaurant/outlets
GET    /restaurant/outlets/:id
PATCH  /restaurant/outlets/:id
DELETE /restaurant/outlets/:id
```

Menu items:

```txt
POST   /restaurant/menu-items
GET    /restaurant/menu-items
GET    /restaurant/menu-items/:id
PATCH  /restaurant/menu-items/:id
DELETE /restaurant/menu-items/:id
PATCH  /restaurant/menu-items/:id/mark-out-of-stock
PATCH  /restaurant/menu-items/:id/mark-active
```

POS orders:

```txt
POST   /restaurant/orders
GET    /restaurant/orders
GET    /restaurant/orders/:id
PATCH  /restaurant/orders/:id
POST   /restaurant/orders/:id/items
PATCH  /restaurant/orders/:id/items/:itemId
PATCH  /restaurant/orders/:id/items/:itemId/void
POST   /restaurant/orders/:id/payments
POST   /restaurant/orders/:id/charge-to-room
PATCH  /restaurant/orders/:id/close
PATCH  /restaurant/orders/:id/cancel
```

Sales/reporting:

```txt
GET /restaurant/dashboard
GET /restaurant/sales-summary
GET /restaurant/outlets/:id/sales-summary
```

Room charge helper:

```txt
GET /restaurant/in-house-guests/search
```

This helps cashier search active stays/rooms before charging to room.

---

5. DTO requirements

---

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

Required DTOs:

Outlets:

* CreateOutletDto
* UpdateOutletDto
* GetOutletsQueryDto

Menu items:

* CreateMenuItemDto
* UpdateMenuItemDto
* GetMenuItemsQueryDto

Orders:

* CreatePosOrderDto
* UpdatePosOrderDto
* GetPosOrdersQueryDto
* AddPosOrderItemDto
* UpdatePosOrderItemDto
* VoidPosOrderItemDto
* RecordPosOrderPaymentDto
* ChargePosOrderToRoomDto
* ClosePosOrderDto
* CancelPosOrderDto

Reports:

* RestaurantDashboardQueryDto
* RestaurantSalesSummaryQueryDto
* InHouseGuestSearchQueryDto

Validation rules:

* outlet code must be unique.
* menu item code must be unique per outlet.
* menu item price must be positive.
* order must have valid outlet.
* order items must have quantity >= 1.
* cannot add inactive/out-of-stock menu item to order.
* cannot modify closed/cancelled order.
* payment amount must be positive.
* direct payment cannot exceed order balance unless overpayment support is added.
* charge-to-room requires active stay and open folio.
* cancellation requires reason.

Query DTOs should support:

* page
* limit
* search
* outletId
* status
* paymentStatus
* source
* createdFrom
* createdTo

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
restaurant/repositories/outlets.repository.ts
restaurant/repositories/menu-items.repository.ts
restaurant/repositories/pos-orders.repository.ts
restaurant/repositories/pos-order-items.repository.ts
restaurant/repositories/pos-order-payments.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

7. Business rules

---

Implement these business rules.

Outlet:

* outlet code must be unique.
* soft-delete outlet by setting isActive=false.
* cannot create order for inactive outlet.
* create audit logs.

Menu items:

* menu item code must be unique per outlet.
* price must be positive.
* inactive/out-of-stock items cannot be added to orders.
* soft-delete by setting status=INACTIVE.
* create audit logs.

Order creation:

* outlet must exist and be active.
* order number must be unique.
* if items are provided, calculate totals.
* if no items are provided, create OPEN order with zero totals.
* createdByUserId = current user.
* create audit log.

Order line items:

* can only add/update items on OPEN order.
* quantity must be at least 1.
* menu item must be ACTIVE.
* totalAmount = quantity * unitPrice.
* voided items do not count toward totals.
* recalculate order subtotal/total/balance after changes.
* create audit log.

Direct payment:

* can only record payment on OPEN order.
* amount must be positive.
* amount cannot exceed balance unless overpayment support is designed.
* payment methods include cash/card/bank/mobile/QR/other.
* update paidAmount and balanceAmount.
* if balance becomes 0, paymentStatus = PAID.
* create audit log.

Charge-to-room:

* order must be OPEN.
* order balance must be greater than 0.
* stay must exist and be ACTIVE.
* folio must exist and be OPEN.
* roomId/stayId/folioId should be linked to POS order.
* create a FolioLineItem with:

  * type = POS_CHARGE
  * description includes outlet/order number
  * sourceType = POS_ORDER
  * sourceId = order.id
* update folio totals through existing folio recalculation logic.
* set order paymentStatus = CHARGED_TO_ROOM.
* set order balanceAmount = 0.
* close order if requested or required.
* create audit log.
* prevent charging the same order to room twice.

Close order:

* order cannot be cancelled.
* order must have no unpaid balance unless charged to room.
* set status = CLOSED.
* closedAt and closedByUserId.
* create audit log.

Cancel order:

* cannot cancel CLOSED order unless void workflow exists.
* cancellation reason required.
* set status = CANCELLED.
* create audit log.
* cancelled order should not count in sales totals.

Sales summary:
Return:

* totalOrders
* closedOrders
* cancelledOrders
* grossSales
* directPayments
* roomCharges
* unpaidBalance
* salesByOutlet
* salesByPaymentMethod

Traditional workflow note:

* Waiters do not need system accounts in this stage.
* Cashier enters orders into POS.
* Kitchen/bar staff are not system users in this stage.

---

8. Audit logging

---

Use existing AuditLogsService.

Audit these actions:

* outlet created
* outlet updated
* outlet deactivated
* menu item created
* menu item updated
* menu item deactivated
* menu item marked out of stock
* POS order created
* POS order updated
* POS item added
* POS item updated
* POS item voided
* POS payment recorded
* POS order charged to room
* POS order closed
* POS order cancelled

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
* clear endpoint descriptions.

---

10. Tests

---

Add/update unit tests and e2e tests.

Unit tests should cover:

* outlet create/update/deactivate
* menu item create/update/out-of-stock
* order creation
* add item recalculates totals
* void item recalculates totals
* direct payment updates paid/balance
* overpayment rejection
* charge-to-room success
* charge-to-room rejects inactive stay
* charge-to-room rejects missing/open folio
* duplicate charge-to-room rejected
* close order rejects unpaid order
* cancel order requires reason
* sales summary calculations

E2E tests should cover at least:

* unauthorized user rejected
* user without permission rejected
* restaurant cashier can create outlet/menu item/order
* restaurant cashier can add item to order
* restaurant cashier can record direct payment
* restaurant cashier can charge order to room
* charge-to-room posts POS charge to folio
* order cannot be charged to room twice
* order can be closed after payment/room charge
* sales summary returns expected totals

Use existing auth/stay/folio test helpers if available.

---

11. Documentation

---

Add:

```txt
docs/restaurant-pos-module.md
```

Include:

* purpose of POS/restaurant module
* traditional waiter-to-cashier workflow
* outlet model
* menu item model
* order lifecycle
* direct payment flow
* charge-to-room flow
* folio integration
* main permissions
* sales summary fields
* intentional limitations

Intentional limitations to document:

* no kitchen display system yet
* no waiter mobile ordering yet
* no inventory stock deduction yet
* no external payment gateway integration yet
* no fiscal printer/e-invoice integration yet

Update README if needed.
Update tree.md after source-controlled structure changes.

---

12. Definition of done

---

This task is complete only when:

* Prisma models/enums are added.
* Migration is created.
* Prisma client generates.
* Outlet API works.
* Menu item API works.
* POS order API works.
* Order item add/update/void works.
* Direct payment works.
* Charge-to-room works.
* Charge-to-room posts to existing folio as POS_CHARGE.
* Duplicate charge-to-room is prevented.
* Order close/cancel works.
* Restaurant dashboard/sales summary works.
* Audit logs are created for sensitive POS actions.
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
