import { Injectable } from '@nestjs/common';

import {
  InventoryItemStatus,
  Prisma,
  StockAdjustmentStatus,
  StockMovementType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockMovementsRepository } from './stock-movements.repository';

const stockAdjustmentSelect = {
  id: true,
  adjustmentNumber: true,
  itemId: true,
  locationId: true,
  status: true,
  quantity: true,
  reason: true,
  requestedByUserId: true,
  approvedByUserId: true,
  rejectedByUserId: true,
  decidedAt: true,
  decisionNote: true,
  createdAt: true,
  updatedAt: true,
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
  location: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },
  requestedBy: {
    select: { id: true, email: true, fullName: true },
  },
  approvedBy: {
    select: { id: true, email: true, fullName: true },
  },
  rejectedBy: {
    select: { id: true, email: true, fullName: true },
  },
} as const;

export type StockAdjustmentRecord = Prisma.StockAdjustmentGetPayload<{
  select: typeof stockAdjustmentSelect;
}>;

export type StockAdjustmentApprovalResult =
  | { status: 'INACTIVE' }
  | { status: 'INSUFFICIENT'; availableQuantity: Prisma.Decimal }
  | { status: 'ALREADY_APPLIED' }
  | {
      status: 'APPROVED';
      adjustment: StockAdjustmentRecord;
      balance: NonNullable<
        Awaited<ReturnType<StockBalancesRepository['findBalance']>>
      >;
      movement: Awaited<ReturnType<StockMovementsRepository['createMovement']>>;
    };

@Injectable()
export class StockAdjustmentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockBalancesRepository: StockBalancesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
  ) {}

  listAdjustments({
    skip,
    take,
    search,
    status,
    itemId,
    locationId,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: StockAdjustmentStatus;
    itemId?: number;
    locationId?: number;
  }) {
    const where: Prisma.StockAdjustmentWhereInput = {
      ...(status ? { status } : {}),
      ...(itemId === undefined ? {} : { itemId }),
      ...(locationId === undefined ? {} : { locationId }),
      ...(search
        ? {
            OR: [
              {
                adjustmentNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              { reason: { contains: search, mode: 'insensitive' } },
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
      this.prisma.stockAdjustment.count({ where }),
      this.prisma.stockAdjustment.findMany({
        where,
        skip,
        take,
        select: stockAdjustmentSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  findByAdjustmentNumber(adjustmentNumber: string) {
    return this.prisma.stockAdjustment.findUnique({
      where: { adjustmentNumber },
      select: { id: true },
    });
  }

  findAdjustment(id: number) {
    return this.prisma.stockAdjustment.findUnique({
      where: { id },
      select: stockAdjustmentSelect,
    });
  }

  createAdjustment(data: Prisma.StockAdjustmentUncheckedCreateInput) {
    return this.prisma.stockAdjustment.create({
      data,
      select: stockAdjustmentSelect,
    });
  }

  async approveAdjustment(input: {
    adjustmentId: number;
    movementNumber: string;
    approvedByUserId: number;
    decisionNote?: string | null;
  }): Promise<StockAdjustmentApprovalResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const adjustment = await tx.stockAdjustment.findUnique({
          where: { id: input.adjustmentId },
          select: stockAdjustmentSelect,
        });

        if (!adjustment) {
          return { status: 'INACTIVE' };
        }

        if (adjustment.status !== StockAdjustmentStatus.PENDING) {
          return { status: 'ALREADY_APPLIED' };
        }

        const [item, location, existingBalance] = await Promise.all([
          tx.inventoryItem.findFirst({
            where: {
              id: adjustment.itemId,
              status: InventoryItemStatus.ACTIVE,
            },
            select: { id: true, averageCost: true },
          }),
          tx.inventoryLocation.findFirst({
            where: {
              id: adjustment.locationId,
              isActive: true,
            },
            select: { id: true },
          }),
          this.stockBalancesRepository.findBalance(
            adjustment.itemId,
            adjustment.locationId,
            tx,
          ),
        ]);

        if (!item || !location) {
          return { status: 'INACTIVE' };
        }

        const absoluteQuantity = adjustment.quantity.abs();
        const isIncrease = adjustment.quantity.greaterThan(0);
        const availableQuantity =
          existingBalance?.quantity ?? new Prisma.Decimal(0);
        if (!isIncrease && availableQuantity.lessThan(absoluteQuantity)) {
          return {
            status: 'INSUFFICIENT',
            availableQuantity,
          };
        }

        const claimed = await tx.stockAdjustment.updateMany({
          where: {
            id: adjustment.id,
            status: StockAdjustmentStatus.PENDING,
          },
          data: {
            status: StockAdjustmentStatus.APPROVED,
            approvedByUserId: input.approvedByUserId,
            decidedAt: new Date(),
            decisionNote: input.decisionNote,
          },
        });

        if (claimed.count !== 1) {
          return { status: 'ALREADY_APPLIED' };
        }

        const balance = isIncrease
          ? await this.stockBalancesRepository.increaseBalance(
              adjustment.itemId,
              adjustment.locationId,
              absoluteQuantity,
              tx,
            )
          : await this.stockBalancesRepository.decreaseBalance(
              adjustment.itemId,
              adjustment.locationId,
              absoluteQuantity,
              tx,
            );

        if (!balance) {
          throw new Error(
            'Stock balance changed while an adjustment was being approved.',
          );
        }

        const movement = await this.stockMovementsRepository.createMovement(
          {
            movementNumber: input.movementNumber,
            itemId: adjustment.itemId,
            locationId: adjustment.locationId,
            type: isIncrease
              ? StockMovementType.ADJUSTMENT_IN
              : StockMovementType.ADJUSTMENT_OUT,
            quantity: absoluteQuantity,
            unitCost: item.averageCost,
            totalCost: item.averageCost
              ? absoluteQuantity.mul(item.averageCost)
              : null,
            referenceType: 'STOCK_ADJUSTMENT',
            referenceId: adjustment.id,
            reason: adjustment.reason,
            notes: input.decisionNote,
            createdByUserId: input.approvedByUserId,
          },
          tx,
        );
        const approvedAdjustment = await tx.stockAdjustment.update({
          where: { id: adjustment.id },
          data: {
            status: StockAdjustmentStatus.APPROVED,
          },
          select: stockAdjustmentSelect,
        });

        return {
          status: 'APPROVED',
          adjustment: approvedAdjustment,
          balance,
          movement,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  rejectAdjustment(
    id: number,
    data: Prisma.StockAdjustmentUncheckedUpdateInput,
  ) {
    return this.prisma.stockAdjustment.update({
      where: { id },
      data,
      select: stockAdjustmentSelect,
    });
  }

  cancelAdjustment(
    id: number,
    data: Prisma.StockAdjustmentUncheckedUpdateInput,
  ) {
    return this.prisma.stockAdjustment.update({
      where: { id },
      data,
      select: stockAdjustmentSelect,
    });
  }
}
