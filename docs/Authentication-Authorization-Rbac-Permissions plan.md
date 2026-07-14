# Authentication, Authorization, RBAC, and Permissions Plan

Last updated: 2026-05-23

This backend is a single-hotel installation. Authentication and authorization are intentionally modeled as a direct chain:

```text
User
-> Role
-> Permissions
-> Guards
-> Service-level business rules
-> Audit logs
```

## Current Model

- `User` is the login identity.
- `Role` is assigned directly to `User.roleId`.
- `Department` may be assigned through `User.departmentId`.
- `Permission` records are assigned to roles through role-permission rows.
- `Employee` and `Guest` remain optional profile links to a login user.
- `Hotel` is retained only as singleton profile/settings data for the property.
- `RefreshToken` belongs to a user.
- `AuditLog` records the acting user.
- `ApprovalRequest` records the requesting and deciding users.

## Auth Flow

```text
POST /auth/login
-> validate email and password
-> require active user
-> require active direct role
-> load role permissions and department
-> issue access token and refresh token
-> return user, role, department, permissions, tokens
```

JWT payload:

```ts
type CurrentUserPayload = {
  sub: number;
  email: string;
  roleKey: string;
  roleId: number;
  departmentId?: number | null;
  tokenVersion: number;
};
```

`GET /auth/me` returns the current login identity, role, department, and permissions. It does not return password hashes or refresh token hashes.

## Authorization

Routes use:

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('resource.action')
```

Broad role-only checks may use:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleKey.HOTEL_ADMIN)
```

`PermissionsGuard` reads permissions through the authenticated user's direct `roleId`.
`RolesGuard` reads the authenticated user's direct `roleKey`.

## User Management

User management creates and updates users directly:

- Create user with `roleId` and optional `departmentId`.
- Assign role by updating `User.roleId`.
- Assign department by updating `User.departmentId`.
- Activate/deactivate users by changing `User.status`.
- Reset password by updating the user password hash and revoking active refresh tokens.

## Role And Permission Management

Roles are global to this installation:

- Role keys are unique.
- Default roles and permissions are seeded idempotently.
- System roles are protected from unsafe key changes and deletion.
- Permission replacement updates role-permission rows and writes an audit log.

## Seed Behavior

The seed creates or updates:

- Singleton hotel profile/settings record.
- Default permissions.
- Default roles.
- Default role-permission mappings.
- Default departments.
- Initial administrator user with a direct admin role.

## Audit And Approvals

Audit logs record:

- login success/failure
- logout
- password change/reset
- user create/activate/deactivate
- role assignment
- permission changes
- approval request create/approve/reject

Approval requests link directly to users for requester and decider tracking.

## Verification

Required checks:

```bash
npm run build
npm run test
npm run test:e2e
```

Current implementation status:

- Build passes.
- Unit tests cover auth, guards, users, roles, permissions, employees, guests, approvals, and audit logs.
- E2E tests cover app bootstrap, global exception formatting, Swagger UI, and health.
