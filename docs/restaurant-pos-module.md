# Restaurant POS Module

## Purpose

The restaurant module provides backend APIs for hotel restaurant, cafe, bar,
store, and room-service point-of-sale operations. It supports cashier-entered
orders, direct payments, room charges, printable receipts, and outlet sales
reporting.

## Traditional Workflow

1. A waiter records the guest's order manually.
2. The waiter gives the order to the cashier.
3. The cashier creates the POS order and enters its line items.
4. Kitchen or bar preparation occurs outside the system.
5. The waiter delivers the prepared items.
6. The cashier records direct payment or charges the order to an active room
   folio.
7. The cashier closes the settled order and can generate a POS receipt.

Waiters and kitchen staff do not require system accounts in this stage.

## Outlets

An outlet represents a restaurant, cafe, bar, store, room-service operation,
or other POS location. Outlet codes are unique. Deletion is implemented as
deactivation so historical orders remain intact.

## Menu Items

Menu items belong to an outlet and have a unique code within that outlet.
Items can be active, inactive, or out of stock. Only active items can be added
to open orders.

## Order Lifecycle

```text
OPEN
  -> CLOSED
  -> CANCELLED
```

Open orders can receive item changes and payments. Closing requires no unpaid
balance. Cancellation requires a reason. Closed and cancelled orders cannot
be modified through normal order endpoints.

Voided line items remain in the audit trail but do not contribute to order
totals.

## Direct Payment

Direct payments support cash, card, bank transfer, mobile money, QR payment,
and other non-room-charge methods. Payments cannot exceed the outstanding
order balance. A fully paid order receives `PAID` payment status.

## Charge To Room

Room charging requires:

- an open POS order with an outstanding balance
- an active stay
- an active room assignment
- an open folio
- no existing folio charge for the same POS order

The workflow creates a `POS_CHARGE` folio line item, updates folio totals,
links the room, stay, and folio to the order, and changes payment status to
`CHARGED_TO_ROOM`. The order may be closed in the same operation.

## POS Receipts

Receipts are printable POS response payloads generated from closed and fully
settled orders. They contain outlet details, active line items, non-voided
payments, totals, and room/folio references where applicable.

POS receipts are separate from billing receipts because walk-in POS sales do
not have a folio.

## Sales Reporting

The dashboard and sales summaries return:

- total, closed, and cancelled orders
- gross sales
- direct payments
- room charges
- unpaid balance
- sales by outlet
- sales by payment method
- open and unpaid order counts
- active outlet count
- unavailable menu-item count

Reports support outlet and date-range filtering.

## In-House Guest Search

Cashiers can search active stays by guest name, stay number, or active room
number before charging an order to a room. Results are paginated and include
the current room assignment and open folio summary when available.

## Main Permissions

- `pos.dashboard.read`
- `pos.orders.create`
- `pos.orders.read`
- `pos.orders.update`
- `pos.orders.close`
- `pos.orders.cancel`
- `pos.payments.record`
- `pos.receipts.generate`
- `pos.charge_to_room`
- `pos.menu_items.create`
- `pos.menu_items.read`
- `pos.menu_items.update`
- `pos.menu_items.delete`
- `outlet_sales.read`
- `outlet_sales.read.own_outlet`
- `in_house_guests.read`

## Intentional Limitations

- No kitchen display system
- No waiter mobile ordering
- No inventory stock deduction
- No procurement integration
- No external payment gateway integration
- No fiscal printer or e-invoice integration
- No persisted POS receipt entity for walk-in sales
- No automatic outlet ownership mapping for `outlet_sales.read.own_outlet`
