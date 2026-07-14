# Inventory Module

## Purpose

Inventory manages item masters, stock locations, balances, movement history,
receipts, issues, transfers, approved adjustments, reorder alerts, and summary
reporting for the single hotel.

## Entities and lifecycle

The main entities are `InventoryItem`, `InventoryLocation`, `StockBalance`,
`StockMovement`, and `StockAdjustment`. Items are active or inactive. An
adjustment remains stock-neutral while pending and changes stock exactly once
when approved; it can instead be rejected or cancelled.

## Endpoints and permissions

`/inventory/items` and `/inventory/locations` provide master-data CRUD.
`/inventory/receive`, `/issue`, and `/transfer` perform stock operations.
`/inventory/adjustments` provides request, list, approve, reject, and cancel
operations. Balances, movements, reorder alerts, and the dashboard are exposed
as read endpoints. Every endpoint uses JWT and permission guards with the
`inventory.*` or `reports.inventory.read` permissions declared by its controller.

## Business rules and integrations

Item numbers and location codes are unique. Inactive items or locations cannot
participate in stock operations. Conditional balance updates prevent negative
stock. Receive, issue, transfer, and adjustment approval use serializable Prisma
transactions; a transfer writes paired outbound and inbound movements. Receipts
with unit cost update weighted average cost deterministically to two decimals.
Approved actions create audit records, and posted procurement GRNs feed the same
balances and movement ledger.

## Known limitations

There is no barcode scanning, automatic POS consumption, accounting integration,
lot/expiry tracking, or advanced costing. Serializable transaction conflicts are
reported to callers; automatic retry policy is not yet implemented.
