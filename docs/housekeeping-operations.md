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
* front desk stay lifecycle
* folios, line items, payments, invoices, receipts, and checkout billing validation

Current hotel flow:
Reservation → Check-in → Stay → Folio/Charges → Payment → Invoice/Receipt → Checkout

After checkout, the room is already marked:

* occupancyStatus = VACANT
* cleaningStatus = DIRTY

Task:
Implement the next hotel operations module:

Housekeeping Operations

This stage should implement:

1. Automatic housekeeping task creation after checkout
2. Housekeeping task list
3. Assigned task workflow
4. Supervisor assignment/reassignment
5. Attendant start/complete workflow
6. Supervisor inspection/approval workflow
7. Room cleaning status updates
8. Housekeeping issue reporting
9. Housekeeping dashboard
10. Housekeeping productivity/read summaries

Do NOT implement full maintenance module yet.
Do NOT implement mobile app yet.
Do NOT implement inventory/linen stock deduction yet.
Do NOT implement payroll/productivity payments.

This is backend-only and API-first.

---

1. Generate NestJS module using Nest CLI

---

Use Nest CLI where applicable.

Generate/complete the housekeeping module if it is still a placeholder:

```bash
nest g module modules/housekeeping
nest g controller modules/housekeeping
nest g service modules/housekeeping
```

Manual files are allowed for:

* DTOs
* repositories
* constants/enums
* tests
* helper types

---

2. Prisma schema design

---

Add housekeeping models and enums.

Recommended enums:

```prisma
enum HousekeepingTaskStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  INSPECTION_PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum HousekeepingTaskType {
  CHECKOUT_CLEANING
  STAYOVER_CLEANING
  DEEP_CLEANING
  INSPECTION
  MANUAL
}

enum HousekeepingPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum HousekeepingIssueStatus {
  OPEN
  RESOLVED
  CANCELLED
}
```

Recommended models:

```prisma
model HousekeepingTask {
  id                 Int                     @id @default(autoincrement())
  taskNumber         String                  @unique
  roomId             Int
  type               HousekeepingTaskType    @default(CHECKOUT_CLEANING)
  status             HousekeepingTaskStatus  @default(PENDING)
  priority           HousekeepingPriority    @default(NORMAL)

  assignedToUserId   Int?
  assignedByUserId   Int?
  startedAt          DateTime?
  completedAt        DateTime?
  inspectedAt        DateTime?
  approvedAt         DateTime?
  rejectedAt         DateTime?
  cancelledAt        DateTime?

  completedByUserId  Int?
  inspectedByUserId  Int?
  approvedByUserId   Int?
  rejectedByUserId   Int?
  cancelledByUserId  Int?

  notes              String?
  completionNotes    String?
  inspectionNotes    String?
  rejectionReason    String?
  sourceType         String?
  sourceId           Int?

  createdAt          DateTime                @default(now())
  updatedAt          DateTime                @updatedAt

  room               Room                    @relation(fields: [roomId], references: [id], onDelete: Restrict)
  assignedTo         User?                   @relation("HousekeepingTaskAssignedTo", fields: [assignedToUserId], references: [id], onDelete: SetNull)
  assignedBy         User?                   @relation("HousekeepingTaskAssignedBy", fields: [assignedByUserId], references: [id], onDelete: SetNull)
  completedBy        User?                   @relation("HousekeepingTaskCompletedBy", fields: [completedByUserId], references: [id], onDelete: SetNull)
  inspectedBy        User?                   @relation("HousekeepingTaskInspectedBy", fields: [inspectedByUserId], references: [id], onDelete: SetNull)
  approvedBy         User?                   @relation("HousekeepingTaskApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  rejectedBy         User?                   @relation("HousekeepingTaskRejectedBy", fields: [rejectedByUserId], references: [id], onDelete: SetNull)
  cancelledBy        User?                   @relation("HousekeepingTaskCancelledBy", fields: [cancelledByUserId], references: [id], onDelete: SetNull)

  issues             HousekeepingIssue[]

  @@index([roomId])
  @@index([status])
  @@index([priority])
  @@index([assignedToUserId])
  @@index([type])
  @@index([createdAt])
  @@map("housekeeping_tasks")
}

model HousekeepingIssue {
  id              Int                     @id @default(autoincrement())
  issueNumber     String                  @unique
  taskId          Int?
  roomId          Int
  reportedByUserId Int?
  status          HousekeepingIssueStatus @default(OPEN)
  title           String
  description     String?
  photoUrl        String?
  resolvedAt      DateTime?
  resolvedByUserId Int?
  resolutionNotes String?

  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  task            HousekeepingTask?       @relation(fields: [taskId], references: [id], onDelete: SetNull)
  room            Room                    @relation(fields: [roomId], references: [id], onDelete: Restrict)
  reportedBy      User?                   @relation("HousekeepingIssueReportedBy", fields: [reportedByUserId], references: [id], onDelete: SetNull)
  resolvedBy      User?                   @relation("HousekeepingIssueResolvedBy", fields: [resolvedByUserId], references: [id], onDelete: SetNull)

  @@index([taskId])
  @@index([roomId])
  @@index([status])
  @@index([reportedByUserId])
  @@map("housekeeping_issues")
}
```

