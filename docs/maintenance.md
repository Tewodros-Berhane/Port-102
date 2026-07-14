# Maintenance Operations

We are continuing the Port-102 Hotel Operating System backend.

Work only inside `apps/backend` unless root-level `tree.md` or docs must be updated.

Read and strictly follow `apps/backend/AGENTS.md` before making changes.

## Important Project Rules

- Use the Nest CLI whenever generating NestJS framework files.
- Follow Controller -> Service -> Repository -> PrismaService architecture.
- Do not put Prisma queries in controllers.
- Use DTOs with class-validator and Swagger decorators.
- Add/update unit and e2e tests where needed.
- Update `tree.md` if source-controlled files/folders change.
- Do not make broad unrelated refactors.

## Completed Backend Context

The backend has completed:

- single-hotel auth/RBAC
- users, roles, permissions, employees, guests, approvals, audit logs
- floors, room types, room amenities, rooms, room status, physical availability
- reservations, date availability, booking calendar
- front desk stay lifecycle
- folios, billing, payments, invoices, receipts
- housekeeping operations

## Current Housekeeping Flow

- Checkout marks room `VACANT` + `DIRTY`.
- Checkout creates housekeeping cleaning task.
- Attendant completes task.
- Room becomes `CLEAN`.
- Supervisor approves task.
- Room becomes `INSPECTED`.
- Housekeeping issues can be reported, resolved, or cancelled.

## Task

Implement the next hotel operations module:

```txt
Maintenance Operations
```

This stage should implement:

1. Maintenance tickets / work orders
2. Maintenance dashboard
3. Ticket creation from front desk, housekeeping, supervisor, or manual source
4. Technician assignment
5. Assigned-to-me technician workflow
6. Start/update/complete ticket workflow
7. Supervisor approval/rejection workflow
8. Room out-of-order / under-maintenance linkage
9. Maintenance issue photos/notes foundation
10. Preventive maintenance foundation
11. Asset/equipment foundation

Do not implement:

- inventory spare-part deduction yet
- procurement integration yet
- mobile app yet
- advanced IoT/sensor monitoring yet

This is backend-only and API-first.

---

## 1. Generate NestJS Module Using Nest CLI

Use Nest CLI where applicable.

Generate/complete the maintenance module if it is still a placeholder:

```bash
nest g module modules/maintenance
nest g controller modules/maintenance
nest g service modules/maintenance
```

Manual files are allowed for:

- DTOs
- repositories
- constants/enums
- tests
- helper types

---

## 2. Prisma Schema Design

Add maintenance models and enums.

### Recommended Enums

```prisma
enum MaintenanceTicketStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  APPROVED
  REJECTED
  CANCELLED
}

enum MaintenancePriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum MaintenanceTicketSource {
  FRONT_DESK
  HOUSEKEEPING
  MANAGER
  TECHNICIAN
  PREVENTIVE
  MANUAL
}

enum MaintenanceIssueType {
  ELECTRICAL
  PLUMBING
  HVAC
  FURNITURE
  APPLIANCE
  CLEANLINESS
  STRUCTURAL
  INTERNET_TV
  SAFETY
  OTHER
}

enum AssetStatus {
  ACTIVE
  INACTIVE
  UNDER_MAINTENANCE
  RETIRED
}

enum PreventiveMaintenanceStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}
```

### Recommended Models

