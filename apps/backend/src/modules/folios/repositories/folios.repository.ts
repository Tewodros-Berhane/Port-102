import { Injectable } from '@nestjs/common';

import { FolioStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const folioSelect = {
  id: true,
  folioNumber: true,
  stayId: true,
  guestId: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  taxAmount: true,
  serviceAmount: true,
  totalAmount: true,
  paidAmount: true,
  balanceAmount: true,
  openedAt: true,
  closedAt: true,
  openedByUserId: true,
  closedByUserId: true,
  createdAt: true,
  updatedAt: true,
  stay: {
    select: {
      id: true,
      stayNumber: true,
      reservationId: true,
      guestId: true,
      status: true,
      checkedInAt: true,
      expectedCheckOutDate: true,
    },
  },
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  openedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  closedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type FolioRecord = Prisma.FolioGetPayload<{
  select: typeof folioSelect;
}>;

const folioStaySelect = {
  id: true,
  stayNumber: true,
  guestId: true,
  status: true,
  checkedInAt: true,
  expectedCheckOutDate: true,
  reservationId: true,
  reservation: {
    select: {
      id: true,
      reservationNumber: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
    },
  },
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  },
} as const;

export type FolioStayRecord = Prisma.StayGetPayload<{
  select: typeof folioStaySelect;
}>;

type FolioClient = Pick<PrismaService | Prisma.TransactionClient, 'folio'>;
type FolioStayClient = Pick<PrismaService | Prisma.TransactionClient, 'stay'>;

@Injectable()
export class FoliosRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(operation);
  }

  createFolio(
    data: Prisma.FolioUncheckedCreateInput,
    client: FolioClient = this.prisma,
  ) {
    return client.folio.create({
      data,
      select: folioSelect,
    });
  }

  findStayForFolio(stayId: number, client: FolioStayClient = this.prisma) {
    return client.stay.findUnique({
      where: {
        id: stayId,
      },
      select: folioStaySelect,
    });
  }

  findFolio(folioId: number, client: FolioClient = this.prisma) {
    return client.folio.findUnique({
      where: {
        id: folioId,
      },
      select: folioSelect,
    });
  }

  findByStayId(stayId: number, client: FolioClient = this.prisma) {
    return client.folio.findUnique({
      where: {
        stayId,
      },
      select: folioSelect,
    });
  }

  findByFolioNumber(folioNumber: string) {
    return this.prisma.folio.findUnique({
      where: {
        folioNumber,
      },
      select: folioSelect,
    });
  }

  listFolios({
    skip,
    take,
    search,
    status,
    stayId,
    guestId,
    openedFrom,
    openedTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: FolioStatus;
    stayId?: number;
    guestId?: number;
    openedFrom?: Date;
    openedTo?: Date;
  }) {
    const where: Prisma.FolioWhereInput = {
      ...(status ? { status } : {}),
      ...(stayId === undefined ? {} : { stayId }),
      ...(guestId === undefined ? {} : { guestId }),
      ...(openedFrom || openedTo
        ? {
            openedAt: {
              ...(openedFrom ? { gte: openedFrom } : {}),
              ...(openedTo ? { lte: openedTo } : {}),
            },
          }
        : {}),
      ...this.searchWhere(search),
    };

    return Promise.all([
      this.prisma.folio.count({ where }),
      this.prisma.folio.findMany({
        where,
        skip,
        take,
        select: folioSelect,
        orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateFolio(
    folioId: number,
    data: Prisma.FolioUncheckedUpdateInput,
    client: FolioClient = this.prisma,
  ) {
    return client.folio.update({
      where: {
        id: folioId,
      },
      data,
      select: folioSelect,
    });
  }

  private searchWhere(search?: string): Prisma.FolioWhereInput {
    return search
      ? {
          OR: [
            {
              folioNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              stay: {
                stayNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              guest: {
                firstName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              guest: {
                lastName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              guest: {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              guest: {
                phone: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : {};
  }
}
