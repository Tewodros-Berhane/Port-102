/* eslint-disable @typescript-eslint/unbound-method */
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';

import { REQUIRED_PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let inventoryService: {
    createItem: jest.Mock;
    listItems: jest.Mock;
    getItemById: jest.Mock;
    updateItem: jest.Mock;
    deactivateItem: jest.Mock;
    createLocation: jest.Mock;
    listLocations: jest.Mock;
    getLocationById: jest.Mock;
    updateLocation: jest.Mock;
    deactivateLocation: jest.Mock;
    listStockBalances: jest.Mock;
    getStockBalancesByItem: jest.Mock;
    listStockMovements: jest.Mock;
    receiveStock: jest.Mock;
    issueStock: jest.Mock;
    transferStock: jest.Mock;
    createStockAdjustment: jest.Mock;
    listStockAdjustments: jest.Mock;
    getStockAdjustmentById: jest.Mock;
    approveStockAdjustment: jest.Mock;
    rejectStockAdjustment: jest.Mock;
    cancelStockAdjustment: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    inventoryService = {
      createItem: jest.fn(),
      listItems: jest.fn(),
      getItemById: jest.fn(),
      updateItem: jest.fn(),
      deactivateItem: jest.fn(),
      createLocation: jest.fn(),
      listLocations: jest.fn(),
      getLocationById: jest.fn(),
      updateLocation: jest.fn(),
      deactivateLocation: jest.fn(),
      listStockBalances: jest.fn(),
      getStockBalancesByItem: jest.fn(),
      listStockMovements: jest.fn(),
      receiveStock: jest.fn(),
      issueStock: jest.fn(),
      transferStock: jest.fn(),
      createStockAdjustment: jest.fn(),
      listStockAdjustments: jest.fn(),
      getStockAdjustmentById: jest.fn(),
      approveStockAdjustment: jest.fn(),
      rejectStockAdjustment: jest.fn(),
      cancelStockAdjustment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: inventoryService,
        },
        {
          provide: PrismaService,
          useValue: {
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get(InventoryController);
  });

  it('protects inventory routes with auth and permission guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, InventoryController)).toEqual([
      JwtAuthGuard,
      PermissionsGuard,
    ]);
  });

  it('declares inventory location permissions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.createLocation,
      ),
    ).toEqual(['inventory.items.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.listLocations,
      ),
    ).toEqual(['inventory.items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.getLocationById,
      ),
    ).toEqual(['inventory.items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.updateLocation,
      ),
    ).toEqual(['inventory.items.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.deactivateLocation,
      ),
    ).toEqual(['inventory.items.delete']);
  });

  it('declares inventory item permissions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.createItem,
      ),
    ).toEqual(['inventory.items.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.listItems,
      ),
    ).toEqual(['inventory.items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.getItemById,
      ),
    ).toEqual(['inventory.items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.updateItem,
      ),
    ).toEqual(['inventory.items.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.deactivateItem,
      ),
    ).toEqual(['inventory.items.delete']);
  });

  it('declares stock operation permissions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.listStockBalances,
      ),
    ).toEqual(['inventory.items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.getStockBalancesByItem,
      ),
    ).toEqual(['inventory.items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.listStockMovements,
      ),
    ).toEqual(['inventory.movements.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.receiveStock,
      ),
    ).toEqual(['inventory.stock.receive']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.issueStock,
      ),
    ).toEqual(['inventory.stock.issue']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.transferStock,
      ),
    ).toEqual(['inventory.stock.transfer']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.createStockAdjustment,
      ),
    ).toEqual(['inventory.stock.adjust.request']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.approveStockAdjustment,
      ),
    ).toEqual(['inventory.stock.adjust.approve']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.rejectStockAdjustment,
      ),
    ).toEqual(['inventory.stock.adjust.approve']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InventoryController.prototype.cancelStockAdjustment,
      ),
    ).toEqual(['inventory.stock.adjust.request']);
  });

  it('delegates stock balance and movement queries', async () => {
    const balanceQuery = { page: 1, limit: 20, locationId: 4 };
    const movementQuery = { page: 1, limit: 20 };
    inventoryService.listStockBalances.mockResolvedValue({ items: [] });
    inventoryService.getStockBalancesByItem.mockResolvedValue({ items: [] });
    inventoryService.listStockMovements.mockResolvedValue({ items: [] });

    await controller.listStockBalances(currentUser, balanceQuery);
    await controller.getStockBalancesByItem(currentUser, 7, balanceQuery);
    await controller.listStockMovements(currentUser, movementQuery);

    expect(inventoryService.listStockBalances).toHaveBeenCalledWith(
      currentUser,
      balanceQuery,
    );
    expect(inventoryService.getStockBalancesByItem).toHaveBeenCalledWith(
      currentUser,
      7,
      balanceQuery,
    );
    expect(inventoryService.listStockMovements).toHaveBeenCalledWith(
      currentUser,
      movementQuery,
    );
  });

  it('delegates stock receipt creation', async () => {
    const dto = {
      itemId: 7,
      locationId: 4,
      quantity: 25,
      unitCost: 150,
    };
    inventoryService.receiveStock.mockResolvedValue({ movement: { id: 9 } });

    await controller.receiveStock(currentUser, dto);

    expect(inventoryService.receiveStock).toHaveBeenCalledWith(
      currentUser,
      dto,
    );
  });

  it('delegates stock issue creation', async () => {
    const dto = {
      itemId: 7,
      locationId: 4,
      quantity: 10,
      referenceType: 'DEPARTMENT',
      referenceId: 6,
    };
    inventoryService.issueStock.mockResolvedValue({ movement: { id: 10 } });

    await controller.issueStock(currentUser, dto);

    expect(inventoryService.issueStock).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates stock transfer creation', async () => {
    const dto = {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 5,
      quantity: 8,
    };
    inventoryService.transferStock.mockResolvedValue({
      transferOutMovement: { id: 11 },
    });

    await controller.transferStock(currentUser, dto);

    expect(inventoryService.transferStock).toHaveBeenCalledWith(
      currentUser,
      dto,
    );
  });

  it('delegates stock adjustment operations', async () => {
    const createDto = {
      itemId: 7,
      locationId: 4,
      quantity: -2,
      reason: 'Physical count variance.',
    };
    const query = { page: 1, limit: 20 };
    inventoryService.createStockAdjustment.mockResolvedValue({ id: 3 });
    inventoryService.listStockAdjustments.mockResolvedValue({ items: [] });
    inventoryService.getStockAdjustmentById.mockResolvedValue({ id: 3 });
    inventoryService.approveStockAdjustment.mockResolvedValue({ id: 3 });
    inventoryService.rejectStockAdjustment.mockResolvedValue({ id: 3 });
    inventoryService.cancelStockAdjustment.mockResolvedValue({ id: 3 });

    await controller.createStockAdjustment(currentUser, createDto);
    await controller.listStockAdjustments(currentUser, query);
    await controller.getStockAdjustmentById(currentUser, 3);
    await controller.approveStockAdjustment(currentUser, 3, {
      decisionNote: 'Approved.',
    });
    await controller.rejectStockAdjustment(currentUser, 3, {
      decisionNote: 'Rejected.',
    });
    await controller.cancelStockAdjustment(currentUser, 3, {
      decisionNote: 'Cancelled.',
    });

    expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(inventoryService.listStockAdjustments).toHaveBeenCalledWith(
      currentUser,
      query,
    );
    expect(inventoryService.getStockAdjustmentById).toHaveBeenCalledWith(
      currentUser,
      3,
    );
    expect(inventoryService.approveStockAdjustment).toHaveBeenCalledWith(
      currentUser,
      3,
      { decisionNote: 'Approved.' },
    );
    expect(inventoryService.rejectStockAdjustment).toHaveBeenCalledWith(
      currentUser,
      3,
      { decisionNote: 'Rejected.' },
    );
    expect(inventoryService.cancelStockAdjustment).toHaveBeenCalledWith(
      currentUser,
      3,
      { decisionNote: 'Cancelled.' },
    );
  });

  it('delegates inventory item operations to InventoryService', async () => {
    const createDto = {
      itemNumber: 'INV-FOOD-0001',
      name: 'Basmati Rice',
      type: 'FOOD' as const,
      unitOfMeasure: 'KG',
    };
    const query = { page: 1, limit: 20 };
    const item = { id: 7, ...createDto };
    inventoryService.createItem.mockResolvedValue(item);
    inventoryService.listItems.mockResolvedValue({
      items: [item],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    inventoryService.getItemById.mockResolvedValue(item);
    inventoryService.updateItem.mockResolvedValue(item);
    inventoryService.deactivateItem.mockResolvedValue({
      ...item,
      status: 'INACTIVE',
    });

    await controller.createItem(currentUser, createDto);
    await controller.listItems(currentUser, query);
    await controller.getItemById(currentUser, 7);
    await controller.updateItem(currentUser, 7, { name: 'Premium Rice' });
    await controller.deactivateItem(currentUser, 7);

    expect(inventoryService.createItem).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(inventoryService.listItems).toHaveBeenCalledWith(currentUser, query);
    expect(inventoryService.getItemById).toHaveBeenCalledWith(currentUser, 7);
    expect(inventoryService.updateItem).toHaveBeenCalledWith(currentUser, 7, {
      name: 'Premium Rice',
    });
    expect(inventoryService.deactivateItem).toHaveBeenCalledWith(
      currentUser,
      7,
    );
  });

  it('delegates location operations to InventoryService', async () => {
    const createDto = {
      name: 'Main Store',
      code: 'MAIN-STORE',
    };
    const query = {
      page: 1,
      limit: 20,
    };
    const location = {
      id: 4,
      ...createDto,
    };
    inventoryService.createLocation.mockResolvedValue(location);
    inventoryService.listLocations.mockResolvedValue({
      items: [location],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    inventoryService.getLocationById.mockResolvedValue(location);
    inventoryService.updateLocation.mockResolvedValue(location);
    inventoryService.deactivateLocation.mockResolvedValue({
      ...location,
      isActive: false,
    });

    await controller.createLocation(currentUser, createDto);
    await controller.listLocations(currentUser, query);
    await controller.getLocationById(currentUser, 4);
    await controller.updateLocation(currentUser, 4, {
      name: 'Central Store',
    });
    await controller.deactivateLocation(currentUser, 4);

    expect(inventoryService.createLocation).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(inventoryService.listLocations).toHaveBeenCalledWith(
      currentUser,
      query,
    );
    expect(inventoryService.getLocationById).toHaveBeenCalledWith(
      currentUser,
      4,
    );
    expect(inventoryService.updateLocation).toHaveBeenCalledWith(
      currentUser,
      4,
      { name: 'Central Store' },
    );
    expect(inventoryService.deactivateLocation).toHaveBeenCalledWith(
      currentUser,
      4,
    );
  });
});
