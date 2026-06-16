import { Test, TestingModule } from '@nestjs/testing';

import { Prisma, StockMovementType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockMovementsRepository } from './stock-movements.repository';
import { StockTransfersRepository } from './stock-transfers.repository';

describe('StockTransfersRepository', () => {
  let repository: StockTransfersRepository;
  let prisma: { $transaction: jest.Mock };
  let balancesRepository: {
    findBalance: jest.Mock;
    decreaseBalance: jest.Mock;
    increaseBalance: jest.Mock;
  };
  let movementsRepository: { createMovement: jest.Mock };
  let tx: {
    inventoryItem: { findFirst: jest.Mock };
    inventoryLocation: { findFirst: jest.Mock };
    stockBalance: object;
    stockMovement: object;
  };

  beforeEach(async () => {
    tx = {
      inventoryItem: { findFirst: jest.fn() },
      inventoryLocation: { findFirst: jest.fn() },
      stockBalance: {},
      stockMovement: {},
    };
    prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    balancesRepository = {
      findBalance: jest.fn(),
      decreaseBalance: jest.fn(),
      increaseBalance: jest.fn(),
    };
    movementsRepository = {
      createMovement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTransfersRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: StockBalancesRepository, useValue: balancesRepository },
        { provide: StockMovementsRepository, useValue: movementsRepository },
      ],
    }).compile();

    repository = module.get(StockTransfersRepository);
  });

  it('moves stock between locations and records paired movements', async () => {
    const averageCost = new Prisma.Decimal(20);
    const quantity = new Prisma.Decimal(3);
    tx.inventoryItem.findFirst.mockResolvedValue({ id: 7, averageCost });
    tx.inventoryLocation.findFirst
      .mockResolvedValueOnce({ id: 4 })
      .mockResolvedValueOnce({ id: 5 });
    balancesRepository.findBalance.mockResolvedValue({
      quantity: new Prisma.Decimal(10),
    });
    balancesRepository.decreaseBalance.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(7),
    });
    balancesRepository.increaseBalance.mockResolvedValue({
      id: 2,
      quantity: new Prisma.Decimal(6),
    });
    movementsRepository.createMovement
      .mockResolvedValueOnce({ id: 11, type: StockMovementType.TRANSFER_OUT })
      .mockResolvedValueOnce({ id: 12, type: StockMovementType.TRANSFER_IN });

    const result = await repository.transferStock({
      transferOutMovementNumber: 'MOV-20260616-000001',
      transferInMovementNumber: 'MOV-20260616-000002',
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 5,
      quantity,
      createdByUserId: 1,
    });

    expect(result.status).toBe('TRANSFERRED');
    expect(balancesRepository.decreaseBalance).toHaveBeenCalledWith(
      7,
      4,
      quantity,
      tx,
    );
    expect(balancesRepository.increaseBalance).toHaveBeenCalledWith(
      7,
      5,
      quantity,
      tx,
    );
    expect(movementsRepository.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StockMovementType.TRANSFER_OUT,
        totalCost: new Prisma.Decimal(60),
      }),
      tx,
    );
    expect(movementsRepository.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StockMovementType.TRANSFER_IN,
        totalCost: new Prisma.Decimal(60),
      }),
      tx,
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }),
    );
  });

  it('returns available stock when source stock is insufficient', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 7,
      averageCost: new Prisma.Decimal(20),
    });
    tx.inventoryLocation.findFirst
      .mockResolvedValueOnce({ id: 4 })
      .mockResolvedValueOnce({ id: 5 });
    balancesRepository.findBalance.mockResolvedValue({
      quantity: new Prisma.Decimal(2),
    });
    balancesRepository.decreaseBalance.mockResolvedValue(null);

    await expect(
      repository.transferStock({
        transferOutMovementNumber: 'MOV-20260616-000003',
        transferInMovementNumber: 'MOV-20260616-000004',
        itemId: 7,
        fromLocationId: 4,
        toLocationId: 5,
        quantity: new Prisma.Decimal(3),
        createdByUserId: 1,
      }),
    ).resolves.toEqual({
      status: 'INSUFFICIENT',
      availableQuantity: new Prisma.Decimal(2),
    });

    expect(balancesRepository.increaseBalance).not.toHaveBeenCalled();
    expect(movementsRepository.createMovement).not.toHaveBeenCalled();
  });

  it('rejects transfer when item or location becomes inactive', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue(null);
    tx.inventoryLocation.findFirst
      .mockResolvedValueOnce({ id: 4 })
      .mockResolvedValueOnce({ id: 5 });
    balancesRepository.findBalance.mockResolvedValue(null);

    await expect(
      repository.transferStock({
        transferOutMovementNumber: 'MOV-20260616-000005',
        transferInMovementNumber: 'MOV-20260616-000006',
        itemId: 7,
        fromLocationId: 4,
        toLocationId: 5,
        quantity: new Prisma.Decimal(1),
        createdByUserId: 1,
      }),
    ).resolves.toEqual({ status: 'INACTIVE' });

    expect(balancesRepository.decreaseBalance).not.toHaveBeenCalled();
    expect(movementsRepository.createMovement).not.toHaveBeenCalled();
  });
});
