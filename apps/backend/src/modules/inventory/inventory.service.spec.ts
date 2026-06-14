import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  InventoryItemStatus,
  InventoryItemType,
  Prisma,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InventoryService } from './inventory.service';
import { InventoryItemsRepository } from './repositories/inventory-items.repository';
import { InventoryLocationsRepository } from './repositories/inventory-locations.repository';

describe('InventoryService', () => {
  let service: InventoryService;
  let locationsRepository: {
    createLocation: jest.Mock;
    findLocation: jest.Mock;
    findLocationByCode: jest.Mock;
    listLocations: jest.Mock;
    updateLocation: jest.Mock;
  };
  let itemsRepository: {
    createItem: jest.Mock;
    findItem: jest.Mock;
    findItemByNumber: jest.Mock;
    listItems: jest.Mock;
    updateItem: jest.Mock;
  };
  let auditLogsService: { record: jest.Mock };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };
  const location = {
    id: 4,
    name: 'Main Store',
    code: 'MAIN-STORE',
    description: null,
    isActive: true,
    createdAt: new Date('2026-06-14T06:00:00.000Z'),
    updatedAt: new Date('2026-06-14T06:00:00.000Z'),
  };
  const item = {
    id: 7,
    itemNumber: 'INV-FOOD-0001',
    name: 'Basmati Rice',
    type: InventoryItemType.FOOD,
    category: 'Dry Goods',
    unitOfMeasure: 'KG',
    reorderLevel: new Prisma.Decimal(25),
    reorderQuantity: new Prisma.Decimal(100),
    averageCost: new Prisma.Decimal(145.5),
    status: InventoryItemStatus.ACTIVE,
    description: null,
    createdAt: new Date('2026-06-14T06:00:00.000Z'),
    updatedAt: new Date('2026-06-14T06:00:00.000Z'),
  };
  const serializedItem = {
    ...item,
    reorderLevel: '25.00',
    reorderQuantity: '100.00',
    averageCost: '145.50',
  };

  beforeEach(async () => {
    locationsRepository = {
      createLocation: jest.fn(),
      findLocation: jest.fn(),
      findLocationByCode: jest.fn(),
      listLocations: jest.fn(),
      updateLocation: jest.fn(),
    };
    itemsRepository = {
      createItem: jest.fn(),
      findItem: jest.fn(),
      findItemByNumber: jest.fn(),
      listItems: jest.fn(),
      updateItem: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryLocationsRepository,
          useValue: locationsRepository,
        },
        {
          provide: InventoryItemsRepository,
          useValue: itemsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  it('creates a normalized inventory item and records an audit log', async () => {
    itemsRepository.findItemByNumber.mockResolvedValue(null);
    itemsRepository.createItem.mockResolvedValue(item);

    await expect(
      service.createItem(currentUser, {
        itemNumber: ' inv-food-0001 ',
        name: ' Basmati Rice ',
        type: InventoryItemType.FOOD,
        category: ' Dry Goods ',
        unitOfMeasure: ' KG ',
        reorderLevel: 25,
        reorderQuantity: 100,
        averageCost: 145.5,
      }),
    ).resolves.toEqual(serializedItem);

    expect(itemsRepository.createItem).toHaveBeenCalledWith({
      itemNumber: 'INV-FOOD-0001',
      name: 'Basmati Rice',
      type: InventoryItemType.FOOD,
      category: 'Dry Goods',
      unitOfMeasure: 'KG',
      reorderLevel: new Prisma.Decimal(25),
      reorderQuantity: new Prisma.Decimal(100),
      averageCost: new Prisma.Decimal(145.5),
      status: InventoryItemStatus.ACTIVE,
      description: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.items.created',
        entityType: 'InventoryItem',
        entityId: '7',
      }),
    );
  });

});
