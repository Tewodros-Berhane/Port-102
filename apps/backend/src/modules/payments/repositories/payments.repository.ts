import { Injectable } from '@nestjs/common';

import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const paymentSelect = {
  id: true,
  paymentNumber: true,
  folioId: true,
  amount: true,
  method: true,
  status: true,
  reference: true,
  notes: true,
  recordedByUserId: true,
  recordedAt: true,
  voidedAt: true,
  voidReason: true,
  createdAt: true,
  updatedAt: true,
  folio: {
    select: {
      id: true,
      folioNumber: true,
      stayId: true,
      guestId: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
    },
  },
  recordedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type PaymentRecord = Prisma.PaymentGetPayload<{
  select: typeof paymentSelect;
}>;

type PaymentClient = Pick<PrismaService | Prisma.TransactionClient, 'payment'>;

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(operation);
  }

  createPayment(
    data: Prisma.PaymentUncheckedCreateInput,
    client: PaymentClient = this.prisma,
  ) {
    return client.payment.create({
      data,
      select: paymentSelect,
    });
  }

  findPayment(paymentId: number, client: PaymentClient = this.prisma) {
    return client.payment.findUnique({
      where: {
        id: paymentId,
      },
      select: paymentSelect,
    });
  }

  findByPaymentNumber(paymentNumber: string) {
    return this.prisma.payment.findUnique({
      where: {
        paymentNumber,
      },
      select: paymentSelect,
    });
  }

  listPayments({
    skip,
    take,
    search,
    status,
    method,
    folioId,
    recordedFrom,
    recordedTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: PaymentStatus;
    method?: PaymentMethod;
    folioId?: number;
    recordedFrom?: Date;
    recordedTo?: Date;
  }) {
    const where: Prisma.PaymentWhereInput = {
      ...(status ? { status } : {}),
      ...(method ? { method } : {}),
      ...(folioId === undefined ? {} : { folioId }),
      ...(recordedFrom || recordedTo
        ? {
            recordedAt: {
              ...(recordedFrom ? { gte: recordedFrom } : {}),
              ...(recordedTo ? { lte: recordedTo } : {}),
            },
          }
        : {}),
      ...this.searchWhere(search),
    };

    return Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        select: paymentSelect,
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updatePayment(
    paymentId: number,
    data: Prisma.PaymentUncheckedUpdateInput,
    client: PaymentClient = this.prisma,
  ) {
    return client.payment.update({
      where: {
        id: paymentId,
      },
      data,
      select: paymentSelect,
    });
  }

  private searchWhere(search?: string): Prisma.PaymentWhereInput {
    return search
      ? {
          OR: [
            {
              paymentNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              reference: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              folio: {
                folioNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              folio: {
                guest: {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              folio: {
                guest: {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        }
      : {};
  }
}
