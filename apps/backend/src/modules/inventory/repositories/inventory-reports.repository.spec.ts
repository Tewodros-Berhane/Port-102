/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { InventoryItemStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryReportsRepository } from './inventory-reports.repository';

describe('InventoryReportsRepository', () => {
  let repository: InventoryReportsRepository;
  let prisma: {
    inventoryItem: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    stockBalance: {
      findMany: jest.Mock;
    };
    stockMovement: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      inventoryItem: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      stockBalance: {
        findMany: jest.fn(),
      },
      stockMovement: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReportsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(InventoryReportsRepository);
  });

  it('counts active inventory items', async () => {
    await repository.countActiveItems();

    expect(prisma.inventoryItem.count).toHaveBeenCalledWith({
      where: { status: InventoryItemStatus.ACTIVE },
    });
  });

  it('lists reorder alert candidates with search and location filters', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([]);

    await repository.listReorderAlertCandidates({
      skip: 20,
      take: 20,
      search: 'rice',
      locationId: 4,
    });

    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: expect.objectContaining({
          status: InventoryItemStatus.ACTIVE,
          reorderLevel: { not: null },
        }),
      }),
    );
  });

  it('calculates stock value from active item average cost', async () => {
    prisma.stockBalance.findMany.mockResolvedValue([
      {
        quantity: new Prisma.Decimal(5),
        item: {
          averageCost: new Prisma.Decimal(10),
          status: InventoryItemStatus.ACTIVE,
        },
      },
      {
        quantity: new Prisma.Decimal(3),
        item: {
          averageCost: new Prisma.Decimal(20),
          status: InventoryItemStatus.INACTIVE,
        },
      },
    ]);

    await expect(repository.calculateStockValue(4)).resolves.toEqual(
      new Prisma.Decimal(50),
    );
  });

  it('queries recent movements with location filters', async () => {
    await repository.recentMovements(5, 4);

    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        where: {
          OR: [{ locationId: 4 }, { fromLocationId: 4 }, { toLocationId: 4 }],
        },
      }),
    );
  });
});
