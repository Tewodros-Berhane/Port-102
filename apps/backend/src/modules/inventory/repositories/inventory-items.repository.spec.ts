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

});
