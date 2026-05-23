import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config as loadEnv } from 'dotenv';

import { PrismaClient, RoleKey } from '../src/generated/prisma/client';
import { DEFAULT_PERMISSIONS } from '../src/modules/permissions/constants/default-permissions.constant';
import { DEFAULT_ROLES } from '../src/modules/roles/constants/default-roles.constant';

const DEFAULT_DEPARTMENTS = [
  {
    key: 'ADMINISTRATION',
    name: 'Administration',
    description: 'Hotel administration and system access management.',
  },
  {
    key: 'MANAGEMENT',
    name: 'Management',
    description: 'General management and operational oversight.',
  },
  {
    key: 'FRONT_DESK',
    name: 'Front Desk',
    description: 'Reservations, reception, cashier, check-in, and checkout.',
  },
  {
    key: 'HOUSEKEEPING',
    name: 'Housekeeping',
    description: 'Room cleaning, inspection, and readiness operations.',
  },
  {
    key: 'MAINTENANCE',
    name: 'Maintenance',
    description: 'Facilities, repairs, work orders, and room outage handling.',
  },
  {
    key: 'FINANCE',
    name: 'Finance',
    description: 'Payments, reconciliation, invoices, and reporting.',
  },
  {
    key: 'RESTAURANT',
    name: 'Restaurant',
    description: 'Restaurant, cafe, bar, and POS outlet operations.',
  },
  {
    key: 'INVENTORY',
    name: 'Inventory',
    description: 'Stock, store, and inventory control.',
  },
  {
    key: 'PROCUREMENT',
    name: 'Procurement',
    description: 'Purchase requests, purchase orders, and suppliers.',
  },
  {
    key: 'HR',
    name: 'Human Resources',
    description: 'Employee records, shifts, attendance, and staff documents.',
  },
] as const;

function loadEnvironment() {
  const envFilePaths = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '../../.env'),
    join(process.cwd(), '.env.example'),
    join(process.cwd(), '../../.env.example'),
  ];

  for (const path of envFilePaths) {
    if (existsSync(path)) {
      loadEnv({ path, override: false });
    }
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to run the Prisma seed.`);
  }

  return value;
}

function optionalEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();

  return value || fallback;
}

function integerEnv(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be an integer.`);
  }

  return parsed;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function seedPermissions(prisma: PrismaClient) {
  for (const permission of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        category: permission.category,
        isActive: true,
      },
      create: {
        key: permission.key,
        name: permission.name,
        category: permission.category,
      },
    });
  }
}

async function seedRoles(prisma: PrismaClient) {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { systemKey: role.key as RoleKey },
      update: {
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: true,
        isActive: true,
      },
      create: {
        key: role.key,
        systemKey: role.key as RoleKey,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });
  }
}

async function seedRolePermissions(prisma: PrismaClient) {
  const permissions = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  const permissionByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id]),
  );

  const roles = await prisma.role.findMany({
    where: { systemKey: { not: null } },
    select: { id: true, systemKey: true },
  });
  const roleByKey = new Map(roles.map((role) => [role.systemKey, role.id]));

  for (const role of DEFAULT_ROLES) {
    const roleId = roleByKey.get(role.key);

    if (!roleId) {
      throw new Error(`Role ${role.key} was not seeded.`);
    }

    const permissionIds = role.permissions.map((permissionKey) => {
      const permissionId = permissionByKey.get(permissionKey);

      if (!permissionId) {
        throw new Error(
          `Role ${role.key} references unknown permission ${permissionKey}.`,
        );
      }

      return permissionId;
    });

    await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { notIn: permissionIds },
      },
    });

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }
}

async function seedHotelProfile(prisma: PrismaClient) {
  const hotelName = optionalEnv('INITIAL_HOTEL_NAME', 'Demo Hotel');
  const hotelCode = optionalEnv('INITIAL_HOTEL_CODE', 'DEMO');

  return prisma.hotel.upsert({
    where: { code: hotelCode },
    update: {
      name: hotelName,
      timezone: optionalEnv('INITIAL_HOTEL_TIMEZONE', 'Africa/Nairobi'),
      defaultCurrency: optionalEnv('INITIAL_HOTEL_CURRENCY', 'ETB'),
    },
    create: {
      name: hotelName,
      code: hotelCode,
      timezone: optionalEnv('INITIAL_HOTEL_TIMEZONE', 'Africa/Nairobi'),
      defaultCurrency: optionalEnv('INITIAL_HOTEL_CURRENCY', 'ETB'),
    },
  });
}

async function seedDefaultDepartments(prisma: PrismaClient) {
  for (const department of DEFAULT_DEPARTMENTS) {
    await prisma.department.upsert({
      where: {
        key: department.key,
      },
      update: {
        name: department.name,
        description: department.description,
        isActive: true,
      },
      create: {
        key: department.key,
        name: department.name,
        description: department.description,
      },
    });
  }
}

async function seedInitialAdmin(prisma: PrismaClient) {
  const adminName = optionalEnv('INITIAL_ADMIN_NAME', 'Hotel Admin');
  const adminEmail = normalizeEmail(
    optionalEnv('INITIAL_ADMIN_EMAIL', 'admin@demo-hotel.com'),
  );
  const adminPassword = optionalEnv('INITIAL_ADMIN_PASSWORD', 'ChangeMe123!');
  const bcryptSaltRounds = integerEnv('BCRYPT_SALT_ROUNDS', 12);

  const hotelAdminRole = await prisma.role.findUnique({
    where: { systemKey: 'HOTEL_ADMIN' },
  });

  if (!hotelAdminRole) {
    throw new Error('HOTEL_ADMIN role was not seeded.');
  }

  const administrationDepartment = await prisma.department.findUnique({
    where: {
      key: 'ADMINISTRATION',
    },
  });

  if (!administrationDepartment) {
    throw new Error('ADMINISTRATION department was not seeded.');
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        fullName: adminName,
        status: 'ACTIVE',
        roleId: hotelAdminRole.id,
        departmentId: administrationDepartment.id,
      },
    });
    return;
  }

  await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: adminName,
      passwordHash: await hash(adminPassword, bcryptSaltRounds),
      roleId: hotelAdminRole.id,
      departmentId: administrationDepartment.id,
    },
  });
}

async function main() {
  loadEnvironment();

  const adapter = new PrismaPg({
    connectionString: requiredEnv('DATABASE_URL'),
  });
  const prisma = new PrismaClient({ adapter });

  try {
    await seedPermissions(prisma);
    await seedRoles(prisma);
    await seedRolePermissions(prisma);
    await seedHotelProfile(prisma);
    await seedDefaultDepartments(prisma);
    await seedInitialAdmin(prisma);

    const [permissionCount, roleCount, departmentCount] = await Promise.all([
      prisma.permission.count(),
      prisma.role.count({ where: { isSystem: true } }),
      prisma.department.count(),
    ]);

    console.log(
      `Seed complete: ${permissionCount} permissions, ${roleCount} system roles, ${departmentCount} departments.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
