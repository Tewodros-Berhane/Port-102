import { Injectable } from '@nestjs/common';

import { Prisma, SupplierStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const supplierSelect = {
  id: true,
  supplierNumber: true,
  name: true,
  contactName: true,
  phone: true,
  email: true,
  address: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type SupplierRecord = Prisma.SupplierGetPayload<{
  select: typeof supplierSelect;
}>;

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSupplier(data: Prisma.SupplierUncheckedCreateInput) {
    return this.prisma.supplier.create({
      data,
      select: supplierSelect,
    });
  }

  findSupplier(id: number) {
    return this.prisma.supplier.findUnique({
      where: { id },
      select: supplierSelect,
    });
  }

  findBySupplierNumber(supplierNumber: string, excludeSupplierId?: number) {
    return this.prisma.supplier.findFirst({
      where: {
        supplierNumber,
        ...(excludeSupplierId ? { id: { not: excludeSupplierId } } : {}),
      },
      select: supplierSelect,
    });
  }

  listSuppliers({
    skip,
    take,
    search,
    status,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: SupplierStatus;
  }) {
    const where: Prisma.SupplierWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { supplierNumber: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        select: supplierSelect,
        orderBy: [{ supplierNumber: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updateSupplier(id: number, data: Prisma.SupplierUncheckedUpdateInput) {
    return this.prisma.supplier.update({
      where: { id },
      data,
      select: supplierSelect,
    });
  }
}
