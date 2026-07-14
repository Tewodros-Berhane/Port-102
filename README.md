# Port-102

Port-102 is a hotel operating system monorepo. The first application in the workspace is the central NestJS API backend.

## Workspace

```text
apps/backend      Central API backend
apps/frontend     Future Next.js web app
apps/mobile       Future React Native app
packages/types    Shared TypeScript types
packages/validators Shared validation utilities
packages/sdk      Future API SDK
```

## Backend

The backend lives in `apps/backend`. It was generated with the Nest CLI and is built with NestJS, TypeScript, PostgreSQL, Prisma ORM, Swagger/OpenAPI, Jest, and Supertest.

### Backend Setup

Install dependencies from the monorepo root:

```bash
npm install
```

Start the backend in development mode:

```bash
npm run backend:dev
```

The API starts on `http://localhost:3000` by default.

### Environment Setup

Create a local environment file:

```bash
cp .env.example .env
```

Required backend environment values:

```text
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/port_102?schema=public"
```

The backend uses `ConfigModule` globally and reads these values from the root `.env` file.

### Database Setup

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d postgres
```

The default database settings in `.env.example` match the `postgres` service in `docker-compose.yml`.

### Prisma Commands

Generate the Prisma client:

```bash
npm run backend:prisma:generate
```

Create and run a development migration:

```bash
npm run backend:prisma:migrate
```

Deploy existing migrations:

```bash
npm run backend:prisma:deploy
```

Open Prisma Studio:

```bash
npm run backend:prisma:studio
```

Run the seed script:

```bash
npm run backend:prisma:seed
```

### Health, Swagger, and Response Format

Health check endpoint:

```text
GET /api/health
```

Swagger documentation is available at:

```text
http://localhost:3000/api/docs
```

Successful API responses are wrapped globally:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": {},
  "timestamp": "2026-05-19T00:00:00.000Z",
  "path": "/api/health"
}
```

HTTP exceptions are formatted globally:

```json
{
  "success": false,
  "statusCode": 404,
  "error": "Not Found",
  "message": "Cannot GET /api/example",
  "timestamp": "2026-05-19T00:00:00.000Z",
  "path": "/api/example"
}
```

### Tests and Build

Run unit tests:

```bash
npm run backend:test
```

Run e2e tests:

```bash
npm run test:e2e -w @port-102/backend
```

Build the backend:

```bash
npm run backend:build
```

## Backend Architecture

Future backend work should follow the layered architecture:

```text
Controller -> Service / Use Case -> Repository -> PrismaService -> PostgreSQL
```

Controllers should only handle HTTP concerns, validation, and response mapping. Prisma queries belong behind repository or persistence boundaries, not in controllers.

## Backend Module Documentation

Implemented backend module notes:

- [Rooms, floors, and room types](docs/rooms-module.md)
- [Reservations and availability](docs/reservations-module.md)
- [Stays and front desk](docs/front-desk-stays-module.md)
- [Billing, folios, payments, invoices, and receipts](docs/billing-folios-payments-module.md)
- [Housekeeping](docs/housekeeping-module.md)
- [Maintenance](docs/maintenance-module.md)
- [Restaurant and POS](docs/restaurant-pos-module.md)
- [Inventory](docs/inventory-module.md)
- [Procurement](docs/procurement-module.md)
- [Consolidated reports and management dashboards](docs/reports-module.md)
- [Property settings](docs/property-settings-module.md)
- [Internal notifications](docs/notifications-module.md)

Database integration tests require `DATABASE_URL_TEST` to identify a dedicated
PostgreSQL database whose name contains `test`. The runner applies migrations
before executing the serial database-backed suites:

```bash
npm run test:integration -w @port-102/backend -- --runInBand
```
