# Port-102 frontend

Next.js App Router management frontend for the single-property Port-102 system.

## Local development

Copy `.env.example` to `.env.local`, ensure the NestJS API is running, then run:

```bash
npm run dev -w @port-102/frontend
```

Required server-only configuration:

- `BACKEND_API_URL`: NestJS base URL including `/api`.
- `AUTH_COOKIE_NAME`: access-token cookie name.
- `REFRESH_COOKIE_NAME`: refresh-token cookie name.

## Authentication and API access

Login credentials are posted to a Next.js Route Handler. It calls the backend and stores both returned tokens in secure, same-site, httpOnly cookies. Browser code never reads tokens or contacts NestJS directly. Authenticated browser requests use `/api/proxy/*`; that handler attaches the access token server-side. A failed `401` triggers one coordinated request to `/api/auth/refresh`, which rotates cookies through the backend refresh contract before retrying once.
