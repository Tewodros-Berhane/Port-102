import { Test, TestingModule } from '@nestjs/testing';

import { ApprovalStatus } from '../../generated/prisma/client';
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

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    hotelId: 10,
    membershipId: 20,
    roleKey: 'HOTEL_ADMIN',
    tokenVersion: 0,
  };
  const now = new Date('2026-05-22T00:00:00.000Z');
  const approvalRequest = {
    id: 5,
    hotelId: 10,
    requestedByUserId: 1,
    requestedByHotelUserId: 20,
    decidedByUserId: null,
    decidedByHotelUserId: null,
    type: 'REFUND' as const,
    status: ApprovalStatus.PENDING,
    title: 'Refund guest overcharge',
    reason: 'Duplicate charge',
    payload: {
      paymentId: 123,
      amount: 25,
    },
    decisionNote: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
    requestedByUser: {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Hotel Admin',
    },
    requestedByHotelUser: {
      id: 20,
      role: {
        id: 2,
        key: 'HOTEL_ADMIN',
        name: 'Hotel Admin',
      },
    },
    decidedByUser: null,
    decidedByHotelUser: null,
  };
  const approvedApprovalRequest = {
    ...approvalRequest,
    status: ApprovalStatus.APPROVED,
    decisionNote: 'Approved',
    decidedAt: now,
    decidedByUser: {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Hotel Admin',
    },
    decidedByHotelUser: {
      id: 20,
      role: {
        id: 2,
        key: 'HOTEL_ADMIN',
        name: 'Hotel Admin',
      },
    },
  };

  beforeEach(async () => {
    approvalRequestsRepository = {
      createApprovalRequest: jest.fn().mockResolvedValue(approvalRequest),
      listApprovalRequests: jest.fn().mockResolvedValue([1, [approvalRequest]]),
      findApprovalRequest: jest.fn().mockResolvedValue(approvalRequest),
      decideApprovalRequest: jest
        .fn()
        .mockResolvedValue(approvedApprovalRequest),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalRequestsService,
        {
          provide: ApprovalRequestsRepository,
          useValue: approvalRequestsRepository,
        },
      ],
    }).compile();

    service = module.get<ApprovalRequestsService>(ApprovalRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a hotel-scoped approval request from the current user', async () => {
    const result = await service.create(currentUser, {
      type: 'REFUND',
      title: ' Refund guest overcharge ',
      reason: ' Duplicate charge ',
      payload: {
        paymentId: 123,
      },
    });

    expect(
      approvalRequestsRepository.createApprovalRequest,
    ).toHaveBeenCalledWith({
      hotelId: 10,
      requestedByUserId: 1,
      requestedByHotelUserId: 20,
      type: 'REFUND',
      title: 'Refund guest overcharge',
      reason: 'Duplicate charge',
      payload: {
        paymentId: 123,
      },
    });
    expect(result).toMatchObject({
      id: 5,
      type: 'REFUND',
      status: ApprovalStatus.PENDING,
      requestedBy: {
        user: {
          id: 1,
        },
      },
    });
  });

  it('rejects unsupported approval request types', async () => {
    await expect(
      service.create(currentUser, {
        type: 'UNKNOWN' as never,
        title: 'Invalid approval',
      }),
    ).rejects.toThrow('Approval request type is not supported.');
  });

  it('lists approval requests with pagination metadata', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      status: ApprovalStatus.PENDING,
      type: 'REFUND',
    });

    expect(
      approvalRequestsRepository.listApprovalRequests,
    ).toHaveBeenCalledWith({
      hotelId: 10,
      skip: 10,
      take: 10,
      status: ApprovalStatus.PENDING,
      type: 'REFUND',
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('rejects approval request lookups outside the current hotel', async () => {
    approvalRequestsRepository.findApprovalRequest.mockResolvedValue(null);

    await expect(service.getById(currentUser, 5)).rejects.toThrow(
      'Approval request was not found in this hotel.',
    );
  });

  it('approves pending approval requests and records an audit action', async () => {
    const result = await service.approve(currentUser, 5, {
      decisionNote: ' Approved ',
    });

    expect(
      approvalRequestsRepository.decideApprovalRequest,
    ).toHaveBeenCalledWith({
      hotelId: 10,
      approvalRequestId: 5,
      requestType: 'REFUND',
      status: ApprovalStatus.APPROVED,
      decidedByUserId: 1,
      decidedByHotelUserId: 20,
      decisionNote: 'Approved',
      auditAction: 'approval_request.approved',
    });
    expect(result).toMatchObject({
      id: 5,
      status: ApprovalStatus.APPROVED,
      decisionNote: 'Approved',
      decidedBy: {
        user: {
          id: 1,
        },
      },
    });
  });

  it('rejects pending approval requests and records an audit action', async () => {
    approvalRequestsRepository.decideApprovalRequest.mockResolvedValue({
      ...approvedApprovalRequest,
      status: ApprovalStatus.REJECTED,
      decisionNote: 'Missing receipt',
    });

    await service.reject(currentUser, 5, {
      decisionNote: ' Missing receipt ',
    });

    expect(
      approvalRequestsRepository.decideApprovalRequest,
    ).toHaveBeenCalledWith({
      hotelId: 10,
      approvalRequestId: 5,
      requestType: 'REFUND',
      status: ApprovalStatus.REJECTED,
      decidedByUserId: 1,
      decidedByHotelUserId: 20,
      decisionNote: 'Missing receipt',
      auditAction: 'approval_request.rejected',
    });
  });

  it('rejects decisions for non-pending approval requests', async () => {
    approvalRequestsRepository.findApprovalRequest.mockResolvedValue({
      ...approvalRequest,
      status: ApprovalStatus.APPROVED,
    });

    await expect(
      service.approve(currentUser, 5, { decisionNote: 'Approved' }),
    ).rejects.toThrow(
      'Only pending approval requests can be approved or rejected.',
    );
    expect(
      approvalRequestsRepository.decideApprovalRequest,
    ).not.toHaveBeenCalled();
  });
});
