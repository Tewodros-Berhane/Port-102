# Port-102 Coding Agent Prompt — Build Front Desk Stay Lifecycle

We are continuing the Port-102 Hotel Operating System backend.

Work only inside apps/backend unless root-level tree.md or docs must be updated.

Read and strictly follow apps/backend/AGENTS.md before making changes.

Important project rules:
- Use the Nest CLI whenever generating NestJS framework files.
- Follow Controller → Service → Repository → PrismaService architecture.
- Do not put Prisma queries in controllers.
- Use DTOs with class-validator and Swagger decorators.
- Add/update unit and e2e tests where needed.
- Update tree.md if source-controlled files/folders change.
- Do not make broad unrelated refactors.

Context:
The backend has completed:
- single-hotel auth/RBAC
- users, roles, permissions, employees, guests, approvals, audit logs
- floors, room types, room amenities, rooms, room status, physical availability
- reservations, reservation rooms, date-based availability, booking calendar

Current limitations intentionally left from the previous stage:
- no check-in/check-out yet
- no folios/invoices/payments/deposits yet
- no housekeeping task creation yet
- no advanced rate plans/channel inventory/overbooking controls yet

Task:
Implement the next hotel operations module:

Front Desk Stay Lifecycle

This stage should implement:
1. Check-in
2. Active stays
3. Room assignment during check-in
4. Room move during stay
5. Stay extension
6. Checkout
7. Front desk dashboard/read endpoints
8. Arrival/departure/in-house views

Do NOT implement full billing/folios/payments yet.
Do NOT implement housekeeping task automation yet.
Do NOT implement POS yet.
Do NOT implement inventory yet.

However, this module must be designed so that folios/payments and housekeeping can hook into it later.

----------------------------------------
1. Generate NestJS module using Nest CLI
----------------------------------------

Use Nest CLI where applicable.

Generate/complete the stays module if it is still a placeholder:

```bash
nest g module modules/stays
nest g controller modules/stays
nest g service modules/stays
````

If a front-desk module is preferred for dashboard-only endpoints, generate it too:

```bash
nest g module modules/front-desk
nest g controller modules/front-desk
nest g service modules/front-desk
```

But do not overcomplicate the structure.

Recommended:

* Use `stays` for check-in, checkout, active stays, room moves, extensions.
* Use `front-desk` only if dashboard/read aggregation becomes cleaner.

Manual files are allowed for:

* DTOs
* repositories
* constants/enums
* tests
* helper types

---

2. Prisma schema design

---

Add stay lifecycle models and enums.

Recommended enums:

```prisma
enum StayStatus {
  ACTIVE
  CHECKED_OUT
}

enum StayRoomAssignmentStatus {
  ACTIVE
  RELEASED
}
```

Recommended models:

```prisma
model Stay {
  id                Int        @id @default(autoincrement())
  stayNumber        String     @unique
  reservationId     Int        @unique
  guestId           Int
  status            StayStatus @default(ACTIVE)

  checkedInAt       DateTime   @default(now())
  expectedCheckOutDate DateTime
  checkedOutAt      DateTime?

  checkedInByUserId Int?
  checkedOutByUserId Int?

  notes             String?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  reservation       Reservation @relation(fields: [reservationId], references: [id], onDelete: Restrict)
  guest             Guest       @relation(fields: [guestId], references: [id], onDelete: Restrict)
  checkedInBy       User?       @relation("StayCheckedInBy", fields: [checkedInByUserId], references: [id], onDelete: SetNull)
  checkedOutBy      User?       @relation("StayCheckedOutBy", fields: [checkedOutByUserId], references: [id], onDelete: SetNull)

  roomAssignments   StayRoomAssignment[]

  @@index([guestId])
  @@index([status])
  @@index([checkedInAt])
  @@index([expectedCheckOutDate])
  @@map("stays")
}

