/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryLocationsRepository } from './inventory-locations.repository';

describe('InventoryLocationsRepository', () => {
  let repository: InventoryLocationsRepository;
  let prisma: {
    inventoryLocation: {
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
      inventoryLocation: {
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
        InventoryLocationsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get(InventoryLocationsRepository);
  });

  it('creates an inventory location through PrismaService', async () => {
    await repository.createLocation({
      name: 'Main Store',
      code: 'MAIN-STORE',
    });

    expect(prisma.inventoryLocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Main Store',
          code: 'MAIN-STORE',
        },
      }),
    );
  });

  it('finds locations by id and normalized code', async () => {
    await repository.findLocation(4);
    await repository.findLocationByCode('MAIN-STORE', 4);

    expect(prisma.inventoryLocation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 4 } }),
    );
    expect(prisma.inventoryLocation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          code: 'MAIN-STORE',
          id: { not: 4 },
        },
      }),
    );
  });

});
