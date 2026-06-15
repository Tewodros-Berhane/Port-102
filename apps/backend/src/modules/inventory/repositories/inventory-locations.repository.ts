import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const inventoryLocationSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type InventoryLocationRecord = Prisma.InventoryLocationGetPayload<{
  select: typeof inventoryLocationSelect;
}>;

type InventoryLocationClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'inventoryLocation'
>;

@Injectable()
export class InventoryLocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createLocation(data: Prisma.InventoryLocationUncheckedCreateInput) {
    return this.prisma.inventoryLocation.create({
      data,
      select: inventoryLocationSelect,
    });
  }

  findLocation(
    locationId: number,
    client: InventoryLocationClient = this.prisma,
  ) {
    return client.inventoryLocation.findUnique({
      where: { id: locationId },
      select: inventoryLocationSelect,
    });
  }

  findActiveLocation(
    locationId: number,
    client: InventoryLocationClient = this.prisma,
  ) {
    return client.inventoryLocation.findFirst({
      where: {
        id: locationId,
        isActive: true,
      },
      select: inventoryLocationSelect,
    });
  }

  findLocationByCode(code: string, excludeLocationId?: number) {
    return this.prisma.inventoryLocation.findFirst({
      where: {
        code,
        ...(excludeLocationId ? { id: { not: excludeLocationId } } : {}),
      },
      select: inventoryLocationSelect,
    });
  }

  listLocations({
    skip,
    take,
    search,
    isActive,
  }: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.InventoryLocationWhereInput = {
      ...(isActive === undefined ? {} : { isActive }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.inventoryLocation.count({ where }),
      this.prisma.inventoryLocation.findMany({
        where,
        skip,
        take,
        select: inventoryLocationSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updateLocation(
    locationId: number,
    data: Prisma.InventoryLocationUncheckedUpdateInput,
    client: InventoryLocationClient = this.prisma,
  ) {
    return client.inventoryLocation.update({
      where: { id: locationId },
      data,
      select: inventoryLocationSelect,
    });
  }
}
