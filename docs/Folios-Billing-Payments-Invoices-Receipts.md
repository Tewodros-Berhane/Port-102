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
* floors, room types, room amenities, rooms, room status, physical availability
* reservations, reservation rooms, date-based availability, booking calendar
* front desk stay lifecycle:

  * check-in
  * checkout
  * active stays
  * in-house guests
  * room assignment
  * room move
  * stay extension
  * front desk dashboard

Current intentional limitations:

* no folios yet
* no invoices yet
* no receipts yet
* no payments yet
* no POS yet
* no automatic housekeeping task creation yet

Task:
Implement the next hotel operations module:

Folios, Billing, Payments, Invoices, and Receipts

This stage should implement:

1. Folio creation for a stay
2. Folio line items / charges
3. Manual charges
4. Room charge posting
5. Discounts
6. Taxes/service charges foundation
7. Payment recording
8. Partial payments
9. Split payments
10. Folio balance calculation
11. Invoice generation
12. Receipt generation
13. Checkout billing validation hook

Do NOT implement POS yet.
Do NOT implement restaurant/cafe orders yet.
Do NOT implement inventory yet.
Do NOT integrate external payment gateways yet.
Do NOT implement government e-invoice integration yet.

This module should support internal payment recording first.

---

1. Generate NestJS modules using Nest CLI

---

Use Nest CLI where applicable.

Generate/complete these modules if they are still placeholders:

```bash
nest g module modules/folios
nest g controller modules/folios
nest g service modules/folios

nest g module modules/payments
nest g controller modules/payments
nest g service modules/payments

nest g module modules/invoices
nest g controller modules/invoices
nest g service modules/invoices
```

If a `billing` module already exists and makes more sense as the main module, use it as the orchestration module.

Recommended structure:

* `folios` handles guest accounts and line items.
* `payments` handles payment records.
* `invoices` handles invoice/receipt generation.
* `billing` can coordinate workflows if needed.

Manual files are allowed for:

* DTOs
* repositories
* constants/enums
* tests
* helper types

---

2. Prisma schema design

---

Add billing models and enums.

Recommended enums:

```prisma
enum FolioStatus {
  OPEN
  CLOSED
  VOIDED
}

enum FolioLineItemType {
  ROOM_CHARGE
  MANUAL_CHARGE
  DISCOUNT
  TAX
  SERVICE_CHARGE
  PAYMENT_ADJUSTMENT
  POS_CHARGE
  LAUNDRY_CHARGE
  OTHER
}

enum PaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  MOBILE_MONEY
  QR_PAYMENT
  OTHER
}

enum PaymentStatus {
  RECORDED
  VOIDED
  REFUNDED
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  VOIDED
}

enum ReceiptStatus {
  ISSUED
  VOIDED
}
```

Recommended models:

```prisma
model Folio {
  id              Int          @id @default(autoincrement())
  folioNumber     String       @unique
  stayId          Int          @unique
  guestId         Int
  status          FolioStatus  @default(OPEN)

  subtotalAmount  Decimal      @default(0) @db.Decimal(12, 2)
  discountAmount  Decimal      @default(0) @db.Decimal(12, 2)
  taxAmount       Decimal      @default(0) @db.Decimal(12, 2)
  serviceAmount   Decimal      @default(0) @db.Decimal(12, 2)
  totalAmount     Decimal      @default(0) @db.Decimal(12, 2)
  paidAmount      Decimal      @default(0) @db.Decimal(12, 2)
  balanceAmount   Decimal      @default(0) @db.Decimal(12, 2)

  openedAt        DateTime     @default(now())
  closedAt        DateTime?
  openedByUserId  Int?
  closedByUserId  Int?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  stay            Stay         @relation(fields: [stayId], references: [id], onDelete: Restrict)
  guest           Guest        @relation(fields: [guestId], references: [id], onDelete: Restrict)
  openedBy        User?        @relation("FolioOpenedBy", fields: [openedByUserId], references: [id], onDelete: SetNull)
  closedBy        User?        @relation("FolioClosedBy", fields: [closedByUserId], references: [id], onDelete: SetNull)

  lineItems       FolioLineItem[]
  payments        Payment[]
  invoices        Invoice[]
  receipts        Receipt[]

  @@index([stayId])
  @@index([guestId])
  @@index([status])
  @@map("folios")
}

model FolioLineItem {
  id              Int               @id @default(autoincrement())
  folioId         Int
  type            FolioLineItemType
  description     String
  quantity        Int               @default(1)
  unitAmount      Decimal           @db.Decimal(12, 2)
  totalAmount     Decimal           @db.Decimal(12, 2)
  isVoided        Boolean           @default(false)
  voidReason      String?
  sourceType      String?
  sourceId        Int?
  postedByUserId  Int?
  postedAt        DateTime          @default(now())
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  folio           Folio             @relation(fields: [folioId], references: [id], onDelete: Cascade)
  postedBy        User?             @relation("FolioLineItemPostedBy", fields: [postedByUserId], references: [id], onDelete: SetNull)

  @@index([folioId])
  @@index([type])
  @@index([postedByUserId])
  @@map("folio_line_items")
}

model Payment {
  id              Int           @id @default(autoincrement())
  paymentNumber   String        @unique
  folioId         Int
  amount          Decimal       @db.Decimal(12, 2)
  method          PaymentMethod
  status          PaymentStatus @default(RECORDED)
  reference       String?
  notes           String?
  recordedByUserId Int?
  recordedAt      DateTime      @default(now())
  voidedAt        DateTime?
  voidReason      String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  folio           Folio         @relation(fields: [folioId], references: [id], onDelete: Restrict)
  recordedBy      User?         @relation("PaymentRecordedBy", fields: [recordedByUserId], references: [id], onDelete: SetNull)

  receipts        Receipt[]

  @@index([folioId])
  @@index([method])
  @@index([status])
  @@index([recordedAt])
  @@map("payments")
}

model Invoice {
  id              Int           @id @default(autoincrement())
  invoiceNumber   String        @unique
  folioId         Int
  status          InvoiceStatus @default(ISSUED)
  subtotalAmount  Decimal       @db.Decimal(12, 2)
  discountAmount  Decimal       @db.Decimal(12, 2)
  taxAmount       Decimal       @db.Decimal(12, 2)
  serviceAmount   Decimal       @db.Decimal(12, 2)
  totalAmount     Decimal       @db.Decimal(12, 2)
  issuedByUserId  Int?
  issuedAt        DateTime      @default(now())
  voidedAt        DateTime?
  voidReason      String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  folio           Folio         @relation(fields: [folioId], references: [id], onDelete: Restrict)
  issuedBy        User?         @relation("InvoiceIssuedBy", fields: [issuedByUserId], references: [id], onDelete: SetNull)

  @@index([folioId])
  @@index([status])
  @@index([issuedAt])
  @@map("invoices")
}

model Receipt {
  id              Int           @id @default(autoincrement())
  receiptNumber   String        @unique
  folioId         Int
  paymentId       Int?
  status          ReceiptStatus @default(ISSUED)
  amount          Decimal       @db.Decimal(12, 2)
  issuedByUserId  Int?
  issuedAt        DateTime      @default(now())
  voidedAt        DateTime?
  voidReason      String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  folio           Folio         @relation(fields: [folioId], references: [id], onDelete: Restrict)
  payment         Payment?      @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  issuedBy        User?         @relation("ReceiptIssuedBy", fields: [issuedByUserId], references: [id], onDelete: SetNull)

  @@index([folioId])
  @@index([paymentId])
  @@index([status])
  @@index([issuedAt])
  @@map("receipts")
}
```

Also update existing relation fields if Prisma requires them:

* Stay should relate to Folio.
* Guest should relate to Folio.
* User should relate to opened/closed folios, posted line items, payments, invoices, and receipts.

Important:

* Do not add hotelId.
* Do not add HotelUser.
* Do not reintroduce multi-hotel logic.

---

