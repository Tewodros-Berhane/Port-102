# AGENTS.md

## Project Context

This repository is a **Hotel Operating System backend** built with:

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication
- Role-based authorization
- Swagger / OpenAPI documentation
- Jest unit tests
- Supertest E2E tests

The backend is the central API for hotel operations, including but not limited to:

- Authentication and user management
- Roles and permissions
- Guest management
- Room and floor management
- Reservations and bookings
- Check-in and check-out
- Housekeeping
- Maintenance
- Employee/staff management
- Inventory/store management
- Cafe/restaurant operations
- Billing, invoices, and payments
- Reports and dashboards
- Audit logs and activity history

This file defines the rules that all coding agents must follow when adding, modifying, or refactoring code.

---

## 1. Core Engineering Rule

Every implementation must be:

- Cleanly architected
- Type-safe
- Tested
- Documented with Swagger/OpenAPI
- Secure by default
- Easy to maintain
- Consistent with existing project conventions

Do not add quick hacks, unstructured logic, or code that bypasses the architecture.

---

## 2. Architecture Style

Use a clean layered architecture.

The default flow must be:

```txt
Controller
↓
Service / Use Case
↓
Repository
↓
PrismaService
↓
PostgreSQL
```

Each layer has a clear responsibility.

### Controller Responsibilities

Controllers handle HTTP only.

Controllers may:

- Define routes
- Receive request params, query, body, uploaded files, and current user
- Apply guards, interceptors, pipes, and Swagger decorators
- Call service methods
- Return service results

Controllers must not:

- Contain business logic
- Call Prisma directly
- Build complex database queries
- Perform authorization logic beyond applying guards/decorators
- Hash passwords
- Generate tokens
- Send emails directly
- Perform calculations that belong to services

Example:

```ts
@Post()
@ApiOperation({ summary: 'Create a room' })
create(@Body() createRoomDto: CreateRoomDto) {
  return this.roomsService.create(createRoomDto);
}
```

### Service Responsibilities

Services contain business logic and orchestration.

Services may:

- Enforce business rules
- Check ownership rules
- Throw business exceptions
- Call repositories
- Coordinate multiple repositories
- Call domain helpers
- Call external services through injected providers

Services must not:

- Receive raw Express request/response objects
- Know HTTP-specific details unless absolutely necessary
- Return password hashes or sensitive data
- Contain direct Prisma calls when a repository exists for that domain

Example:

```ts
async create(createRoomDto: CreateRoomDto) {
  const roomExists = await this.roomsRepository.findByNumber(createRoomDto.roomNumber);

  if (roomExists) {
    throw new ConflictException('Room number already exists');
  }

  return this.roomsRepository.create(createRoomDto);
}
```

### Repository Responsibilities

Repositories handle database access.

Repositories may:

- Call Prisma
- Build Prisma `where`, `select`, `include`, `orderBy`, `skip`, and `take` objects
- Encapsulate repeated queries
- Return database records or selected projections

Repositories must not:

- Handle HTTP
- Read JWT tokens
- Apply controller decorators
- Perform complex business decisions
- Throw business exceptions unless the repository itself is enforcing a database-specific invariant

Example:

```ts
@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByNumber(roomNumber: string) {
    return this.prisma.room.findUnique({
      where: { roomNumber },
    });
  }
}
```

---

## 3. Module Structure

Each domain module should follow this structure where applicable:

```txt
src/<domain>/
├── dto/
│   ├── create-<domain>.dto.ts
│   ├── update-<domain>.dto.ts
│   └── get-<domain>-query.dto.ts
├── repositories/
│   └── <domain>.repository.ts
├── entities/ or types/
│   └── optional domain types
├── <domain>.controller.ts
├── <domain>.service.ts
├── <domain>.module.ts
└── tests if colocated
```

Example:

```txt
src/rooms/
├── dto/
│   ├── create-room.dto.ts
│   ├── update-room.dto.ts
│   └── get-rooms-query.dto.ts
├── repositories/
│   └── rooms.repository.ts
├── rooms.controller.ts
├── rooms.service.ts
└── rooms.module.ts
```

Large or complex domains may use a more advanced structure:

```txt
src/reservations/
├── application/
├── domain/
├── infrastructure/
├── presentation/
├── dto/
└── reservations.module.ts
```

Do not introduce advanced folder structures unless the module complexity justifies it.

---

## 4. Hotel Domain Boundaries

Keep hotel modules separated by domain.