```prisma
model MaintenanceTicket {
  id                  Int                      @id @default(autoincrement())
  ticketNumber        String                   @unique
  roomId              Int?
  assetId             Int?
  source              MaintenanceTicketSource  @default(MANUAL)
  sourceType          String?
  sourceId            Int?
  issueType           MaintenanceIssueType     @default(OTHER)
  status              MaintenanceTicketStatus  @default(OPEN)
  priority            MaintenancePriority      @default(NORMAL)

  title               String
  description         String?
  reportedByUserId    Int?
  assignedToUserId    Int?
  assignedByUserId    Int?

  assignedAt          DateTime?
  startedAt           DateTime?
  completedAt         DateTime?
  approvedAt          DateTime?
  rejectedAt          DateTime?
  cancelledAt         DateTime?

  completedByUserId   Int?
  approvedByUserId    Int?
  rejectedByUserId    Int?
  cancelledByUserId   Int?

  completionNotes     String?
  approvalNotes       String?
  rejectionReason     String?
  cancellationReason  String?

  createdAt           DateTime                 @default(now())
  updatedAt           DateTime                 @updatedAt

  room                Room?                    @relation(fields: [roomId], references: [id], onDelete: SetNull)
  asset               Asset?                   @relation(fields: [assetId], references: [id], onDelete: SetNull)

  reportedBy          User?                    @relation("MaintenanceTicketReportedBy", fields: [reportedByUserId], references: [id], onDelete: SetNull)
  assignedTo          User?                    @relation("MaintenanceTicketAssignedTo", fields: [assignedToUserId], references: [id], onDelete: SetNull)
  assignedBy          User?                    @relation("MaintenanceTicketAssignedBy", fields: [assignedByUserId], references: [id], onDelete: SetNull)
  completedBy         User?                    @relation("MaintenanceTicketCompletedBy", fields: [completedByUserId], references: [id], onDelete: SetNull)
  approvedBy          User?                    @relation("MaintenanceTicketApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  rejectedBy          User?                    @relation("MaintenanceTicketRejectedBy", fields: [rejectedByUserId], references: [id], onDelete: SetNull)
  cancelledBy         User?                    @relation("MaintenanceTicketCancelledBy", fields: [cancelledByUserId], references: [id], onDelete: SetNull)

  notes               MaintenanceTicketNote[]
  photos              MaintenanceTicketPhoto[]

  @@index([roomId])
  @@index([assetId])
  @@index([status])
  @@index([priority])
  @@index([assignedToUserId])
  @@index([issueType])
  @@index([createdAt])
  @@map("maintenance_tickets")
}

model MaintenanceTicketNote {
  id             Int      @id @default(autoincrement())
  ticketId       Int
  authorUserId   Int?
  note           String
  createdAt      DateTime @default(now())

  ticket         MaintenanceTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author         User?             @relation("MaintenanceTicketNoteAuthor", fields: [authorUserId], references: [id], onDelete: SetNull)

  @@index([ticketId])
  @@index([authorUserId])
  @@map("maintenance_ticket_notes")
}

model MaintenanceTicketPhoto {
  id               Int      @id @default(autoincrement())
  ticketId         Int
  uploadedByUserId Int?
  url              String
  description      String?
  createdAt        DateTime @default(now())

  ticket           MaintenanceTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  uploadedBy       User?             @relation("MaintenanceTicketPhotoUploadedBy", fields: [uploadedByUserId], references: [id], onDelete: SetNull)

  @@index([ticketId])
  @@index([uploadedByUserId])
  @@map("maintenance_ticket_photos")
}

model Asset {
  id                Int         @id @default(autoincrement())
  assetNumber       String      @unique
  name              String
  category          String?
  location          String?
  roomId            Int?
  status            AssetStatus @default(ACTIVE)
  description       String?
  purchaseDate      DateTime?
  warrantyUntil     DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  room              Room?       @relation(fields: [roomId], references: [id], onDelete: SetNull)
  tickets           MaintenanceTicket[]
  preventivePlans   PreventiveMaintenancePlan[]

  @@index([roomId])
  @@index([status])
  @@index([category])
  @@map("assets")
}

model PreventiveMaintenancePlan {
  id              Int                         @id @default(autoincrement())
  planNumber      String                      @unique
  assetId         Int?
  roomId          Int?
  title           String
  description     String?
  status          PreventiveMaintenanceStatus @default(ACTIVE)
  intervalDays    Int
  nextDueDate     DateTime
  lastCompletedAt DateTime?
  createdByUserId Int?
  createdAt       DateTime                    @default(now())
  updatedAt       DateTime                    @updatedAt

  asset           Asset?                      @relation(fields: [assetId], references: [id], onDelete: SetNull)
  room            Room?                       @relation(fields: [roomId], references: [id], onDelete: SetNull)
  createdBy       User?                       @relation("PreventiveMaintenanceCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([assetId])
  @@index([roomId])
  @@index([status])
  @@index([nextDueDate])
  @@map("preventive_maintenance_plans")
}
```

Update existing relations if Prisma requires them:

- `Room` should have `maintenanceTickets`, `assets`, and `preventiveMaintenancePlans` relations.
- `User` should have maintenance ticket relation fields.
- `User` should have note/photo/preventive maintenance relation fields.

Important:

- Do not add `hotelId`.
- Do not add `HotelUser`.
- Do not reintroduce multi-hotel logic.

---

## 3. Permissions To Use

Use existing seeded permissions.

### Maintenance

