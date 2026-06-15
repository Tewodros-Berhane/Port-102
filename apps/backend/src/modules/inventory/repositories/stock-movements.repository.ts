import { Injectable } from '@nestjs/common';

import { Prisma, StockMovementType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const stockMovementSelect = {
  id: true,
  movementNumber: true,
  itemId: true,
  locationId: true,
  fromLocationId: true,
  toLocationId: true,
  type: true,
  quantity: true,
  unitCost: true,
  totalCost: true,
  referenceType: true,
  referenceId: true,
  reason: true,
  notes: true,
  createdByUserId: true,
  createdAt: true,
  item: {
    select: {
      id: true,
      itemNumber: true,
      name: true,
      unitOfMeasure: true,
    },
  },
  location: {
    select: { id: true, code: true, name: true },
  },
  fromLocation: {
    select: { id: true, code: true, name: true },
  },
  toLocation: {
    select: { id: true, code: true, name: true },
  },
  createdBy: {
    select: { id: true, email: true, fullName: true },
  },
} as const;

export type StockMovementRecord = Prisma.StockMovementGetPayload<{
  select: typeof stockMovementSelect;
}>;

type StockMovementClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'stockMovement'
>;

@Injectable()
export class StockMovementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listMovements({
    skip,
    take,
    search,
    type,
    itemId,
    locationId,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    type?: StockMovementType;
    itemId?: number;
    locationId?: number;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.StockMovementWhereInput = {
      ...(type ? { type } : {}),
      ...(itemId === undefined ? {} : { itemId }),
      ...(locationId === undefined
        ? {}
        : {
            OR: [
              { locationId },
              { fromLocationId: locationId },
              { toLocationId: locationId },
            ],
          }),
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
            AND: [
              {
                OR: [
                  { movementNumber: { contains: search, mode: 'insensitive' } },
                  {
                    item: {
                      itemNumber: { contains: search, mode: 'insensitive' },
                    },
                  },
                  { item: { name: { contains: search, mode: 'insensitive' } } },
                  {
                    location: {
                      code: { contains: search, mode: 'insensitive' },
                    },
                  },
                  {
                    location: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                  { referenceType: { contains: search, mode: 'insensitive' } },
                  { reason: { contains: search, mode: 'insensitive' } },
                  { notes: { contains: search, mode: 'insensitive' } },
                ],
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take,
        select: stockMovementSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  findByMovementNumber(movementNumber: string) {
    return this.prisma.stockMovement.findUnique({
      where: { movementNumber },
      select: { id: true },
    });
  }

  createMovement(
    data: Prisma.StockMovementUncheckedCreateInput,
    client: StockMovementClient = this.prisma,
  ) {
    return client.stockMovement.create({
      data,
      select: stockMovementSelect,
    });
  }
}
