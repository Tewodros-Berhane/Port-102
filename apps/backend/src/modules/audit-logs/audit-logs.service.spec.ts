import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogsService } from './audit-logs.service';
import { AuditLogsRepository } from './repositories/audit-logs.repository';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let auditLogsRepository: {
    createAuditLog: jest.Mock;
    listAuditLogs: jest.Mock;
    findAuditLog: jest.Mock;
  };

  const now = new Date('2026-05-23T00:00:00.000Z');
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };
  const auditLog = {
    id: 7,
    actorUserId: 1,
    action: 'users.created',
    entityType: 'User',
    entityId: '5',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    metadata: { targetUserId: 5 },
    createdAt: now,
    actorUser: {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Hotel Admin',
    },
  };

  beforeEach(async () => {
    auditLogsRepository = {
      createAuditLog: jest.fn().mockResolvedValue(auditLog),
      listAuditLogs: jest.fn().mockResolvedValue([1, [auditLog]]),
      findAuditLog: jest.fn().mockResolvedValue(auditLog),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: AuditLogsRepository,
          useValue: auditLogsRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('records audit logs with actorUserId only', async () => {
    await service.record({
      actorUserId: 1,
      action: 'users.created',
      entityType: 'User',
      entityId: '5',
      metadata: {
        targetUserId: 5,
      },
    });

    expect(auditLogsRepository.createAuditLog).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'users.created',
      entityType: 'User',
      entityId: '5',
      metadata: {
        targetUserId: 5,
      },
    });
  });

  it('lists audit logs without hotel filters', async () => {
    await expect(
      service.list(currentUser, {
        page: 2,
        pageSize: 10,
        action: ' users.created ',
        entityType: ' User ',
        entityId: ' 5 ',
        actorUserId: 1,
      }),
    ).resolves.toMatchObject({
      items: [
        {
          id: 7,
          action: 'users.created',
          actor: {
            user: auditLog.actorUser,
          },
        },
      ],
      pagination: {
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(auditLogsRepository.listAuditLogs).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      action: 'users.created',
      entityType: 'User',
      entityId: '5',
      actorUserId: 1,
    });
  });

  it('returns one audit log by id', async () => {
    await expect(service.getById(currentUser, 7)).resolves.toMatchObject({
      id: 7,
      actor: {
        user: auditLog.actorUser,
      },
    });

    expect(auditLogsRepository.findAuditLog).toHaveBeenCalledWith(7);
  });

  it('throws when an audit log is missing', async () => {
    auditLogsRepository.findAuditLog.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Audit log was not found.',
    );
  });
});
