# Port-102 Coding Agent Prompt — Build Reservations and Date-Based Availability Foundation

Use this prompt for the next backend implementation step.

---

````txt
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
- single-hotel auth/RBAC refactor
- users, roles, permissions, employees, guests, approvals, audit logs
- floors, room types, room amenities, rooms, room status, and physical availability summary

Important architecture decisions:
- This is a single-hotel system, not SaaS.
- Do not add hotelId.
- Do not add HotelUser.
- Do not add CurrentHotel or HotelAccessGuard.
- User has direct roleId and optional departmentId.
- JWT contains: sub, email, roleKey, roleId, departmentId, tokenVersion.
- Use JwtAuthGuard + PermissionsGuard for protected routes.

Task:
Implement the next hotel operations foundation module:

1. Reservations
2. Reservation rooms
3. Date-based availability
4. Booking calendar
5. Reservation status lifecycle up to cancellation/no-show/confirmation

Do not implement full check-in/check-out yet.
Do not implement folios/payments yet.
Do not implement housekeeping task creation yet.
This stage should prepare the reservation foundation that those modules will use later.

----------------------------------------
1. Generate NestJS module using Nest CLI
----------------------------------------

Use Nest CLI where applicable.

If the reservations folder only exists as a placeholder, generate the module/controller/service properly.

Example:

```bash
nest g module modules/reservations
nest g controller modules/reservations
nest g service modules/reservations
````

Manual files are allowed for:

* DTOs
* repositories
* constants/enums
* tests
* helper types

---

2. Prisma schema design

---

Add reservation models and enums.

Recommended enums:

```prisma
enum ReservationStatus {
  DRAFT
  CONFIRMED
  CANCELLED
  NO_SHOW
  CHECKED_IN
  CHECKED_OUT
}

enum ReservationSource {
  WALK_IN
  PHONE
  EMAIL
  WEBSITE
  OTA
  CORPORATE
  AGENT
  OTHER
}

enum ReservationRoomStatus {
  RESERVED
  CANCELLED
  CHECKED_IN
  CHECKED_OUT
}
```

Recommended models:

```prisma
model Reservation {
  id                 Int               @id @default(autoincrement())
  reservationNumber  String            @unique
  guestId            Int
  status             ReservationStatus @default(CONFIRMED)
  source             ReservationSource @default(WALK_IN)

  checkInDate        DateTime
  checkOutDate       DateTime
  adults             Int               @default(1)
  children           Int               @default(0)

  specialRequests    String?
  internalNotes      String?
  cancellationReason String?
  cancelledAt        DateTime?
  noShowAt           DateTime?

  createdByUserId    Int?
  cancelledByUserId  Int?

  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  guest              Guest             @relation(fields: [guestId], references: [id], onDelete: Restrict)
  createdBy          User?             @relation("ReservationCreator", fields: [createdByUserId], references: [id], onDelete: SetNull)
  cancelledBy        User?             @relation("ReservationCanceller", fields: [cancelledByUserId], references: [id], onDelete: SetNull)
  rooms              ReservationRoom[]

  @@index([guestId])
  @@index([status])
  @@index([checkInDate, checkOutDate])
  @@index([source])
  @@map("reservations")
}

model ReservationRoom {
  id            Int                   @id @default(autoincrement())
  reservationId Int
  roomTypeId    Int
  roomId        Int?
  status        ReservationRoomStatus @default(RESERVED)
  rate          Decimal?              @db.Decimal(12, 2)
  notes         String?
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  reservation   Reservation           @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  roomType      RoomType              @relation(fields: [roomTypeId], references: [id], onDelete: Restrict)
  room          Room?                 @relation(fields: [roomId], references: [id], onDelete: SetNull)

  @@index([reservationId])
  @@index([roomTypeId])
  @@index([roomId])
  @@index([status])
  @@map("reservation_rooms")
}
```

Important design decisions:

* A reservation belongs to one guest.
* A reservation can include one or more reserved rooms.
* ReservationRoom must always have a roomTypeId.
* ReservationRoom may optionally have a specific roomId.
* This allows hotels to reserve by room type first, then assign an exact room later.
* Do not add hotelId.
* Do not reintroduce multi-hotel logic.

Also update existing User, Guest, RoomType, and Room relations if Prisma requires relation fields.

---

3. Date-based availability logic

---

The previous room availability summary is only physical current availability.

Now add reservation-date availability.

A room is available for a date range only if:

* room.isActive = true
* room.maintenanceStatus = AVAILABLE
* room is not already reserved/checked in for overlapping dates
* reservation status is not CANCELLED and not NO_SHOW
* reservation room status is not CANCELLED

Date overlap rule:

```txt
existing.checkInDate < requestedCheckOutDate
AND existing.checkOutDate > requestedCheckInDate
```

This allows back-to-back stays:

```txt
Guest A checks out on June 10
Guest B checks in on June 10
```

Availability should support:

* availability by room type
* available specific rooms for date range
* total rooms, reserved rooms, available rooms

---

4. Permissions to use

---

Use already seeded permissions:

Reservations:

* reservations.create
* reservations.read
* reservations.update
* reservations.cancel
* reservations.no_show.mark
* reservations.confirm
* reservations.deposit.record

Availability/calendar:

* availability.read
* booking_calendar.read

Rooms:

* rooms.availability.read
* rooms.read

Guest:

* guests.read
* guests.create if creating guest inline is supported

Every protected route should normally use:

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('resource.action')
```

---

5. API endpoints

---

Implement these endpoints.

Reservations:

