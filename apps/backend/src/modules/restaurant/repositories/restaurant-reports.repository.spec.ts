/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { RestaurantReportsRepository } from './restaurant-reports.repository';

describe('RestaurantReportsRepository', () => {
  let repository: RestaurantReportsRepository;
  const prisma = {
    posOrder: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    posOrderPayment: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    outlet: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    menuItem: {
      count: jest.fn(),
    },
    stay: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RestaurantReportsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get(RestaurantReportsRepository);
  });

  function mockEmptySalesSummary() {
    prisma.posOrder.count.mockResolvedValue(0);
    prisma.posOrder.aggregate.mockResolvedValue({
      _sum: { totalAmount: null, balanceAmount: null },
    });
    prisma.posOrderPayment.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });
    prisma.posOrder.groupBy.mockResolvedValue([]);
    prisma.posOrderPayment.groupBy.mockResolvedValue([]);
    prisma.outlet.findMany.mockResolvedValue([]);
  }

  it('returns restaurant dashboard counts', async () => {
    prisma.posOrder.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    prisma.outlet.count.mockResolvedValue(1);
    prisma.menuItem.count.mockResolvedValue(4);

    await expect(repository.getDashboardCounts({})).resolves.toEqual({
      openOrders: 3,
      unpaidOrders: 2,
      activeOutlets: 1,
      unavailableMenuItems: 4,
    });
  });

  it('returns zero-backed raw values for an empty sales period', async () => {
    mockEmptySalesSummary();

    const result = await repository.getSalesSummary({});

    expect(result.totalOrders).toBe(0);
    expect(result.outletGroups).toEqual([]);
    expect(result.paymentGroups).toEqual([]);
  });

  it('applies outlet filters to dashboard counts', async () => {
    prisma.posOrder.count.mockResolvedValue(0);
    prisma.outlet.count.mockResolvedValue(1);
    prisma.menuItem.count.mockResolvedValue(0);

    await repository.getDashboardCounts({ outletId: 4 });

    expect(prisma.outlet.count).toHaveBeenCalledWith({
      where: { isActive: true, id: 4 },
    });
    expect(prisma.menuItem.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ outletId: 4 }),
      }),
    );
  });
});
