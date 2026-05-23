import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogsRepository } from './repositories/audit-logs.repository';

type AuditLogRecord = {
  id: number;
  actorUserId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
  actorUser: {
    id: number;
    email: string;
    fullName: string;
  } | null;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  record(data: {
    actorUserId?: number | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    return this.auditLogsRepository.createAuditLog(data);
  }

  async list(_currentUser: CurrentUserPayload, query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [total, auditLogs] = await this.auditLogsRepository.listAuditLogs({
      skip: (page - 1) * pageSize,
      take: pageSize,
      action: this.normalizeOptionalString(query.action) ?? undefined,
      entityType: this.normalizeOptionalString(query.entityType) ?? undefined,
      entityId: this.normalizeOptionalString(query.entityId) ?? undefined,
      actorUserId: query.actorUserId,
    });

    return {
      items: auditLogs.map((auditLog) => this.serializeAuditLog(auditLog)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, auditLogId: number) {
    const auditLog = await this.auditLogsRepository.findAuditLog(auditLogId);

    if (!auditLog) {
      throw new NotFoundException('Audit log was not found.');
    }

    return this.serializeAuditLog(auditLog);
  }

  private serializeAuditLog(auditLog: AuditLogRecord) {
    return {
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
      actor: auditLog.actorUser
        ? {
            user: auditLog.actorUser,
          }
        : null,
    };
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }
}