- `maintenance.dashboard.read`
- `maintenance.tickets.create`
- `maintenance.tickets.read`
- `maintenance.tickets.read.assigned`
- `maintenance.tickets.assign`
- `maintenance.tickets.start`
- `maintenance.tickets.start.assigned`
- `maintenance.tickets.update`
- `maintenance.tickets.update.assigned`
- `maintenance.tickets.complete`
- `maintenance.tickets.complete.assigned`
- `maintenance.tickets.approve`
- `maintenance.parts.request`
- `maintenance.photos.upload`

### Preventive Maintenance

- `preventive_maintenance.create`
- `preventive_maintenance.read`
- `preventive_maintenance.update`
- `preventive_maintenance.delete`

### Assets

- `assets.create`
- `assets.read`
- `assets.update`
- `assets.delete`

### Rooms

- `rooms.read`
- `rooms.status.read`
- `rooms.out_of_order.mark`
- `rooms.out_of_order.clear`

### Files

- `files.upload`
- `files.read`

Every protected route should normally use:

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('resource.action')
```

Do not use `HotelAccessGuard`.
Do not use `CurrentHotel`.
Do not expect `hotelId` in `CurrentUser`.

---

## 4. API Endpoints

### Dashboard

```txt
GET /maintenance/dashboard
```

### Tickets

```txt
POST   /maintenance/tickets
GET    /maintenance/tickets
GET    /maintenance/tickets/assigned/me
GET    /maintenance/tickets/:id
PATCH  /maintenance/tickets/:id
PATCH  /maintenance/tickets/:id/assign
PATCH  /maintenance/tickets/:id/start
PATCH  /maintenance/tickets/:id/complete
PATCH  /maintenance/tickets/:id/approve
PATCH  /maintenance/tickets/:id/reject
PATCH  /maintenance/tickets/:id/cancel
POST   /maintenance/tickets/:id/notes
POST   /maintenance/tickets/:id/photos
```

### Room Maintenance Status

```txt
PATCH /maintenance/rooms/:roomId/mark-out-of-order
PATCH /maintenance/rooms/:roomId/mark-under-maintenance
PATCH /maintenance/rooms/:roomId/clear-maintenance
```

### Assets

```txt
POST   /maintenance/assets
GET    /maintenance/assets
GET    /maintenance/assets/:id
PATCH  /maintenance/assets/:id
DELETE /maintenance/assets/:id
```

### Preventive Maintenance

```txt
POST   /maintenance/preventive-plans
GET    /maintenance/preventive-plans
GET    /maintenance/preventive-plans/:id
PATCH  /maintenance/preventive-plans/:id
DELETE /maintenance/preventive-plans/:id
POST   /maintenance/preventive-plans/:id/create-ticket
```

### Housekeeping Integration

```txt
POST /maintenance/tickets/from-housekeeping-issue/:issueId
```

This should create a maintenance ticket from an open housekeeping issue.

Important route ordering:

- Static routes like `/maintenance/tickets/assigned/me` and `/maintenance/tickets/from-housekeeping-issue/:issueId` must be declared before `/:id` routes where needed to avoid route conflicts.

---

## 5. DTO Requirements

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

### Tickets

- `CreateMaintenanceTicketDto`
- `UpdateMaintenanceTicketDto`
- `GetMaintenanceTicketsQueryDto`
- `AssignMaintenanceTicketDto`
- `StartMaintenanceTicketDto`
- `CompleteMaintenanceTicketDto`
- `ApproveMaintenanceTicketDto`
- `RejectMaintenanceTicketDto`
- `CancelMaintenanceTicketDto`
- `CreateMaintenanceTicketNoteDto`
- `UploadMaintenanceTicketPhotoDto`
- `CreateTicketFromHousekeepingIssueDto`

### Room Maintenance

- `MarkRoomOutOfOrderFromMaintenanceDto`
- `MarkRoomUnderMaintenanceDto`
- `ClearRoomMaintenanceDto`

### Assets

- `CreateAssetDto`
- `UpdateAssetDto`
- `GetAssetsQueryDto`

### Preventive Maintenance

- `CreatePreventiveMaintenancePlanDto`
- `UpdatePreventiveMaintenancePlanDto`
- `GetPreventiveMaintenancePlansQueryDto`
- `CreateTicketFromPreventivePlanDto`

### Validation Rules

- ticket title is required.
- rejection must include reason.
- cancellation must include reason.
- completion can include notes.
- assignedToUserId must be valid when assigning.
- roomId must exist if provided.
- assetId must exist if provided.
- assetNumber must be unique.
- preventive intervalDays must be greater than 0.
- preventive plan must link to either assetId or roomId or both.
- photo URL must be valid URL/string depending on current file strategy.

Query DTOs should support:

- page
- limit
- search
- status
- priority
- issueType
- roomId
- assetId
- assignedToUserId
- createdFrom
- createdTo

Use maximum limit `100`.

---

## 6. Repository/Service Architecture

Follow:

```txt
Controller
Service
Repository
PrismaService
```

Required repositories:

```txt
maintenance/repositories/maintenance-tickets.repository.ts
maintenance/repositories/maintenance-ticket-notes.repository.ts
maintenance/repositories/maintenance-ticket-photos.repository.ts
maintenance/repositories/assets.repository.ts
maintenance/repositories/preventive-maintenance-plans.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

