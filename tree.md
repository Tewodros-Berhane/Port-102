# Port-102 Project Tree

Last updated: 2026-06-04

This file tracks the project structure for Port-102. Generated output, dependencies, build artifacts, local environment files, and ignored Prisma client files are intentionally omitted.

## Root Structure

```text
Port-102/
|-- .env.example
|-- .gitignore
|-- README.md
|-- docker-compose.yml
|-- package-lock.json
|-- package.json
|-- tree.md
|-- apps/
|   |-- backend/
|   |-- frontend/
|   `-- mobile/
|-- docs/
|-- infrastructure/
|-- packages/
|   |-- sdk/
|   |-- types/
|   `-- validators/
`-- scripts/
```

## Auth/RBAC Implementation Tree

The authentication, authorization, RBAC, permissions, audit, approval, user, employee, and guest identity foundation is implemented under the backend app.

```text
apps/backend/src/
|-- app.module.ts
|-- common/
|   |-- decorators/
|   |   |-- current-permissions.decorator.spec.ts
|   |   |-- current-permissions.decorator.ts
|   |   |-- current-user.decorator.spec.ts
|   |   |-- current-user.decorator.ts
|   |   |-- permissions.decorator.spec.ts
|   |   |-- permissions.decorator.ts
|   |   |-- public.decorator.spec.ts
|   |   |-- public.decorator.ts
|   |   |-- roles.decorator.spec.ts
|   |   `-- roles.decorator.ts
|   `-- guards/
|       |-- operational-route-protection.spec.ts
|       |-- permissions.guard.spec.ts
|       |-- permissions.guard.ts
|       |-- roles.guard.spec.ts
|       `-- roles.guard.ts
|-- modules/
|   |-- approval-requests/
|   |   |-- approval-requests.controller.spec.ts
|   |   |-- approval-requests.controller.ts
|   |   |-- approval-requests.module.ts
|   |   |-- approval-requests.service.spec.ts
|   |   |-- approval-requests.service.ts
|   |   |-- dto/
|   |   |   |-- create-approval-request.dto.ts
|   |   |   |-- decide-approval-request.dto.ts
|   |   |   `-- list-approval-requests-query.dto.ts
|   |   `-- repositories/
|   |       `-- approval-requests.repository.ts
|   |-- audit-logs/
|   |   |-- audit-logs.controller.spec.ts
|   |   |-- audit-logs.controller.ts
|   |   |-- audit-logs.module.ts
|   |   |-- audit-logs.service.spec.ts
|   |   |-- audit-logs.service.ts
|   |   |-- dto/
|   |   |   `-- list-audit-logs-query.dto.ts
|   |   `-- repositories/
|   |       `-- audit-logs.repository.ts
|   |-- auth/
|   |   |-- auth.controller.spec.ts
|   |   |-- auth.controller.ts
|   |   |-- auth.module.ts
|   |   |-- auth.service.spec.ts
|   |   |-- auth.service.ts
|   |   |-- dto/
|   |   |   |-- change-password.dto.ts
|   |   |   |-- forgot-password.dto.ts
|   |   |   |-- login.dto.ts
|   |   |   |-- refresh-token.dto.ts
|   |   |   `-- reset-password.dto.ts
|   |   |-- guards/
|   |   |   |-- jwt-auth.guard.ts
|   |   |   `-- local-auth.guard.ts
|   |   |-- repositories/
|   |   |   `-- auth-tokens.repository.ts
|   |   |-- strategies/
|   |   |   |-- jwt.strategy.ts
|   |   |   `-- local.strategy.ts
|   |   `-- types/
|   |       |-- auth-me-response.type.ts
|   |       |-- current-user-payload.type.ts
|   |       |-- jwt-auth-request.type.ts
|   |       |-- local-authenticated-user.type.ts
|   |       |-- login-response.type.ts
|   |       `-- token-pair.type.ts
|   |-- employees/
|   |   |-- employees.controller.spec.ts
|   |   |-- employees.controller.ts
|   |   |-- employees.module.ts
|   |   |-- employees.service.spec.ts
|   |   |-- employees.service.ts
|   |   |-- dto/
|   |   |   |-- create-employee.dto.ts
|   |   |   |-- link-employee-user.dto.ts
|   |   |   |-- list-employees-query.dto.ts
|   |   |   `-- update-employee.dto.ts
|   |   `-- repositories/
|   |       `-- employees.repository.ts
|   |-- guests/
|   |   |-- guests.controller.spec.ts
|   |   |-- guests.controller.ts
|   |   |-- guests.module.ts
|   |   |-- guests.service.spec.ts
|   |   |-- guests.service.ts
|   |   |-- dto/
|   |   |   |-- create-guest.dto.ts
|   |   |   |-- list-guests-query.dto.ts
|   |   |   `-- update-guest.dto.ts
|   |   `-- repositories/
|   |       `-- guests.repository.ts
|   |-- permissions/
|   |   |-- permissions.controller.spec.ts
|   |   |-- permissions.controller.ts
|   |   |-- permissions.module.ts
|   |   |-- permissions.service.spec.ts
|   |   |-- permissions.service.ts
|   |   |-- constants/
|   |   |   `-- default-permissions.constant.ts
|   |   `-- repositories/
|   |       `-- permissions.repository.ts
|   |-- roles/
|   |   |-- roles.controller.spec.ts
|   |   |-- roles.controller.ts
|   |   |-- roles.module.ts
|   |   |-- roles.service.spec.ts
|   |   |-- roles.service.ts
|   |   |-- constants/
|   |   |   |-- default-roles.constant.spec.ts
|   |   |   `-- default-roles.constant.ts
|   |   |-- dto/
|   |   |   |-- assign-role-permissions.dto.ts
|   |   |   |-- create-role.dto.ts
|   |   |   `-- update-role.dto.ts
|   |   `-- repositories/
|   |       `-- roles.repository.ts
|   `-- users/
|       |-- users.controller.spec.ts
|       |-- users.controller.ts
|       |-- users.module.ts
|       |-- users.service.spec.ts
|       |-- users.service.ts
|       |-- dto/
|       |   |-- assign-role.dto.ts
|       |   |-- create-user.dto.ts
|       |   |-- list-users-query.dto.ts
|       |   |-- reset-password.dto.ts
|       |   `-- update-user.dto.ts
|       `-- repositories/
|           `-- users.repository.ts
`-- prisma/
    |-- prisma.module.ts
    `-- prisma.service.ts
