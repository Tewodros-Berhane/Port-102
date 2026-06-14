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

});
