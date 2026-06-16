import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  InventoryItemStatus,
  InventoryItemType,
  Prisma,
  StockAdjustmentStatus,
  StockMovementType,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InventoryService } from './inventory.service';
import { InventoryItemsRepository } from './repositories/inventory-items.repository';
import { InventoryLocationsRepository } from './repositories/inventory-locations.repository';
import { StockAdjustmentsRepository } from './repositories/stock-adjustments.repository';
import { StockBalancesRepository } from './repositories/stock-balances.repository';
import { StockIssuesRepository } from './repositories/stock-issues.repository';
import { StockMovementsRepository } from './repositories/stock-movements.repository';
import { StockReceiptsRepository } from './repositories/stock-receipts.repository';
import { StockTransfersRepository } from './repositories/stock-transfers.repository';

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
  let balancesRepository: {
    listBalances: jest.Mock;
  };
  let movementsRepository: {
    listMovements: jest.Mock;
    findByMovementNumber: jest.Mock;
  };
  let receiptsRepository: {
    receiveStock: jest.Mock;
  };
  let issuesRepository: {
    issueStock: jest.Mock;
  };
  let transfersRepository: {
    transferStock: jest.Mock;
  };
  let adjustmentsRepository: {
    listAdjustments: jest.Mock;
    findAdjustment: jest.Mock;
    findByAdjustmentNumber: jest.Mock;
    createAdjustment: jest.Mock;
    approveAdjustment: jest.Mock;
    rejectAdjustment: jest.Mock;
    cancelAdjustment: jest.Mock;
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
  const adjustmentRecord = {
    id: 3,
    adjustmentNumber: 'ADJ-20260616-000001',
    itemId: 7,
    locationId: 4,
    status: StockAdjustmentStatus.PENDING,
    quantity: new Prisma.Decimal(-2),
    reason: 'Physical count variance.',
    requestedByUserId: 1,
    approvedByUserId: null,
    rejectedByUserId: null,
    decidedAt: null,
    decisionNote: null,
    createdAt: new Date('2026-06-16T06:00:00.000Z'),
    updatedAt: new Date('2026-06-16T06:00:00.000Z'),
    item: {
      id: 7,
      itemNumber: item.itemNumber,
      name: item.name,
      unitOfMeasure: item.unitOfMeasure,
      averageCost: item.averageCost,
      status: item.status,
    },
    location: {
      id: 4,
      code: location.code,
      name: location.name,
      isActive: true,
    },
    requestedBy: null,
    approvedBy: null,
    rejectedBy: null,
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
    balancesRepository = {
      listBalances: jest.fn(),
    };
    movementsRepository = {
      listMovements: jest.fn(),
      findByMovementNumber: jest.fn(),
    };
    receiptsRepository = {
      receiveStock: jest.fn(),
    };
    issuesRepository = {
      issueStock: jest.fn(),
    };
    transfersRepository = {
      transferStock: jest.fn(),
    };
    adjustmentsRepository = {
      listAdjustments: jest.fn(),
      findAdjustment: jest.fn(),
      findByAdjustmentNumber: jest.fn(),
      createAdjustment: jest.fn(),
      approveAdjustment: jest.fn(),
      rejectAdjustment: jest.fn(),
      cancelAdjustment: jest.fn(),
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
          provide: StockAdjustmentsRepository,
          useValue: adjustmentsRepository,
        },
        {
          provide: StockBalancesRepository,
          useValue: balancesRepository,
        },
        {
          provide: StockMovementsRepository,
          useValue: movementsRepository,
        },
        {
          provide: StockReceiptsRepository,
          useValue: receiptsRepository,
        },
        {
          provide: StockIssuesRepository,
          useValue: issuesRepository,
        },
        {
          provide: StockTransfersRepository,
          useValue: transfersRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  it('lists and serializes stock balances', async () => {
    const balance = {
      id: 1,
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(25),
      updatedAt: new Date('2026-06-15T08:00:00.000Z'),
      item: {
        id: 7,
        itemNumber: 'INV-FOOD-0001',
        name: 'Basmati Rice',
        type: InventoryItemType.FOOD,
        category: 'Dry Goods',
        unitOfMeasure: 'KG',
        averageCost: new Prisma.Decimal(145.5),
        status: InventoryItemStatus.ACTIVE,
      },
      location: {
        id: 4,
        code: 'MAIN-STORE',
        name: 'Main Store',
        isActive: true,
      },
    };
    balancesRepository.listBalances.mockResolvedValue([1, [balance]]);

    await expect(
      service.listStockBalances(currentUser, {
        page: 2,
        limit: 10,
        search: ' rice ',
        locationId: 4,
      }),
    ).resolves.toEqual({
      items: [
        {
          ...balance,
          quantity: '25.00',
          item: {
            ...balance.item,
            averageCost: '145.50',
          },
        },
      ],
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(balancesRepository.listBalances).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'rice',
      itemId: undefined,
      locationId: 4,
    });
  });

  it('requires an existing item before listing its balances', async () => {
    itemsRepository.findItem.mockResolvedValue(null);

    await expect(
      service.getStockBalancesByItem(currentUser, 99, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(balancesRepository.listBalances).not.toHaveBeenCalled();
  });

  it('lists movements with normalized filters and decimal serialization', async () => {
    const movement = {
      id: 9,
      movementNumber: 'MOV-20260615-000001',
      itemId: 7,
      locationId: 4,
      fromLocationId: null,
      toLocationId: null,
      type: StockMovementType.RECEIPT,
      quantity: new Prisma.Decimal(5),
      unitCost: new Prisma.Decimal(150),
      totalCost: new Prisma.Decimal(750),
      referenceType: 'DELIVERY',
      referenceId: 42,
      reason: null,
      notes: null,
      createdByUserId: 1,
      createdAt: new Date('2026-06-15T08:00:00.000Z'),
      item: {
        id: 7,
        itemNumber: 'INV-FOOD-0001',
        name: 'Basmati Rice',
        unitOfMeasure: 'KG',
      },
      location: { id: 4, code: 'MAIN-STORE', name: 'Main Store' },
      fromLocation: null,
      toLocation: null,
      createdBy: {
        id: 1,
        email: 'admin@demo-hotel.com',
        fullName: 'Hotel Admin',
      },
    };
    movementsRepository.listMovements.mockResolvedValue([1, [movement]]);

    await expect(
      service.listStockMovements(currentUser, {
        page: 1,
        limit: 20,
        search: ' delivery ',
        type: StockMovementType.RECEIPT,
        createdFrom: '2026-06-01T00:00:00.000Z',
        createdTo: '2026-06-30T23:59:59.999Z',
      }),
    ).resolves.toEqual({
      items: [
        {
          ...movement,
          quantity: '5.00',
          unitCost: '150.00',
          totalCost: '750.00',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('rejects an inverted movement date range', async () => {
    await expect(
      service.listStockMovements(currentUser, {
        page: 1,
        limit: 20,
        createdFrom: '2026-06-30T00:00:00.000Z',
        createdTo: '2026-06-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(
      'Movement createdFrom must be before or equal to createdTo.',
    );
  });

  it('receives stock, returns updated values, and records an audit log', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue(location);
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    const movement = {
      id: 9,
      movementNumber: 'MOV-20260615-000001',
      itemId: 7,
      locationId: 4,
      fromLocationId: null,
      toLocationId: null,
      type: StockMovementType.RECEIPT,
      quantity: new Prisma.Decimal(5),
      unitCost: new Prisma.Decimal(150),
      totalCost: new Prisma.Decimal(750),
      referenceType: null,
      referenceId: null,
      reason: null,
      notes: null,
      createdByUserId: 1,
      createdAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
      },
      location: { id: 4, code: location.code, name: location.name },
      fromLocation: null,
      toLocation: null,
      createdBy: null,
    };
    const balance = {
      id: 1,
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(15),
      updatedAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        type: item.type,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        averageCost: new Prisma.Decimal('147.00'),
        status: item.status,
      },
      location: {
        id: 4,
        code: location.code,
        name: location.name,
        isActive: true,
      },
    };
    receiptsRepository.receiveStock.mockResolvedValue({
      movement,
      balance,
      averageCost: new Prisma.Decimal('147.00'),
    });

    const result = await service.receiveStock(currentUser, {
      itemId: 7,
      locationId: 4,
      quantity: 5,
      unitCost: 150,
    });

    expect(result.averageCost).toBe('147.00');
    expect(result.balance.quantity).toBe('15.00');
    expect(result.movement.totalCost).toBe('750.00');
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.stock.received',
        entityType: 'StockMovement',
        entityId: '9',
      }),
    );
  });

  it('rejects receipts for inactive items', async () => {
    itemsRepository.findItem.mockResolvedValue({
      ...item,
      status: InventoryItemStatus.INACTIVE,
    });
    locationsRepository.findLocation.mockResolvedValue(location);

    await expect(
      service.receiveStock(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: 5,
      }),
    ).rejects.toThrow('Inactive inventory item cannot receive stock.');
  });

  it('rejects receipts for inactive locations', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue({
      ...location,
      isActive: false,
    });

    await expect(
      service.receiveStock(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: 5,
      }),
    ).rejects.toThrow('Inactive inventory location cannot receive stock.');
  });

  it('rejects a receipt when active state changes during its transaction', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue(location);
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    receiptsRepository.receiveStock.mockResolvedValue(null);

    await expect(
      service.receiveStock(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: 5,
      }),
    ).rejects.toThrow(
      'Inventory item or location became inactive before stock was received.',
    );
  });

  it('issues stock, returns updated values, and records an audit log', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue(location);
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    const movement = {
      id: 10,
      movementNumber: 'MOV-20260615-000002',
      itemId: 7,
      locationId: 4,
      fromLocationId: null,
      toLocationId: null,
      type: StockMovementType.ISSUE,
      quantity: new Prisma.Decimal(10),
      unitCost: new Prisma.Decimal(145.5),
      totalCost: new Prisma.Decimal(1455),
      referenceType: 'DEPARTMENT',
      referenceId: 6,
      reason: 'Issued to the main kitchen.',
      notes: null,
      createdByUserId: 1,
      createdAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
      },
      location: { id: 4, code: location.code, name: location.name },
      fromLocation: null,
      toLocation: null,
      createdBy: null,
    };
    const balance = {
      id: 1,
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(15),
      updatedAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        type: item.type,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        averageCost: item.averageCost,
        status: item.status,
      },
      location: {
        id: 4,
        code: location.code,
        name: location.name,
        isActive: true,
      },
    };
    issuesRepository.issueStock.mockResolvedValue({
      status: 'ISSUED',
      movement,
      balance,
    });

    const result = await service.issueStock(currentUser, {
      itemId: 7,
      locationId: 4,
      quantity: 10,
      referenceType: ' DEPARTMENT ',
      referenceId: 6,
      reason: ' Issued to the main kitchen. ',
    });

    expect(result.balance.quantity).toBe('15.00');
    expect(result.movement.type).toBe(StockMovementType.ISSUE);
    expect(result.movement.totalCost).toBe('1455.00');
    expect(issuesRepository.issueStock).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 7,
        locationId: 4,
        quantity: new Prisma.Decimal(10),
        referenceType: 'DEPARTMENT',
        reason: 'Issued to the main kitchen.',
        createdByUserId: currentUser.sub,
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.stock.issued',
        entityType: 'StockMovement',
        entityId: '10',
      }),
    );
  });

  it('rejects stock issues for inactive items and locations', async () => {
    itemsRepository.findItem.mockResolvedValue({
      ...item,
      status: InventoryItemStatus.INACTIVE,
    });
    locationsRepository.findLocation.mockResolvedValue(location);

    await expect(
      service.issueStock(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: 1,
      }),
    ).rejects.toThrow('Inactive inventory item cannot issue stock.');

    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue({
      ...location,
      isActive: false,
    });

    await expect(
      service.issueStock(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: 1,
      }),
    ).rejects.toThrow('Inactive inventory location cannot issue stock.');
  });

  it('reports available quantity when stock is insufficient', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue(location);
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    issuesRepository.issueStock.mockResolvedValue({
      status: 'INSUFFICIENT',
      availableQuantity: new Prisma.Decimal(5),
    });

    await expect(
      service.issueStock(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: 10,
      }),
    ).rejects.toThrow('Insufficient stock. Available quantity is 5.00.');

    expect(auditLogsService.record).not.toHaveBeenCalled();
  });

  it('rejects an issue when active state changes during its transaction', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue(location);
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    issuesRepository.issueStock.mockResolvedValue({ status: 'INACTIVE' });

    await expect(
      service.issueStock(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: 1,
      }),
    ).rejects.toThrow(
      'Inventory item or location became inactive before stock was issued.',
    );
  });

  it('transfers stock between active locations and records an audit log', async () => {
    const toLocation = { ...location, id: 5, code: 'KITCHEN' };
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation
      .mockResolvedValueOnce(location)
      .mockResolvedValueOnce(toLocation);
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    const transferOutMovement = {
      id: 11,
      movementNumber: 'MOV-20260616-000001',
      itemId: 7,
      locationId: null,
      fromLocationId: 4,
      toLocationId: 5,
      type: StockMovementType.TRANSFER_OUT,
      quantity: new Prisma.Decimal(8),
      unitCost: item.averageCost,
      totalCost: new Prisma.Decimal(1164),
      referenceType: null,
      referenceId: null,
      reason: null,
      notes: null,
      createdByUserId: 1,
      createdAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
      },
      location: null,
      fromLocation: { id: 4, code: location.code, name: location.name },
      toLocation: { id: 5, code: toLocation.code, name: toLocation.name },
      createdBy: null,
    };
    const transferInMovement = {
      ...transferOutMovement,
      id: 12,
      movementNumber: 'MOV-20260616-000002',
      type: StockMovementType.TRANSFER_IN,
    };
    const fromBalance = {
      id: 1,
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(12),
      updatedAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        type: item.type,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        averageCost: item.averageCost,
        status: item.status,
      },
      location: {
        id: 4,
        code: location.code,
        name: location.name,
        isActive: true,
      },
    };
    const toBalance = {
      ...fromBalance,
      id: 2,
      locationId: 5,
      quantity: new Prisma.Decimal(8),
      location: {
        id: 5,
        code: toLocation.code,
        name: toLocation.name,
        isActive: true,
      },
    };
    transfersRepository.transferStock.mockResolvedValue({
      status: 'TRANSFERRED',
      fromBalance,
      toBalance,
      transferOutMovement,
      transferInMovement,
    });

    const result = await service.transferStock(currentUser, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 5,
      quantity: 8,
    });

    expect(result.fromBalance.quantity).toBe('12.00');
    expect(result.toBalance.quantity).toBe('8.00');
    expect(result.transferOutMovement.type).toBe(
      StockMovementType.TRANSFER_OUT,
    );
    expect(transfersRepository.transferStock).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 7,
        fromLocationId: 4,
        toLocationId: 5,
        quantity: new Prisma.Decimal(8),
        createdByUserId: currentUser.sub,
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.stock.transferred',
        entityType: 'StockMovement',
        entityId: '11',
      }),
    );
  });

  it('rejects transfers between the same location', async () => {
    await expect(
      service.transferStock(currentUser, {
        itemId: 7,
        fromLocationId: 4,
        toLocationId: 4,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transfersRepository.transferStock).not.toHaveBeenCalled();
  });

  it('reports available quantity when transfer stock is insufficient', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation
      .mockResolvedValueOnce(location)
      .mockResolvedValueOnce({ ...location, id: 5, code: 'KITCHEN' });
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    transfersRepository.transferStock.mockResolvedValue({
      status: 'INSUFFICIENT',
      availableQuantity: new Prisma.Decimal(2),
    });

    await expect(
      service.transferStock(currentUser, {
        itemId: 7,
        fromLocationId: 4,
        toLocationId: 5,
        quantity: 8,
      }),
    ).rejects.toThrow('Insufficient stock. Available quantity is 2.00.');
  });

  it('creates a pending stock adjustment and records an audit log', async () => {
    itemsRepository.findItem.mockResolvedValue(item);
    locationsRepository.findLocation.mockResolvedValue(location);
    adjustmentsRepository.findByAdjustmentNumber.mockResolvedValue(null);
    adjustmentsRepository.createAdjustment.mockResolvedValue(adjustmentRecord);

    await expect(
      service.createStockAdjustment(currentUser, {
        itemId: 7,
        locationId: 4,
        quantity: -2,
        reason: ' Physical count variance. ',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        adjustmentNumber: 'ADJ-20260616-000001',
        quantity: '-2.00',
      }),
    );
    expect(adjustmentsRepository.createAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 7,
        locationId: 4,
        quantity: new Prisma.Decimal(-2),
        reason: 'Physical count variance.',
        requestedByUserId: currentUser.sub,
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.stock.adjustment.requested',
        entityType: 'StockAdjustment',
      }),
    );
  });

  it('lists and reads stock adjustments', async () => {
    adjustmentsRepository.listAdjustments.mockResolvedValue([
      1,
      [adjustmentRecord],
    ]);
    adjustmentsRepository.findAdjustment.mockResolvedValue(adjustmentRecord);

    await expect(
      service.listStockAdjustments(currentUser, {
        page: 2,
        limit: 10,
        search: ' rice ',
        status: StockAdjustmentStatus.PENDING,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ quantity: '-2.00' })],
      }),
    );
    await expect(
      service.getStockAdjustmentById(currentUser, 3),
    ).resolves.toEqual(expect.objectContaining({ quantity: '-2.00' }));
    expect(adjustmentsRepository.listAdjustments).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        search: 'rice',
        status: StockAdjustmentStatus.PENDING,
      }),
    );
  });

  it('approves a pending stock adjustment and records the applied movement', async () => {
    adjustmentsRepository.findAdjustment.mockResolvedValue(adjustmentRecord);
    movementsRepository.findByMovementNumber.mockResolvedValue(null);
    const balance = {
      id: 1,
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(8),
      updatedAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        type: item.type,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        averageCost: item.averageCost,
        status: item.status,
      },
      location: {
        id: 4,
        code: location.code,
        name: location.name,
        isActive: true,
      },
    };
    const movement = {
      id: 14,
      movementNumber: 'MOV-20260616-000003',
      itemId: 7,
      locationId: 4,
      fromLocationId: null,
      toLocationId: null,
      type: StockMovementType.ADJUSTMENT_OUT,
      quantity: new Prisma.Decimal(2),
      unitCost: item.averageCost,
      totalCost: new Prisma.Decimal(291),
      referenceType: 'STOCK_ADJUSTMENT',
      referenceId: 3,
      reason: adjustmentRecord.reason,
      notes: 'Approved.',
      createdByUserId: 1,
      createdAt: new Date(),
      item: {
        id: 7,
        itemNumber: item.itemNumber,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
      },
      location: { id: 4, code: location.code, name: location.name },
      fromLocation: null,
      toLocation: null,
      createdBy: null,
    };
    adjustmentsRepository.approveAdjustment.mockResolvedValue({
      status: 'APPROVED',
      adjustment: {
        ...adjustmentRecord,
        status: StockAdjustmentStatus.APPROVED,
      },
      balance,
      movement,
    });

    const result = await service.approveStockAdjustment(currentUser, 3, {
      decisionNote: ' Approved. ',
    });

    expect(result.adjustment.status).toBe(StockAdjustmentStatus.APPROVED);
    expect(result.balance.quantity).toBe('8.00');
    expect(result.movement.type).toBe(StockMovementType.ADJUSTMENT_OUT);
    expect(adjustmentsRepository.approveAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustmentId: 3,
        approvedByUserId: currentUser.sub,
        decisionNote: 'Approved.',
      }),
    );
  });

  it('rejects approval for non-pending adjustments', async () => {
    adjustmentsRepository.findAdjustment.mockResolvedValue({
      ...adjustmentRecord,
      status: StockAdjustmentStatus.APPROVED,
    });

    await expect(
      service.approveStockAdjustment(currentUser, 3, {}),
    ).rejects.toThrow('Only pending stock adjustments can be decided.');
  });

  it('rejects and cancels pending stock adjustments without stock movement', async () => {
    adjustmentsRepository.findAdjustment.mockResolvedValue(adjustmentRecord);
    adjustmentsRepository.rejectAdjustment.mockResolvedValue({
      ...adjustmentRecord,
      status: StockAdjustmentStatus.REJECTED,
      decisionNote: 'Rejected.',
    });
    adjustmentsRepository.cancelAdjustment.mockResolvedValue({
      ...adjustmentRecord,
      status: StockAdjustmentStatus.CANCELLED,
      decisionNote: 'Cancelled.',
    });

    await expect(
      service.rejectStockAdjustment(currentUser, 3, {
        decisionNote: ' Rejected. ',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ status: StockAdjustmentStatus.REJECTED }),
    );
    await expect(
      service.cancelStockAdjustment(currentUser, 3, {
        decisionNote: ' Cancelled. ',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ status: StockAdjustmentStatus.CANCELLED }),
    );
    expect(adjustmentsRepository.rejectAdjustment).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        status: StockAdjustmentStatus.REJECTED,
        decisionNote: 'Rejected.',
      }),
    );
    expect(adjustmentsRepository.cancelAdjustment).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        status: StockAdjustmentStatus.CANCELLED,
        decisionNote: 'Cancelled.',
      }),
    );
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

  it('returns an already inactive location without another write', async () => {
    const inactiveLocation = { ...location, isActive: false };
    locationsRepository.findLocation.mockResolvedValue(inactiveLocation);

    await expect(
      service.deactivateLocation(currentUser, location.id),
    ).resolves.toEqual(inactiveLocation);

    expect(locationsRepository.updateLocation).not.toHaveBeenCalled();
    expect(auditLogsService.record).not.toHaveBeenCalled();
  });
});
