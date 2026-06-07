import { Injectable } from '@nestjs/common';

import { OutletType, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const outletSelect = {
  id: true,
  name: true,
  code: true,
  type: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type OutletRecord = Prisma.OutletGetPayload<{
  select: typeof outletSelect;
}>;

@Injectable()
export class OutletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createOutlet(data: Prisma.OutletUncheckedCreateInput) {
    return this.prisma.outlet.create({
      data,
      select: outletSelect,
    });
  }

  findOutlet(outletId: number) {
    return this.prisma.outlet.findUnique({
      where: {
        id: outletId,
      },
      select: outletSelect,
    });
  }

  findByCode(code: string, excludeOutletId?: number) {
    return this.prisma.outlet.findFirst({
      where: {
        code,
        ...(excludeOutletId ? { id: { not: excludeOutletId } } : {}),
      },
      select: outletSelect,
    });
  }

  listOutlets({
    skip,
    take,
    search,
    type,
    isActive,
  }: {
    skip: number;
    take: number;
    search?: string;
    type?: OutletType;
    isActive?: boolean;
  }) {
    const where: Prisma.OutletWhereInput = {
      ...(type ? { type } : {}),
      ...(isActive === undefined ? {} : { isActive }),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.outlet.count({ where }),
      this.prisma.outlet.findMany({
        where,
        skip,
        take,
        select: outletSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updateOutlet(outletId: number, data: Prisma.OutletUncheckedUpdateInput) {
    return this.prisma.outlet.update({
      where: {
        id: outletId,
      },
      data,
      select: outletSelect,
    });
  }
}