Recommended modules:

```txt
auth
users
roles
permissions
guests
rooms
room-types
floors
reservations
check-in
check-out
housekeeping
maintenance
employees
departments
inventory
suppliers
restaurant
orders
billing
payments
invoices
reports
audit-logs
notifications
files
settings
```

Do not put everything into a single large `hotel.service.ts`.

Prefer domain-specific modules:

```txt
RoomsModule
ReservationsModule
HousekeepingModule
BillingModule
InventoryModule
```

---

## 5. DTO Rules

Every endpoint that accepts body data must use a DTO.

Do not accept raw untyped objects.

Bad:

```ts
create(@Body() body: any) {}
```

Good:

```ts
create(@Body() createRoomDto: CreateRoomDto) {}
```

DTOs must use:

- `class-validator`
- `class-transformer` where needed
- Swagger decorators

Example:

```ts
export class CreateRoomDto {
  @ApiProperty({ example: 'A-101' })
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  floorId: number;

  @ApiPropertyOptional({ enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
```

### Create and Update DTOs

Use separate DTOs for create and update.

```txt
CreateRoomDto
UpdateRoomDto
```

For update DTOs, all fields should normally be optional.

You may use `PartialType` when appropriate.

Example:

```ts
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
```

### Query DTOs

Every list endpoint must use a query DTO.

Example:

```ts
@Get()
findAll(@Query() queryDto: GetRoomsQueryDto) {
  return this.roomsService.findAll(queryDto);
}
```

Query DTOs should include pagination where appropriate:

```ts
page?: number = 1;
limit?: number = 10;
search?: string;
sortBy?: string;
sortOrder?: 'asc' | 'desc';
```

Use limits to prevent large unbounded queries.

Default max limit: `100`.

---

## 6. Validation Rules

Global validation must remain enabled.

Required global pipe:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

Do not disable:

- `whitelist`
- `forbidNonWhitelisted`
- `transform`

All request inputs must be validated through:

- DTO validation
- Built-in pipes
- Custom pipes when necessary

Use built-in pipes where appropriate:

```ts
@Param('id', ParseIntPipe) id: number
```

Never trust client input.

---

## 7. Swagger / OpenAPI Rules

Every API endpoint must be documented with Swagger/OpenAPI.

Minimum controller-level decorators:

```ts
@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {}
```

Protected controllers or routes must include:

```ts
@ApiBearerAuth()
```

Every endpoint must include:

```ts
@ApiOperation({ summary: 'Clear description of what this endpoint does' })
```

Use response decorators:

```ts
@ApiOkResponse()
@ApiCreatedResponse()
@ApiBadRequestResponse()
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
@ApiConflictResponse()
```

Every DTO property must include:

```ts
@ApiProperty()
```

or:

```ts
@ApiPropertyOptional()
```

Example:

```ts
@ApiProperty({
  example: 'Deluxe King Room',
  description: 'Human-readable room type name',
})
@IsString()
@IsNotEmpty()
name: string;
```

### File Upload Endpoints

File upload endpoints must document multipart form data.

Example:

```ts
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
    },
  },
})
```

### Swagger Must Stay Usable

After adding endpoints, ensure the Swagger UI can:

- Show the route
- Show request body schema
- Show query parameters
- Accept JWT token where needed
- Upload files where needed
- Display meaningful response descriptions

---

## 8. Authentication Rules

Authentication must be centralized in `AuthModule`.

Use JWT access tokens unless the project explicitly switches strategy.

Rules:

- Never store plain passwords
- Always hash passwords using a secure hashing algorithm
- Never return `passwordHash` in API responses
- Never place JWT secrets directly in source code
- Use environment variables for secrets
- Use `AuthGuard` for protected routes
- Use `@CurrentUser()` or equivalent decorator instead of manually reading `req.user`

Bad:

```ts
@Get('me')
me(@Req() req) {
  return req.user;
}
```

Good:

```ts
@Get('me')
me(@CurrentUser() user: JwtPayload) {
  return user;
}
```

---

## 9. Authorization and Roles Rules

Use guards for access control.

Authentication answers:

```txt
Who are you?
```

Authorization answers:

```txt
What are you allowed to do?
```

Use:

```ts
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
```

Do not place role checks randomly inside controllers.

Bad:

```ts
if (user.role !== 'ADMIN') {
  throw new ForbiddenException();
}
```

Better:

```ts
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
```

Business-level ownership checks may remain in services.

Example:

