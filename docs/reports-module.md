# Consolidated Reports Module

## Purpose

The read-only Reports module exposes export-ready JSON views of hotel operations and finances. It aggregates existing operational records and does not mutate data, create snapshots, or duplicate module workflows. All routes use the global `/api` prefix.

## Report catalog

| Route | Permission | Scope |
| --- | --- | --- |
| `GET /api/reports/dashboard` | `reports.dashboard.read` | Executive snapshot |
| `GET /api/reports/daily-summary` | `reports.daily_summary.read` | Single-day management review |
| `GET /api/reports/exceptions` | `reports.dashboard.read` | Management attention queues |
| `GET /api/reports/occupancy` | `reports.occupancy.read` | Current and period occupancy |
| `GET /api/reports/arrivals-departures` | `reports.arrivals_departures.read` | Expected/completed movements |
| `GET /api/reports/room-status` | `reports.room_status.read` | Current room state and filters |
| `GET /api/reports/revenue` | `reports.revenue.read` | Revenue categories and trend |
| `GET /api/reports/payments` | `reports.payment_summary.read` | Folio/direct-POS payments |
| `GET /api/reports/department-performance` | `reports.department_performance.read` | Raw cross-department KPIs |
| `GET /api/reports/housekeeping` | `reports.housekeeping.read` | Workload and productivity |
| `GET /api/reports/maintenance` | `reports.maintenance.read` | Tickets and preventive exceptions |
| `GET /api/reports/outlet-sales` | `reports.outlet_sales.read` | Outlet, method, and item sales |
| `GET /api/reports/inventory` | `reports.inventory.read` | Current value and period movement |
| `GET /api/reports/procurement` | `reports.procurement.read` | Requests, orders, GRNs, suppliers |

JWT authentication and `PermissionsGuard` protect every route. The existing permission catalog already contains all required keys.

## Date and grouping rules

Dates are ISO-8601 query strings. Missing dates use report-specific defaults. Inclusive boundaries are normalized to UTC day start/end, `to` must not precede `from`, and a range may not exceed 366 days. Supported grouping values are `day`, `week`, and `month`. Responses include their effective range and use strings for monetary values so JSON serialization does not lose decimal precision.

Date-only boundaries use the singleton property's configured IANA timezone and are converted to UTC instants for database queries. Responses disclose the effective timezone. Explicit database timestamps remain UTC instants.

## Financial source-of-truth rules

Guest-account revenue comes from non-voided folio line items in the posted date range. Discounts reduce revenue. Room, POS, laundry, service, manual, and other line-item types are categorized without converting estimates into revenue.

Direct-pay outlet revenue comes from non-voided POS payments whose orders are not cancelled. `ROOM_CHARGE` POS payment markers are excluded because the corresponding `POS_CHARGE` folio line item is the one consolidated revenue record. This prevents charge-to-room sales from being counted twice.

Payment reporting keeps sources distinct: non-voided folio payments plus non-voided direct POS payments, again excluding `ROOM_CHARGE` markers. Voided folio payment value is returned separately. Cancelled POS orders and voided POS order items do not contribute to outlet sales.

All monetary aggregation uses Prisma Decimal arithmetic until values are serialized as fixed two-decimal strings.

## Occupancy and operational rules

Current occupancy rate is `occupied sellable rooms / total sellable rooms * 100`. Rooms whose maintenance status is not `AVAILABLE` are excluded from sellable inventory. Period room nights are reconstructed from stay room-assignment intervals overlapping each UTC day; they are not inferred from reservation estimates.

Housekeeping and maintenance reports use their task/ticket lifecycle timestamps. Inventory value is current `StockBalance × averageCost`, while movement totals are period facts from `StockMovement`. Procurement uses actual purchase request, purchase order, and goods-received statuses and item costs.

## Known limitations

- There are no historical room-status or stock-balance snapshots. Period occupancy uses stay assignments; inventory value is current state only.
- Group labels are derived from UTC instants after property-local boundary conversion; fully localized presentation labels remain a frontend concern.
- Direct-pay POS revenue is recognized from valid payments, while guest-account revenue is recognized from posted folio charges; this is an operational consolidated view, not a statutory profit-and-loss statement.
- Taxes cannot be separated where source records do not store an explicit tax line/category.
- Results are export-ready JSON only; PDF, warehouse, OLAP, and external BI integrations are outside this phase.
- Exception lists are capped at 100 records per category to bound dashboard requests.
