import { Injectable } from '@nestjs/common';

import { InvoiceStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const invoiceSelect = {
  id: true,
  invoiceNumber: true,
  folioId: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  taxAmount: true,
  serviceAmount: true,
  totalAmount: true,
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
  issuedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type InvoiceRecord = Prisma.InvoiceGetPayload<{
  select: typeof invoiceSelect;
}>;

type InvoiceClient = Pick<PrismaService | Prisma.TransactionClient, 'invoice'>;

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(operation);
  }

  createInvoice(
    data: Prisma.InvoiceUncheckedCreateInput,
    client: InvoiceClient = this.prisma,
  ) {
    return client.invoice.create({
      data,
      select: invoiceSelect,
    });
  }

  findInvoice(invoiceId: number, client: InvoiceClient = this.prisma) {
    return client.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      select: invoiceSelect,
    });
  }

  findByInvoiceNumber(invoiceNumber: string) {
    return this.prisma.invoice.findUnique({
      where: {
        invoiceNumber,
      },
      select: invoiceSelect,
    });
  }

  findIssuedInvoiceByFolioId(folioId: number) {
    return this.prisma.invoice.findFirst({
      where: {
        folioId,
        status: InvoiceStatus.ISSUED,
      },
      select: invoiceSelect,
      orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
    });
  }

  listInvoices({
    skip,
    take,
    search,
    status,
    folioId,
    issuedFrom,
    issuedTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: InvoiceStatus;
    folioId?: number;
    issuedFrom?: Date;
    issuedTo?: Date;
  }) {
    const where: Prisma.InvoiceWhereInput = {
      ...(status ? { status } : {}),
      ...(folioId === undefined ? {} : { folioId }),
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
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        select: invoiceSelect,
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateInvoice(
    invoiceId: number,
    data: Prisma.InvoiceUncheckedUpdateInput,
    client: InvoiceClient = this.prisma,
  ) {
    return client.invoice.update({
      where: {
        id: invoiceId,
      },
      data,
      select: invoiceSelect,
    });
  }

  private searchWhere(search?: string): Prisma.InvoiceWhereInput {
    return search
      ? {
          OR: [
            {
              invoiceNumber: {
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
