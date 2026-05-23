-- Keep the database RoleKey enum aligned with the single-hotel role catalog.

WITH fallback_role AS (
  SELECT "id"
  FROM "roles"
  WHERE "systemKey" = 'HOTEL_ADMIN' OR "key" = 'HOTEL_ADMIN'
  ORDER BY
    CASE WHEN "systemKey" = 'HOTEL_ADMIN' THEN 0 ELSE 1 END,
    "id"
  LIMIT 1
),
obsolete_roles AS (
  SELECT "id"
  FROM "roles"
  WHERE
    "systemKey"::TEXT IN (
      'PLATFORM_SUPER_ADMIN',
      'RESERVATION_OFFICER',
      'SEPARATE_FRONT_DESK_CASHIER',
      'KITCHEN_STAFF',
      'BAR_STAFF',
      'SECURITY_OFFICER'
    )
    OR "key" IN (
      'PLATFORM_SUPER_ADMIN',
      'RESERVATION_OFFICER',
      'SEPARATE_FRONT_DESK_CASHIER',
      'KITCHEN_STAFF',
      'BAR_STAFF',
      'SECURITY_OFFICER'
    )
)
UPDATE "users"
SET "roleId" = (SELECT "id" FROM fallback_role)
WHERE
  "roleId" IN (SELECT "id" FROM obsolete_roles)
  AND EXISTS (SELECT 1 FROM fallback_role);

DELETE FROM "role_permissions"
WHERE "roleId" IN (
  SELECT "id"
  FROM "roles"
  WHERE
    "systemKey"::TEXT IN (
      'PLATFORM_SUPER_ADMIN',
      'RESERVATION_OFFICER',
      'SEPARATE_FRONT_DESK_CASHIER',
      'KITCHEN_STAFF',
      'BAR_STAFF',
      'SECURITY_OFFICER'
    )
    OR "key" IN (
      'PLATFORM_SUPER_ADMIN',
      'RESERVATION_OFFICER',
      'SEPARATE_FRONT_DESK_CASHIER',
      'KITCHEN_STAFF',
      'BAR_STAFF',
      'SECURITY_OFFICER'
    )
);

DELETE FROM "roles"
WHERE
  "systemKey"::TEXT IN (
    'PLATFORM_SUPER_ADMIN',
    'RESERVATION_OFFICER',
    'SEPARATE_FRONT_DESK_CASHIER',
    'KITCHEN_STAFF',
    'BAR_STAFF',
    'SECURITY_OFFICER'
  )
  OR "key" IN (
    'PLATFORM_SUPER_ADMIN',
    'RESERVATION_OFFICER',
    'SEPARATE_FRONT_DESK_CASHIER',
    'KITCHEN_STAFF',
    'BAR_STAFF',
    'SECURITY_OFFICER'
  );

DROP TYPE IF EXISTS "RoleKey_new";
CREATE TYPE "RoleKey_new" AS ENUM (
  'HOTEL_OWNER',
  'HOTEL_ADMIN',
  'GENERAL_MANAGER',
  'FRONT_DESK_CASHIER',
  'HOUSEKEEPING_SUPERVISOR',
  'HOUSEKEEPING_ATTENDANT',
  'MAINTENANCE_SUPERVISOR',
  'MAINTENANCE_TECHNICIAN',
  'ACCOUNTANT',
  'RESTAURANT_CASHIER',
  'WAITER',
  'STOREKEEPER',
  'PROCUREMENT_OFFICER',
  'HR_ADMIN',
  'GUEST'
);

ALTER TABLE "roles"
ALTER COLUMN "systemKey" TYPE "RoleKey_new"
USING "systemKey"::TEXT::"RoleKey_new";

DROP TYPE "RoleKey";
ALTER TYPE "RoleKey_new" RENAME TO "RoleKey";
