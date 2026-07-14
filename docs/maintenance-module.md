# Maintenance Module

## Purpose

Maintenance manages corrective tickets, technician assignment, room maintenance
states, assets, preventive plans, notes, and photo metadata.

## Entities and lifecycle

`MaintenanceTicket`, `MaintenanceTicketNote`, `MaintenanceTicketPhoto`, `Asset`,
and `PreventiveMaintenancePlan` are the core entities. Tickets progress through
open, assigned, in-progress, completed, and approved states, with rejection,
rework, and cancellation paths.

## Endpoints and permissions

`/maintenance` exposes dashboard, ticket CRUD and workflow actions, assigned-to-me,
notes/photos, room out-of-order/under-maintenance/clear operations, assets,
preventive plans, preventive ticket creation, and housekeeping-issue conversion.
JWT and permission guards protect every operation; assigned-only permissions are
also enforced in the service for technician workflows.

## Business rules and integrations

Room changes write room-status logs. Ticket lifecycle and master-data changes are
audited. Only open housekeeping issues can create maintenance tickets, and a
partial database uniqueness constraint prevents duplicate non-final tickets from
the same issue. Preventive plans may generate successive tickets over time.

## Known limitations

Photos are stored as metadata/URLs rather than managed object storage. There is no
parts consumption, vendor work-order portal, labor costing, or notification engine.
