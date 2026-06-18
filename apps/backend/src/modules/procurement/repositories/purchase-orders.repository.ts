import { Injectable } from '@nestjs/common';

import {
  InventoryItemStatus,
  Prisma,
  PurchaseOrderStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const purchaseOrderSelect = {
  id: true,
  orderNumber: true,
  supplierId: true,
  purchaseRequestId: true,
  status: true,
  orderedAt: true,
  expectedAt: true,
  approvedByUserId: true,
  createdByUserId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: { id: true, supplierNumber: true, name: true, status: true },
  },
  purchaseRequest: {
    select: { id: true, requestNumber: true, status: true },
  },
  approvedBy: { select: { id: true, email: true, fullName: true } },
  createdBy: { select: { id: true, email: true, fullName: true } },
  items: {
    select: {
      id: true,
      itemId: true,
      quantity: true,
      unitCost: true,
      receivedQuantity: true,
      notes: true,
      item: {
        select: {
          id: true,
          itemNumber: true,
          name: true,
          unitOfMeasure: true,
          status: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  },
} as const;

export type PurchaseOrderRecord = Prisma.PurchaseOrderGetPayload<{
  select: typeof purchaseOrderSelect;
}>;

@Injectable()
export class PurchaseOrdersRepository {
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

  findByOrderNumber(orderNumber: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { orderNumber },
      select: { id: true },
    });
  }

  createOrder(data: {
    orderNumber: string;
    supplierId?: number | null;
    purchaseRequestId?: number | null;
    createdByUserId: number;
    expectedAt?: Date | null;
    notes?: string | null;
    items: Prisma.PurchaseOrderItemUncheckedCreateWithoutPurchaseOrderInput[];
  }) {
    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber: data.orderNumber,
        supplierId: data.supplierId,
        purchaseRequestId: data.purchaseRequestId,
        createdByUserId: data.createdByUserId,
        expectedAt: data.expectedAt,
        notes: data.notes,
        items: { create: data.items },
      },
      select: purchaseOrderSelect,
    });
  }

  findOrder(id: number) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      select: purchaseOrderSelect,
    });
  }

  listOrders({
    skip,
    take,
    search,
    status,
    supplierId,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: PurchaseOrderStatus;
    supplierId?: number;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(status ? { status } : {}),
      ...(supplierId === undefined ? {} : { supplierId }),
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
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              {
                supplier: {
                  supplierNumber: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        select: purchaseOrderSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateOrder(
    id: number,
    data: Prisma.PurchaseOrderUncheckedUpdateInput,
    items?: Prisma.PurchaseOrderItemUncheckedCreateWithoutPurchaseOrderInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...data,
          ...(items ? { items: { create: items } } : {}),
        },
        select: purchaseOrderSelect,
      });
    });
  }

  convertRequestToOrder(data: {
    requestId: number;
    orderNumber: string;
    supplierId?: number | null;
    createdByUserId: number;
    expectedAt?: Date | null;
    notes?: string | null;
    items: Prisma.PurchaseOrderItemUncheckedCreateWithoutPurchaseOrderInput[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          orderNumber: data.orderNumber,
          supplierId: data.supplierId,
          purchaseRequestId: data.requestId,
          createdByUserId: data.createdByUserId,
          expectedAt: data.expectedAt,
          notes: data.notes,
          items: { create: data.items },
        },
        select: purchaseOrderSelect,
      });

      await tx.purchaseRequest.update({
        where: { id: data.requestId },
        data: { status: 'CONVERTED_TO_PO' },
      });

      return order;
    });
  }

  countByStatus(status: PurchaseOrderStatus) {
    return this.prisma.purchaseOrder.count({ where: { status } });
  }
}