Update existing relations if Prisma requires them:

* Room should have housekeepingTasks and housekeepingIssues relations.
* User should have housekeeping task/issue relation fields.

Important:

* Do not add hotelId.
* Do not add HotelUser.
* Do not reintroduce multi-hotel logic.

---

3. Permissions to use

---

Use existing seeded permissions:

Housekeeping:

* housekeeping.dashboard.read
* housekeeping.tasks.create
* housekeeping.tasks.read
* housekeeping.tasks.read.assigned
* housekeeping.tasks.assign
* housekeeping.tasks.reassign
* housekeeping.tasks.start
* housekeeping.tasks.start.assigned
* housekeeping.tasks.complete
* housekeeping.tasks.complete.assigned
* housekeeping.tasks.inspect
* housekeeping.tasks.approve
* housekeeping.issues.report
* housekeeping.issues.read
* housekeeping.productivity.read
* room_cleaning_status.update
* room_cleaning_status.update.assigned

Rooms:

* rooms.read
* rooms.status.read
* rooms.status.update

Files:

* files.upload
* files.read

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

Housekeeping dashboard:

```txt
GET /housekeeping/dashboard
GET /housekeeping/productivity
```

Tasks:

```txt
POST   /housekeeping/tasks
GET    /housekeeping/tasks
GET    /housekeeping/tasks/assigned/me
GET    /housekeeping/tasks/:id
PATCH  /housekeeping/tasks/:id
PATCH  /housekeeping/tasks/:id/assign
PATCH  /housekeeping/tasks/:id/reassign
PATCH  /housekeeping/tasks/:id/start
PATCH  /housekeeping/tasks/:id/complete
PATCH  /housekeeping/tasks/:id/inspect
PATCH  /housekeeping/tasks/:id/approve
PATCH  /housekeeping/tasks/:id/reject
PATCH  /housekeeping/tasks/:id/cancel
```

Issues:

```txt
POST   /housekeeping/issues
GET    /housekeeping/issues
GET    /housekeeping/issues/:id
PATCH  /housekeeping/issues/:id/resolve
PATCH  /housekeeping/issues/:id/cancel
```

Room cleaning status:

```txt
PATCH /housekeeping/rooms/:roomId/cleaning-status
```

Integration with checkout:
Update existing checkout flow so that successful checkout automatically creates a housekeeping task:

```txt
type = CHECKOUT_CLEANING
status = PENDING
priority = NORMAL
roomId = checked-out room
sourceType = "STAY_CHECKOUT"
sourceId = stay.id
```

Important route ordering:
Static routes like `/housekeeping/tasks/assigned/me` must be declared before `/:id` routes if needed to avoid route conflicts.

---

5. DTO requirements

---

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

Required DTOs:

Tasks:

* CreateHousekeepingTaskDto
* UpdateHousekeepingTaskDto
* GetHousekeepingTasksQueryDto
* AssignHousekeepingTaskDto
* ReassignHousekeepingTaskDto
* StartHousekeepingTaskDto
* CompleteHousekeepingTaskDto
* InspectHousekeepingTaskDto
* ApproveHousekeepingTaskDto
* RejectHousekeepingTaskDto
* CancelHousekeepingTaskDto

Issues:

* CreateHousekeepingIssueDto
* GetHousekeepingIssuesQueryDto
* ResolveHousekeepingIssueDto
* CancelHousekeepingIssueDto

Room cleaning:

* UpdateRoomCleaningStatusDto

Dashboard:

* HousekeepingDashboardQueryDto
* HousekeepingProductivityQueryDto

Validation rules:

* assignedToUserId must be valid when assigning.
* task room must exist and be active.
* issue room must exist and be active.
* task status transitions must be valid.
* only allowed cleaning statuses should be accepted.
* rejection must include reason.
* cancellation should include reason.
* completion can include notes.
* issue title is required.

Query DTOs should support:

* page
* limit
* search
* status
* type
* priority
* roomId
* assignedToUserId
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
housekeeping/repositories/housekeeping-tasks.repository.ts
housekeeping/repositories/housekeeping-issues.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

7. Business rules

---

Implement these business rules.

Automatic checkout task:

* When checkout succeeds and room becomes VACANT + DIRTY, create housekeeping task automatically.
* Do not duplicate an open checkout cleaning task for the same room/source stay.
* Use transaction if checkout already runs in transaction.
* Create audit log.

Task creation:

* Room must exist and be active.
* Manual task can be created by supervisor/manager.
* Task number must be unique.
* Initial status:

  * PENDING if no assignee
  * ASSIGNED if assignedToUserId is provided
* Create audit log.

Assignment:

* Only users with assign/reassign permission can assign/reassign.
* Assigned user should exist and be active.
* Assigned user should normally have housekeeping attendant/supervisor role, but do not hardcode role unless a role check helper exists.
* Assigning task sets status to ASSIGNED unless already IN_PROGRESS.
* Create audit log.

