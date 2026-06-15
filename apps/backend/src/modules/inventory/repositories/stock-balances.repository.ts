import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const stockBalanceSelect = {
  id: true,
  itemId: true,
  locationId: true,
  quantity: true,
  updatedAt: true,
  item: {
    select: {
      id: true,
      itemNumber: true,
      name: true,
      type: true,
      category: true,
      unitOfMeasure: true,
      averageCost: true,
      status: true,
    },
  },
  location: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },
} as const;

export type StockBalanceRecord = Prisma.StockBalanceGetPayload<{
  select: typeof stockBalanceSelect;
}>;

type StockBalanceClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'stockBalance'
>;

@Injectable()
export class StockBalancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listBalances({
    skip,
    take,
    search,
    itemId,
    locationId,
  }: {
    skip: number;
    take: number;
    search?: string;
    itemId?: number;
    locationId?: number;
  }) {
    const where: Prisma.StockBalanceWhereInput = {
      ...(itemId === undefined ? {} : { itemId }),
      ...(locationId === undefined ? {} : { locationId }),
      ...(search
        ? {
            OR: [
              {
                item: { itemNumber: { contains: search, mode: 'insensitive' } },
              },
              { item: { name: { contains: search, mode: 'insensitive' } } },
              { location: { code: { contains: search, mode: 'insensitive' } } },
              { location: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.stockBalance.count({ where }),
      this.prisma.stockBalance.findMany({
        where,
        skip,
        take,
        select: stockBalanceSelect,
        orderBy: [
          { item: { itemNumber: 'asc' } },
          { location: { code: 'asc' } },
          { id: 'asc' },
        ],
      }),
    ]);
  }

  findBalance(
    itemId: number,
    locationId: number,
    client: StockBalanceClient = this.prisma,
  ) {
    return client.stockBalance.findUnique({
      where: {
        itemId_locationId: { itemId, locationId },
      },
      select: stockBalanceSelect,
    });
  }

  increaseBalance(
    itemId: number,
    locationId: number,
    quantity: Prisma.Decimal,
    client: StockBalanceClient = this.prisma,
  ) {
    return client.stockBalance.upsert({
      where: {
        itemId_locationId: { itemId, locationId },
      },
      create: {
        itemId,
        locationId,
        quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
      select: stockBalanceSelect,
    });
  }
}
