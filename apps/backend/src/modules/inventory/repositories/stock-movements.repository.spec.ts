/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma, StockMovementType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockMovementsRepository } from './stock-movements.repository';

describe('StockMovementsRepository', () => {
  let repository: StockMovementsRepository;
  let prisma: {
    stockMovement: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      stockMovement: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(StockMovementsRepository);
  });

  it('lists movements with operational filters and newest-first ordering', async () => {
    prisma.stockMovement.count.mockResolvedValue(0);
    prisma.stockMovement.findMany.mockResolvedValue([]);
    const createdFrom = new Date('2026-06-01T00:00:00.000Z');
    const createdTo = new Date('2026-06-30T23:59:59.999Z');

    await repository.listMovements({
      skip: 10,
      take: 10,
      search: 'delivery',
      type: StockMovementType.RECEIPT,
      itemId: 7,
      locationId: 4,
      createdFrom,
      createdTo,
    });

    expect(prisma.stockMovement.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        type: StockMovementType.RECEIPT,
        itemId: 7,
        createdAt: { gte: createdFrom, lte: createdTo },
        AND: expect.any(Array),
      }),
    });
    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('matches location filters across direct and transfer locations', async () => {
    prisma.stockMovement.count.mockResolvedValue(0);
    prisma.stockMovement.findMany.mockResolvedValue([]);

    await repository.listMovements({
      skip: 0,
      take: 20,
      locationId: 4,
    });

    expect(prisma.stockMovement.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: [{ locationId: 4 }, { fromLocationId: 4 }, { toLocationId: 4 }],
      }),
    });
  });

});
