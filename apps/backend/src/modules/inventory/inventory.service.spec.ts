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

  it('rejects a duplicate inventory item number', async () => {
    itemsRepository.findItemByNumber.mockResolvedValue(item);

    await expect(
      service.createItem(currentUser, {
        itemNumber: 'inv-food-0001',
        name: 'Duplicate Rice',
        type: InventoryItemType.FOOD,
        unitOfMeasure: 'KG',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(itemsRepository.createItem).not.toHaveBeenCalled();
  });

  it('lists serialized items with normalized filters and pagination', async () => {
    itemsRepository.listItems.mockResolvedValue([1, [item]]);

    await expect(
      service.listItems(currentUser, {
        page: 2,
        limit: 10,
        search: ' rice ',
        status: InventoryItemStatus.ACTIVE,
        type: InventoryItemType.FOOD,
        category: ' Dry Goods ',
      }),
    ).resolves.toEqual({
      items: [serializedItem],
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(itemsRepository.listItems).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'rice',
      status: InventoryItemStatus.ACTIVE,
      type: InventoryItemType.FOOD,
      category: 'Dry Goods',
    });
  });

  it('throws when an inventory item does not exist', async () => {
    itemsRepository.findItem.mockResolvedValue(null);

    await expect(service.getItemById(currentUser, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates item master data and audits previous and current values', async () => {
    const updatedItem = {
      ...item,
      itemNumber: 'INV-FOOD-0099',
      name: 'Premium Rice',
      reorderLevel: null,
    };
    itemsRepository.findItem.mockResolvedValue(item);
    itemsRepository.findItemByNumber.mockResolvedValue(null);
    itemsRepository.updateItem.mockResolvedValue(updatedItem);

    await expect(
      service.updateItem(currentUser, item.id, {
        itemNumber: ' inv-food-0099 ',
        name: ' Premium Rice ',
        reorderLevel: null,
      }),
    ).resolves.toEqual({
      ...updatedItem,
      reorderLevel: null,
      reorderQuantity: '100.00',
      averageCost: '145.50',
    });

    expect(itemsRepository.findItemByNumber).toHaveBeenCalledWith(
      'INV-FOOD-0099',
      item.id,
    );
    expect(itemsRepository.updateItem).toHaveBeenCalledWith(item.id, {
      itemNumber: 'INV-FOOD-0099',
      name: 'Premium Rice',
      reorderLevel: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.items.updated',
      }),
    );
  });

  it('soft-deactivates an inventory item and audits the change', async () => {
    const inactiveItem = {
      ...item,
      status: InventoryItemStatus.INACTIVE,
    };
    itemsRepository.findItem.mockResolvedValue(item);
    itemsRepository.updateItem.mockResolvedValue(inactiveItem);

    await expect(service.deactivateItem(currentUser, item.id)).resolves.toEqual(
      {
        ...inactiveItem,
        reorderLevel: '25.00',
        reorderQuantity: '100.00',
        averageCost: '145.50',
      },
    );

    expect(itemsRepository.updateItem).toHaveBeenCalledWith(item.id, {
      status: InventoryItemStatus.INACTIVE,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.items.deactivated',
      }),
    );
  });

  it('returns an inactive item without another write', async () => {
    const inactiveItem = {
      ...item,
      status: InventoryItemStatus.INACTIVE,
    };
    itemsRepository.findItem.mockResolvedValue(inactiveItem);

    await service.deactivateItem(currentUser, item.id);

    expect(itemsRepository.updateItem).not.toHaveBeenCalled();
    expect(auditLogsService.record).not.toHaveBeenCalled();
  });

  it('creates a normalized location and records an audit log', async () => {
    locationsRepository.findLocationByCode.mockResolvedValue(null);
    locationsRepository.createLocation.mockResolvedValue(location);

    await expect(
      service.createLocation(currentUser, {
        name: ' Main Store ',
        code: ' main-store ',
        description: ' Primary store ',
      }),
    ).resolves.toEqual(location);

    expect(locationsRepository.createLocation).toHaveBeenCalledWith({
      name: 'Main Store',
      code: 'MAIN-STORE',
      description: 'Primary store',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: currentUser.sub,
        action: 'inventory.locations.created',
        entityType: 'InventoryLocation',
        entityId: '4',
      }),
    );
  });

  it('rejects a duplicate location code', async () => {
    locationsRepository.findLocationByCode.mockResolvedValue(location);

    await expect(
      service.createLocation(currentUser, {
        name: 'Duplicate Store',
        code: 'main-store',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(locationsRepository.createLocation).not.toHaveBeenCalled();
  });

  it('lists locations with normalized search and pagination', async () => {
    locationsRepository.listLocations.mockResolvedValue([1, [location]]);

    await expect(
      service.listLocations(currentUser, {
        page: 2,
        limit: 10,
        search: ' main ',
        isActive: true,
      }),
    ).resolves.toEqual({
      items: [location],
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(locationsRepository.listLocations).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'main',
      isActive: true,
    });
  });

  it('throws when an inventory location does not exist', async () => {
    locationsRepository.findLocation.mockResolvedValue(null);

    await expect(
      service.getLocationById(currentUser, 99),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a location and records previous and current values', async () => {
    const updatedLocation = {
      ...location,
      name: 'Central Store',
      code: 'CENTRAL',
    };
    locationsRepository.findLocation.mockResolvedValue(location);
    locationsRepository.findLocationByCode.mockResolvedValue(null);
    locationsRepository.updateLocation.mockResolvedValue(updatedLocation);

    await expect(
      service.updateLocation(currentUser, location.id, {
        name: ' Central Store ',
        code: ' central ',
      }),
    ).resolves.toEqual(updatedLocation);

    expect(locationsRepository.findLocationByCode).toHaveBeenCalledWith(
      'CENTRAL',
      location.id,
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.locations.updated',
        metadata: {
          previous: {
            name: 'Main Store',
            code: 'MAIN-STORE',
            description: null,
            isActive: true,
          },
          current: {
            name: 'Central Store',
            code: 'CENTRAL',
            description: null,
            isActive: true,
          },
        },
      }),
    );
  });

  it('soft-deactivates a location and audits the change', async () => {
    const inactiveLocation = { ...location, isActive: false };
    locationsRepository.findLocation.mockResolvedValue(location);
    locationsRepository.updateLocation.mockResolvedValue(inactiveLocation);

    await expect(
      service.deactivateLocation(currentUser, location.id),
    ).resolves.toEqual(inactiveLocation);

    expect(locationsRepository.updateLocation).toHaveBeenCalledWith(
      location.id,
      { isActive: false },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.locations.deactivated',
      }),
    );
  });

});
