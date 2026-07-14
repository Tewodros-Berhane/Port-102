import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { RoleKey } from '../../src/generated/prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';

export type IntegrationContext = {
  app: INestApplicationContext;
  prisma: PrismaService;
  user: {
    id: number;
    email: string;
    roleId: number;
    departmentId: number | null;
  };
};

export async function createIntegrationContext(): Promise<IntegrationContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  await moduleRef.init();
  const prisma = moduleRef.get(PrismaService);
  const user = await resetIntegrationDatabase(prisma);

  return { app: moduleRef, prisma, user };
}

export async function resetIntegrationDatabase(prisma: PrismaService) {
  await truncateTestDatabase(prisma);

  const role = await prisma.role.create({
    data: {
      key: 'integration-admin',
      systemKey: RoleKey.HOTEL_ADMIN,
      name: 'Integration Admin',
      isSystem: true,
    },
  });
  const user = await prisma.user.create({
    data: {
      email: 'integration-admin@port102.test',
      passwordHash: 'not-used-by-integration-tests',
      fullName: 'Integration Admin',
      roleId: role.id,
    },
    select: { id: true, email: true, roleId: true, departmentId: true },
  });

  return user;
}

export async function truncateTestDatabase(prisma: PrismaService) {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );

  if (tables.length === 0) return;

  const quoted = tables
    .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
    .join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
  );
}
