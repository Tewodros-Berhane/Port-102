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

});