```

## Auth/RBAC Implementation Status

```text
Implemented slices:
0. Backend foundation check
1. Prisma auth schema
2. Permission and role seed
3. Auth module skeleton
4. Password hashing and local login
5. JWT access token and refresh token flow
6. Current user and public decorators
7. Single-installation role access cleanup
8. Permissions guard
9. Roles guard
10. Auth me direct user context
11. User management API
12. Roles and permissions API
13. Employee and user linking
14. Guest identity foundation
15. Approval request foundation
16. Audit logs foundation
17. Password management
18. Protect first hotel workflow modules
19. Single-hotel auth/RBAC refactor
```

Notes:

- Slice 19 removed tenant-style access control and now uses direct User -> Role -> Permissions authorization.
- The hotel record is retained only as singleton property profile/settings data.
- Slice 18 protection is currently applied to live operational modules with routes: guests and audit logs.
- Room type CRUD, rooms, reservations, payments, housekeeping, maintenance, and reports are still pending, so route protection will be applied when those modules are implemented.
- Public reset-password token verification still needs a persisted reset-token model before a full email-token reset flow can be completed.

## Full Tracked Tree

```text
Port-102/
|-- .env.example
|-- .gitignore
|-- README.md
|-- docker-compose.yml
|-- package-lock.json
|-- package.json
|-- tree.md
|-- apps/
|   |-- backend/
|   |   |-- .prettierignore
|   |   |-- .prettierrc
|   |   |-- eslint.config.mjs
|   |   |-- nest-cli.json
|   |   |-- package.json
|   |   |-- prisma.config.ts
|   |   |-- tsconfig.build.json
|   |   |-- tsconfig.json
|   |   |-- prisma/
|   |   |   |-- migrations/
|   |   |   |   |-- 20260525000000_init_single_hotel_schema/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260525082820_add_room_inventory_foundation/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260526212603_add_reservations_foundation/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260528213048_add_stay_lifecycle/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260530180931_add_billing_folios_payments/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260601210752_add_housekeeping_operations/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260604191846_add_maintenance_operations/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260607194318_add_restaurant_pos_operations/
|   |   |   |   |   `-- migration.sql
|   |   |   |   |-- 20260614093955_add_inventory_procurement_foundation/
|   |   |   |   |   `-- migration.sql
|   |   |   |   `-- migration_lock.toml
|   |   |   |-- schema.prisma
|   |   |   `-- seed.ts
|   |   |-- src/
|   |   |   |-- app.module.ts
|   |   |   |-- app.setup.spec.ts
|   |   |   |-- app.setup.ts
|   |   |   |-- main.ts
|   |   |   |-- common/
|   |   |   |   |-- decorators/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- filters/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- http-exception.filter.spec.ts
|   |   |   |   |   `-- http-exception.filter.ts
|   |   |   |   |-- guards/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- interceptors/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- response.interceptor.spec.ts
|   |   |   |   |   `-- response.interceptor.ts
|   |   |   |   |-- pipes/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   `-- utils/
|   |   |   |       `-- .gitkeep
|   |   |   |-- config/
|   |   |   |   `-- configuration.ts
|   |   |   |-- modules/
|   |   |   |   |-- audit-logs/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- auth/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- billing/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- employees/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- floors/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- floors.controller.spec.ts
|   |   |   |   |   |-- floors.controller.ts
|   |   |   |   |   |-- floors.module.ts
|   |   |   |   |   |-- floors.service.spec.ts
|   |   |   |   |   |-- floors.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- create-floor.dto.ts
|   |   |   |   |   |   |-- get-floors-query.dto.ts
|   |   |   |   |   |   `-- update-floor.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- floors.repository.spec.ts
|   |   |   |   |       `-- floors.repository.ts
|   |   |   |   |-- folios/
|   |   |   |   |   |-- folios.controller.spec.ts
|   |   |   |   |   |-- folios.controller.ts
|   |   |   |   |   |-- folios.module.ts
|   |   |   |   |   |-- folios.service.spec.ts
|   |   |   |   |   |-- folios.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- add-folio-line-item.dto.ts
|   |   |   |   |   |   |-- apply-discount.dto.ts
|   |   |   |   |   |   |-- close-folio.dto.ts
|   |   |   |   |   |   |-- create-folio.dto.ts
|   |   |   |   |   |   |-- get-folios-query.dto.ts
|   |   |   |   |   |   |-- update-folio.dto.ts
|   |   |   |   |   |   `-- void-folio-line-item.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- folio-line-items.repository.spec.ts
|   |   |   |   |       |-- folio-line-items.repository.ts
|   |   |   |   |       |-- folios.repository.spec.ts
|   |   |   |   |       `-- folios.repository.ts
|   |   |   |   |-- front-desk/
|   |   |   |   |   |-- front-desk.controller.spec.ts
|   |   |   |   |   |-- front-desk.controller.ts
|   |   |   |   |   |-- front-desk.module.ts
|   |   |   |   |   |-- front-desk.service.spec.ts
|   |   |   |   |   |-- front-desk.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   `-- front-desk-query.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- front-desk.repository.spec.ts
|   |   |   |   |       `-- front-desk.repository.ts
|   |   |   |   |-- guests/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- health/
|   |   |   |   |   |-- health.controller.spec.ts
|   |   |   |   |   |-- health.controller.ts
|   |   |   |   |   |-- health.module.ts
|   |   |   |   |   |-- health.service.spec.ts
|   |   |   |   |   `-- health.service.ts
|   |   |   |   |-- hotels/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- housekeeping/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- housekeeping.controller.spec.ts
|   |   |   |   |   |-- housekeeping.controller.ts
|   |   |   |   |   |-- housekeeping.module.ts
|   |   |   |   |   |-- housekeeping.service.spec.ts
|   |   |   |   |   |-- housekeeping.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- assign-housekeeping-task.dto.ts
|   |   |   |   |   |   |-- cancel-housekeeping-task.dto.ts
|   |   |   |   |   |   |-- complete-housekeeping-task.dto.ts
|   |   |   |   |   |   |-- create-housekeeping-task.dto.ts
|   |   |   |   |   |   |-- get-housekeeping-tasks-query.dto.ts
|   |   |   |   |   |   |-- reassign-housekeeping-task.dto.ts
|   |   |   |   |   |   |-- start-housekeeping-task.dto.ts
|   |   |   |   |   |   `-- update-housekeeping-task.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- housekeeping-tasks.repository.spec.ts
|   |   |   |   |       `-- housekeeping-tasks.repository.ts
|   |   |   |   |-- invoices/
|   |   |   |   |   |-- invoices.controller.spec.ts
|   |   |   |   |   |-- invoices.controller.ts
|   |   |   |   |   |-- invoices.module.ts
|   |   |   |   |   |-- invoices.service.spec.ts
|   |   |   |   |   |-- invoices.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- generate-invoice.dto.ts
|   |   |   |   |   |   |-- generate-receipt.dto.ts
|   |   |   |   |   |   |-- get-invoices-query.dto.ts
|   |   |   |   |   |   |-- get-receipts-query.dto.ts
|   |   |   |   |   |   |-- void-invoice.dto.ts
|   |   |   |   |   |   `-- void-receipt.dto.ts
|   |   |   |   |   |-- receipts/
|   |   |   |   |   |   |-- receipts.controller.spec.ts
|   |   |   |   |   |   `-- receipts.controller.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- invoices.repository.spec.ts
|   |   |   |   |       |-- invoices.repository.ts
|   |   |   |   |       |-- receipts.repository.spec.ts
|   |   |   |   |       `-- receipts.repository.ts
|   |   |   |   |-- inventory/
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- create-inventory-item.dto.ts
|   |   |   |   |   |   |-- create-inventory-location.dto.ts
|   |   |   |   |   |   |-- approve-stock-adjustment.dto.ts
|   |   |   |   |   |   |-- cancel-stock-adjustment.dto.ts
|   |   |   |   |   |   |-- create-stock-adjustment.dto.ts
|   |   |   |   |   |   |-- get-inventory-items-query.dto.ts
|   |   |   |   |   |   |-- get-inventory-locations-query.dto.ts
|   |   |   |   |   |   |-- get-reorder-alerts-query.dto.ts
|   |   |   |   |   |   |-- get-stock-adjustments-query.dto.ts
|   |   |   |   |   |   |-- get-stock-balances-query.dto.ts
|   |   |   |   |   |   |-- get-stock-movements-query.dto.ts
|   |   |   |   |   |   |-- inventory-dashboard-query.dto.ts
|   |   |   |   |   |   |-- inventory-item-dto-validation.spec.ts
|   |   |   |   |   |   |-- inventory-transfer-adjustment-regression.spec.ts
|   |   |   |   |   |   |-- issue-stock.dto.ts
|   |   |   |   |   |   |-- receive-stock.dto.ts
|   |   |   |   |   |   |-- reject-stock-adjustment.dto.ts
|   |   |   |   |   |   |-- stock-operation-dto-validation.spec.ts
|   |   |   |   |   |   |-- transfer-stock.dto.ts
|   |   |   |   |   |   |-- update-inventory-item.dto.ts
|   |   |   |   |   |   `-- update-inventory-location.dto.ts
|   |   |   |   |   |-- repositories/
|   |   |   |   |   |   |-- inventory-items.repository.spec.ts
|   |   |   |   |   |   |-- inventory-items.repository.ts
|   |   |   |   |   |   |-- inventory-locations.repository.spec.ts
|   |   |   |   |   |   `-- inventory-locations.repository.ts
|   |   |   |   |   |   |-- inventory-reports.repository.spec.ts
|   |   |   |   |   |   |-- inventory-reports.repository.ts
|   |   |   |   |   |   |-- stock-adjustments.repository.spec.ts
|   |   |   |   |   |   |-- stock-adjustments.repository.ts
|   |   |   |   |   |   |-- stock-balances.repository.spec.ts
|   |   |   |   |   |   |-- stock-balances.repository.ts
|   |   |   |   |   |   |-- stock-issues.repository.spec.ts
|   |   |   |   |   |   |-- stock-issues.repository.ts
|   |   |   |   |   |   |-- stock-movements.repository.spec.ts
|   |   |   |   |   |   |-- stock-movements.repository.ts
|   |   |   |   |   |   |-- stock-receipts.repository.spec.ts
|   |   |   |   |   |   |-- stock-receipts.repository.ts
|   |   |   |   |   |   |-- stock-transfers.repository.spec.ts
|   |   |   |   |   |   `-- stock-transfers.repository.ts
|   |   |   |   |   |-- inventory.controller.spec.ts
|   |   |   |   |   |-- inventory.controller.ts
|   |   |   |   |   |-- inventory.module.ts
|   |   |   |   |   |-- inventory.service.spec.ts
|   |   |   |   |   `-- inventory.service.ts
|   |   |   |   |-- maintenance/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- maintenance.controller.spec.ts
|   |   |   |   |   |-- maintenance.controller.ts
|   |   |   |   |   |-- maintenance.module.ts
|   |   |   |   |   |-- maintenance.service.spec.ts
|   |   |   |   |   |-- maintenance.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- assign-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- approve-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- cancel-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- clear-room-maintenance.dto.ts
|   |   |   |   |   |   |-- complete-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- create-asset.dto.ts
|   |   |   |   |   |   |-- create-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- create-maintenance-ticket-note.dto.ts
|   |   |   |   |   |   |-- create-preventive-maintenance-plan.dto.ts
|   |   |   |   |   |   |-- create-ticket-from-housekeeping-issue.dto.ts
|   |   |   |   |   |   |-- create-ticket-from-preventive-plan.dto.ts
|   |   |   |   |   |   |-- get-assets-query.dto.ts
|   |   |   |   |   |   |-- get-maintenance-tickets-query.dto.ts
|   |   |   |   |   |   |-- get-preventive-maintenance-plans-query.dto.ts
|   |   |   |   |   |   |-- mark-room-out-of-order-from-maintenance.dto.ts
|   |   |   |   |   |   |-- mark-room-under-maintenance.dto.ts
|   |   |   |   |   |   |-- reject-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- start-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- update-asset.dto.ts
|   |   |   |   |   |   |-- update-maintenance-ticket.dto.ts
|   |   |   |   |   |   |-- update-preventive-maintenance-plan.dto.ts
|   |   |   |   |   |   `-- upload-maintenance-ticket-photo.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- assets.repository.spec.ts
|   |   |   |   |       |-- assets.repository.ts
|   |   |   |   |       |-- maintenance-ticket-notes.repository.ts
|   |   |   |   |       |-- maintenance-ticket-notes.repository.spec.ts
|   |   |   |   |       |-- maintenance-ticket-photos.repository.ts
|   |   |   |   |       |-- maintenance-ticket-photos.repository.spec.ts
|   |   |   |   |       |-- maintenance-tickets.repository.spec.ts
|   |   |   |   |       |-- maintenance-tickets.repository.ts
|   |   |   |   |       `-- preventive-maintenance-plans.repository.ts
|   |   |   |   |-- notifications/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- payments/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- payments.controller.spec.ts
|   |   |   |   |   |-- payments.controller.ts
|   |   |   |   |   |-- payments.module.ts
|   |   |   |   |   |-- payments.service.spec.ts
|   |   |   |   |   |-- payments.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- get-payments-query.dto.ts
|   |   |   |   |   |   |-- record-payment.dto.ts
|   |   |   |   |   |   `-- void-payment.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- payments.repository.spec.ts
|   |   |   |   |       `-- payments.repository.ts
|   |   |   |   |-- procurement/
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- create-supplier.dto.ts
|   |   |   |   |   |   |-- get-suppliers-query.dto.ts
|   |   |   |   |   |   |-- supplier-dto-validation.spec.ts
|   |   |   |   |   |   `-- update-supplier.dto.ts
|   |   |   |   |   |-- repositories/
|   |   |   |   |   |   |-- suppliers.repository.spec.ts
|   |   |   |   |   |   `-- suppliers.repository.ts
|   |   |   |   |   |-- procurement.controller.spec.ts
|   |   |   |   |   |-- procurement.controller.ts
|   |   |   |   |   |-- procurement.module.ts
|   |   |   |   |   |-- procurement.service.spec.ts
|   |   |   |   |   `-- procurement.service.ts
|   |   |   |   |-- reports/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- reservations/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- reservations.controller.spec.ts
|   |   |   |   |   |-- reservations.controller.ts
|   |   |   |   |   |-- reservations.module.ts
|   |   |   |   |   |-- reservations.service.spec.ts
|   |   |   |   |   |-- reservations.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- add-reservation-room.dto.ts
|   |   |   |   |   |   |-- availability-search-query.dto.ts
|   |   |   |   |   |   |-- booking-calendar-query.dto.ts
|   |   |   |   |   |   |-- cancel-reservation.dto.ts
|   |   |   |   |   |   |-- create-reservation.dto.ts
|   |   |   |   |   |   |-- get-reservations-query.dto.ts
|   |   |   |   |   |   |-- is-after-date-property.decorator.ts
|   |   |   |   |   |   |-- mark-no-show.dto.ts
|   |   |   |   |   |   |-- reservation-dto-validation.spec.ts
|   |   |   |   |   |   |-- update-reservation-room.dto.ts
|   |   |   |   |   |   `-- update-reservation.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- reservation-availability.repository.spec.ts
|   |   |   |   |       |-- reservation-availability.repository.ts
|   |   |   |   |       |-- reservation-rooms.repository.spec.ts
|   |   |   |   |       |-- reservation-rooms.repository.ts
|   |   |   |   |       |-- reservations.repository.spec.ts
|   |   |   |   |       `-- reservations.repository.ts
|   |   |   |   |-- restaurant/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- restaurant.controller.spec.ts
|   |   |   |   |   |-- restaurant.controller.ts
|   |   |   |   |   |-- restaurant.module.ts
|   |   |   |   |   |-- restaurant.service.spec.ts
|   |   |   |   |   |-- restaurant.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- add-pos-order-item.dto.ts
|   |   |   |   |   |   |-- create-menu-item.dto.ts
|   |   |   |   |   |   |-- create-outlet.dto.ts
|   |   |   |   |   |   |-- create-pos-order.dto.ts
|   |   |   |   |   |   |-- get-menu-items-query.dto.ts
|   |   |   |   |   |   |-- get-outlets-query.dto.ts
|   |   |   |   |   |   |-- get-pos-orders-query.dto.ts
|   |   |   |   |   |   |-- record-pos-order-payment.dto.ts
|   |   |   |   |   |   |-- restaurant-dto-validation.spec.ts
|   |   |   |   |   |   |-- update-menu-item.dto.ts
|   |   |   |   |   |   |-- update-outlet.dto.ts
|   |   |   |   |   |   |-- update-pos-order-item.dto.ts
|   |   |   |   |   |   |-- update-pos-order.dto.ts
|   |   |   |   |   |   `-- void-pos-order-item.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- menu-items.repository.spec.ts
|   |   |   |   |       |-- menu-items.repository.ts
|   |   |   |   |       |-- outlets.repository.spec.ts
|   |   |   |   |       |-- outlets.repository.ts
|   |   |   |   |       |-- pos-order-items.repository.spec.ts
|   |   |   |   |       |-- pos-order-items.repository.ts
|   |   |   |   |       |-- pos-order-payments.repository.spec.ts
|   |   |   |   |       |-- pos-order-payments.repository.ts
|   |   |   |   |       |-- pos-orders.repository.spec.ts
|   |   |   |   |       `-- pos-orders.repository.ts
|   |   |   |   |-- roles/
|   |   |   |   |   `-- .gitkeep
|   |   |   |   |-- room-types/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- room-amenities.controller.spec.ts
|   |   |   |   |   |-- room-amenities.controller.ts
|   |   |   |   |   |-- room-amenities.service.spec.ts
|   |   |   |   |   |-- room-amenities.service.ts
|   |   |   |   |   |-- room-types.controller.spec.ts
|   |   |   |   |   |-- room-types.controller.ts
|   |   |   |   |   |-- room-types.module.ts
|   |   |   |   |   |-- room-types.service.spec.ts
|   |   |   |   |   |-- room-types.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- assign-room-type-amenities.dto.ts
|   |   |   |   |   |   |-- create-room-amenity.dto.ts
|   |   |   |   |   |   |-- create-room-type.dto.ts
|   |   |   |   |   |   |-- get-room-amenities-query.dto.ts
|   |   |   |   |   |   |-- get-room-types-query.dto.ts
|   |   |   |   |   |   |-- update-room-amenity.dto.ts
|   |   |   |   |   |   `-- update-room-type.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- room-amenities.repository.spec.ts
|   |   |   |   |       |-- room-amenities.repository.ts
|   |   |   |   |       |-- room-types.repository.spec.ts
|   |   |   |   |       `-- room-types.repository.ts
|   |   |   |   |-- rooms/
|   |   |   |   |   |-- .gitkeep
|   |   |   |   |   |-- rooms.controller.spec.ts
|   |   |   |   |   |-- rooms.controller.ts
|   |   |   |   |   |-- rooms.module.ts
|   |   |   |   |   |-- rooms.service.spec.ts
|   |   |   |   |   |-- rooms.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- clear-room-out-of-order.dto.ts
|   |   |   |   |   |   |-- create-room.dto.ts
|   |   |   |   |   |   |-- get-room-status-logs-query.dto.ts
|   |   |   |   |   |   |-- get-rooms-query.dto.ts
|   |   |   |   |   |   |-- mark-room-out-of-order.dto.ts
|   |   |   |   |   |   |-- update-room-status.dto.ts
|   |   |   |   |   |   `-- update-room.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- rooms.repository.spec.ts
|   |   |   |   |       `-- rooms.repository.ts
|   |   |   |   |-- stays/
|   |   |   |   |   |-- reservation-check-ins.controller.spec.ts
|   |   |   |   |   |-- reservation-check-ins.controller.ts
|   |   |   |   |   |-- stays.controller.spec.ts
|   |   |   |   |   |-- stays.controller.ts
|   |   |   |   |   |-- stays.module.ts
|   |   |   |   |   |-- stays.service.spec.ts
|   |   |   |   |   |-- stays.service.ts
|   |   |   |   |   |-- dto/
|   |   |   |   |   |   |-- assign-stay-room.dto.ts
|   |   |   |   |   |   |-- check-in-reservation.dto.ts
|   |   |   |   |   |   |-- check-out-stay.dto.ts
|   |   |   |   |   |   |-- extend-stay.dto.ts
|   |   |   |   |   |   |-- get-stays-query.dto.ts
|   |   |   |   |   |   |-- move-room.dto.ts
|   |   |   |   |   |   `-- update-stay-room-assignment.dto.ts
|   |   |   |   |   `-- repositories/
|   |   |   |   |       |-- stay-room-assignments.repository.spec.ts
|   |   |   |   |       |-- stay-room-assignments.repository.ts
|   |   |   |   |       |-- stays.repository.spec.ts
|   |   |   |   |       `-- stays.repository.ts
|   |   |   |   `-- users/
|   |   |   |       `-- .gitkeep
|   |   |   `-- prisma/
|   |   |       |-- prisma.module.ts
|   |   |       `-- prisma.service.ts
|   |   `-- test/
|   |       |-- front-desk.e2e-spec.ts
|   |       |-- health.e2e-spec.ts
|   |       |-- app.e2e-spec.ts
|   |       |-- folios.e2e-spec.ts
|   |       |-- invoices.e2e-spec.ts
|   |       |-- maintenance.e2e-spec.ts
|   |       |-- payments.e2e-spec.ts
|   |       |-- receipts.e2e-spec.ts
|   |       |-- rooms.e2e-spec.ts
|   |       |-- reservations.e2e-spec.ts
|   |       |-- stays.e2e-spec.ts
|   |       `-- jest-e2e.json
|   |-- frontend/
|   |   `-- .gitkeep
|   `-- mobile/
|       `-- .gitkeep
|-- docs/
|   |-- .gitkeep
|   |-- billing-folios-payments-module.md
|   |-- reservations-module.md
|   `-- rooms-module.md
|-- infrastructure/
|   `-- .gitkeep
|-- packages/
|   |-- sdk/
|   |   `-- .gitkeep
|   |-- types/
|   |   `-- .gitkeep
|   `-- validators/
|       `-- .gitkeep
`-- scripts/
    `-- .gitkeep
```

