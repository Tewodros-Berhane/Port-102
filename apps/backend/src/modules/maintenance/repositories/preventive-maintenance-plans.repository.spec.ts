import { Test, TestingModule } from '@nestjs/testing';

import { PreventiveMaintenanceStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PreventiveMaintenancePlansRepository } from './preventive-maintenance-plans.repository';

describe('PreventiveMaintenancePlansRepository', () => {
  let repository: PreventiveMaintenancePlansRepository;
  let prisma: {
    preventiveMaintenancePlan: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      preventiveMaintenancePlan: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreventiveMaintenancePlansRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<PreventiveMaintenancePlansRepository>(
      PreventiveMaintenancePlansRepository,
    );
  });

  it('creates preventive maintenance plans', async () => {
    await repository.createPlan({
      planNumber: 'PMP-20260606-123450',
      assetId: 4,
      title: 'Quarterly AC service',
      intervalDays: 90,
      nextDueDate: new Date('2026-09-01'),
      createdByUserId: 1,
    });

    expect(prisma.preventiveMaintenancePlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planNumber: 'PMP-20260606-123450',
          assetId: 4,
          intervalDays: 90,
        }),
      }),
    );
  });

  it('finds plans by id and plan number', async () => {
    await repository.findPlan(6);
    await repository.findByPlanNumber('PMP-20260606-123450');

    expect(prisma.preventiveMaintenancePlan.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 6,
        },
      }),
    );
    expect(prisma.preventiveMaintenancePlan.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          planNumber: 'PMP-20260606-123450',
        },
      }),
    );
  });

  it('lists plans with filters, pagination, and due ordering', async () => {
    prisma.preventiveMaintenancePlan.count.mockResolvedValue(0);
    prisma.preventiveMaintenancePlan.findMany.mockResolvedValue([]);

    await repository.listPlans({
      skip: 10,
      take: 10,
      search: 'AC',
      status: PreventiveMaintenanceStatus.ACTIVE,
      assetId: 4,
      roomId: 12,
      dueFrom: new Date('2026-06-01'),
      dueTo: new Date('2026-09-30'),
    });

    expect(prisma.preventiveMaintenancePlan.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: PreventiveMaintenanceStatus.ACTIVE,
        assetId: 4,
        roomId: 12,
        nextDueDate: {
          gte: new Date('2026-06-01'),
          lte: new Date('2026-09-30'),
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.preventiveMaintenancePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ nextDueDate: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates preventive maintenance plans', async () => {
    await repository.updatePlan(6, {
      status: PreventiveMaintenanceStatus.PAUSED,
    });

    expect(prisma.preventiveMaintenancePlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 6,
        },
        data: {
          status: PreventiveMaintenanceStatus.PAUSED,
        },
      }),
    );
  });

  it('counts plans for dashboard summaries', async () => {
    const dueBefore = new Date('2026-06-06T10:00:00.000Z');

    await repository.countPlans({
      status: PreventiveMaintenanceStatus.ACTIVE,
      nextDueDate: {
        lt: dueBefore,
      },
    });

    expect(prisma.preventiveMaintenancePlan.count).toHaveBeenCalledWith({
      where: {
        status: PreventiveMaintenanceStatus.ACTIVE,
        nextDueDate: {
          lt: dueBefore,
        },
      },
    });
  });
});
