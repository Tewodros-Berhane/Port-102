import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let auditLogsService: {
    list: jest.Mock;
    getById: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    auditLogsService = {
      list: jest.fn(),
      getById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
        {
          provide: PrismaService,
          useValue: {
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates paginated audit log listing', () => {
    const query = { page: 2, pageSize: 10, action: 'users.created' };

    controller.list(currentUser, query);

    expect(auditLogsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates audit log detail lookup', () => {
    controller.getById(currentUser, 5);

    expect(auditLogsService.getById).toHaveBeenCalledWith(currentUser, 5);
  });
});
