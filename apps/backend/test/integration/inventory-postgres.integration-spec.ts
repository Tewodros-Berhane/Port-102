import { BadRequestException, ConflictException } from '@nestjs/common';

import {
  InventoryItemStatus,
  InventoryItemType,
  Prisma,
  StockAdjustmentStatus,
  StockMovementType,
} from '../../src/generated/prisma/client';
import type { CurrentUserPayload } from '../../src/modules/auth/types/current-user-payload.type';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { StockAdjustmentsRepository } from '../../src/modules/inventory/repositories/stock-adjustments.repository';
import { StockIssuesRepository } from '../../src/modules/inventory/repositories/stock-issues.repository';
import { StockReceiptsRepository } from '../../src/modules/inventory/repositories/stock-receipts.repository';
import { StockTransfersRepository } from '../../src/modules/inventory/repositories/stock-transfers.repository';
import {
  createIntegrationContext,
  type IntegrationContext,
  resetIntegrationDatabase,
} from './integration-test-context';

describe('Inventory PostgreSQL integration', () => {
  let context: IntegrationContext;
  let service: InventoryService;
  let user: CurrentUserPayload;

  beforeAll(async () => {
    context = await createIntegrationContext();
    service = context.app.get(InventoryService);
  });

  beforeEach(async () => {
    context.user = await resetIntegrationDatabase(context.prisma);
    user = {
      sub: context.user.id,
      email: context.user.email,
      roleKey: 'HOTEL_ADMIN',
      roleId: context.user.roleId,
      departmentId: null,
      tokenVersion: 0,
    };
  });

  afterAll(async () => context?.app.close());

  async function seedInventory(
    quantity = '0',
    averageCost: string | null = null,
  ) {
    const item = await context.prisma.inventoryItem.create({
      data: {
        itemNumber: `ITEM-${Date.now()}-${Math.random()}`,
        name: 'Integration item',
        type: InventoryItemType.FOOD,
        unitOfMeasure: 'kg',
        averageCost,
      },
    });
    const from = await context.prisma.inventoryLocation.create({
      data: { code: `FROM-${Date.now()}-${Math.random()}`, name: 'Main store' },
    });
    const to = await context.prisma.inventoryLocation.create({
      data: { code: `TO-${Date.now()}-${Math.random()}`, name: 'Outlet store' },
    });
    if (quantity !== '0') {
      await context.prisma.stockBalance.create({
        data: { itemId: item.id, locationId: from.id, quantity },
      });
    }
    return { item, from, to };
  }

  it('receives stock, creates a balance and movement, and calculates weighted average cost', async () => {
    const { item, from } = await seedInventory('10', '10');
    const result = await service.receiveStock(user, {
      itemId: item.id,
      locationId: from.id,
      quantity: 10,
      unitCost: 20,
    });

    expect(result.balance.quantity).toBe('20.00');
    expect(result.averageCost).toBe('15.00');
    expect(
      await context.prisma.stockMovement.count({
        where: { itemId: item.id, type: StockMovementType.RECEIPT },
      }),
    ).toBe(1);
  });

  it('rolls back a receipt when movement creation fails', async () => {
    const { item, from } = await seedInventory('5');
    const repository = context.app.get(StockReceiptsRepository);
    await context.prisma.stockMovement.create({
      data: {
        movementNumber: 'DUPLICATE-RECEIPT',
        itemId: item.id,
        locationId: from.id,
        type: StockMovementType.RECEIPT,
        quantity: 1,
      },
    });

    await expect(
      repository.receiveStock({
        movementNumber: 'DUPLICATE-RECEIPT',
        itemId: item.id,
        locationId: from.id,
        quantity: new Prisma.Decimal(3),
        createdByUserId: context.user.id,
      }),
    ).rejects.toBeDefined();
    const balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: item.id, locationId: from.id } },
    });
    expect(balance.quantity.toString()).toBe('5');
  });

  it('rejects inactive items and locations', async () => {
    const { item, from } = await seedInventory();
    await context.prisma.inventoryItem.update({
      where: { id: item.id },
      data: { status: InventoryItemStatus.INACTIVE },
    });
    await expect(
      service.receiveStock(user, {
        itemId: item.id,
        locationId: from.id,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('issues stock without allowing a negative balance', async () => {
    const { item, from } = await seedInventory('5', '4');
    const issued = await service.issueStock(user, {
      itemId: item.id,
      locationId: from.id,
      quantity: 3,
    });
    expect(issued.balance.quantity).toBe('2.00');
    await expect(
      service.issueStock(user, {
        itemId: item.id,
        locationId: from.id,
        quantity: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: item.id, locationId: from.id } },
    });
    expect(balance.quantity.toString()).toBe('2');
  });

  it('rolls back an issue when movement creation fails', async () => {
    const { item, from } = await seedInventory('5');
    const repository = context.app.get(StockIssuesRepository);
    await context.prisma.stockMovement.create({
      data: {
        movementNumber: 'DUPLICATE-ISSUE',
        itemId: item.id,
        locationId: from.id,
        type: StockMovementType.ISSUE,
        quantity: 1,
      },
    });
    await expect(
      repository.issueStock({
        movementNumber: 'DUPLICATE-ISSUE',
        itemId: item.id,
        locationId: from.id,
        quantity: new Prisma.Decimal(2),
        createdByUserId: context.user.id,
      }),
    ).rejects.toBeDefined();
    const balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: item.id, locationId: from.id } },
    });
    expect(balance.quantity.toString()).toBe('5');
  });

  it('transfers stock atomically and creates both movements', async () => {
    const { item, from, to } = await seedInventory('8', '2');
    const result = await service.transferStock(user, {
      itemId: item.id,
      fromLocationId: from.id,
      toLocationId: to.id,
      quantity: 3,
    });
    expect(result.fromBalance.quantity).toBe('5.00');
    expect(result.toBalance.quantity).toBe('3.00');
    const types = (
      await context.prisma.stockMovement.findMany({
        where: { itemId: item.id },
        orderBy: { id: 'asc' },
      })
    ).map((movement) => movement.type);
    expect(types).toEqual([
      StockMovementType.TRANSFER_OUT,
      StockMovementType.TRANSFER_IN,
    ]);
  });

  it('rolls back the source deduction when the inbound movement fails', async () => {
    const { item, from, to } = await seedInventory('8');
    const repository = context.app.get(StockTransfersRepository);
    await context.prisma.stockMovement.create({
      data: {
        movementNumber: 'DUPLICATE-TRANSFER-IN',
        itemId: item.id,
        type: StockMovementType.TRANSFER_IN,
        quantity: 1,
      },
    });
    await expect(
      repository.transferStock({
        transferOutMovementNumber: 'TRANSFER-OUT-ROLLBACK',
        transferInMovementNumber: 'DUPLICATE-TRANSFER-IN',
        itemId: item.id,
        fromLocationId: from.id,
        toLocationId: to.id,
        quantity: new Prisma.Decimal(2),
        createdByUserId: context.user.id,
      }),
    ).rejects.toBeDefined();
    const source = await context.prisma.stockBalance.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: item.id, locationId: from.id } },
    });
    expect(source.quantity.toString()).toBe('8');
    expect(
      await context.prisma.stockBalance.findUnique({
        where: { itemId_locationId: { itemId: item.id, locationId: to.id } },
      }),
    ).toBeNull();
  });

  it('rejects a same-location transfer', async () => {
    const { item, from } = await seedInventory('2');
    await expect(
      service.transferStock(user, {
        itemId: item.id,
        fromLocationId: from.id,
        toLocationId: from.id,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies an adjustment only after approval and never below zero', async () => {
    const { item, from } = await seedInventory('4');
    const pending = await service.createStockAdjustment(user, {
      itemId: item.id,
      locationId: from.id,
      quantity: -3,
      reason: 'Count correction',
    });
    expect(pending.status).toBe(StockAdjustmentStatus.PENDING);
    let balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: item.id, locationId: from.id } },
    });
    expect(balance.quantity.toString()).toBe('4');
    await service.approveStockAdjustment(user, pending.id, {});
    balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: item.id, locationId: from.id } },
    });
    expect(balance.quantity.toString()).toBe('1');
    await expect(
      service.approveStockAdjustment(user, pending.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    const excessive = await service.createStockAdjustment(user, {
      itemId: item.id,
      locationId: from.id,
      quantity: -2,
      reason: 'Invalid correction',
    });
    await expect(
      service.approveStockAdjustment(user, excessive.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not double-apply competing adjustment approvals', async () => {
    const { item, from } = await seedInventory();
    const adjustment = await context.prisma.stockAdjustment.create({
      data: {
        adjustmentNumber: `CONCURRENT-ADJ-${Date.now()}`,
        itemId: item.id,
        locationId: from.id,
        quantity: 5,
        reason: 'Concurrent approval test',
        requestedByUserId: context.user.id,
      },
    });
    const repository = context.app.get(StockAdjustmentsRepository);

    await Promise.allSettled([
      repository.approveAdjustment({
        adjustmentId: adjustment.id,
        movementNumber: `CONCURRENT-ADJ-MOV-A-${Date.now()}`,
        approvedByUserId: context.user.id,
      }),
      repository.approveAdjustment({
        adjustmentId: adjustment.id,
        movementNumber: `CONCURRENT-ADJ-MOV-B-${Date.now()}`,
        approvedByUserId: context.user.id,
      }),
    ]);

    const balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: item.id, locationId: from.id } },
    });
    expect(balance.quantity.toString()).toBe('5');
    expect(
      await context.prisma.stockMovement.count({
        where: {
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: adjustment.id,
        },
      }),
    ).toBe(1);
  });
});
