import { Injectable } from '@nestjs/common';

import { Prisma, ReceiptStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const receiptSelect = {
  id: true,
  receiptNumber: true,
  folioId: true,
  paymentId: true,
  status: true,
  amount: true,
  issuedByUserId: true,
  issuedAt: true,
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
  payment: {
    select: {
      id: true,
      paymentNumber: true,
      amount: true,
      method: true,
      status: true,
      recordedAt: true,
    },
  },
  issuedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type ReceiptRecord = Prisma.ReceiptGetPayload<{
  select: typeof receiptSelect;
}>;

type ReceiptClient = Pick<PrismaService | Prisma.TransactionClient, 'receipt'>;

@Injectable()
export class ReceiptsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createReceipt(
    data: Prisma.ReceiptUncheckedCreateInput,
    client: ReceiptClient = this.prisma,
  ) {
    return client.receipt.create({
      data,
      select: receiptSelect,
    });
  }

  findReceipt(receiptId: number, client: ReceiptClient = this.prisma) {
    return client.receipt.findUnique({
      where: {
        id: receiptId,
      },
      select: receiptSelect,
    });
  }

  findByReceiptNumber(receiptNumber: string) {
    return this.prisma.receipt.findUnique({
      where: {
        receiptNumber,
      },
      select: receiptSelect,
    });
  }

  listReceipts({
    skip,
    take,
    search,
    status,
    folioId,
    paymentId,
    issuedFrom,
    issuedTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: ReceiptStatus;
    folioId?: number;
    paymentId?: number;
    issuedFrom?: Date;
    issuedTo?: Date;
  }) {
    const where: Prisma.ReceiptWhereInput = {
      ...(status ? { status } : {}),
      ...(folioId === undefined ? {} : { folioId }),
      ...(paymentId === undefined ? {} : { paymentId }),
      ...(issuedFrom || issuedTo
        ? {
            issuedAt: {
              ...(issuedFrom ? { gte: issuedFrom } : {}),
              ...(issuedTo ? { lte: issuedTo } : {}),
            },
          }
        : {}),
      ...this.searchWhere(search),
    };

    return Promise.all([
      this.prisma.receipt.count({ where }),
      this.prisma.receipt.findMany({
        where,
        skip,
        take,
        select: receiptSelect,
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateReceipt(
    receiptId: number,
    data: Prisma.ReceiptUncheckedUpdateInput,
    client: ReceiptClient = this.prisma,
  ) {
    return client.receipt.update({
      where: {
        id: receiptId,
      },
      data,
      select: receiptSelect,
    });
  }

  private searchWhere(search?: string): Prisma.ReceiptWhereInput {
    return search
      ? {
          OR: [
            {
              receiptNumber: {
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