Assigned task access:

* Attendant endpoint `/housekeeping/tasks/assigned/me` returns only tasks assigned to current user.
* Assigned-only start/complete operations must verify:

  * task.assignedToUserId === currentUser.sub
* This must be enforced in service/repository, not only by permission.

Task start:

* Task must be ASSIGNED or PENDING.
* If current user has assigned-only permission, they can only start their own assigned task.
* Set status = IN_PROGRESS.
* Set startedAt.
* Create audit log.

Task complete:

* Task must be IN_PROGRESS or ASSIGNED.
* If current user has assigned-only permission, they can only complete their own assigned task.
* Set status = INSPECTION_PENDING.
* Set completedAt and completedByUserId.
* Update room.cleaningStatus = CLEAN.
* Create RoomStatusLog.
* Create audit log.
* Do not mark room as INSPECTED automatically.

Inspection:

* Supervisor inspects a completed task.
* Task must be INSPECTION_PENDING or COMPLETED depending on chosen flow.
* Inspection can approve or reject.
* `inspect` may record notes and set inspectedAt/inspectedByUserId.
* `approve` should set task status = APPROVED.
* `approve` should update room.cleaningStatus = INSPECTED.
* Create RoomStatusLog.
* Create audit log.
* `reject` should set status = REJECTED and require reason.
* Rejected task can be reassigned or restarted later.

Room cleaning status manual update:

* Only authorized users can manually update room cleaning status.
* Must create RoomStatusLog.
* Must create audit log.
* Manual update should not bypass task workflow unless permission allows it.

Issue reporting:

* Any authorized housekeeping user can report issue.
* Issue must be linked to room.
* Issue may optionally link to task.
* Issue remains OPEN until resolved/cancelled.
* Create audit log.
* Do not create maintenance ticket yet.
* Add TODO/event hook for future maintenance ticket integration.

Issue resolve/cancel:

* Only authorized user can resolve/cancel.
* Set resolvedAt/resolvedByUserId or status CANCELLED.
* Create audit log.

Dashboard:
Return useful counts:

* pendingTasks
* assignedTasks
* inProgressTasks
* inspectionPendingTasks
* approvedTasksToday
* rejectedTasksToday
* openIssues
* dirtyRooms
* cleanRooms
* inspectedRooms
* roomsOutOfOrder
* urgentTasks

Productivity:
Return per-attendant summary for date range:

* assignedCount
* completedCount
* approvedCount
* rejectedCount
* averageCompletionTime if feasible

---

8. Audit logging

---

Use existing AuditLogsService.

Audit these actions:

* housekeeping task created
* housekeeping task auto-created from checkout
* task assigned
* task reassigned
* task started
* task completed
* task inspected
* task approved
* task rejected
* task cancelled
* housekeeping issue reported
* housekeeping issue resolved
* housekeeping issue cancelled
* room cleaning status updated

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

* checkout auto-creates housekeeping task
* task creation success
* duplicate checkout task prevention
* assignment success
* assigned-only task list returns only current user's tasks
* assigned-only start rejects unassigned user
* assigned-only complete rejects unassigned user
* start task status transition
* complete task sets room CLEAN and task INSPECTION_PENDING
* approve task sets room INSPECTED and task APPROVED
* reject task requires reason
* manual room cleaning status update creates status log
* issue report success
* issue resolve success
* dashboard counts

E2E tests should cover at least:

* unauthorized user rejected
* user without permission rejected
* supervisor can create/assign task
* attendant can see assigned task
* attendant can start assigned task
* attendant can complete assigned task
* supervisor can approve task
* room becomes INSPECTED after approval
* checkout creates housekeeping task
* issue can be reported and resolved

Use existing auth/stay/test helpers if available.

---

11. Documentation

---

Add:

```txt
docs/housekeeping-module.md
```

Include:

* purpose of housekeeping module
* relationship between checkout and housekeeping
* task lifecycle
* room cleaning statuses
* supervisor vs attendant permissions
* assigned-only rule
* issue reporting
* dashboard fields
* intentional limitations

Intentional limitations to document:

* no mobile app yet
* no automatic maintenance ticket creation yet
* no inventory/linen usage deduction yet
* no advanced scheduling/shift optimization yet

Update README if needed.
Update tree.md after source-controlled structure changes.

---

12. Definition of done

---

This task is complete only when:

* Prisma models/enums are added.
* Migration is created.
* Prisma client generates.
* Housekeeping task API works.
* Assigned task workflow works.
* Task assignment/reassignment works.
* Task start/complete workflow works.
* Inspection/approval/rejection workflow works.
* Room cleaning status is updated correctly.
* Checkout automatically creates housekeeping task.
* Duplicate checkout cleaning task is prevented.
* Housekeeping issue API works.
* Dashboard/productivity endpoints work.
* RoomStatusLog entries are created for room cleaning changes.
* Audit logs are created for sensitive housekeeping actions.
* All endpoints are protected with JwtAuthGuard + PermissionsGuard where appropriate.
* Assigned-only rules are enforced in service/repository logic.
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