3. Permissions to use

---

Use existing seeded permissions:

Folios:

* folios.create
* folios.read
* folios.update
* folios.close
* folios.manual_charge.create
* folios.charge.void
* folios.discount.apply.small
* folios.discount.request
* folios.discount.approve
* folios.adjustment.request
* folios.adjustment.approve

Payments:

* payments.record
* payments.read
* payments.update
* payments.void
* payments.refund.request
* payments.refund.review
* payments.refund.approve
* payments.reconcile
* payments.methods.read

Invoices/receipts:

* invoices.generate
* invoices.read
* receipts.generate
* receipts.read

Reports later:

* reports.payment_summary.read
* reports.revenue.read

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

Folios:

```txt
POST   /folios
GET    /folios
GET    /folios/:id
GET    /folios/by-stay/:stayId
PATCH  /folios/:id
PATCH  /folios/:id/close
POST   /folios/:id/line-items
PATCH  /folios/:id/line-items/:lineItemId/void
POST   /folios/:id/discounts
GET    /folios/:id/summary
```

Payments:

```txt
POST   /payments
GET    /payments
GET    /payments/:id
GET    /payments/by-folio/:folioId
PATCH  /payments/:id/void
```

Invoices:

```txt
POST   /invoices/generate
GET    /invoices
GET    /invoices/:id
GET    /invoices/by-folio/:folioId
PATCH  /invoices/:id/void
```

Receipts:

```txt
POST   /receipts/generate
GET    /receipts
GET    /receipts/:id
GET    /receipts/by-folio/:folioId
PATCH  /receipts/:id/void
```

Stay integration endpoint:

```txt
POST /stays/:id/open-folio
```

Checkout integration:
Update checkout logic so checkout can optionally require folio settlement.

For this stage:

* If a stay has an open folio with balanceAmount > 0, normal checkout should be blocked.
* Allow future override later, but do not implement override unless a permission exists and is clearly protected.
* If no folio exists, checkout can either:

  * allow checkout for now, or
  * create/open folio before checkout.
    Preferred: require folio settlement only if folio exists.

---

5. DTO requirements

---

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

Required DTOs:

Folios:

* CreateFolioDto
* UpdateFolioDto
* GetFoliosQueryDto
* AddFolioLineItemDto
* VoidFolioLineItemDto
* ApplyDiscountDto
* CloseFolioDto

Payments:

* RecordPaymentDto
* GetPaymentsQueryDto
* VoidPaymentDto

Invoices:

* GenerateInvoiceDto
* GetInvoicesQueryDto
* VoidInvoiceDto

Receipts:

* GenerateReceiptDto
* GetReceiptsQueryDto
* VoidReceiptDto

Validation rules:

* amount values must be positive where applicable.
* quantity must be at least 1.
* discounts must be negative line items or handled as positive discountAmount internally, but be consistent.
* payment amount must be greater than 0.
* payment method must be valid.
* cannot record payment above remaining balance unless overpayment support is explicitly designed.
* cannot add charges to a closed folio.
* cannot record payments on a closed/voided folio unless explicitly allowed.
* cannot void already voided payment/line item/invoice/receipt.

Query DTOs should support:

* page
* limit
* search
* status
* date range filters where relevant
* folioId
* guestId
* stayId

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
folios/repositories/folios.repository.ts
folios/repositories/folio-line-items.repository.ts
payments/repositories/payments.repository.ts
invoices/repositories/invoices.repository.ts
invoices/repositories/receipts.repository.ts
```

If using a billing orchestration module:

```txt
billing/repositories/billing.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

7. Business rules

---

Implement these business rules.

Folio creation:

* Stay must exist.
* Stay must be ACTIVE unless creating historical folio is explicitly allowed.
* Guest should match stay.guestId.
* A stay can have only one active/main folio for now.
* Generate unique folioNumber.
* Create audit log.

Opening folio from stay:

* `POST /stays/:id/open-folio` creates folio for an active stay.
* If folio already exists, return existing folio or conflict consistently.