```txt
POST   /reservations
GET    /reservations
GET    /reservations/:id
PATCH  /reservations/:id
PATCH  /reservations/:id/confirm
PATCH  /reservations/:id/cancel
PATCH  /reservations/:id/no-show
POST   /reservations/:id/rooms
PATCH  /reservations/:id/rooms/:reservationRoomId
DELETE /reservations/:id/rooms/:reservationRoomId
```

Availability:

```txt
GET /reservations/availability/search
GET /reservations/availability/by-room-type
GET /reservations/availability/rooms
GET /reservations/calendar
```

Important route ordering:
Static routes like `/reservations/availability/search` and `/reservations/calendar` must be declared before `/:id` routes if needed to avoid route conflicts.

---

6. DTO requirements

---

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

Required DTOs:

* CreateReservationDto
* UpdateReservationDto
* GetReservationsQueryDto
* CancelReservationDto
* MarkNoShowDto
* AddReservationRoomDto
* UpdateReservationRoomDto
* AvailabilitySearchQueryDto
* BookingCalendarQueryDto

CreateReservationDto should support:

* guestId
* checkInDate
* checkOutDate
* adults
* children
* source
* specialRequests
* internalNotes
* rooms array

Each room item should include:

* roomTypeId
* optional roomId
* optional rate
* optional notes

Validation rules:

* checkOutDate must be after checkInDate.
* adults must be at least 1.
* children must be 0 or more.
* reservation must include at least one room.
* roomTypeId must exist and be active.
* roomId, if provided, must exist, be active, and belong to the selected room type.

Query DTOs must support pagination where needed:

* page
* limit
* search
* status
* source
* guestId
* checkInFrom
* checkInTo
* checkOutFrom
* checkOutTo

Use maximum limit 100.

---

7. Repository/service architecture

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
reservations/repositories/reservations.repository.ts
reservations/repositories/reservation-rooms.repository.ts
reservations/repositories/reservation-availability.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

8. Business rules

---

Implement these business rules:

Reservation creation:

* Guest must exist and be active.
* Check-out date must be after check-in date.
* Reservation must have at least one room.
* Room type must exist and be active.
* If specific roomId is selected:

  * room must exist and be active
  * room must match the selected room type
  * room must not be out of order/out of service/under maintenance
  * room must not be already reserved for overlapping dates
* If no roomId is selected:

  * there must be at least one available room for that room type for the requested date range.
* Generate unique reservationNumber.
* Use a Prisma transaction when creating reservation + reservation rooms.
* Create audit log for reservation creation.

Reservation update:

* Cannot update cancelled reservation except limited fields if explicitly allowed.
* Cannot update checked-out reservation.
* If dates or rooms change, re-check availability.
* Create audit log for important changes.

Reservation cancellation:

* Cannot cancel checked-out reservation.
* Record cancellationReason.
* Set status = CANCELLED.
* Set cancelledAt.
* Set cancelledByUserId.
* Set reservation room statuses = CANCELLED.
* Create audit log.

No-show:

* Can mark confirmed reservation as NO_SHOW.
* Set noShowAt.
* Set reservation room statuses = CANCELLED or leave as RESERVED depending on chosen design; prefer CANCELLED to release inventory.
* Create audit log.

Confirm:

* DRAFT reservation can become CONFIRMED.
* CONFIRMED reservation should be idempotent or return already confirmed.
* Create audit log if status changes.

Reservation rooms:

* Adding a room must check availability.
* Updating room assignment must check availability.
* Removing a reservation room should not leave reservation with zero rooms unless cancellation is intended; block removing the last room from an active reservation.

Date-based availability:

* Cancelled/no-show reservations should not block availability.
* Back-to-back checkout/check-in on same date should be allowed.
* Out-of-order rooms should not be available.
* Inactive rooms should not be available.

---

9. Audit logging

---

Use existing AuditLogsService.

Audit these actions:

* reservation created
* reservation updated
* reservation confirmed
* reservation cancelled
* reservation marked no-show
* reservation room added
* reservation room updated
* reservation room removed

Do not create audit logs directly in controllers.

---

10. Swagger requirements

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

11. Tests

---

Add/update unit tests and e2e tests.

Unit tests should cover:

* reservation create success
* invalid date range rejection
* inactive guest rejection
* inactive room type rejection
* selected room type mismatch rejection
* overlapping room reservation rejection
* back-to-back reservation allowed
* cancellation rules
* no-show rules
* availability calculations
* reservation room add/update/remove rules

E2E tests should cover at least:

* unauthorized user rejected
* user without permission rejected
* authorized front desk/admin can create reservation
* list reservations with pagination
* get reservation detail
* availability search works
* overlapping booking is rejected
* back-to-back booking is allowed
* cancel reservation works
* no-show reservation works

Use existing auth test helpers if available.

---

12. Documentation

---

Add or update:

```txt
docs/reservations-module.md
```

Include:

* purpose of reservations module
* main entities
* main permissions
* reservation statuses
* date-overlap rule
* availability meaning
* key endpoints
* important limitations

Current limitation to document:

* This stage does not implement check-in/check-out.
* This stage does not implement folio/payment/deposit posting.
* Availability is based on reservations and room maintenance/active state, not advanced rate plans.

Update README if needed.
Update tree.md after source-controlled structure changes.

---

13. Definition of done

---

This task is complete only when:

* Prisma models/enums are added.
* Migration is created.
* Prisma client generates.
* Reservations API works.
* Reservation rooms API works.
* Date-based availability search works.
* Booking calendar endpoint works.
* Overlapping assigned-room reservations are blocked.
* Back-to-back reservations are allowed.
* Reservation cancellation releases availability.
* No-show releases availability.
* Audit logs are created for sensitive reservation actions.
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
