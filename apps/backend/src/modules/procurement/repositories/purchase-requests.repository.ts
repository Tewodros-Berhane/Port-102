import { Injectable } from '@nestjs/common';

import {
  InventoryItemStatus,
  Prisma,
  PurchaseRequestStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const purchaseRequestSelect = {
  id: true,
  requestNumber: true,
  status: true,
  departmentId: true,
  requestedByUserId: true,
  approvedByUserId: true,
  rejectedByUserId: true,
  submittedAt: true,
  decidedAt: true,
  reason: true,
  decisionNote: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  requestedBy: { select: { id: true, email: true, fullName: true } },
  approvedBy: { select: { id: true, email: true, fullName: true } },
  rejectedBy: { select: { id: true, email: true, fullName: true } },
  items: {
    select: {
      id: true,
      itemId: true,
      quantity: true,
      estimatedUnitCost: true,
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

export type PurchaseRequestRecord = Prisma.PurchaseRequestGetPayload<{
  select: typeof purchaseRequestSelect;
}>;

@Injectable()
export class PurchaseRequestsRepository {
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

  findByRequestNumber(requestNumber: string) {
    return this.prisma.purchaseRequest.findUnique({
      where: { requestNumber },
      select: { id: true },
    });
  }

  createRequest(data: {
    requestNumber: string;
    departmentId?: number | null;
    requestedByUserId: number;
    reason?: string | null;
    notes?: string | null;
    items: Prisma.PurchaseRequestItemUncheckedCreateWithoutPurchaseRequestInput[];
  }) {
    return this.prisma.purchaseRequest.create({
      data: {
        requestNumber: data.requestNumber,
        departmentId: data.departmentId,
        requestedByUserId: data.requestedByUserId,
        reason: data.reason,
        notes: data.notes,
        items: { create: data.items },
      },
      select: purchaseRequestSelect,
    });
  }

  findRequest(id: number) {
    return this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: purchaseRequestSelect,
    });
  }

  listRequests({
    skip,
    take,
    search,
    status,
    departmentId,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: PurchaseRequestStatus;
    departmentId?: number;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.PurchaseRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(departmentId === undefined ? {} : { departmentId }),
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
              { requestNumber: { contains: search, mode: 'insensitive' } },
              { reason: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.purchaseRequest.count({ where }),
      this.prisma.purchaseRequest.findMany({
        where,
        skip,
        take,
        select: purchaseRequestSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateRequest(
    id: number,
    data: Prisma.PurchaseRequestUncheckedUpdateInput,
    items?: Prisma.PurchaseRequestItemUncheckedCreateWithoutPurchaseRequestInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.purchaseRequestItem.deleteMany({
          where: { purchaseRequestId: id },
        });
      }

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          ...data,
          ...(items ? { items: { create: items } } : {}),
        },
        select: purchaseRequestSelect,
      });
    });
  }

  countByStatus(status: PurchaseRequestStatus) {
    return this.prisma.purchaseRequest.count({ where: { status } });
  }
}
