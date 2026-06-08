import { Injectable } from '@nestjs/common';

import {
  PosOrderPaymentStatus,
  PosOrderSource,
  PosOrderStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
} as const;

const posOrderSelect = {
  id: true,
  orderNumber: true,
  outletId: true,
  status: true,
  paymentStatus: true,
  source: true,
  tableNumber: true,
  roomId: true,
  stayId: true,
  folioId: true,
  subtotalAmount: true,
  discountAmount: true,
  taxAmount: true,
  serviceAmount: true,
  totalAmount: true,
  paidAmount: true,
  balanceAmount: true,
  notes: true,
  cancelledReason: true,
  createdByUserId: true,
  closedByUserId: true,
  cancelledByUserId: true,
  closedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  outlet: {
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
    },
  },
  createdBy: {
    select: userSummarySelect,
  },
  closedBy: {
    select: userSummarySelect,
  },
  cancelledBy: {
    select: userSummarySelect,
  },
  items: {
    select: {
      id: true,
      menuItemId: true,
      description: true,
      quantity: true,
      unitPrice: true,
      totalAmount: true,
      notes: true,
      isVoided: true,
      voidReason: true,
      createdAt: true,
      updatedAt: true,
      menuItem: {
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
          status: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  },
  payments: {
    select: {
      id: true,
      paymentNumber: true,
      amount: true,
      method: true,
      reference: true,
      notes: true,
      recordedByUserId: true,
      recordedAt: true,
      isVoided: true,
      voidReason: true,
      voidedAt: true,
      createdAt: true,
      updatedAt: true,
      recordedBy: {
        select: userSummarySelect,
      },
    },
    orderBy: {
      recordedAt: 'asc',
    },
  },
} as const;

export type PosOrderRecord = Prisma.PosOrderGetPayload<{
  select: typeof posOrderSelect;
}>;

type PosOrderClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'posOrder'
>;

@Injectable()
export class PosOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  createOrder(
    data: Prisma.PosOrderUncheckedCreateInput,
    client: PosOrderClient = this.prisma,
  ) {
    return client.posOrder.create({
      data,
      select: posOrderSelect,
    });
  }

  findOrder(orderId: number, client: PosOrderClient = this.prisma) {
    return client.posOrder.findUnique({
      where: {
        id: orderId,
      },
      select: posOrderSelect,
    });
  }

  findByOrderNumber(orderNumber: string) {
    return this.prisma.posOrder.findUnique({
      where: {
        orderNumber,
      },
      select: posOrderSelect,
    });
  }

  listOrders({
    skip,
    take,
    search,
    outletId,
    status,
    paymentStatus,
    source,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    outletId?: number;
    status?: PosOrderStatus;
    paymentStatus?: PosOrderPaymentStatus;
    source?: PosOrderSource;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.PosOrderWhereInput = {
      ...(outletId === undefined ? {} : { outletId }),
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(source ? { source } : {}),
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
              { tableNumber: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              {
                outlet: {
                  is: {
                    OR: [
                      { name: { contains: search, mode: 'insensitive' } },
                      { code: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.posOrder.count({ where }),
      this.prisma.posOrder.findMany({
        where,
        skip,
        take,
        select: posOrderSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateOrder(
    orderId: number,
    data: Prisma.PosOrderUncheckedUpdateInput,
    client: PosOrderClient = this.prisma,
  ) {
    return client.posOrder.update({
      where: {
        id: orderId,
      },
      data,
      select: posOrderSelect,
    });
  }
}
