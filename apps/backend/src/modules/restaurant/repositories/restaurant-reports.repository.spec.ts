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
});
