# Port-102 — Build Floors, Room Types, Rooms, Room Status, and Availability Foundation

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
The backend has completed the single-hotel auth/RBAC refactor.

Important current architecture decisions:
- This is a single-hotel system, not SaaS.
- There is no HotelUser model.
- There is no HotelAccessGuard.
- There is no activeHotel/currentHotel selection flow.
- User has direct roleId and optional departmentId.
- JWT contains: sub, email, roleKey, roleId, departmentId, tokenVersion.
- Guards now use JwtAuthGuard + PermissionsGuard or RolesGuard.
- Do not add hotelId-based tenancy back into new models.
- Hotel may remain only as singleton property profile/settings, not access control.

Task:
Implement the first real hotel operations foundation module:

1. Floors
2. Room Types
3. Room Amenities
4. Rooms
5. Room Status
6. Room Availability Read API

This module is the foundation for future reservations, check-in, checkout, housekeeping, maintenance, and reports.

Do not implement reservations yet.
Do not implement check-in/check-out yet.
Do not implement housekeeping task creation yet.
Only build the room inventory foundation.

----------------------------------------
1. Generate NestJS modules using Nest CLI
----------------------------------------

Use Nest CLI where applicable.

Generate or complete these modules if they do not already exist:

```bash
nest g module modules/floors
nest g controller modules/floors
nest g service modules/floors

nest g module modules/room-types
nest g controller modules/room-types
nest g service modules/room-types

nest g module modules/rooms
nest g controller modules/rooms
nest g service modules/rooms
````

If modules already exist as folders with .gitkeep only, convert them into proper Nest modules/controllers/services using the CLI or carefully align with existing generated patterns.

Manual files are allowed for:

* DTOs
* repositories
* constants/enums
* tests
* helper types

---

2. Prisma schema design

---

Add the room inventory models.

Recommended models:

```prisma
model Floor {
  id          Int      @id @default(autoincrement())
  number      Int?
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  rooms       Room[]

  @@unique([name])
  @@index([isActive])
  @@map("floors")
}

model RoomType {
  id             Int      @id @default(autoincrement())
  name           String
  code           String   @unique
  description    String?
  baseOccupancy  Int      @default(1)
  maxOccupancy   Int      @default(1)
  baseRate       Decimal? @db.Decimal(12, 2)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  rooms          Room[]
  amenities      RoomTypeAmenity[]

  @@index([isActive])
  @@map("room_types")
}

model RoomAmenity {
  id          Int      @id @default(autoincrement())
  name        String
  key         String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  roomTypes   RoomTypeAmenity[]

  @@index([isActive])
  @@map("room_amenities")
}

model RoomTypeAmenity {
  roomTypeId Int
  amenityId  Int
  createdAt  DateTime @default(now())

  roomType   RoomType    @relation(fields: [roomTypeId], references: [id], onDelete: Cascade)
  amenity    RoomAmenity @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  @@id([roomTypeId, amenityId])
  @@map("room_type_amenities")
}

enum RoomOccupancyStatus {
  VACANT
  OCCUPIED
}

enum RoomCleaningStatus {
  CLEAN
  DIRTY
  INSPECTED
}

enum RoomMaintenanceStatus {
  AVAILABLE
  OUT_OF_ORDER
  OUT_OF_SERVICE
  UNDER_MAINTENANCE
}

model Room {
  id                Int                   @id @default(autoincrement())
  roomNumber        String                @unique
  displayName       String?
  floorId           Int?
  roomTypeId        Int
  occupancyStatus   RoomOccupancyStatus   @default(VACANT)
  cleaningStatus    RoomCleaningStatus    @default(CLEAN)
  maintenanceStatus RoomMaintenanceStatus @default(AVAILABLE)
  notes             String?
  isActive          Boolean               @default(true)
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  floor             Floor?                @relation(fields: [floorId], references: [id], onDelete: SetNull)
  roomType          RoomType              @relation(fields: [roomTypeId], references: [id], onDelete: Restrict)

  statusLogs        RoomStatusLog[]

  @@index([floorId])
  @@index([roomTypeId])
  @@index([isActive])
  @@index([occupancyStatus])
  @@index([cleaningStatus])
  @@index([maintenanceStatus])
  @@map("rooms")
}

