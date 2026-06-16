import { Injectable } from '@nestjs/common';

import {
  InventoryItemStatus,
  Prisma,
  StockMovementType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockMovementsRepository } from './stock-movements.repository';

export type StockTransferResult =
  | { status: 'INACTIVE' }
  | { status: 'INSUFFICIENT'; availableQuantity: Prisma.Decimal }
  | {
      status: 'TRANSFERRED';
      fromBalance: NonNullable<
        Awaited<ReturnType<StockBalancesRepository['findBalance']>>
      >;
      toBalance: NonNullable<
        Awaited<ReturnType<StockBalancesRepository['findBalance']>>
      >;
      transferOutMovement: Awaited<
        ReturnType<StockMovementsRepository['createMovement']>
      >;
      transferInMovement: Awaited<
        ReturnType<StockMovementsRepository['createMovement']>
      >;
    };

@Injectable()
export class StockTransfersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockBalancesRepository: StockBalancesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
  ) {}

  transferStock(input: {
    transferOutMovementNumber: string;
    transferInMovementNumber: string;
    itemId: number;
    fromLocationId: number;
    toLocationId: number;
    quantity: Prisma.Decimal;
    referenceType?: string | null;
    referenceId?: number;
    reason?: string | null;
    notes?: string | null;
    createdByUserId: number;
  }): Promise<StockTransferResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const [item, fromLocation, toLocation, existingBalance] =
          await Promise.all([
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
                id: input.fromLocationId,
                isActive: true,
              },
              select: { id: true },
            }),
            tx.inventoryLocation.findFirst({
              where: {
                id: input.toLocationId,
                isActive: true,
              },
              select: { id: true },
            }),
            this.stockBalancesRepository.findBalance(
              input.itemId,
              input.fromLocationId,
              tx,
            ),
          ]);

        if (!item || !fromLocation || !toLocation) {
          return { status: 'INACTIVE' };
        }

        const availableQuantity =
          existingBalance?.quantity ?? new Prisma.Decimal(0);
        const fromBalance = await this.stockBalancesRepository.decreaseBalance(
          input.itemId,
          input.fromLocationId,
          input.quantity,
          tx,
        );

        if (!fromBalance) {
          return {
            status: 'INSUFFICIENT',
            availableQuantity,
          };
        }

        const toBalance = await this.stockBalancesRepository.increaseBalance(
          input.itemId,
          input.toLocationId,
          input.quantity,
          tx,
        );
        const totalCost = item.averageCost
          ? input.quantity.mul(item.averageCost)
          : null;
        const transferOutMovement =
          await this.stockMovementsRepository.createMovement(
            {
              movementNumber: input.transferOutMovementNumber,
              itemId: input.itemId,
              fromLocationId: input.fromLocationId,
              toLocationId: input.toLocationId,
              type: StockMovementType.TRANSFER_OUT,
              quantity: input.quantity,
              unitCost: item.averageCost,
              totalCost,
              referenceType: input.referenceType,
              referenceId: input.referenceId,
              reason: input.reason,
              notes: input.notes,
              createdByUserId: input.createdByUserId,
            },
            tx,
          );
        const transferInMovement =
          await this.stockMovementsRepository.createMovement(
            {
              movementNumber: input.transferInMovementNumber,
              itemId: input.itemId,
              fromLocationId: input.fromLocationId,
              toLocationId: input.toLocationId,
              type: StockMovementType.TRANSFER_IN,
              quantity: input.quantity,
              unitCost: item.averageCost,
              totalCost,
              referenceType: input.referenceType,
              referenceId: input.referenceId,
              reason: input.reason,
              notes: input.notes,
              createdByUserId: input.createdByUserId,
            },
            tx,
          );

        return {
          status: 'TRANSFERRED',
          fromBalance,
          toBalance,
          transferOutMovement,
          transferInMovement,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