```ts
const reservation = await this.reservationsRepository.findOne(id);

if (reservation.hotelId !== currentUser.hotelId) {
  throw new ForbiddenException('You cannot access this reservation');
}
```

### Hotel-Specific Authorization

The backend must support multi-role access.

Example roles may include:

```txt
SUPER_ADMIN
HOTEL_ADMIN
MANAGER
RECEPTIONIST
HOUSEKEEPING_STAFF
MAINTENANCE_STAFF
ACCOUNTANT
STORE_MANAGER
RESTAURANT_STAFF
GUEST
```

Do not hardcode role strings throughout the codebase.

Use enums/constants.

---

## 10. Multi-Tenancy / Hotel Isolation Rules

If the system supports multiple hotels, every hotel-owned resource must be scoped by `hotelId`.

Examples:

```txt
rooms.hotelId
reservations.hotelId
employees.hotelId
inventoryItems.hotelId
invoices.hotelId
```

Services must prevent users from accessing data from another hotel.

Bad:

```ts
return this.prisma.room.findUnique({
  where: { id },
});
```

Good:

```ts
return this.roomsRepository.findFirst({
  id,
  hotelId: currentUser.hotelId,
});
```

Never trust `hotelId` from the request body if it can be derived from the authenticated user.

---

## 11. Prisma Rules

Use Prisma through `PrismaService`.

Do not instantiate PrismaClient directly in feature modules.

Bad:

```ts
const prisma = new PrismaClient();
```

Good:

```ts
constructor(private readonly prisma: PrismaService) {}
```

### Migrations

Every schema change must include a Prisma migration.

Use meaningful migration names:

```bash
npx prisma migrate dev --name add_room_status
```

Do not manually edit migration files unless necessary and understood.

### Prisma Schema Naming

Use clear model names:

```prisma
model Room {}
model Guest {}
model Reservation {}
model Invoice {}
```

Use enums for fixed domain states:

```prisma
enum RoomStatus {
  AVAILABLE
  OCCUPIED
  MAINTENANCE
  OUT_OF_SERVICE
}
```

Use explicit relationships:

```prisma
model Reservation {
  id      Int  @id @default(autoincrement())
  guestId Int
  guest   Guest @relation(fields: [guestId], references: [id])
}
```

### Query Safety

List endpoints must use pagination.

Avoid unbounded:

```ts
findMany()
```

unless the table is guaranteed small.

Use `select` to avoid returning sensitive or unnecessary data.

Bad:

```ts
return this.prisma.user.findMany();
```

Good:

```ts
return this.prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
  },
});
```

---

## 12. Error Handling Rules

Use NestJS HTTP exceptions.

Examples:

```ts
throw new BadRequestException('Invalid room status');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('You do not have permission');
throw new NotFoundException('Room not found');
throw new ConflictException('Room number already exists');
```

Do not throw generic errors for expected business cases.

Bad:

```ts
throw new Error('Room not found');
```

Good:

```ts
throw new NotFoundException('Room not found');
```

All errors should be formatted by the global exception filter.

Do not manually format error responses in controllers.

---

## 13. Response Formatting Rules

Use the global response interceptor for successful responses.

Controllers and services should return raw data.

Do not manually wrap every response like this:

```ts
return {
  success: true,
  data,
};
```

The interceptor should handle standard wrapping.

Paginated service results should use this shape before global wrapping:

```ts
return {
  data: items,
  meta: {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  },
};
```

---

## 14. Pagination, Filtering, and Sorting Rules

Every list endpoint for potentially growing data must support pagination.

Examples:

```txt
GET /rooms?page=1&limit=10
GET /reservations?status=CONFIRMED&page=1&limit=20
GET /guests?search=abebe
```

Use query DTOs.

Example:

```ts
export class GetRoomsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({ example: 'A-101' })
  @IsOptional()
  @IsString()
  search?: string;
}
```

Do not expose arbitrary `sortBy` fields without validation.

Allowed sort fields must be whitelisted.

---

## 15. Testing Rules

Every new feature must include tests.

Minimum required tests:

```txt
Controller test
Service test
Repository test where repository logic exists
E2E test for critical API flows
```

### Controller Tests

Controller tests should verify:

```txt
Controller calls service with correct arguments.
Controller returns service result.
```

Mock the service.

Do not test database logic in controller tests.

### Service Tests

Service tests should verify:

```txt
Business rules
Ownership checks
Exception throwing
Repository calls
```

Mock repositories.

