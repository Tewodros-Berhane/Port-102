-- Convert auth/RBAC from multi-hotel membership access to a single-hotel installation model.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "departmentId" INTEGER;

UPDATE "users" AS user_record
SET
  "roleId" = selected_membership."roleId",
  "departmentId" = selected_membership."departmentId"
FROM (
  SELECT DISTINCT ON ("userId")
    "userId",
    "roleId",
    "departmentId"
  FROM "hotel_users"
  ORDER BY
    "userId",
    CASE WHEN "status" = 'ACTIVE' THEN 0 ELSE 1 END,
    "id"
) AS selected_membership
WHERE user_record."id" = selected_membership."userId";

UPDATE "users"
SET "roleId" = (
  SELECT "id"
  FROM "roles"
  WHERE "systemKey" = 'GUEST'
  LIMIT 1
)
WHERE "roleId" IS NULL;

ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_hotelUserId_fkey";
DROP INDEX IF EXISTS "refresh_tokens_hotelUserId_idx";
ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "hotelUserId";

ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_hotelId_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actorHotelUserId_fkey";
DROP INDEX IF EXISTS "audit_logs_hotelId_createdAt_idx";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "hotelId";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "actorHotelUserId";

ALTER TABLE "approval_requests" DROP CONSTRAINT IF EXISTS "approval_requests_hotelId_fkey";
ALTER TABLE "approval_requests" DROP CONSTRAINT IF EXISTS "approval_requests_requestedByHotelUserId_fkey";
ALTER TABLE "approval_requests" DROP CONSTRAINT IF EXISTS "approval_requests_decidedByHotelUserId_fkey";
DROP INDEX IF EXISTS "approval_requests_hotelId_status_idx";
ALTER TABLE "approval_requests" DROP COLUMN IF EXISTS "hotelId";
ALTER TABLE "approval_requests" DROP COLUMN IF EXISTS "requestedByHotelUserId";
ALTER TABLE "approval_requests" DROP COLUMN IF EXISTS "decidedByHotelUserId";

DROP TABLE IF EXISTS "hotel_users";

ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_hotelId_fkey";
DROP INDEX IF EXISTS "roles_hotelId_key_key";
DROP INDEX IF EXISTS "roles_hotelId_isActive_idx";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "hotelId";

ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_hotelId_fkey";
DROP INDEX IF EXISTS "departments_hotelId_key_key";
DROP INDEX IF EXISTS "departments_hotelId_isActive_idx";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "hotelId";

ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_hotelId_fkey";
DROP INDEX IF EXISTS "employees_hotelId_employeeNumber_key";
DROP INDEX IF EXISTS "employees_hotelId_userId_key";
DROP INDEX IF EXISTS "employees_hotelId_status_idx";
ALTER TABLE "employees" DROP COLUMN IF EXISTS "hotelId";

ALTER TABLE "guests" DROP CONSTRAINT IF EXISTS "guests_hotelId_fkey";
DROP INDEX IF EXISTS "guests_hotelId_email_key";
DROP INDEX IF EXISTS "guests_hotelId_userId_key";
DROP INDEX IF EXISTS "guests_hotelId_status_idx";
DROP INDEX IF EXISTS "guests_hotelId_lastName_idx";
ALTER TABLE "guests" DROP COLUMN IF EXISTS "hotelId";

ALTER TABLE "hotels" DROP COLUMN IF EXISTS "status";
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "roles_key_key" ON "roles"("key");
CREATE INDEX IF NOT EXISTS "roles_isActive_idx" ON "roles"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "departments_key_key" ON "departments"("key");
CREATE INDEX IF NOT EXISTS "departments_isActive_idx" ON "departments"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "employees_employeeNumber_key" ON "employees"("employeeNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "employees_userId_key" ON "employees"("userId");
CREATE INDEX IF NOT EXISTS "employees_status_idx" ON "employees"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "guests_userId_key" ON "guests"("userId");
CREATE INDEX IF NOT EXISTS "guests_status_idx" ON "guests"("status");
CREATE INDEX IF NOT EXISTS "guests_lastName_idx" ON "guests"("lastName");

CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "approval_requests_status_idx" ON "approval_requests"("status");

ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "users_roleId_idx" ON "users"("roleId");
CREATE INDEX IF NOT EXISTS "users_departmentId_idx" ON "users"("departmentId");

DROP TYPE IF EXISTS "HotelUserStatus";
DROP TYPE IF EXISTS "HotelStatus";
