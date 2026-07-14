# Billing, Folios, Payments, Invoices, and Receipts

This document describes the backend billing foundation for Port-102. It covers guest folios, line items, internal payment recording, invoices, receipts, and checkout settlement validation.

## Purpose

The billing module gives front desk and accounting users a single source of truth for stay charges and settlement. It supports internal hotel payment recording first. It does not integrate external payment gateways, POS outlets, or government e-invoicing yet.

## Core Concepts

A folio is the running guest account for a stay. It belongs to one stay and one guest.

A folio line item is a charge or discount posted to the folio. Manual charges and room charges increase the subtotal. Discounts reduce the total.

A payment records money received against a folio. Payments can be partial or split across methods by recording multiple payments.

An invoice is a snapshot of the folio totals issued to the guest. The MVP allows one active issued invoice per folio.

A receipt confirms a payment or folio amount has been receipted. A receipt can be generated from a payment, or from a direct folio amount when needed.

## Main Entities

```text
Stay
  -> Folio
       -> FolioLineItem[]
       -> Payment[]
       -> Invoice[]
       -> Receipt[]
```

Implemented Prisma models and enums:

- `Folio`, `FolioStatus`
- `FolioLineItem`, `FolioLineItemType`
- `Payment`, `PaymentMethod`, `PaymentStatus`
- `Invoice`, `InvoiceStatus`
- `Receipt`, `ReceiptStatus`

## Main Permissions

Folios:

- `folios.create`
- `folios.read`
- `folios.update`
- `folios.close`
- `folios.manual_charge.create`
- `folios.charge.void`
- `folios.discount.apply.small`
- `folios.discount.request`

Payments:

- `payments.record`
- `payments.read`
- `payments.void`

Invoices and receipts:

- `invoices.generate`
- `invoices.read`
- `receipts.generate`
- `receipts.read`

All routes are protected with `JwtAuthGuard` and `PermissionsGuard`.

## API Surface

Folios:

- `POST /folios`
- `GET /folios`
- `GET /folios/:id`
- `GET /folios/by-stay/:stayId`
- `GET /folios/:id/summary`
- `PATCH /folios/:id`
- `PATCH /folios/:id/close`
- `POST /folios/:id/line-items`
- `PATCH /folios/:id/line-items/:lineItemId/void`
- `POST /folios/:id/discounts`

Payments:

- `POST /payments`
- `GET /payments`
- `GET /payments/:id`
- `GET /payments/by-folio/:folioId`
- `PATCH /payments/:id/void`

Invoices:

- `POST /invoices/generate`
- `GET /invoices`
- `GET /invoices/:id`
- `GET /invoices/by-folio/:folioId`
- `PATCH /invoices/:id/void`

Receipts:

- `POST /receipts/generate`
- `GET /receipts`
- `GET /receipts/:id`
- `GET /receipts/by-folio/:folioId`
- `PATCH /receipts/:id/void`

Stay integration:

- `POST /stays/:id/open-folio`
- `POST /stays/:id/check-out`

## Balance Calculation

Only non-voided line items contribute to folio totals.

```text
subtotalAmount = sum(non-discount, non-tax, non-service-charge line items)
discountAmount = sum(discount line items as positive values)
taxAmount = sum(tax line items)
serviceAmount = sum(service charge line items)
totalAmount = subtotalAmount - discountAmount + taxAmount + serviceAmount
paidAmount = sum(recorded payments)
balanceAmount = totalAmount - paidAmount
```

Payments cannot exceed the remaining folio balance. Voiding a payment reverses its contribution to `paidAmount` and recalculates the balance.

## Business Rules

Folio creation:

- A stay must exist.
- The stay must be active.
- The folio guest must match the stay guest.
- One folio is allowed per stay for this stage.

Line items:

- Line items can only be added to open folios.
- Quantity must be at least `1`.
- Amounts must be positive.
- Voided line items no longer affect totals.

Discounts:

- Small discounts are applied directly.
- Discounts above the service threshold create an approval request.
- Discounts reduce folio total through `discountAmount`.

Payments:

- Payments can only be recorded on open folios.
- Partial and split payments are supported through multiple payment records.
- Overpayments are rejected.
- Optional receipt generation can happen when recording a payment.

Invoices:

- An invoice is generated from the current folio totals.
- One active issued invoice per folio is allowed in the MVP.
- Voided invoices are retained for audit history.

Receipts:

- A receipt can be generated from a payment.
- If generated from a payment, the receipt amount must match the payment amount.
- Voided receipts are retained for audit history.

Folio close and checkout:

- A folio can only close when it is open and has a zero balance.
- Checkout is blocked when an open folio exists with a non-zero balance.
- Checkout can close a settled open folio when `closeFolio` is requested.
- Forced checkout override is intentionally not implemented.

## Payment Methods

Supported internal payment methods:

- `CASH`
- `CARD`
- `BANK_TRANSFER`
- `MOBILE_MONEY`
- `QR_PAYMENT`
- `OTHER`

These are internal records only. Gateway reconciliation and settlement files are future work.

## Audit Logging

The backend records audit logs for billing-sensitive actions:

- folio created, updated, closed
- line item added or voided
- discount applied or approval requested
- payment recorded or voided
- invoice generated or voided
- receipt generated or voided
- checkout blocked because of an unsettled folio

Audit logging is performed in services, not controllers.

## Intentional Limitations

- No external payment gateway integration.
- No government or e-invoice integration.
- No POS, restaurant, cafe, or outlet order integration.
- No automatic nightly room charge posting.
- No advanced tax rule engine.
- No refund workflow beyond permission and status foundations.
- No forced checkout override.