## Source File Inventory

```text
.env.example
.gitignore
README.md
docker-compose.yml
package-lock.json
package.json
tree.md
apps/backend/.prettierignore
apps/backend/.prettierrc
apps/backend/eslint.config.mjs
apps/backend/nest-cli.json
apps/backend/package.json
apps/backend/prisma.config.ts
apps/backend/prisma/migrations/20260525000000_init_single_hotel_schema/migration.sql
apps/backend/prisma/migrations/20260525082820_add_room_inventory_foundation/migration.sql
apps/backend/prisma/migrations/20260526212603_add_reservations_foundation/migration.sql
apps/backend/prisma/migrations/20260528213048_add_stay_lifecycle/migration.sql
apps/backend/prisma/migrations/20260530180931_add_billing_folios_payments/migration.sql
apps/backend/prisma/migrations/20260601210752_add_housekeeping_operations/migration.sql
apps/backend/prisma/migrations/20260604191846_add_maintenance_operations/migration.sql
apps/backend/prisma/migrations/20260607194318_add_restaurant_pos_operations/migration.sql
apps/backend/prisma/migrations/20260614093955_add_inventory_procurement_foundation/migration.sql
apps/backend/prisma/migrations/20260714000000_harden_transaction_idempotency/migration.sql
apps/backend/prisma/migrations/20260714010000_add_reporting_indexes/migration.sql
apps/backend/prisma/migrations/20260714020000_add_property_settings_notifications/migration.sql
apps/backend/prisma/migrations/migration_lock.toml
apps/backend/prisma/schema.prisma
apps/backend/prisma/seed.ts
apps/backend/src/app.module.ts
apps/backend/src/app.setup.spec.ts
apps/backend/src/app.setup.ts
apps/backend/src/common/decorators/.gitkeep
apps/backend/src/common/decorators/current-permissions.decorator.spec.ts
apps/backend/src/common/decorators/current-permissions.decorator.ts
apps/backend/src/common/filters/.gitkeep
apps/backend/src/common/filters/http-exception.filter.spec.ts
apps/backend/src/common/filters/http-exception.filter.ts
apps/backend/src/common/guards/.gitkeep
apps/backend/src/common/interceptors/.gitkeep
apps/backend/src/common/interceptors/response.interceptor.spec.ts
apps/backend/src/common/interceptors/response.interceptor.ts
apps/backend/src/common/pipes/.gitkeep
apps/backend/src/common/utils/.gitkeep
apps/backend/src/config/configuration.ts
apps/backend/src/main.ts
apps/backend/src/modules/audit-logs/.gitkeep
apps/backend/src/modules/auth/.gitkeep
apps/backend/src/modules/billing/.gitkeep
apps/backend/src/modules/employees/.gitkeep
apps/backend/src/modules/floors/.gitkeep
apps/backend/src/modules/floors/dto/create-floor.dto.ts
apps/backend/src/modules/floors/dto/get-floors-query.dto.ts
apps/backend/src/modules/floors/dto/update-floor.dto.ts
apps/backend/src/modules/floors/floors.controller.spec.ts
apps/backend/src/modules/floors/floors.controller.ts
apps/backend/src/modules/floors/floors.module.ts
apps/backend/src/modules/floors/floors.service.spec.ts
apps/backend/src/modules/floors/floors.service.ts
apps/backend/src/modules/floors/repositories/floors.repository.spec.ts
apps/backend/src/modules/floors/repositories/floors.repository.ts
apps/backend/src/modules/folios/dto/add-folio-line-item.dto.ts
apps/backend/src/modules/folios/dto/apply-discount.dto.ts
apps/backend/src/modules/folios/dto/close-folio.dto.ts
apps/backend/src/modules/folios/dto/create-folio.dto.ts
apps/backend/src/modules/folios/dto/get-folios-query.dto.ts
apps/backend/src/modules/folios/dto/update-folio.dto.ts
apps/backend/src/modules/folios/dto/void-folio-line-item.dto.ts
apps/backend/src/modules/folios/folios.controller.spec.ts
apps/backend/src/modules/folios/folios.controller.ts
apps/backend/src/modules/folios/folios.module.ts
apps/backend/src/modules/folios/folios.service.spec.ts
apps/backend/src/modules/folios/folios.service.ts
apps/backend/src/modules/folios/repositories/folio-line-items.repository.spec.ts
apps/backend/src/modules/folios/repositories/folio-line-items.repository.ts
apps/backend/src/modules/folios/repositories/folios.repository.spec.ts
apps/backend/src/modules/folios/repositories/folios.repository.ts
apps/backend/src/modules/front-desk/dto/front-desk-query.dto.ts
apps/backend/src/modules/front-desk/front-desk.controller.spec.ts
apps/backend/src/modules/front-desk/front-desk.controller.ts
apps/backend/src/modules/front-desk/front-desk.module.ts
apps/backend/src/modules/front-desk/front-desk.service.spec.ts
apps/backend/src/modules/front-desk/front-desk.service.ts
apps/backend/src/modules/front-desk/repositories/front-desk.repository.spec.ts
apps/backend/src/modules/front-desk/repositories/front-desk.repository.ts
apps/backend/src/modules/guests/.gitkeep
apps/backend/src/modules/health/health.controller.spec.ts
apps/backend/src/modules/health/health.controller.ts
apps/backend/src/modules/health/health.module.ts
apps/backend/src/modules/health/health.service.spec.ts
apps/backend/src/modules/health/health.service.ts
apps/backend/src/modules/hotels/.gitkeep
apps/backend/src/modules/housekeeping/.gitkeep
apps/backend/src/modules/housekeeping/dto/assign-housekeeping-task.dto.ts
apps/backend/src/modules/housekeeping/dto/cancel-housekeeping-task.dto.ts
apps/backend/src/modules/housekeeping/dto/complete-housekeeping-task.dto.ts
apps/backend/src/modules/housekeeping/dto/create-housekeeping-task.dto.ts
apps/backend/src/modules/housekeeping/dto/get-housekeeping-tasks-query.dto.ts
apps/backend/src/modules/housekeeping/dto/reassign-housekeeping-task.dto.ts
apps/backend/src/modules/housekeeping/dto/start-housekeeping-task.dto.ts
apps/backend/src/modules/housekeeping/dto/update-housekeeping-task.dto.ts
apps/backend/src/modules/housekeeping/housekeeping.controller.spec.ts
apps/backend/src/modules/housekeeping/housekeeping.controller.ts
apps/backend/src/modules/housekeeping/housekeeping.module.ts
apps/backend/src/modules/housekeeping/housekeeping.service.spec.ts
apps/backend/src/modules/housekeeping/housekeeping.service.ts
apps/backend/src/modules/housekeeping/repositories/housekeeping-tasks.repository.spec.ts
apps/backend/src/modules/housekeeping/repositories/housekeeping-tasks.repository.ts
apps/backend/src/modules/invoices/dto/generate-invoice.dto.ts
apps/backend/src/modules/invoices/dto/generate-receipt.dto.ts
apps/backend/src/modules/invoices/dto/get-invoices-query.dto.ts
apps/backend/src/modules/invoices/dto/get-receipts-query.dto.ts
apps/backend/src/modules/invoices/dto/void-invoice.dto.ts
apps/backend/src/modules/invoices/dto/void-receipt.dto.ts
apps/backend/src/modules/invoices/invoices.controller.spec.ts
apps/backend/src/modules/invoices/invoices.controller.ts
apps/backend/src/modules/invoices/invoices.module.ts
apps/backend/src/modules/invoices/invoices.service.spec.ts
apps/backend/src/modules/invoices/invoices.service.ts
apps/backend/src/modules/invoices/receipts/receipts.controller.spec.ts
apps/backend/src/modules/invoices/receipts/receipts.controller.ts
apps/backend/src/modules/invoices/repositories/invoices.repository.spec.ts
apps/backend/src/modules/invoices/repositories/invoices.repository.ts
apps/backend/src/modules/invoices/repositories/receipts.repository.spec.ts
apps/backend/src/modules/invoices/repositories/receipts.repository.ts
apps/backend/src/modules/inventory/dto/create-inventory-item.dto.ts
apps/backend/src/modules/inventory/dto/create-inventory-location.dto.ts
apps/backend/src/modules/inventory/dto/approve-stock-adjustment.dto.ts
apps/backend/src/modules/inventory/dto/cancel-stock-adjustment.dto.ts
apps/backend/src/modules/inventory/dto/create-stock-adjustment.dto.ts
apps/backend/src/modules/inventory/dto/get-inventory-items-query.dto.ts
apps/backend/src/modules/inventory/dto/get-inventory-locations-query.dto.ts
apps/backend/src/modules/inventory/dto/get-reorder-alerts-query.dto.ts
apps/backend/src/modules/inventory/dto/get-stock-adjustments-query.dto.ts
apps/backend/src/modules/inventory/dto/get-stock-balances-query.dto.ts
apps/backend/src/modules/inventory/dto/get-stock-movements-query.dto.ts
apps/backend/src/modules/inventory/dto/inventory-dashboard-query.dto.ts
apps/backend/src/modules/inventory/dto/inventory-item-dto-validation.spec.ts
apps/backend/src/modules/inventory/dto/inventory-transfer-adjustment-regression.spec.ts
apps/backend/src/modules/inventory/dto/issue-stock.dto.ts
apps/backend/src/modules/inventory/dto/receive-stock.dto.ts
apps/backend/src/modules/inventory/dto/reject-stock-adjustment.dto.ts
apps/backend/src/modules/inventory/dto/stock-operation-dto-validation.spec.ts
apps/backend/src/modules/inventory/dto/transfer-stock.dto.ts
apps/backend/src/modules/inventory/dto/update-inventory-item.dto.ts
apps/backend/src/modules/inventory/dto/update-inventory-location.dto.ts
apps/backend/src/modules/inventory/inventory.controller.spec.ts
apps/backend/src/modules/inventory/inventory.controller.ts
apps/backend/src/modules/inventory/inventory.module.ts
apps/backend/src/modules/inventory/inventory.service.spec.ts
apps/backend/src/modules/inventory/inventory.service.ts
apps/backend/src/modules/inventory/repositories/inventory-items.repository.spec.ts
apps/backend/src/modules/inventory/repositories/inventory-items.repository.ts
apps/backend/src/modules/inventory/repositories/inventory-locations.repository.spec.ts
apps/backend/src/modules/inventory/repositories/inventory-locations.repository.ts
apps/backend/src/modules/inventory/repositories/inventory-reports.repository.spec.ts
apps/backend/src/modules/inventory/repositories/inventory-reports.repository.ts
apps/backend/src/modules/inventory/repositories/stock-adjustments.repository.spec.ts
apps/backend/src/modules/inventory/repositories/stock-adjustments.repository.ts
apps/backend/src/modules/inventory/repositories/stock-balances.repository.spec.ts
apps/backend/src/modules/inventory/repositories/stock-balances.repository.ts
apps/backend/src/modules/inventory/repositories/stock-issues.repository.spec.ts
apps/backend/src/modules/inventory/repositories/stock-issues.repository.ts
apps/backend/src/modules/inventory/repositories/stock-movements.repository.spec.ts
apps/backend/src/modules/inventory/repositories/stock-movements.repository.ts
apps/backend/src/modules/inventory/repositories/stock-receipts.repository.spec.ts
apps/backend/src/modules/inventory/repositories/stock-receipts.repository.ts
apps/backend/src/modules/inventory/repositories/stock-transfers.repository.spec.ts
apps/backend/src/modules/inventory/repositories/stock-transfers.repository.ts
apps/backend/src/modules/maintenance/.gitkeep
apps/backend/src/modules/maintenance/dto/assign-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/approve-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/cancel-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/clear-room-maintenance.dto.ts
apps/backend/src/modules/maintenance/dto/complete-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/create-asset.dto.ts
apps/backend/src/modules/maintenance/dto/create-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/create-maintenance-ticket-note.dto.ts
apps/backend/src/modules/maintenance/dto/create-preventive-maintenance-plan.dto.ts
apps/backend/src/modules/maintenance/dto/create-ticket-from-housekeeping-issue.dto.ts
apps/backend/src/modules/maintenance/dto/create-ticket-from-preventive-plan.dto.ts
apps/backend/src/modules/maintenance/dto/get-assets-query.dto.ts
apps/backend/src/modules/maintenance/dto/get-maintenance-tickets-query.dto.ts
apps/backend/src/modules/maintenance/dto/get-preventive-maintenance-plans-query.dto.ts
apps/backend/src/modules/maintenance/dto/mark-room-out-of-order-from-maintenance.dto.ts
apps/backend/src/modules/maintenance/dto/mark-room-under-maintenance.dto.ts
apps/backend/src/modules/maintenance/dto/reject-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/start-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/update-asset.dto.ts
apps/backend/src/modules/maintenance/dto/update-maintenance-ticket.dto.ts
apps/backend/src/modules/maintenance/dto/update-preventive-maintenance-plan.dto.ts
apps/backend/src/modules/maintenance/dto/upload-maintenance-ticket-photo.dto.ts
apps/backend/src/modules/maintenance/maintenance.controller.spec.ts
apps/backend/src/modules/maintenance/maintenance.controller.ts
apps/backend/src/modules/maintenance/maintenance.module.ts
apps/backend/src/modules/maintenance/maintenance.service.spec.ts
apps/backend/src/modules/maintenance/maintenance.service.ts
apps/backend/src/modules/maintenance/repositories/assets.repository.spec.ts
apps/backend/src/modules/maintenance/repositories/assets.repository.ts
apps/backend/src/modules/maintenance/repositories/maintenance-ticket-notes.repository.ts
apps/backend/src/modules/maintenance/repositories/maintenance-ticket-notes.repository.spec.ts
apps/backend/src/modules/maintenance/repositories/maintenance-ticket-photos.repository.ts
apps/backend/src/modules/maintenance/repositories/maintenance-ticket-photos.repository.spec.ts
apps/backend/src/modules/maintenance/repositories/maintenance-tickets.repository.spec.ts
apps/backend/src/modules/maintenance/repositories/maintenance-tickets.repository.ts
apps/backend/src/modules/maintenance/repositories/preventive-maintenance-plans.repository.spec.ts
apps/backend/src/modules/maintenance/repositories/preventive-maintenance-plans.repository.ts
apps/backend/src/modules/notifications/.gitkeep
apps/backend/src/modules/payments/.gitkeep
apps/backend/src/modules/payments/dto/get-payments-query.dto.ts
apps/backend/src/modules/payments/dto/record-payment.dto.ts
apps/backend/src/modules/payments/dto/void-payment.dto.ts
apps/backend/src/modules/payments/payments.controller.spec.ts
apps/backend/src/modules/payments/payments.controller.ts
apps/backend/src/modules/payments/payments.module.ts
apps/backend/src/modules/payments/payments.service.spec.ts
apps/backend/src/modules/payments/payments.service.ts
apps/backend/src/modules/payments/repositories/payments.repository.spec.ts
apps/backend/src/modules/payments/repositories/payments.repository.ts
apps/backend/src/modules/procurement/procurement.controller.ts
apps/backend/src/modules/procurement/procurement.module.ts
apps/backend/src/modules/procurement/procurement.service.ts
apps/backend/src/modules/procurement/dto/create-supplier.dto.ts
apps/backend/src/modules/procurement/dto/get-suppliers-query.dto.ts
apps/backend/src/modules/procurement/dto/supplier-dto-validation.spec.ts
apps/backend/src/modules/procurement/dto/update-supplier.dto.ts
apps/backend/src/modules/procurement/procurement.controller.spec.ts
apps/backend/src/modules/procurement/procurement.service.spec.ts
apps/backend/src/modules/procurement/repositories/goods-received.repository.spec.ts
apps/backend/src/modules/procurement/repositories/goods-received.repository.ts
apps/backend/src/modules/procurement/repositories/procurement-reports.repository.ts
apps/backend/src/modules/procurement/repositories/purchase-orders.repository.spec.ts
apps/backend/src/modules/procurement/repositories/purchase-orders.repository.ts
apps/backend/src/modules/procurement/repositories/purchase-requests.repository.spec.ts
apps/backend/src/modules/procurement/repositories/purchase-requests.repository.ts
apps/backend/src/modules/procurement/repositories/suppliers.repository.spec.ts
apps/backend/src/modules/procurement/repositories/suppliers.repository.ts
apps/backend/src/modules/reports/.gitkeep
apps/backend/src/modules/notifications/dto/notification.dto.ts
apps/backend/src/modules/notifications/notifications.controller.ts
apps/backend/src/modules/notifications/notifications.controller.spec.ts
apps/backend/src/modules/notifications/notifications.module.ts
apps/backend/src/modules/notifications/notifications.service.spec.ts
apps/backend/src/modules/notifications/notifications.service.ts
apps/backend/src/modules/notifications/repositories/notifications.repository.ts
apps/backend/src/modules/notifications/repositories/notifications.repository.spec.ts
apps/backend/src/modules/notifications/types/create-notification.type.ts
apps/backend/src/modules/property-settings/dto/update-property-settings.dto.ts
apps/backend/src/modules/property-settings/property-settings.controller.ts
apps/backend/src/modules/property-settings/property-settings.controller.spec.ts
apps/backend/src/modules/property-settings/property-settings.module.ts
apps/backend/src/modules/property-settings/property-settings.service.spec.ts
apps/backend/src/modules/property-settings/property-settings.service.ts
apps/backend/src/modules/property-settings/repositories/property-settings.repository.ts
apps/backend/src/modules/property-settings/repositories/property-settings.repository.spec.ts
apps/backend/src/modules/reports/dto/report-query.dto.ts
apps/backend/src/modules/reports/reports.controller.spec.ts
apps/backend/src/modules/reports/reports.controller.ts
apps/backend/src/modules/reports/reports.module.ts
apps/backend/src/modules/reports/reports.service.spec.ts
apps/backend/src/modules/reports/reports.service.ts
apps/backend/src/modules/reports/repositories/financial-report.repository.ts
apps/backend/src/modules/reports/repositories/operations-report.repository.ts
apps/backend/src/modules/reports/repositories/report-repositories.spec.ts
apps/backend/src/modules/reports/repositories/room-report.repository.ts
apps/backend/src/modules/reports/repositories/supply-chain-report.repository.ts
apps/backend/src/modules/reservations/.gitkeep
apps/backend/src/modules/reservations/dto/add-reservation-room.dto.ts
apps/backend/src/modules/reservations/dto/availability-search-query.dto.ts
apps/backend/src/modules/reservations/dto/booking-calendar-query.dto.ts
apps/backend/src/modules/reservations/dto/cancel-reservation.dto.ts
apps/backend/src/modules/reservations/dto/create-reservation.dto.ts
apps/backend/src/modules/reservations/dto/get-reservations-query.dto.ts
apps/backend/src/modules/reservations/dto/is-after-date-property.decorator.ts
apps/backend/src/modules/reservations/dto/mark-no-show.dto.ts
apps/backend/src/modules/reservations/dto/reservation-dto-validation.spec.ts
apps/backend/src/modules/reservations/dto/update-reservation-room.dto.ts
apps/backend/src/modules/reservations/dto/update-reservation.dto.ts
apps/backend/src/modules/reservations/repositories/reservation-availability.repository.spec.ts
apps/backend/src/modules/reservations/repositories/reservation-availability.repository.ts
apps/backend/src/modules/reservations/repositories/reservation-rooms.repository.spec.ts
apps/backend/src/modules/reservations/repositories/reservation-rooms.repository.ts
apps/backend/src/modules/reservations/repositories/reservations.repository.spec.ts
apps/backend/src/modules/reservations/repositories/reservations.repository.ts
apps/backend/src/modules/reservations/reservations.controller.spec.ts
apps/backend/src/modules/reservations/reservations.controller.ts
apps/backend/src/modules/reservations/reservations.module.ts
apps/backend/src/modules/reservations/reservations.service.spec.ts
apps/backend/src/modules/reservations/reservations.service.ts
apps/backend/src/modules/restaurant/.gitkeep
apps/backend/src/modules/restaurant/dto/add-pos-order-item.dto.ts
apps/backend/src/modules/restaurant/dto/cancel-pos-order.dto.ts
apps/backend/src/modules/restaurant/dto/charge-pos-order-to-room.dto.spec.ts
apps/backend/src/modules/restaurant/dto/charge-pos-order-to-room.dto.ts
apps/backend/src/modules/restaurant/dto/close-pos-order.dto.ts
apps/backend/src/modules/restaurant/dto/create-menu-item.dto.ts
apps/backend/src/modules/restaurant/dto/create-outlet.dto.ts
apps/backend/src/modules/restaurant/dto/create-pos-order.dto.ts
apps/backend/src/modules/restaurant/dto/get-menu-items-query.dto.ts
apps/backend/src/modules/restaurant/dto/get-outlets-query.dto.ts
apps/backend/src/modules/restaurant/dto/get-pos-orders-query.dto.ts
apps/backend/src/modules/restaurant/dto/in-house-guest-search-query.dto.ts
apps/backend/src/modules/restaurant/dto/record-pos-order-payment.dto.ts
apps/backend/src/modules/restaurant/dto/restaurant-dashboard-query.dto.ts
apps/backend/src/modules/restaurant/dto/restaurant-sales-summary-query.dto.ts
apps/backend/src/modules/restaurant/dto/restaurant-dto-validation.spec.ts
apps/backend/src/modules/restaurant/dto/update-menu-item.dto.ts
apps/backend/src/modules/restaurant/dto/update-outlet.dto.ts
apps/backend/src/modules/restaurant/dto/update-pos-order-item.dto.ts
apps/backend/src/modules/restaurant/dto/update-pos-order.dto.ts
apps/backend/src/modules/restaurant/dto/void-pos-order-item.dto.ts
apps/backend/src/modules/restaurant/repositories/menu-items.repository.spec.ts
apps/backend/src/modules/restaurant/repositories/menu-items.repository.ts
apps/backend/src/modules/restaurant/repositories/outlets.repository.spec.ts
apps/backend/src/modules/restaurant/repositories/outlets.repository.ts
apps/backend/src/modules/restaurant/repositories/pos-order-items.repository.spec.ts
apps/backend/src/modules/restaurant/repositories/pos-order-items.repository.ts
apps/backend/src/modules/restaurant/repositories/pos-order-payments.repository.spec.ts
apps/backend/src/modules/restaurant/repositories/pos-order-payments.repository.ts
apps/backend/src/modules/restaurant/repositories/pos-orders.repository.spec.ts
apps/backend/src/modules/restaurant/repositories/pos-orders.repository.ts
apps/backend/src/modules/restaurant/repositories/pos-room-charges.repository.spec.ts
apps/backend/src/modules/restaurant/repositories/pos-room-charges.repository.ts
apps/backend/src/modules/restaurant/repositories/restaurant-reports.repository.spec.ts
apps/backend/src/modules/restaurant/repositories/restaurant-reports.repository.ts
apps/backend/src/modules/restaurant/restaurant.controller.spec.ts
apps/backend/src/modules/restaurant/restaurant.controller.ts
apps/backend/src/modules/restaurant/restaurant.module.ts
apps/backend/src/modules/restaurant/restaurant.service.spec.ts
apps/backend/src/modules/restaurant/restaurant.service.ts
apps/backend/src/modules/roles/.gitkeep
apps/backend/src/modules/room-types/.gitkeep
apps/backend/src/modules/room-types/dto/assign-room-type-amenities.dto.ts
apps/backend/src/modules/room-types/dto/create-room-amenity.dto.ts
apps/backend/src/modules/room-types/dto/create-room-type.dto.ts
apps/backend/src/modules/room-types/dto/get-room-amenities-query.dto.ts
apps/backend/src/modules/room-types/dto/get-room-types-query.dto.ts
apps/backend/src/modules/room-types/dto/update-room-amenity.dto.ts
apps/backend/src/modules/room-types/dto/update-room-type.dto.ts
apps/backend/src/modules/room-types/repositories/room-amenities.repository.spec.ts
apps/backend/src/modules/room-types/repositories/room-amenities.repository.ts
apps/backend/src/modules/room-types/repositories/room-types.repository.spec.ts
apps/backend/src/modules/room-types/repositories/room-types.repository.ts
apps/backend/src/modules/room-types/room-amenities.controller.spec.ts
apps/backend/src/modules/room-types/room-amenities.controller.ts
apps/backend/src/modules/room-types/room-amenities.service.spec.ts
apps/backend/src/modules/room-types/room-amenities.service.ts
apps/backend/src/modules/room-types/room-types.controller.spec.ts
apps/backend/src/modules/room-types/room-types.controller.ts
apps/backend/src/modules/room-types/room-types.module.ts
apps/backend/src/modules/room-types/room-types.service.spec.ts
apps/backend/src/modules/room-types/room-types.service.ts
apps/backend/src/modules/rooms/.gitkeep
apps/backend/src/modules/rooms/dto/clear-room-out-of-order.dto.ts
apps/backend/src/modules/rooms/dto/create-room.dto.ts
apps/backend/src/modules/rooms/dto/get-room-status-logs-query.dto.ts
apps/backend/src/modules/rooms/dto/get-rooms-query.dto.ts
apps/backend/src/modules/rooms/dto/mark-room-out-of-order.dto.ts
apps/backend/src/modules/rooms/dto/update-room-status.dto.ts
apps/backend/src/modules/rooms/dto/update-room.dto.ts
apps/backend/src/modules/rooms/repositories/rooms.repository.spec.ts
apps/backend/src/modules/rooms/repositories/rooms.repository.ts
apps/backend/src/modules/rooms/rooms.controller.spec.ts
apps/backend/src/modules/rooms/rooms.controller.ts
apps/backend/src/modules/rooms/rooms.module.ts
apps/backend/src/modules/rooms/rooms.service.spec.ts
apps/backend/src/modules/rooms/rooms.service.ts
apps/backend/src/modules/stays/reservation-check-ins.controller.spec.ts
apps/backend/src/modules/stays/reservation-check-ins.controller.ts
apps/backend/src/modules/stays/dto/assign-stay-room.dto.ts
apps/backend/src/modules/stays/dto/check-in-reservation.dto.ts
apps/backend/src/modules/stays/dto/check-out-stay.dto.ts
apps/backend/src/modules/stays/dto/extend-stay.dto.ts
apps/backend/src/modules/stays/dto/get-stays-query.dto.ts
apps/backend/src/modules/stays/dto/move-room.dto.ts
apps/backend/src/modules/stays/dto/update-stay-room-assignment.dto.ts
apps/backend/src/modules/stays/repositories/stay-room-assignments.repository.spec.ts
apps/backend/src/modules/stays/repositories/stay-room-assignments.repository.ts
apps/backend/src/modules/stays/repositories/stays.repository.spec.ts
apps/backend/src/modules/stays/repositories/stays.repository.ts
apps/backend/src/modules/stays/stays.controller.spec.ts
apps/backend/src/modules/stays/stays.controller.ts
apps/backend/src/modules/stays/stays.module.ts
apps/backend/src/modules/stays/stays.service.spec.ts
apps/backend/src/modules/stays/stays.service.ts
apps/backend/src/modules/users/.gitkeep
apps/backend/src/prisma/prisma.module.ts
apps/backend/src/prisma/prisma.service.ts
apps/backend/test/app.e2e-spec.ts
apps/backend/test/folios.e2e-spec.ts
apps/backend/test/front-desk.e2e-spec.ts
apps/backend/test/health.e2e-spec.ts
apps/backend/test/invoices.e2e-spec.ts
apps/backend/test/integration/integration-test-context.ts
apps/backend/test/integration/inventory-postgres.integration-spec.ts
apps/backend/test/integration/operations-postgres.integration-spec.ts
apps/backend/test/integration/procurement-postgres.integration-spec.ts
apps/backend/test/integration/reports-postgres.integration-spec.ts
apps/backend/test/integration/property-notifications-postgres.integration-spec.ts
apps/backend/test/integration/run-integration-tests.ts
apps/backend/test/jest-e2e.json
apps/backend/test/jest-integration.json
apps/backend/test/maintenance.e2e-spec.ts
apps/backend/test/payments.e2e-spec.ts
apps/backend/test/receipts.e2e-spec.ts
apps/backend/test/restaurant.e2e-spec.ts
apps/backend/test/reports.e2e-spec.ts
apps/backend/test/property-notifications.e2e-spec.ts
apps/backend/test/reservations.e2e-spec.ts
apps/backend/test/rooms.e2e-spec.ts
apps/backend/test/stays.e2e-spec.ts
apps/backend/tsconfig.build.json
apps/backend/tsconfig.json
apps/frontend/.gitkeep
apps/mobile/.gitkeep
docs/.gitkeep
docs/billing-folios-payments-module.md
docs/front-desk-stays-module.md
docs/housekeeping-module.md
docs/inventory-module.md
docs/maintenance-module.md
docs/procurement-module.md
docs/reports-module.md
docs/property-settings-module.md
docs/notifications-module.md
docs/reservations-module.md
docs/restaurant-pos-module.md
docs/rooms-module.md
infrastructure/.gitkeep
packages/sdk/.gitkeep
packages/types/.gitkeep
packages/validators/.gitkeep
scripts/.gitkeep
```

## Local-Only Instruction Files

These files exist locally for agent guidance and are intentionally ignored by Git:

```text
AGENTS.md
apps/backend/AGENTS.md
apps/frontend/AGENTS.md
apps/mobile/AGENTS.md
tree.md
```

## Maintenance Rule

Update this file whenever a source-controlled file or folder is added, removed, renamed, or moved.
