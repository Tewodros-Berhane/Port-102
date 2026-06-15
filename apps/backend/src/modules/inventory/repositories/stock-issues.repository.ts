import { Injectable } from '@nestjs/common';

import {
  InventoryItemStatus,
  Prisma,
  StockMovementType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockMovementsRepository } from './stock-movements.repository';

export type StockIssueResult =
  | { status: 'INACTIVE' }
  | { status: 'INSUFFICIENT'; availableQuantity: Prisma.Decimal }
  | {
      status: 'ISSUED';
      balance: NonNullable<
        Awaited<ReturnType<StockBalancesRepository['findBalance']>>
      >;
      movement: Awaited<ReturnType<StockMovementsRepository['createMovement']>>;
    };

@Injectable()
export class StockIssuesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockBalancesRepository: StockBalancesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
  ) {}

  issueStock(input: {
    movementNumber: string;
    itemId: number;
    locationId: number;
    quantity: Prisma.Decimal;
    referenceType?: string | null;
    referenceId?: number;
    reason?: string | null;
    notes?: string | null;
    createdByUserId: number;
  }): Promise<StockIssueResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const [item, location, existingBalance] = await Promise.all([
          tx.inventoryItem.findFirst({
            where: {
              id: input.itemId,
              status: InventoryItemStatus.ACTIVE,
            },
            select: {
              id: true,
              averageCost: true,
            },
          }),
          tx.inventoryLocation.findFirst({
            where: {
              id: input.locationId,
              isActive: true,
            },
            select: { id: true },
          }),
          this.stockBalancesRepository.findBalance(
            input.itemId,
            input.locationId,
            tx,
          ),
        ]);

        if (!item || !location) {
          return { status: 'INACTIVE' };
        }

        const availableQuantity =
          existingBalance?.quantity ?? new Prisma.Decimal(0);
        const balance = await this.stockBalancesRepository.decreaseBalance(
          input.itemId,
          input.locationId,
          input.quantity,
          tx,
        );

        if (!balance) {
          return {
            status: 'INSUFFICIENT',
            availableQuantity,
          };
        }

        const movement = await this.stockMovementsRepository.createMovement(
          {
            movementNumber: input.movementNumber,
            itemId: input.itemId,
            locationId: input.locationId,
            type: StockMovementType.ISSUE,
            quantity: input.quantity,
            unitCost: item.averageCost,
            totalCost: item.averageCost
              ? input.quantity.mul(item.averageCost)
              : null,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            reason: input.reason,
            notes: input.notes,
            createdByUserId: input.createdByUserId,
          },
          tx,
        );

        return {
          status: 'ISSUED',
          balance,
          movement,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
