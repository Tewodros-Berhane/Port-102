import { Injectable } from '@nestjs/common';

import {
  GoodsReceivedStatus,
  InventoryItemStatus,
  Prisma,
  PurchaseOrderStatus,
  StockMovementType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const goodsReceivedSelect = {
  id: true,
  grnNumber: true,
  purchaseOrderId: true,
  supplierId: true,
  locationId: true,
  status: true,
  receivedByUserId: true,
  postedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  purchaseOrder: {
    select: { id: true, orderNumber: true, status: true },
  },
  supplier: {
    select: { id: true, supplierNumber: true, name: true, status: true },
  },
  location: { select: { id: true, code: true, name: true, isActive: true } },
  receivedBy: { select: { id: true, email: true, fullName: true } },
  items: {
    select: {
      id: true,
      itemId: true,
      quantity: true,
      unitCost: true,
      notes: true,
      item: {
        select: {
          id: true,
          itemNumber: true,
          name: true,
          unitOfMeasure: true,
          averageCost: true,
          status: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  },
} as const;

export type GoodsReceivedRecord = Prisma.GoodsReceivedGetPayload<{
  select: typeof goodsReceivedSelect;
}>;

@Injectable()
export class GoodsReceivedRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveItems(itemIds: number[]) {
    return this.prisma.inventoryItem.findMany({
      where: {
        id: { in: itemIds },
        status: InventoryItemStatus.ACTIVE,
      },
      select: { id: true },
    });
  }

  findActiveLocation(locationId: number) {
    return this.prisma.inventoryLocation.findFirst({
      where: { id: locationId, isActive: true },
      select: { id: true },
    });
  }

  findByGrnNumber(grnNumber: string) {
    return this.prisma.goodsReceived.findUnique({
      where: { grnNumber },
      select: { id: true },
    });
  }

  createGoodsReceived(data: {
    grnNumber: string;
    purchaseOrderId?: number | null;
    supplierId?: number | null;
    locationId: number;
    receivedByUserId: number;
    notes?: string | null;
    items: Prisma.GoodsReceivedItemUncheckedCreateWithoutGoodsReceivedInput[];
  }) {
    return this.prisma.goodsReceived.create({
      data: {
        grnNumber: data.grnNumber,
        purchaseOrderId: data.purchaseOrderId,
        supplierId: data.supplierId,
        locationId: data.locationId,
        receivedByUserId: data.receivedByUserId,
        notes: data.notes,
        items: { create: data.items },
      },
      select: goodsReceivedSelect,
    });
  }

  findGoodsReceived(id: number) {
    return this.prisma.goodsReceived.findUnique({
      where: { id },
      select: goodsReceivedSelect,
    });
  }

  listGoodsReceived({
    skip,
    take,
    search,
    status,
    supplierId,
    locationId,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: GoodsReceivedStatus;
    supplierId?: number;
    locationId?: number;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.GoodsReceivedWhereInput = {
      ...(status ? { status } : {}),
      ...(supplierId === undefined ? {} : { supplierId }),
      ...(locationId === undefined ? {} : { locationId }),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { grnNumber: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              {
                purchaseOrder: {
                  orderNumber: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.goodsReceived.count({ where }),
      this.prisma.goodsReceived.findMany({
        where,
        skip,
        take,
        select: goodsReceivedSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  cancelGoodsReceived(
    id: number,
    data: Prisma.GoodsReceivedUncheckedUpdateInput,
  ) {
    return this.prisma.goodsReceived.update({
      where: { id },
      data,
      select: goodsReceivedSelect,
    });
  }

  postGoodsReceived(input: {
    grnId: number;
    movementNumbers: string[];
    postedAt: Date;
    notes?: string | null;
    actorUserId: number;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const grn = await tx.goodsReceived.findUnique({
          where: { id: input.grnId },
          select: goodsReceivedSelect,
        });

        if (!grn) {
          return { status: 'NOT_FOUND' as const };
        }

        if (grn.status === GoodsReceivedStatus.POSTED) {
          return { status: 'ALREADY_POSTED' as const, grn };
        }

        if (grn.status === GoodsReceivedStatus.CANCELLED) {
          return { status: 'CANCELLED' as const, grn };
        }

        const activeLocation = await tx.inventoryLocation.findFirst({
          where: { id: grn.locationId, isActive: true },
          select: { id: true },
        });

        if (!activeLocation) {
          return { status: 'INACTIVE_LOCATION' as const, grn };
        }

        const activeItemCount = await tx.inventoryItem.count({
          where: {
            id: { in: grn.items.map((item) => item.itemId) },
            status: InventoryItemStatus.ACTIVE,
          },
        });

        if (activeItemCount !== grn.items.length) {
          return { status: 'INACTIVE_ITEM' as const, grn };
        }

        const movements = [];

        for (const [index, item] of grn.items.entries()) {
          const existingBalance = await tx.stockBalance.findUnique({
            where: {
              itemId_locationId: {
                itemId: item.itemId,
                locationId: grn.locationId,
              },
            },
            select: { quantity: true },
          });
          const previousQuantity =
            existingBalance?.quantity ?? new Prisma.Decimal(0);

          await tx.stockBalance.upsert({
            where: {
              itemId_locationId: {
                itemId: item.itemId,
                locationId: grn.locationId,
              },
            },
            create: {
              itemId: item.itemId,
              locationId: grn.locationId,
              quantity: item.quantity,
            },
            update: {
              quantity: { increment: item.quantity },
            },
          });

          if (item.unitCost) {
            const inventoryItem = await tx.inventoryItem.findUniqueOrThrow({
              where: { id: item.itemId },
              select: { averageCost: true },
            });
            const existingValue =
              inventoryItem.averageCost && previousQuantity.greaterThan(0)
                ? previousQuantity.mul(inventoryItem.averageCost)
                : new Prisma.Decimal(0);
            const averageCost = existingValue
              .add(item.quantity.mul(item.unitCost))
              .div(previousQuantity.add(item.quantity))
              .toDecimalPlaces(2);

            await tx.inventoryItem.update({
              where: { id: item.itemId },
              data: { averageCost },
            });
          }

          const movement = await tx.stockMovement.create({
            data: {
              movementNumber: input.movementNumbers[index],
              itemId: item.itemId,
              locationId: grn.locationId,
              type: StockMovementType.RECEIPT,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.unitCost
                ? item.quantity.mul(item.unitCost)
                : null,
              referenceType: 'GOODS_RECEIVED',
              referenceId: grn.id,
              notes: input.notes ?? grn.notes,
              createdByUserId: input.actorUserId,
            },
          });

          movements.push(movement);
        }

        if (grn.purchaseOrderId) {
          for (const item of grn.items) {
            await tx.purchaseOrderItem.updateMany({
              where: {
                purchaseOrderId: grn.purchaseOrderId,
                itemId: item.itemId,
              },
              data: {
                receivedQuantity: { increment: item.quantity },
              },
            });
          }

          const orderItems = await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: grn.purchaseOrderId },
            select: { quantity: true, receivedQuantity: true },
          });
          const fullyReceived = orderItems.every((item) =>
            item.receivedQuantity.greaterThanOrEqualTo(item.quantity),
          );
          const anyReceived = orderItems.some((item) =>
            item.receivedQuantity.greaterThan(0),
          );

          await tx.purchaseOrder.update({
            where: { id: grn.purchaseOrderId },
            data: {
              status: fullyReceived
                ? PurchaseOrderStatus.RECEIVED
                : anyReceived
                  ? PurchaseOrderStatus.PARTIALLY_RECEIVED
                  : PurchaseOrderStatus.ORDERED,
            },
          });
        }

        const posted = await tx.goodsReceived.update({
          where: { id: grn.id },
          data: {
            status: GoodsReceivedStatus.POSTED,
            postedAt: input.postedAt,
            notes: input.notes ?? grn.notes,
          },
          select: goodsReceivedSelect,
        });

        return { status: 'POSTED' as const, grn: posted, movements };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  countByStatus(status: GoodsReceivedStatus) {
    return this.prisma.goodsReceived.count({ where: { status } });
  }
}
