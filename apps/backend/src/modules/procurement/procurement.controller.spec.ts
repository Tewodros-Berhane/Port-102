/* eslint-disable @typescript-eslint/unbound-method */
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';

import { REQUIRED_PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

describe('ProcurementController', () => {
  let controller: ProcurementController;
  let procurementService: {
    createSupplier: jest.Mock;
    listSuppliers: jest.Mock;
    getSupplierById: jest.Mock;
    updateSupplier: jest.Mock;
    deactivateSupplier: jest.Mock;
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
    procurementService = {
      createSupplier: jest.fn(),
      listSuppliers: jest.fn(),
      getSupplierById: jest.fn(),
      updateSupplier: jest.fn(),
      deactivateSupplier: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcurementController],
      providers: [
        { provide: ProcurementService, useValue: procurementService },
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

    controller = module.get(ProcurementController);
  });

  it('protects procurement routes with auth and permission guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ProcurementController)).toEqual(
      [JwtAuthGuard, PermissionsGuard],
    );
  });

  it('declares supplier permissions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ProcurementController.prototype.createSupplier,
      ),
    ).toEqual(['suppliers.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ProcurementController.prototype.listSuppliers,
      ),
    ).toEqual(['suppliers.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ProcurementController.prototype.getSupplierById,
      ),
    ).toEqual(['suppliers.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ProcurementController.prototype.updateSupplier,
      ),
    ).toEqual(['suppliers.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ProcurementController.prototype.deactivateSupplier,
      ),
    ).toEqual(['suppliers.delete']);
  });

  it('delegates supplier operations to ProcurementService', async () => {
    const createDto = {
      supplierNumber: 'SUP-0001',
      name: 'Addis Fresh Foods',
    };
    const query = { page: 1, limit: 20 };
    procurementService.createSupplier.mockResolvedValue({ id: 3 });
    procurementService.listSuppliers.mockResolvedValue({ items: [] });
    procurementService.getSupplierById.mockResolvedValue({ id: 3 });
    procurementService.updateSupplier.mockResolvedValue({ id: 3 });
    procurementService.deactivateSupplier.mockResolvedValue({ id: 3 });

    await controller.createSupplier(currentUser, createDto);
    await controller.listSuppliers(currentUser, query);
    await controller.getSupplierById(currentUser, 3);
    await controller.updateSupplier(currentUser, 3, { name: 'Premium Foods' });
    await controller.deactivateSupplier(currentUser, 3);

    expect(procurementService.createSupplier).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(procurementService.listSuppliers).toHaveBeenCalledWith(
      currentUser,
      query,
    );
    expect(procurementService.getSupplierById).toHaveBeenCalledWith(
      currentUser,
      3,
    );
    expect(procurementService.updateSupplier).toHaveBeenCalledWith(
      currentUser,
      3,
      { name: 'Premium Foods' },
    );
    expect(procurementService.deactivateSupplier).toHaveBeenCalledWith(
      currentUser,
      3,
    );
  });
});
