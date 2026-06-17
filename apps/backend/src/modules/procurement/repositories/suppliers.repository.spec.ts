/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { SupplierStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuppliersRepository } from './suppliers.repository';

describe('SuppliersRepository', () => {
  let repository: SuppliersRepository;
  let prisma: {
    supplier: {
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
      supplier: {
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
        SuppliersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(SuppliersRepository);
  });

  it('creates a supplier record', async () => {
    await repository.createSupplier({
      supplierNumber: 'SUP-0001',
      name: 'Addis Fresh Foods',
    });

    expect(prisma.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          supplierNumber: 'SUP-0001',
          name: 'Addis Fresh Foods',
        },
      }),
    );
  });

  it('finds duplicates by supplier number with an optional exclusion', async () => {
    await repository.findBySupplierNumber('SUP-0001', 3);

    expect(prisma.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          supplierNumber: 'SUP-0001',
          id: { not: 3 },
        },
      }),
    );
  });

  it('lists suppliers with search, status, and pagination', async () => {
    prisma.supplier.count.mockResolvedValue(0);
    prisma.supplier.findMany.mockResolvedValue([]);

    await repository.listSuppliers({
      skip: 20,
      take: 20,
      search: 'fresh',
      status: SupplierStatus.ACTIVE,
    });

    expect(prisma.supplier.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: SupplierStatus.ACTIVE,
        OR: expect.any(Array),
      }),
    });
    expect(prisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      }),
    );
  });

  it('updates a supplier record', async () => {
    await repository.updateSupplier(3, {
      status: SupplierStatus.INACTIVE,
    });

    expect(prisma.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: { status: SupplierStatus.INACTIVE },
      }),
    );
  });
});
