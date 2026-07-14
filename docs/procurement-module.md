# Procurement Module

## Purpose

Procurement manages suppliers, purchase requests, purchase orders, goods-received
notes, approval transitions, and procurement dashboard counts.

## Entities and workflows

The main entities are `Supplier`, `PurchaseRequest` with items, `PurchaseOrder`
with items, and `GoodsReceived` with items. The normal workflow is:

```text
Draft request -> submitted -> approved -> converted to purchase order
Draft order -> approved -> ordered -> partially received -> received
Draft GRN -> posted (or cancelled)
```

## Endpoints and permissions

The `/procurement` controller exposes supplier CRUD; purchase-request create,
update, submit, approve, reject, cancel, and conversion; purchase-order create,
update, approve, mark-ordered, and cancel; GRN create, list, detail, post, and
cancel; and a dashboard. Routes require JWT plus the corresponding `suppliers.*`,
`purchase_requests.*`, `purchase_orders.*`, `goods_received.*`, or reporting
permission.

## Business rules and integrations

Supplier, request, order, and GRN numbers are unique. Requests and orders require
active inventory items, and suppliers must be active when used. Only an approved
request can be converted, and the database permits only one purchase order for a
request. Posting a GRN is a claimed, serializable transaction: it updates stock,
writes receipt movements, updates weighted average cost and received quantities,
and derives partial/full order status atomically. Posted and cancelled GRNs cannot
be posted again. Sensitive transitions are audited.

## Known limitations

There is no tendering, supplier quotation comparison, invoice matching,
accounting integration, tax engine, or automatic replenishment order creation.