## 7. Business Rules

### Ticket Creation

- Ticket can be room-based, asset-based, both, or general.
- If roomId is provided, room must exist and be active.
- If assetId is provided, asset must exist and be active.
- Ticket number must be unique.
- Initial status:
  - `OPEN` if no assignee
  - `ASSIGNED` if assignedToUserId is provided
- Create audit log.

### Ticket From Housekeeping Issue

- Housekeeping issue must exist and be `OPEN`.
- Issue room becomes ticket room.
- Ticket source = `HOUSEKEEPING`.
- sourceType = `HOUSEKEEPING_ISSUE`.
- sourceId = `issue.id`.
- Do not automatically resolve housekeeping issue yet unless explicitly designed.
- Prevent duplicate open maintenance tickets for the same housekeeping issue.
- Create audit log.

### Assignment

- Assigned user must exist and be active.
- Assigning sets status = `ASSIGNED` unless already `IN_PROGRESS`.
- assignedAt and assignedByUserId should be set.
- Create audit log.

### Assigned Ticket Access

- `/maintenance/tickets/assigned/me` returns only tickets assigned to current user.
- assigned-only start/update/complete operations must verify:
  - `ticket.assignedToUserId === currentUser.sub`
- This must be enforced in service/repository, not only by permission.

### Start

- Ticket must be `OPEN` or `ASSIGNED`.
- Set status = `IN_PROGRESS`.
- Set startedAt.
- If linked room is still `AVAILABLE`, optionally mark room `UNDER_MAINTENANCE` if DTO requests it.
- Create audit log.

### Update

- Do not allow unsafe edits on `APPROVED`/`CANCELLED` tickets.
- Notes should go through notes endpoint.
- Create audit log for important field changes.

### Complete

- Ticket must be `IN_PROGRESS` or `ASSIGNED`.
- If current user has assigned-only permission, they can only complete their own assigned ticket.
- Set status = `COMPLETED`.
- Set completedAt and completedByUserId.
- Store completionNotes.
- Do not automatically clear room maintenance status unless supervisor approval does it.
- Create audit log.

### Approve

- Ticket must be `COMPLETED`.
- Set status = `APPROVED`.
- Set approvedAt and approvedByUserId.
- If linked room is `UNDER_MAINTENANCE` or `OUT_OF_ORDER` and DTO requests clearMaintenance, set room.maintenanceStatus = `AVAILABLE`.
- Create `RoomStatusLog` if room maintenance status changes.
- Create audit log.

### Reject

- Ticket must be `COMPLETED`.
- Rejection reason required.
- Set status = `REJECTED`.
- Set rejectedAt and rejectedByUserId.
- Rejected ticket can later be reassigned or restarted if service supports it.
- Create audit log.

### Cancel

- Cannot cancel `APPROVED` ticket.
- Cancellation reason required.
- Set status = `CANCELLED`.
- Set cancelledAt and cancelledByUserId.
- Create audit log.

### Room Maintenance Status

- mark-out-of-order sets room.maintenanceStatus = `OUT_OF_ORDER`.
- mark-under-maintenance sets room.maintenanceStatus = `UNDER_MAINTENANCE`.
- clear-maintenance sets room.maintenanceStatus = `AVAILABLE`.
- All room status changes must create `RoomStatusLog` and audit log.
- If room is `OCCUPIED`, still allow maintenance ticket but be careful with clearing availability.
- Do not change occupancyStatus through maintenance endpoints.

### Assets

- assetNumber must be unique.
- Soft-delete assets by setting status = `INACTIVE` or `RETIRED`.
- Do not delete asset with active tickets.
- Create audit logs.

### Preventive Maintenance

