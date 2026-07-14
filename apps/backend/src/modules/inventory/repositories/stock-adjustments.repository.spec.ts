/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import {
  Prisma,
  StockAdjustmentStatus,
  StockMovementType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockAdjustmentsRepository } from './stock-adjustments.repository';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockMovementsRepository } from './stock-movements.repository';

describe('StockAdjustmentsRepository', () => {
  let repository: StockAdjustmentsRepository;
  let prisma: {
    $transaction: jest.Mock;
    stockAdjustment: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let balancesRepository: {
    findBalance: jest.Mock;
    increaseBalance: jest.Mock;
    decreaseBalance: jest.Mock;
  };
  let movementsRepository: { createMovement: jest.Mock };
  let tx: {
    stockAdjustment: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
    inventoryItem: { findFirst: jest.Mock };
    inventoryLocation: { findFirst: jest.Mock };
    stockBalance: object;
    stockMovement: object;
  };

  const adjustment = {
    id: 3,
    adjustmentNumber: 'ADJ-20260616-000001',
    itemId: 7,
    locationId: 4,
    status: StockAdjustmentStatus.PENDING,
    quantity: new Prisma.Decimal(-2),
    reason: 'Physical count variance.',
  };

  beforeEach(async () => {
    tx = {
      stockAdjustment: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      inventoryItem: { findFirst: jest.fn() },
      inventoryLocation: { findFirst: jest.fn() },
      stockBalance: {},
      stockMovement: {},
    };
    prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      stockAdjustment: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    balancesRepository = {
      findBalance: jest.fn(),
      increaseBalance: jest.fn(),
      decreaseBalance: jest.fn(),
    };
    movementsRepository = {
      createMovement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAdjustmentsRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: StockBalancesRepository, useValue: balancesRepository },
        { provide: StockMovementsRepository, useValue: movementsRepository },
      ],
    }).compile();

    repository = module.get(StockAdjustmentsRepository);
  });

  it('lists adjustments with filters and pagination', async () => {
    prisma.stockAdjustment.count.mockResolvedValue(0);
    prisma.stockAdjustment.findMany.mockResolvedValue([]);

    await repository.listAdjustments({
      skip: 20,
      take: 20,
      search: 'rice',
      status: StockAdjustmentStatus.PENDING,
      itemId: 7,
      locationId: 4,
    });

    expect(prisma.stockAdjustment.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: StockAdjustmentStatus.PENDING,
        itemId: 7,
        locationId: 4,
      }),
    });
    expect(prisma.stockAdjustment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      }),
    );
  });

  it('creates a pending stock adjustment request', async () => {
    await repository.createAdjustment({
      adjustmentNumber: 'ADJ-20260616-000001',
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(5),
      reason: 'Opening correction.',
      requestedByUserId: 1,
    });

    expect(prisma.stockAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adjustmentNumber: 'ADJ-20260616-000001',
          requestedByUserId: 1,
        }),
      }),
    );
  });

  it('approves a negative adjustment with an adjustment-out movement', async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue(adjustment);
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 7,
      averageCost: new Prisma.Decimal(20),
    });
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue({
      quantity: new Prisma.Decimal(10),
    });
    balancesRepository.decreaseBalance.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(8),
    });
    movementsRepository.createMovement.mockResolvedValue({ id: 12 });
    tx.stockAdjustment.update.mockResolvedValue({
      ...adjustment,
      status: StockAdjustmentStatus.APPROVED,
    });

    const result = await repository.approveAdjustment({
      adjustmentId: 3,
      movementNumber: 'MOV-20260616-000001',
      approvedByUserId: 2,
      decisionNote: 'Approved.',
    });

    expect(result.status).toBe('APPROVED');
    expect(balancesRepository.decreaseBalance).toHaveBeenCalledWith(
      7,
      4,
      new Prisma.Decimal(2),
      tx,
    );
    expect(movementsRepository.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StockMovementType.ADJUSTMENT_OUT,
        quantity: new Prisma.Decimal(2),
      }),
      tx,
    );
  });

  it('approves a positive adjustment with an adjustment-in movement', async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue({
      ...adjustment,
      quantity: new Prisma.Decimal(4),
    });
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 7,
      averageCost: null,
    });
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue(null);
    balancesRepository.increaseBalance.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(4),
    });
    movementsRepository.createMovement.mockResolvedValue({ id: 13 });
    tx.stockAdjustment.update.mockResolvedValue({
      ...adjustment,
      status: StockAdjustmentStatus.APPROVED,
      quantity: new Prisma.Decimal(4),
    });

    const result = await repository.approveAdjustment({
      adjustmentId: 3,
      movementNumber: 'MOV-20260616-000002',
      approvedByUserId: 2,
    });

    expect(result.status).toBe('APPROVED');
    expect(balancesRepository.increaseBalance).toHaveBeenCalledWith(
      7,
      4,
      new Prisma.Decimal(4),
      tx,
    );
    expect(movementsRepository.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StockMovementType.ADJUSTMENT_IN,
      }),
      tx,
    );
  });

  it('rejects negative adjustment approval when stock is insufficient', async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue(adjustment);
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 7,
      averageCost: new Prisma.Decimal(20),
    });
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue({
      quantity: new Prisma.Decimal(1),
    });
    balancesRepository.decreaseBalance.mockResolvedValue(null);

    await expect(
      repository.approveAdjustment({
        adjustmentId: 3,
        movementNumber: 'MOV-20260616-000003',
        approvedByUserId: 2,
      }),
    ).resolves.toEqual({
      status: 'INSUFFICIENT',
      availableQuantity: new Prisma.Decimal(1),
    });

    expect(movementsRepository.createMovement).not.toHaveBeenCalled();
    expect(tx.stockAdjustment.update).not.toHaveBeenCalled();
  });
});
