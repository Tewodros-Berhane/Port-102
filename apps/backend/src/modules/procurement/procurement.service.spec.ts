import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { SupplierStatus } from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProcurementService } from './procurement.service';
import { SuppliersRepository } from './repositories/suppliers.repository';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let suppliersRepository: {
    createSupplier: jest.Mock;
    findSupplier: jest.Mock;
    findBySupplierNumber: jest.Mock;
    listSuppliers: jest.Mock;
    updateSupplier: jest.Mock;
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
  const supplier = {
    id: 3,
    supplierNumber: 'SUP-0001',
    name: 'Addis Fresh Foods',
    contactName: null,
    phone: null,
    email: 'orders@example.com',
    address: null,
    status: SupplierStatus.ACTIVE,
    notes: null,
    createdAt: new Date('2026-06-17T06:00:00.000Z'),
    updatedAt: new Date('2026-06-17T06:00:00.000Z'),
  };

  beforeEach(async () => {
    suppliersRepository = {
      createSupplier: jest.fn(),
      findSupplier: jest.fn(),
      findBySupplierNumber: jest.fn(),
      listSuppliers: jest.fn(),
      updateSupplier: jest.fn(),
    };
    auditLogsService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: SuppliersRepository, useValue: suppliersRepository },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    service = module.get(ProcurementService);
  });

  it('creates a normalized supplier and records an audit log', async () => {
    suppliersRepository.findBySupplierNumber.mockResolvedValue(null);
    suppliersRepository.createSupplier.mockResolvedValue(supplier);

    await expect(
      service.createSupplier(currentUser, {
        supplierNumber: ' sup-0001 ',
        name: ' Addis Fresh Foods ',
        email: ' orders@example.com ',
      }),
    ).resolves.toEqual(supplier);

    expect(suppliersRepository.createSupplier).toHaveBeenCalledWith({
      supplierNumber: 'SUP-0001',
      name: 'Addis Fresh Foods',
      contactName: null,
      phone: null,
      email: 'orders@example.com',
      address: null,
      notes: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement.suppliers.created',
        entityType: 'Supplier',
        entityId: '3',
      }),
    );
  });

  it('rejects duplicate supplier numbers', async () => {
    suppliersRepository.findBySupplierNumber.mockResolvedValue(supplier);

    await expect(
      service.createSupplier(currentUser, {
        supplierNumber: 'SUP-0001',
        name: 'Duplicate Supplier',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(suppliersRepository.createSupplier).not.toHaveBeenCalled();
  });

  it('lists suppliers with normalized filters', async () => {
    suppliersRepository.listSuppliers.mockResolvedValue([1, [supplier]]);

    await expect(
      service.listSuppliers(currentUser, {
        page: 2,
        limit: 10,
        search: ' fresh ',
        status: SupplierStatus.ACTIVE,
      }),
    ).resolves.toEqual({
      items: [supplier],
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(suppliersRepository.listSuppliers).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'fresh',
      status: SupplierStatus.ACTIVE,
    });
  });

  it('throws when a supplier does not exist', async () => {
    suppliersRepository.findSupplier.mockResolvedValue(null);

    await expect(
      service.getSupplierById(currentUser, 99),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates supplier details and audits previous and current values', async () => {
    const updatedSupplier = {
      ...supplier,
      name: 'Addis Premium Foods',
    };
    suppliersRepository.findSupplier.mockResolvedValue(supplier);
    suppliersRepository.updateSupplier.mockResolvedValue(updatedSupplier);

    await expect(
      service.updateSupplier(currentUser, supplier.id, {
        name: ' Addis Premium Foods ',
      }),
    ).resolves.toEqual(updatedSupplier);

    expect(suppliersRepository.updateSupplier).toHaveBeenCalledWith(
      supplier.id,
      { name: 'Addis Premium Foods' },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement.suppliers.updated',
      }),
    );
  });

  it('soft-deactivates an active supplier and audits the change', async () => {
    const inactiveSupplier = {
      ...supplier,
      status: SupplierStatus.INACTIVE,
    };
    suppliersRepository.findSupplier.mockResolvedValue(supplier);
    suppliersRepository.updateSupplier.mockResolvedValue(inactiveSupplier);

    await expect(
      service.deactivateSupplier(currentUser, supplier.id),
    ).resolves.toEqual(inactiveSupplier);

    expect(suppliersRepository.updateSupplier).toHaveBeenCalledWith(
      supplier.id,
      { status: SupplierStatus.INACTIVE },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement.suppliers.deactivated',
      }),
    );
  });
});