model RoomStatusLog {
  id          Int      @id @default(autoincrement())
  roomId      Int
  actorUserId Int?
  field       String
  oldValue    String?
  newValue    String?
  reason      String?
  createdAt   DateTime @default(now())

  room        Room  @relation(fields: [roomId], references: [id], onDelete: Cascade)
  actorUser   User? @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([roomId, createdAt])
  @@index([actorUserId])
  @@map("room_status_logs")
}
```

Important:

* Do not add hotelId.
* Do not add HotelUser references.
* Room.roomNumber must be unique in this single-hotel system.
* Keep occupancy, cleaning, and maintenance status separate.

Why separate statuses:

* Occupancy status answers: is someone staying in the room?
* Cleaning status answers: is the room clean/dirty/inspected?
* Maintenance status answers: can the room be sold/used?

---

3. Permissions to use

---

Use the already-seeded permissions.

Floors:

* floors.create
* floors.read
* floors.update
* floors.delete

Room types:

* room_types.create
* room_types.read
* room_types.update
* room_types.delete

Room amenities:

* room_amenities.create
* room_amenities.read
* room_amenities.update
* room_amenities.delete

Rooms:

* rooms.create
* rooms.read
* rooms.update
* rooms.delete
* rooms.status.read
* rooms.status.update
* rooms.out_of_order.mark
* rooms.out_of_order.clear
* rooms.availability.read

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

Floors:

```txt
POST   /floors
GET    /floors
GET    /floors/:id
PATCH  /floors/:id
DELETE /floors/:id
```

Room Types:

```txt
POST   /room-types
GET    /room-types
GET    /room-types/:id
PATCH  /room-types/:id
DELETE /room-types/:id
POST   /room-types/:id/amenities
DELETE /room-types/:id/amenities/:amenityId
```

Room Amenities:

```txt
POST   /room-amenities
GET    /room-amenities
GET    /room-amenities/:id
PATCH  /room-amenities/:id
DELETE /room-amenities/:id
```

Rooms:

```txt
POST   /rooms
GET    /rooms
GET    /rooms/:id
PATCH  /rooms/:id
DELETE /rooms/:id
PATCH  /rooms/:id/status
PATCH  /rooms/:id/mark-out-of-order
PATCH  /rooms/:id/clear-out-of-order
GET    /rooms/availability/summary
GET    /rooms/status/summary
GET    /rooms/:id/status-logs
```

Important route ordering:
Define static routes like `/rooms/availability/summary` and `/rooms/status/summary` before `/:id` routes if needed to avoid route conflicts.

---

5. DTO requirements

---

Create DTOs with class-validator, class-transformer where needed, and Swagger decorators.

Required DTOs:

Floors:

* CreateFloorDto
* UpdateFloorDto
* GetFloorsQueryDto

Room Types:

* CreateRoomTypeDto
* UpdateRoomTypeDto
* GetRoomTypesQueryDto
* AssignRoomTypeAmenitiesDto

Room Amenities:

* CreateRoomAmenityDto
* UpdateRoomAmenityDto
* GetRoomAmenitiesQueryDto

Rooms:

* CreateRoomDto
* UpdateRoomDto
* GetRoomsQueryDto
* UpdateRoomStatusDto
* MarkRoomOutOfOrderDto
* ClearRoomOutOfOrderDto

Query DTOs must support pagination where list size can grow:

* page
* limit
* search
* isActive

Rooms query should support filters:

* roomTypeId
* floorId
* occupancyStatus
* cleaningStatus
* maintenanceStatus
* isActive
* search

Use maximum limit 100.

---

6. Repository/service architecture

---

Each module must follow:

Controller
↓
Service
↓
Repository
↓
PrismaService

Required repositories:

```txt
floors/repositories/floors.repository.ts
room-types/repositories/room-types.repository.ts
room-types/repositories/room-amenities.repository.ts
rooms/repositories/rooms.repository.ts
```

Controllers must not call Prisma directly.
Services must contain business rules.
Repositories must contain database queries.

---

7. Business rules

---

Implement these business rules:

Floors:

* Floor name must be unique.
* Cannot delete a floor if active rooms are assigned to it; either block deletion or soft-delete using isActive=false.
* Prefer soft-delete by setting isActive=false.

Room Types:

* Room type code must be unique.
* maxOccupancy must be greater than or equal to baseOccupancy.
* baseOccupancy must be at least 1.
* Cannot delete a room type if active rooms use it; prefer soft-delete.

Room Amenities:

* Amenity key must be unique.
* Cannot duplicate amenity assignment to same room type.

Rooms:

* Room number must be unique.
* Room type must exist and be active before assigning it to room.
* Floor must exist and be active if provided.
* Cannot delete a room that has operational history later; for now soft-delete with isActive=false.
* A room is sellable/available only if:

  * isActive = true
  * occupancyStatus = VACANT
  * cleaningStatus = CLEAN or INSPECTED
  * maintenanceStatus = AVAILABLE
* `mark-out-of-order` should set maintenanceStatus = OUT_OF_ORDER.
* `clear-out-of-order` should set maintenanceStatus = AVAILABLE.
* Every status change should create a RoomStatusLog.
* Important status changes should also create an AuditLog.

Do not implement booking availability by date yet because reservations are not built.
For now, availability means current physical room availability.

---

8. Audit logging

---

Use AuditLogsService for sensitive actions.

Audit these actions:

* floor created
* floor updated
* floor deactivated/deleted
* room type created
* room type updated
* room type deactivated/deleted
* room created
* room updated
* room deactivated/deleted
* room status updated
* room marked out of order
* room cleared out of order

Do not call Prisma audit log creation randomly from controllers.
Use existing AuditLogsService.

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

* service create/update/delete logic
* duplicate room number handling
* duplicate floor name handling
* duplicate room type code handling
* invalid occupancy rule
* room type/floor existence checks
* status update logging
* permission-protected controller behavior where practical

E2E tests should cover at least:

* unauthorized user rejected
* user without permission rejected
* authorized hotel admin can create floor
* authorized hotel admin can create room type
* authorized hotel admin can create room
* room list pagination works
* room status update works
* mark room out of order works
* clear out of order works

Use existing auth test helpers if available.

---

11. Documentation

---

Update README or docs if needed.

Add or update a short module doc if the project has docs:

```txt
docs/rooms-module.md
```

Include:

* purpose of the room inventory module
* main entities
* main permissions
* status meaning
* availability meaning
* key endpoints

Update tree.md after source-controlled structure changes.

---

12. Definition of done

---

This task is complete only when:

* Prisma models/enums are added.
* Migration is created.
* Prisma client generates.
* Floors API works.
* Room Types API works.
* Room Amenities API works.
* Rooms API works.
* Room status update works.
* Room status logs are created.
* Audit logs are created for sensitive room setup/status actions.
* Availability summary works for current physical availability.
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
