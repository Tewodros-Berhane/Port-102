import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const auditLogInclude = {
  actorUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createAuditLog(data: {
    actorUserId?: number | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId ?? null,
        action: data.action,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        ...(data.metadata === undefined
          ? {}
          : { metadata: data.metadata ?? Prisma.JsonNull }),
      },
      include: auditLogInclude,
    });
  }

  listAuditLogs({
    skip,
    take,
    action,
    entityType,
    entityId,
    actorUserId,
  }: {
    skip: number;
    take: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    actorUserId?: number;
  }) {
    const where = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actorUserId ? { actorUserId } : {}),
    };

    return Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: auditLogInclude,
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      }),
    ]);
  }

  findAuditLog(auditLogId: number) {
    return this.prisma.auditLog.findUnique({
      where: {
        id: auditLogId,
      },
      include: auditLogInclude,
    });
  }
}
