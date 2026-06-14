/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import {
  InventoryItemStatus,
  InventoryItemType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryItemsRepository } from './inventory-items.repository';

describe('InventoryItemsRepository', () => {
  let repository: InventoryItemsRepository;
  let prisma: {
    inventoryItem: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      inventoryItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryItemsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get(InventoryItemsRepository);
  });

  it('creates inventory items through PrismaService', async () => {
    await repository.createItem({
      itemNumber: 'INV-FOOD-0001',
      name: 'Basmati Rice',
      type: InventoryItemType.FOOD,
      unitOfMeasure: 'KG',
    });

    expect(prisma.inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          itemNumber: 'INV-FOOD-0001',
          name: 'Basmati Rice',
          type: InventoryItemType.FOOD,
          unitOfMeasure: 'KG',
        },
      }),
    );
  });

  it('finds inventory items by id and item number', async () => {
    await repository.findItem(7);
    await repository.findItemByNumber('INV-FOOD-0001', 7);

    expect(prisma.inventoryItem.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 } }),
    );
    expect(prisma.inventoryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          itemNumber: 'INV-FOOD-0001',
          id: { not: 7 },
        },
      }),
    );
  });

  it('lists items with pagination and filters', async () => {
    prisma.inventoryItem.count.mockResolvedValue(0);
    prisma.inventoryItem.findMany.mockResolvedValue([]);

    await repository.listItems({
      skip: 20,
      take: 20,
      search: 'rice',
      status: InventoryItemStatus.ACTIVE,
      type: InventoryItemType.FOOD,
      category: 'Dry Goods',
    });

    expect(prisma.inventoryItem.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: InventoryItemStatus.ACTIVE,
        type: InventoryItemType.FOOD,
        category: {
          equals: 'Dry Goods',
          mode: 'insensitive',
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [{ itemNumber: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates inventory items through PrismaService', async () => {
    await repository.updateItem(7, {
      status: InventoryItemStatus.INACTIVE,
    });

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { status: InventoryItemStatus.INACTIVE },
      }),
    );
  });
});
