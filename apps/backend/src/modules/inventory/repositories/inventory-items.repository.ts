import { Injectable } from '@nestjs/common';

import {
  InventoryItemStatus,
  InventoryItemType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const inventoryItemSelect = {
  id: true,
  itemNumber: true,
  name: true,
  type: true,
  category: true,
  unitOfMeasure: true,
  reorderLevel: true,
  reorderQuantity: true,
  averageCost: true,
  status: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type InventoryItemRecord = Prisma.InventoryItemGetPayload<{
  select: typeof inventoryItemSelect;
}>;

type InventoryItemClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'inventoryItem'
>;

@Injectable()
export class InventoryItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createItem(data: Prisma.InventoryItemUncheckedCreateInput) {
    return this.prisma.inventoryItem.create({
      data,
      select: inventoryItemSelect,
    });
  }

  findItem(itemId: number, client: InventoryItemClient = this.prisma) {
    return client.inventoryItem.findUnique({
      where: { id: itemId },
      select: inventoryItemSelect,
    });
  }

  findActiveItem(itemId: number, client: InventoryItemClient = this.prisma) {
    return client.inventoryItem.findFirst({
      where: {
        id: itemId,
        status: InventoryItemStatus.ACTIVE,
      },
      select: inventoryItemSelect,
    });
  }

  findItemByNumber(itemNumber: string, excludeItemId?: number) {
    return this.prisma.inventoryItem.findFirst({
      where: {
        itemNumber,
        ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
      },
      select: inventoryItemSelect,
    });
  }

  listItems({
    skip,
    take,
    search,
    status,
    type,
    category,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: InventoryItemStatus;
    type?: InventoryItemType;
    category?: string;
  }) {
    const where: Prisma.InventoryItemWhereInput = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(category
        ? {
            category: {
              equals: category,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { itemNumber: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
              { unitOfMeasure: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        select: inventoryItemSelect,
        orderBy: [{ itemNumber: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updateItem(
    itemId: number,
    data: Prisma.InventoryItemUncheckedUpdateInput,
    client: InventoryItemClient = this.prisma,
  ) {
    return client.inventoryItem.update({
      where: { id: itemId },
      data,
      select: inventoryItemSelect,
    });
  }
}
