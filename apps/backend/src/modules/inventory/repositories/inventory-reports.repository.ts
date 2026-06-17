import { Injectable } from '@nestjs/common';

import { InventoryItemStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const reorderAlertItemSelect = {
  id: true,
  itemNumber: true,
  name: true,
  type: true,
  category: true,
  unitOfMeasure: true,
  reorderLevel: true,
  reorderQuantity: true,
  averageCost: true,
  balances: {
    select: {
      locationId: true,
      quantity: true,
      location: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      },
    },
  },
} as const;

const recentMovementSelect = {
  id: true,
  movementNumber: true,
  itemId: true,
  locationId: true,
  fromLocationId: true,
  toLocationId: true,
  type: true,
  quantity: true,
  unitCost: true,
  totalCost: true,
  createdAt: true,
  item: {
    select: {
      id: true,
      itemNumber: true,
      name: true,
      unitOfMeasure: true,
    },
  },
  location: {
    select: { id: true, code: true, name: true },
  },
  fromLocation: {
    select: { id: true, code: true, name: true },
  },
  toLocation: {
    select: { id: true, code: true, name: true },
  },
} as const;

export type ReorderAlertItemRecord = Prisma.InventoryItemGetPayload<{
  select: typeof reorderAlertItemSelect;
}>;

export type DashboardMovementRecord = Prisma.StockMovementGetPayload<{
  select: typeof recentMovementSelect;
}>;

@Injectable()
export class InventoryReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countActiveItems() {
    return this.prisma.inventoryItem.count({
      where: { status: InventoryItemStatus.ACTIVE },
    });
  }

  listReorderAlertCandidates({
    skip,
    take,
    search,
    locationId,
  }: {
    skip: number;
    take: number;
    search?: string;
    locationId?: number;
  }) {
    const where: Prisma.InventoryItemWhereInput = {
      status: InventoryItemStatus.ACTIVE,
      reorderLevel: { not: null },
      ...(search
        ? {
            OR: [
              { itemNumber: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.inventoryItem.findMany({
      where,
      skip,
      take,
      select: {
        ...reorderAlertItemSelect,
        balances: {
          where: locationId === undefined ? undefined : { locationId },
          select: reorderAlertItemSelect.balances.select,
          orderBy: [{ location: { code: 'asc' } }, { id: 'asc' }],
        },
      },
      orderBy: [{ itemNumber: 'asc' }, { id: 'asc' }],
    });
  }

  countReorderAlertCandidates({ search }: { search?: string }) {
    return this.prisma.inventoryItem.count({
      where: {
        status: InventoryItemStatus.ACTIVE,
        reorderLevel: { not: null },
        ...(search
          ? {
              OR: [
                { itemNumber: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
  }

  async calculateStockValue(locationId?: number) {
    const balances = await this.prisma.stockBalance.findMany({
      where: locationId === undefined ? undefined : { locationId },
      select: {
        quantity: true,
        item: {
          select: {
            averageCost: true,
            status: true,
          },
        },
      },
    });

    return balances.reduce((total, balance) => {
      if (
        balance.item.status !== InventoryItemStatus.ACTIVE ||
        !balance.item.averageCost
      ) {
        return total;
      }

      return total.add(balance.quantity.mul(balance.item.averageCost));
    }, new Prisma.Decimal(0));
  }

  countLowStockCandidates(locationId?: number) {
    return this.prisma.inventoryItem.findMany({
      where: {
        status: InventoryItemStatus.ACTIVE,
        reorderLevel: { not: null },
      },
      select: {
        reorderLevel: true,
        balances: {
          where: locationId === undefined ? undefined : { locationId },
          select: { quantity: true },
        },
      },
    });
  }

  recentMovements(take: number, locationId?: number) {
    return this.prisma.stockMovement.findMany({
      where:
        locationId === undefined
          ? undefined
          : {
              OR: [
                { locationId },
                { fromLocationId: locationId },
                { toLocationId: locationId },
              ],
            },
      take,
      select: recentMovementSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  stockByItemType(locationId?: number) {
    return this.prisma.inventoryItem.findMany({
      where: { status: InventoryItemStatus.ACTIVE },
      select: {
        type: true,
        balances: {
          where: locationId === undefined ? undefined : { locationId },
          select: { quantity: true },
        },
      },
    });
  }
}