Do not use the real database in unit tests.

### Repository Tests

Repository tests should verify:

```txt
Repository calls Prisma correctly.
```

Mock `PrismaService`.

### Guard Tests

Guard tests should verify:

```txt
Valid users are allowed.
Invalid users are rejected.
Roles are enforced.
```

Mock `ExecutionContext`.

### E2E Tests

E2E tests should verify real HTTP behavior.

Critical E2E flows for the hotel system should include:

```txt
Signup/login
Create hotel
Create room
Create guest
Create reservation
Check in guest
Check out guest
Create invoice
Record payment
Admin-only access
Unauthorized access rejection
Hotel data isolation
```

E2E tests must use a test database, not production or normal development data.

---

## 16. Security Rules

Always follow secure defaults.

Rules:

- Never return passwords or password hashes
- Never expose internal error stack traces in production
- Validate all inputs
- Enforce authorization on protected routes
- Scope hotel data by authenticated user's hotel access
- Use environment variables for secrets
- Do not log passwords, tokens, or payment details
- Use secure file upload validation
- Limit uploaded file size
- Restrict uploaded file MIME types
- Use rate limiting for auth endpoints if rate limiting is available
- Avoid mass assignment vulnerabilities by using DTOs and Prisma `select`

---

## 17. File Upload Rules

File uploads must use NestJS upload interceptors.

Example:

```ts
@UseInterceptors(FileInterceptor('file', uploadConfig))
@UploadedFile() file: Express.Multer.File
```

File uploads must validate:

```txt
File size
File type
Required/optional status
Destination
Filename safety
```

Do not store large files directly in PostgreSQL unless explicitly required.

Preferred pattern:

```txt
Store file in local storage or cloud storage.
Store file URL/path/metadata in PostgreSQL.
```

For production, prefer:

```txt
S3
Cloudinary
Google Cloud Storage
Azure Blob Storage
Supabase Storage
```

---

## 18. Logging and Audit Rules

Hotel systems need auditability.

Important actions should produce audit logs:

```txt
User login
Reservation created
Reservation cancelled
Room status changed
Guest checked in
Guest checked out
Payment recorded
Invoice generated
Inventory adjusted
Employee role changed
Admin deleted a resource
```

Audit logs should usually include:

```txt
actorUserId
hotelId
action
resourceType
resourceId
oldValue when useful
newValue when useful
timestamp
ip/user agent when available
```

Do not put audit logging randomly in controllers.

Use a dedicated `AuditLogsService`.

---

## 19. Transaction Rules

Use Prisma transactions when one business operation changes multiple related records.

Examples:

```txt
Check-in:
- update reservation status
- update room status
- create audit log

Check-out:
- update reservation status
- update room status
- generate invoice if needed
- create audit log

Payment:
- create payment
- update invoice balance
- update invoice status
- create audit log
```

Use Prisma transaction APIs through service/repository coordination.

Do not perform multi-step critical operations without a transaction.

---

## 20. Naming Rules

Use consistent names.

Files:

```txt
rooms.controller.ts
rooms.service.ts
rooms.module.ts
rooms.repository.ts
create-room.dto.ts
update-room.dto.ts
get-rooms-query.dto.ts
```

Classes:

```ts
RoomsController
RoomsService
RoomsModule
RoomsRepository
CreateRoomDto
UpdateRoomDto
GetRoomsQueryDto
```

Methods:

```txt
create
findAll
findOne
update
remove
```

Use domain-specific methods when needed:

```txt
checkIn
checkOut
assignRoom
markRoomAsClean
markRoomAsUnderMaintenance
recordPayment
generateInvoice
```

---

## 21. Environment Configuration Rules

Use `ConfigModule`.

Do not access environment variables randomly throughout feature code unless needed.

Preferred:

```ts
ConfigService
```

Required environment values may include:

```txt
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
APP_PORT
NODE_ENV
UPLOADS_DIR
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

Validate environment variables if a validation layer exists.

---

## 22. Documentation Rules Beyond Swagger

When adding a major module, update or create documentation explaining:

```txt
Purpose of the module
Main entities
Important business rules
Main endpoints
Roles allowed to access it
Important workflows
```

For complex workflows, include text diagrams.

Example:

```txt
Reservation flow:
Create reservation
↓
Assign room
↓
Guest arrives
↓
Check in
↓
Stay active
↓
Check out
↓
Invoice/payment
```

---

## 23. Agent Workflow Rules

Before coding, the agent must:

1. Identify the module/domain being changed.
2. Inspect existing patterns in nearby modules.
3. Follow existing naming and architecture.
4. Check if DTOs, Swagger docs, tests, and Prisma migrations are needed.
5. Avoid broad unrelated refactors.

After coding, the agent must verify:

```txt
TypeScript compiles
Tests pass
Swagger docs updated
DTO validation added
No direct Prisma access from controllers
No sensitive fields returned
No unpaginated list endpoint added
```

---

## 24. Definition of Done

A task is not complete unless:

- Code follows the layered architecture
- DTOs are created or updated
- Validation is present
- Swagger/OpenAPI decorators are present
- Prisma schema/migration is updated if database changed
- Service and controller logic are separated
- Repository is used where appropriate
- Tests are added or updated
- Authorization is enforced where needed
- Sensitive fields are not returned
- Pagination exists for list endpoints
- Errors use NestJS exceptions
- No unrelated files are changed unnecessarily

---

## 25. Quick Mental Model

Use this rule when deciding where code belongs:

```txt
HTTP route/decorator/request handling?
→ Controller

Business rule/workflow/permission decision?
→ Service

Database query?
→ Repository

Database connection/client setup?
→ PrismaService

Input shape and validation?
→ DTO

Authentication/authorization?
→ Guard + decorators

Response transformation?
→ Interceptor

Error formatting?
→ Exception filter

Cross-cutting request preprocessing?
→ Middleware
```

---

## 26. Forbidden Practices

Do not:

- Put Prisma queries in controllers
- Use `any` unless there is a strong reason
- Skip DTO validation
- Add undocumented endpoints
- Return `passwordHash`
- Hardcode secrets
- Add unpaginated `findMany()` for large tables
- Mix unrelated domains in one module
- Put business logic in guards when it belongs in services
- Put service logic in repositories
- Create circular module dependencies carelessly
- Change database schema without migration
- Add endpoints without tests
- Ignore hotel data isolation
- Bypass role/permission checks
- Commit uploaded files or secrets

---

## 27. Preferred Implementation Order for New Features

When adding a new feature, use this order:

```txt
1. Understand business workflow
2. Design Prisma model changes if needed
3. Create migration
4. Create DTOs
5. Create repository
6. Create service
7. Create controller
8. Add guards/roles
9. Add Swagger decorators
10. Add unit tests
11. Add E2E tests for critical flows
12. Run tests and fix issues
13. Update documentation
```

---

## 28. Hotel System Example: Room Creation

Correct architecture:

```txt
RoomsController.create()
↓
CreateRoomDto validates body
↓
RoomsService.create()
↓
RoomsService checks duplicate room number
↓
RoomsRepository.findByNumber()
↓
RoomsRepository.create()
↓
PrismaService
↓
PostgreSQL
```

Controller:

```ts
@Post()
@ApiOperation({ summary: 'Create a hotel room' })
@ApiCreatedResponse({ description: 'Room created successfully' })
create(@Body() createRoomDto: CreateRoomDto) {
  return this.roomsService.create(createRoomDto);
}
```

Service:

```ts
async create(createRoomDto: CreateRoomDto) {
  const existingRoom = await this.roomsRepository.findByNumber(
    createRoomDto.roomNumber,
  );

  if (existingRoom) {
    throw new ConflictException('Room number already exists');
  }

  return this.roomsRepository.create(createRoomDto);
}
```

Repository:

```ts
findByNumber(roomNumber: string) {
  return this.prisma.room.findUnique({
    where: { roomNumber },
  });
}
```

---

## 29. Hotel System Example: Reservation Check-In

A check-in operation should not be a simple update route only.

It is a business workflow.

Correct service responsibilities:

```txt
Check reservation exists
Check reservation belongs to hotel
Check reservation status allows check-in
Check assigned room is available
Update reservation status
Update room status
Create audit log
Use transaction
```

Recommended endpoint:

```txt
POST /reservations/:id/check-in
```

Controller:

```ts
@Post(':id/check-in')
@ApiOperation({ summary: 'Check in a guest for a reservation' })
checkIn(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: JwtPayload,
) {
  return this.reservationsService.checkIn(id, user);
}
```

Do not put this workflow in the controller.

---

## 30. Final Instruction

When in doubt, prioritize:

```txt
Clarity over cleverness
Consistency over personal style
Security over convenience
Tests over assumptions
Documentation over hidden behavior
Clean boundaries over quick shortcuts
```