model StayRoomAssignment {
  id                 Int                      @id @default(autoincrement())
  stayId             Int
  roomId             Int
  reservationRoomId  Int?
  status             StayRoomAssignmentStatus @default(ACTIVE)

  assignedAt         DateTime                 @default(now())
  releasedAt         DateTime?
  assignedByUserId   Int?
  releasedByUserId   Int?
  reason             String?

  stay               Stay                     @relation(fields: [stayId], references: [id], onDelete: Cascade)
  room               Room                     @relation(fields: [roomId], references: [id], onDelete: Restrict)
  reservationRoom    ReservationRoom?         @relation(fields: [reservationRoomId], references: [id], onDelete: SetNull)
  assignedBy         User?                    @relation("StayRoomAssignedBy", fields: [assignedByUserId], references: [id], onDelete: SetNull)
  releasedBy         User?                    @relation("StayRoomReleasedBy", fields: [releasedByUserId], references: [id], onDelete: SetNull)

  @@index([stayId])
  @@index([roomId])
  @@index([reservationRoomId])
  @@index([status])
  @@map("stay_room_assignments")
}
```

Also update existing relations if required:

* `Reservation` should have optional `stay` relation.
* `Guest` should have `stays` relation.
* `Room` should have `stayAssignments` relation.
* `User` should have relation fields for check-in/check-out and room assignment actions.
* `ReservationRoom` should have optional stay assignment relation.

Important:

* Do not add hotelId.
* Do not add HotelUser.
* Do not add multi-hotel logic.
* Keep Stay separate from Reservation.

Why separate Stay from Reservation:

* Reservation is the booking intent.
* Stay is the actual in-house lifecycle.
* A confirmed reservation becomes an active stay at check-in.
* A stay becomes checked out at checkout.

---

3. Permission usage

---

Use existing seeded permissions:

Front desk and reservations:

* check_in.execute
* check_out.execute
* room_assignment.create
* room_assignment.update
* room_move.execute
* stay_extension.execute
* in_house_guests.read
* arrivals.read
* departures.read
* reservations.read
* reservations.update

Rooms:

* rooms.read
* rooms.status.read
* rooms.status.update
* rooms.availability.read

Guests:

* guests.read

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

Check-in and checkout:

```txt
POST /reservations/:id/check-in
POST /stays/:id/check-out
```

Active stays:

```txt
GET /stays
GET /stays/:id
GET /stays/active/list
GET /stays/in-house/guests
```

Room assignment and room movement:

```txt
POST  /stays/:id/rooms
PATCH /stays/:id/rooms/:assignmentId
POST  /stays/:id/room-move
```

Stay extension:

```txt
PATCH /stays/:id/extend
```

Front desk read endpoints:

```txt
GET /front-desk/dashboard
GET /front-desk/arrivals
GET /front-desk/departures
GET /front-desk/in-house
```

If you decide not to create a separate front-desk module, these read endpoints may live under `/stays/front-desk/*` or similar, but `/front-desk/*` is preferred for clarity.

Important route ordering:
Static routes like `/stays/active/list` and `/stays/in-house/guests` must be declared before `/:id` routes if needed to avoid route conflicts.

---

5. DTO requirements

---

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

Required DTOs:

* CheckInReservationDto
* CheckOutStayDto
* GetStaysQueryDto
* AssignStayRoomDto
* UpdateStayRoomAssignmentDto
* MoveRoomDto
* ExtendStayDto
* FrontDeskArrivalsQueryDto
* FrontDeskDeparturesQueryDto
* FrontDeskInHouseQueryDto

CheckInReservationDto should support:

* optional roomAssignments array
* optional notes

Each room assignment item should support:

* reservationRoomId
* roomId

CheckOutStayDto should support:

* notes
* forceCheckout boolean only if needed and permission-protected later

MoveRoomDto should support:

* fromAssignmentId
* toRoomId
* reason

ExtendStayDto should support:

* newExpectedCheckOutDate
* reason

Query DTOs should support:

* page
* limit
* search
* date filters where useful
* status filters

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
stays/repositories/stays.repository.ts
stays/repositories/stay-room-assignments.repository.ts
```

If creating front-desk module:

```txt
front-desk/repositories/front-desk.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

7. Core business rules

---

Implement these business rules.

Check-in:

* Reservation must exist.
* Reservation status must be CONFIRMED.
* Reservation must not already have a stay.
* Guest must be active.
* Reservation check-in/check-out dates must be valid.
* For each reservation room, assign a physical room.
* If reservation room already has roomId, use it unless override is provided.
* If override roomId is provided, validate it.
* Assigned room must:

  * exist
  * be active
  * match reservationRoom.roomTypeId
  * have occupancyStatus = VACANT
  * have maintenanceStatus = AVAILABLE
  * have cleaningStatus = CLEAN or INSPECTED
  * not be reserved by another active reservation for the reservation date range
* Create Stay.
* Create StayRoomAssignment records.
* Update Reservation.status = CHECKED_IN.
* Update ReservationRoom.status = CHECKED_IN.
* Update Room.occupancyStatus = OCCUPIED.
* Create RoomStatusLog entries for occupancy changes.
* Create audit log.
* Use a Prisma transaction.

Checkout:

* Stay must exist.
* Stay must be ACTIVE.
* All active room assignments should be released.
* Update Stay.status = CHECKED_OUT.
* Set checkedOutAt and checkedOutByUserId.
* Update Reservation.status = CHECKED_OUT.
* Update ReservationRoom.status = CHECKED_OUT.
* Update assigned Room.occupancyStatus = VACANT.
* Update assigned Room.cleaningStatus = DIRTY.
* Create RoomStatusLog entries for occupancy and cleaning changes.
* Create audit log.
* Use a Prisma transaction.
* Do not create housekeeping tasks yet, but leave clear TODO/event hook point for future housekeeping automation.

Room move:

* Stay must be ACTIVE.
* Current assignment must be ACTIVE.
* Destination room must exist, active, vacant, clean/inspected, maintenance available.
* Destination room must not be reserved by another active reservation for the stay date range.
* Release old assignment.
* Create new assignment.
* Old room becomes VACANT + DIRTY unless business logic says otherwise.
* New room becomes OCCUPIED.
* Create status logs and audit logs.
* Use transaction.

Stay extension:

* Stay must be ACTIVE.
* New expected checkout date must be after current expected checkout date.
* Check assigned rooms are available for the extended date range.
* If rooms are reserved by another reservation during extension period, reject.
* Update Stay.expectedCheckOutDate.
* Update Reservation.checkOutDate.
* Create audit log.
* Use transaction.

Adding room to active stay:

* Stay must be ACTIVE.
* Room must be available.
* Room type must match reservation room if linked.
* Create assignment.
* Set room occupied.
* Create status/audit logs.

Updating room assignment:

* Avoid unsafe update if assignment is released.
* If changing room, validate destination availability.
* Prefer using room-move endpoint for room changes.

Front desk dashboard:
Should return basic operational counts:

* arrivalsToday
* departuresToday
* inHouseGuests
* activeStays
* vacantRooms
* occupiedRooms
* dirtyRooms
* outOfOrderRooms
* availablePhysicalRooms

Dates should use server timezone/configured property timezone if existing config supports it. Otherwise use date range query inputs and document the limitation.

---

8. Audit logging

---

Use existing AuditLogsService.

Audit these actions:

* guest checked in
* guest checked out
* stay room assigned
* room moved
* stay extended
* room assignment released

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

* successful check-in
* check-in rejects non-confirmed reservation
* check-in rejects already checked-in reservation
* check-in rejects unavailable/dirty/out-of-order room
* check-in updates reservation, reservation room, stay, room status
* successful checkout
* checkout rejects inactive/already checked-out stay
* checkout marks room vacant dirty
* room move success
* room move rejects unavailable destination room
* stay extension success
* stay extension rejects overlapping future reservation
* dashboard counts

E2E tests should cover at least:

* unauthorized user rejected
* user without permission rejected
* authorized front desk can check in confirmed reservation
* authorized front desk can list in-house guests
* authorized front desk can move room
* authorized front desk can extend stay
* authorized front desk can check out stay
* checkout changes room to vacant dirty

Use existing auth test helpers if available.

---

11. Documentation

---

Add:

```txt
docs/stays-front-desk-module.md
```

Include:

* purpose of stay lifecycle module
* difference between Reservation and Stay
* main entities
* main permissions
* check-in flow
* checkout flow
* room move flow
* stay extension flow
* front desk dashboard fields
* intentional limitations

Intentional limitations to document:

* no folio/payment settlement yet
* no automatic housekeeping task creation yet
* no key/card integration
* no ID document upload requirement yet

Update README if needed.
Update tree.md after source-controlled structure changes.

---

12. Definition of done

---

This task is complete only when:

* Prisma models/enums are added.
* Migration is created.
* Prisma client generates.
* Check-in endpoint works.
* Checkout endpoint works.
* Active stays list works.
* In-house guests endpoint works.
* Room assignment works.
* Room move works.
* Stay extension works.
* Front desk dashboard works.
* Check-in updates reservation, reservation rooms, stay, room assignments, and room occupancy status.
* Checkout updates stay, reservation, reservation rooms, room occupancy status, and room cleaning status.
* Room status logs are created.
* Audit logs are created for sensitive stay actions.
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
