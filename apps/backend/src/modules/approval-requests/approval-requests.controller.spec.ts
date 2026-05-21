import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalRequestsController } from './approval-requests.controller';
import { ApprovalRequestsService } from './approval-requests.service';

describe('ApprovalRequestsController', () => {
  let controller: ApprovalRequestsController;
  let approvalRequestsService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    hotelId: 10,
    membershipId: 20,
    roleKey: 'HOTEL_ADMIN',
    tokenVersion: 0,
  };

  beforeEach(async () => {
    approvalRequestsService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalRequestsController],
      providers: [
        {
          provide: ApprovalRequestsService,
          useValue: approvalRequestsService,
        },
        {
          provide: PrismaService,
          useValue: {
            hotelUser: {
              findFirst: jest.fn(),
            },
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<ApprovalRequestsController>(
      ApprovalRequestsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates approval request creation', () => {
    const dto = {
      type: 'REFUND' as const,
      title: 'Refund guest overcharge',
    };

    controller.create(currentUser, dto);

    expect(approvalRequestsService.create).toHaveBeenCalledWith(
      currentUser,
      dto,
    );
  });

  it('delegates paginated approval request listing', () => {
    const query = { page: 2, pageSize: 10, status: 'PENDING' as const };

    controller.list(currentUser, query);

    expect(approvalRequestsService.list).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates detail lookup and decisions', () => {
    controller.getById(currentUser, 5);
    controller.approve(currentUser, 5, { decisionNote: 'Approved' });
    controller.reject(currentUser, 6, { decisionNote: 'Missing receipt' });

    expect(approvalRequestsService.getById).toHaveBeenCalledWith(
      currentUser,
      5,
    );
    expect(approvalRequestsService.approve).toHaveBeenCalledWith(
      currentUser,
      5,
      { decisionNote: 'Approved' },
    );
    expect(approvalRequestsService.reject).toHaveBeenCalledWith(
      currentUser,
      6,
      { decisionNote: 'Missing receipt' },
    );
  });
});
