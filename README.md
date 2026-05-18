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

The backend lives in `apps/backend` and is built with NestJS, TypeScript, PostgreSQL, Prisma ORM, Swagger/OpenAPI, and Jest.

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
```

The backend reads `DATABASE_URL` from `.env`. The default value matches the PostgreSQL service in `docker-compose.yml`.

### Start PostgreSQL

```bash
docker compose up -d postgres
```

### Generate Prisma client

```bash
npm run backend:prisma:generate
```

### Run database migrations

```bash
npm run backend:prisma:migrate
```

### Start the backend

```bash
npm run backend:dev
```

The API starts on `http://localhost:3000` by default.

Swagger documentation is available at `http://localhost:3000/api/docs`.

Health check endpoint:

```text
GET /api/health
```

### Test and build

```bash
npm run backend:test
npm run backend:build
```

## Backend Architecture

Future backend work should follow the layered architecture:

```text
Controller -> Service / Use Case -> Repository -> PrismaService -> PostgreSQL
```

Controllers should only handle HTTP concerns, validation, and response mapping. Prisma queries belong behind repository or persistence boundaries, not in controllers.