- intervalDays > 0.
- Plan must be `ACTIVE` to create ticket.
- create-ticket creates `MaintenanceTicket` with source = `PREVENTIVE`.
- sourceType = `PREVENTIVE_PLAN`.
- sourceId = `plan.id`.
- Update lastCompletedAt or nextDueDate only when appropriate.
- Create audit logs.

### Dashboard Fields

Return useful counts:

- openTickets
- assignedTickets
- inProgressTickets
- completedPendingApproval
- approvedToday
- rejectedToday
- urgentTickets
- outOfOrderRooms
- underMaintenanceRooms
- assetsUnderMaintenance
- overduePreventivePlans

---

## 8. Audit Logging

Use existing `AuditLogsService`.

Audit these actions:

- maintenance ticket created
- ticket created from housekeeping issue
- ticket assigned
- ticket started
- ticket updated
- ticket completed
- ticket approved
- ticket rejected
- ticket cancelled
- ticket note added
- ticket photo added
- room marked out of order
- room marked under maintenance
- room maintenance cleared
- asset created
- asset updated
- asset deactivated/retired
- preventive plan created
- preventive plan updated
- preventive plan deleted
- preventive ticket created

Do not create audit logs directly in controllers.

---

## 9. Swagger Requirements

Every endpoint must include:

- `@ApiTags`
- `@ApiBearerAuth` where protected
- `@ApiOperation`
- response decorators
- DTO property decorators

Swagger must show:

- request body schemas
- query parameters
- auth requirements
- clear endpoint descriptions

---

## 10. Tests

Add/update unit tests and e2e tests.

### Unit Tests Should Cover

- ticket creation success
- ticket from housekeeping issue success
- duplicate ticket from same housekeeping issue rejected
- assign ticket success
- assigned-only list returns current user's tickets
- assigned-only start rejects unassigned user
- assigned-only complete rejects unassigned user
- start ticket status transition
- complete ticket status transition
- approve ticket clears room maintenance when requested
- reject requires reason
- cancel requires reason
- mark room out of order creates status log
- clear maintenance creates status log
- asset create/update/deactivate
- preventive plan create and create-ticket
- dashboard counts

### E2E Tests Should Cover At Least

- unauthorized user rejected
- user without permission rejected
- supervisor can create ticket
- supervisor can assign ticket
- technician can see assigned ticket
- technician can start assigned ticket
- technician can complete assigned ticket
- supervisor can approve ticket
- room can be marked out of order
- room can be cleared from maintenance
- ticket can be created from housekeeping issue
- asset CRUD works
- preventive plan can create ticket

Use existing auth/stay/housekeeping/test helpers if available.

---

## 11. Documentation

Add:

```txt
docs/maintenance-module.md
```

Include:

- purpose of maintenance module
- ticket lifecycle
- relationship with rooms
- relationship with housekeeping issues
- technician assigned-only rules
- supervisor approval flow
- room maintenance statuses
- asset foundation
- preventive maintenance foundation
- dashboard fields
- intentional limitations

Intentional limitations to document:

- no spare-parts inventory deduction yet
- no procurement integration yet
- no mobile app yet
- no IoT/sensor automation yet
- no advanced SLA/escalation engine yet

Update README if needed.
Update `tree.md` after source-controlled structure changes.

---

## 12. Definition Of Done

This task is complete only when:

- Prisma models/enums are added.
- Migration is created.
- Prisma client generates.
- Maintenance ticket API works.
- Assigned-to-me technician workflow works.
- Ticket assignment/start/update/complete/approve/reject/cancel works.
- Room out-of-order/under-maintenance/clear-maintenance endpoints work.
- Ticket from housekeeping issue works.
- Duplicate ticket from same housekeeping issue is prevented.
- Asset API works.
- Preventive maintenance plan API works.
- Preventive plan can create ticket.
- Dashboard endpoint works.
- RoomStatusLog entries are created for room maintenance status changes.
- Audit logs are created for sensitive maintenance actions.
- All endpoints are protected with JwtAuthGuard + PermissionsGuard where appropriate.
- Assigned-only rules are enforced in service/repository logic.
- No multi-hotel logic is reintroduced.
- No hotelId or HotelUser references are added.
- DTO validation exists.
- Swagger docs are complete.
- Unit tests pass.
- E2E tests pass.
- `npm run build` passes.
- `npm run test` passes.
- `npm run test:e2e` passes.
- `tree.md` is updated.

After completion, provide a concise report with:

- files changed
- models added
- endpoints added
- permissions used
- tests added/updated
- verification results
- remaining caveats if any