Room charge posting:

* Support manual room charge posting through line item.
* In the future this can become automatic during nightly audit.
* For now, front desk can add room charge manually.

Line items:

* Can only add line item to OPEN folio.
* totalAmount = quantity * unitAmount unless type is discount.
* Voided line item should not count toward folio totals.
* Recalculate folio totals after add/void.
* Create audit log.

Discounts:

* Small discount permission can apply limited discount.
* Large discounts should require approval workflow if above configured threshold.
* If approval system is already available, create approval request for large discount.
* For now, use clear service-level constant, e.g. FRONT_DESK_SMALL_DISCOUNT_LIMIT_PERCENT = 10.
* Discounts should reduce total amount.
* Create audit log.

Payments:

* Can only record payment for OPEN folio.
* Payment amount must be positive.
* Payment amount should not exceed balance unless overpayment support is explicitly implemented.
* Record payment.
* Recalculate folio paidAmount and balanceAmount.
* Generate receipt optionally if requested.
* Create audit log.

Payment void:

* Can only void recorded payment.
* Voiding payment recalculates folio balance.
* Create audit log.

Invoice generation:

* Generate invoice from folio current totals.
* A folio may have multiple invoices only if business rule allows. For MVP, either:

  * allow multiple issued invoices as snapshots, or
  * restrict to one active issued invoice.
* Recommended MVP: allow one active issued invoice per folio.
* Create audit log.

Receipt generation:

* Generate receipt from payment or folio amount.
* If paymentId is provided, receipt amount should match payment amount.
* Create audit log.

Folio close:

* Can only close OPEN folio.
* Folio balance must be 0.
* Set status = CLOSED.
* Set closedAt and closedByUserId.
* Create audit log.

Checkout integration:

* Checkout should check folio if it exists.
* If open folio exists and balanceAmount > 0, reject checkout.
* If open folio exists and balanceAmount = 0, allow checkout and optionally close folio first if requested.
* Do not implement forced checkout unless permission-protected.

---

8. Audit logging

---

Use existing AuditLogsService.

Audit these actions:

* folio created
* folio updated
* folio closed
* line item added
* line item voided
* discount applied
* discount approval requested
* payment recorded
* payment voided
* invoice generated
* invoice voided
* receipt generated
* receipt voided
* checkout blocked due to unsettled folio if useful

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

* create folio success
* duplicate folio for same stay handling
* add line item success
* void line item recalculates totals
* discount reduces total
* large discount creates/requires approval
* record payment success
* payment over balance rejected
* void payment recalculates totals
* generate invoice success
* generate receipt success
* close folio with zero balance
* close folio with balance rejected
* checkout blocked when open folio has balance
* checkout allowed when folio settled

E2E tests should cover at least:

* unauthorized user rejected
* user without permission rejected
* authorized front desk/admin can open folio for active stay
* add manual charge
* record partial payment
* record second payment
* generate receipt
* generate invoice
* close folio after settlement
* checkout blocked with unpaid folio
* checkout allowed after payment settlement

Use existing auth/stay test helpers if available.

---

11. Documentation

---

Add:

```txt
docs/billing-folios-payments-module.md
```

Include:

* purpose of folios module
* difference between folio, line item, payment, invoice, receipt
* main entities
* main permissions
* payment methods
* balance calculation
* checkout settlement rule
* intentional limitations

Intentional limitations to document:

* no external payment gateway integration yet
* no government/e-invoice integration yet
* no POS integration yet
* no automatic nightly room charge posting yet
* no advanced tax rules yet

Update README if needed.
Update tree.md after source-controlled structure changes.

---

12. Definition of done

---

This task is complete only when:

* Prisma models/enums are added.
* Migration is created.
* Prisma client generates.
* Folios API works.
* Folio line items work.
* Discounts work.
* Payments API works.
* Invoices API works.
* Receipts API works.
* Folio summary/balance calculation works.
* Checkout blocks unsettled open folios.
* Checkout allows settled folios.
* Audit logs are created for sensitive billing actions.
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
