import { Test, TestingModule } from '@nestjs/testing';

import {
  ApprovalRequestType,
  ApprovalStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalRequestsRepository } from './repositories/approval-requests.repository';

describe('ApprovalRequestsService', () => {
  let service: ApprovalRequestsService;
  let approvalRequestsRepository: {
    createApprovalRequest: jest.Mock;
    listApprovalRequests: jest.Mock;
    findApprovalRequest: jest.Mock;
    decideApprovalRequest: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
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
  const requestedByUser = {
    id: 1,
    email: 'admin@demo-hotel.com',
    fullName: 'Hotel Admin',
  };

  function createApprovalRequest(overrides: Record<string, unknown> = {}) {
    return {
      id: 5,
      type: ApprovalRequestType.REFUND,
      status: ApprovalStatus.PENDING,
      title: 'Refund guest overcharge',
      reason: null,
      payload: { invoiceId: 10 },
      decisionNote: null,
      decidedAt: null,
      createdAt: now,
      updatedAt: now,
      requestedByUser,
      decidedByUser: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    approvalRequestsRepository = {
      createApprovalRequest: jest
        .fn()
        .mockResolvedValue(createApprovalRequest()),
      listApprovalRequests: jest
        .fn()
        .mockResolvedValue([1, [createApprovalRequest()]]),
      findApprovalRequest: jest.fn().mockResolvedValue(createApprovalRequest()),
      decideApprovalRequest: jest.fn().mockResolvedValue(
        createApprovalRequest({
          status: ApprovalStatus.APPROVED,
          decidedByUser: requestedByUser,
          decisionNote: 'Approved',
          decidedAt: now,
        }),
      ),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalRequestsService,
        {
          provide: ApprovalRequestsRepository,
          useValue: approvalRequestsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<ApprovalRequestsService>(ApprovalRequestsService);
  });

  it('creates approval requests with requestedByUserId only', async () => {
    const result = await service.create(currentUser, {
      type: ApprovalRequestType.REFUND,
      title: ' Refund guest overcharge ',
      reason: ' Duplicate charge ',
      payload: { invoiceId: 10 },
    });

    expect(result).toMatchObject({
      id: 5,
      requestedBy: {
        user: requestedByUser,
      },
    });
    expect(
      approvalRequestsRepository.createApprovalRequest,
    ).toHaveBeenCalledWith({
      requestedByUserId: 1,
      type: ApprovalRequestType.REFUND,
      title: 'Refund guest overcharge',
      reason: 'Duplicate charge',
      payload: { invoiceId: 10 },
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'approval_request.created',
      entityType: 'ApprovalRequest',
      entityId: '5',
      metadata: {
        approvalRequestId: 5,
        type: ApprovalRequestType.REFUND,
        status: ApprovalStatus.PENDING,
      },
    });
  });

  it('lists approval requests without hotel filters', async () => {
    await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      status: ApprovalStatus.PENDING,
      type: ApprovalRequestType.REFUND,
    });

    expect(
      approvalRequestsRepository.listApprovalRequests,
    ).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      status: ApprovalStatus.PENDING,
      type: ApprovalRequestType.REFUND,
    });
  });

  it('throws when an approval request is missing', async () => {
    approvalRequestsRepository.findApprovalRequest.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Approval request was not found.',
    );
  });

  it('approves pending requests with decidedByUserId only', async () => {
    const result = await service.approve(currentUser, 5, {
      decisionNote: ' Approved ',
    });

    expect(result).toMatchObject({
      status: ApprovalStatus.APPROVED,
      decidedBy: {
        user: requestedByUser,
      },
    });
    expect(
      approvalRequestsRepository.decideApprovalRequest,
    ).toHaveBeenCalledWith({
      approvalRequestId: 5,
      status: ApprovalStatus.APPROVED,
      decidedByUserId: 1,
      decisionNote: 'Approved',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'approval_request.approved',
      entityType: 'ApprovalRequest',
      entityId: '5',
      metadata: {
        approvalRequestId: 5,
        type: ApprovalRequestType.REFUND,
        status: ApprovalStatus.APPROVED,
      },
    });
  });

  it('rejects decisions on non-pending requests', async () => {
    approvalRequestsRepository.findApprovalRequest.mockResolvedValue(
      createApprovalRequest({ status: ApprovalStatus.APPROVED }),
    );

    await expect(
      service.reject(currentUser, 5, {
        decisionNote: 'Already approved',
      }),
    ).rejects.toThrow(
      'Only pending approval requests can be approved or rejected.',
    );
  });
});
