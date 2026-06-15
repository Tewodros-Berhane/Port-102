import { Injectable } from '@nestjs/common';

import {
  InventoryItemStatus,
  Prisma,
  StockMovementType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockMovementsRepository } from './stock-movements.repository';

@Injectable()
export class StockReceiptsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockBalancesRepository: StockBalancesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
  ) {}

  receiveStock(input: {
    movementNumber: string;
    itemId: number;
    locationId: number;
    quantity: Prisma.Decimal;
    unitCost?: Prisma.Decimal;
    referenceType?: string | null;
    referenceId?: number;
    reason?: string | null;
    notes?: string | null;
    createdByUserId: number;
  }) {
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
          return null;
        }

        const previousQuantity =
          existingBalance?.quantity ?? new Prisma.Decimal(0);
        const balance = await this.stockBalancesRepository.increaseBalance(
          input.itemId,
          input.locationId,
          input.quantity,
          tx,
        );
        let averageCost = item.averageCost;

        if (input.unitCost) {
          const existingValue =
            item.averageCost && previousQuantity.greaterThan(0)
              ? previousQuantity.mul(item.averageCost)
              : new Prisma.Decimal(0);
          averageCost = existingValue
            .add(input.quantity.mul(input.unitCost))
            .div(previousQuantity.add(input.quantity))
            .toDecimalPlaces(2);

          await tx.inventoryItem.update({
            where: { id: input.itemId },
            data: { averageCost },
          });
        }

        const movement = await this.stockMovementsRepository.createMovement(
          {
            movementNumber: input.movementNumber,
            itemId: input.itemId,
            locationId: input.locationId,
            type: StockMovementType.RECEIPT,
            quantity: input.quantity,
            unitCost: input.unitCost,
            totalCost: input.unitCost
              ? input.quantity.mul(input.unitCost)
              : null,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            reason: input.reason,
            notes: input.notes,
            createdByUserId: input.createdByUserId,
          },
          tx,
        );

        return { balance, movement, averageCost };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
