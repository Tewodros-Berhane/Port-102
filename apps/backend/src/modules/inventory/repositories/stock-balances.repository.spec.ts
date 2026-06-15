/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';

describe('StockBalancesRepository', () => {
  let repository: StockBalancesRepository;
  let prisma: {
    stockBalance: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      stockBalance: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockBalancesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(StockBalancesRepository);
  });

  it('lists balances with item, location, search, and pagination filters', async () => {
    prisma.stockBalance.count.mockResolvedValue(0);
    prisma.stockBalance.findMany.mockResolvedValue([]);

    await repository.listBalances({
      skip: 20,
      take: 20,
      search: 'rice',
      itemId: 7,
      locationId: 4,
    });

    expect(prisma.stockBalance.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        itemId: 7,
        locationId: 4,
        OR: expect.any(Array),
      }),
    });
    expect(prisma.stockBalance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [
          { item: { itemNumber: 'asc' } },
          { location: { code: 'asc' } },
          { id: 'asc' },
        ],
      }),
    );
  });

  it('finds one balance by the compound item and location key', async () => {
    await repository.findBalance(7, 4);

    expect(prisma.stockBalance.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          itemId_locationId: { itemId: 7, locationId: 4 },
        },
      }),
    );
  });

  it('creates a missing balance when increasing stock', async () => {
    const quantity = new Prisma.Decimal(25);

    await repository.increaseBalance(7, 4, quantity);

    expect(prisma.stockBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          itemId: 7,
          locationId: 4,
          quantity,
        },
      }),
    );
  });

  it('increments an existing balance when increasing stock', async () => {
    const quantity = new Prisma.Decimal(10);

    await repository.increaseBalance(7, 4, quantity);

    expect(prisma.stockBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          quantity: { increment: quantity },
        },
      }),
    );
  });

  it('conditionally decrements an available stock balance', async () => {
    const quantity = new Prisma.Decimal(10);
    prisma.stockBalance.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockBalance.findUnique.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(15),
    });

    await expect(repository.decreaseBalance(7, 4, quantity)).resolves.toEqual(
      expect.objectContaining({ id: 1 }),
    );

    expect(prisma.stockBalance.updateMany).toHaveBeenCalledWith({
      where: {
        itemId: 7,
        locationId: 4,
        quantity: { gte: quantity },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });
  });

  it('does not decrement when the available stock is insufficient', async () => {
    prisma.stockBalance.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.decreaseBalance(7, 4, new Prisma.Decimal(10)),
    ).resolves.toBeNull();

    expect(prisma.stockBalance.findUnique).not.toHaveBeenCalled();
  });
});
