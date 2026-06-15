import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockMovementsRepository } from './stock-movements.repository';
import { StockReceiptsRepository } from './stock-receipts.repository';

describe('StockReceiptsRepository', () => {
  let repository: StockReceiptsRepository;
  let prisma: {
    $transaction: jest.Mock;
  };
  let balancesRepository: {
    findBalance: jest.Mock;
    increaseBalance: jest.Mock;
  };
  let movementsRepository: {
    createMovement: jest.Mock;
  };
  let tx: {
    inventoryItem: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    inventoryLocation: {
      findFirst: jest.Mock;
    };
    stockBalance: object;
    stockMovement: object;
  };

  beforeEach(async () => {
    tx = {
      inventoryItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      inventoryLocation: {
        findFirst: jest.fn(),
      },
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
      increaseBalance: jest.fn(),
    };
    movementsRepository = {
      createMovement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockReceiptsRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: StockBalancesRepository, useValue: balancesRepository },
        { provide: StockMovementsRepository, useValue: movementsRepository },
      ],
    }).compile();

    repository = module.get(StockReceiptsRepository);
  });

  it('receives stock and calculates weighted average cost transactionally', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 7,
      averageCost: new Prisma.Decimal(100),
    });
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue({
      quantity: new Prisma.Decimal(10),
    });
    balancesRepository.increaseBalance.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(15),
    });
    movementsRepository.createMovement.mockResolvedValue({
      id: 9,
      totalCost: new Prisma.Decimal(1000),
    });

    const result = await repository.receiveStock({
      movementNumber: 'MOV-20260615-000001',
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(5),
      unitCost: new Prisma.Decimal(200),
      createdByUserId: 1,
    });

    expect(result?.averageCost?.toFixed(2)).toBe('133.33');
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { averageCost: new Prisma.Decimal('133.33') },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('keeps average cost unchanged when a receipt has no unit cost', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 7,
      averageCost: new Prisma.Decimal(100),
    });
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue(null);
    balancesRepository.increaseBalance.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(5),
    });
    movementsRepository.createMovement.mockResolvedValue({
      id: 9,
      totalCost: null,
    });

    const result = await repository.receiveStock({
      movementNumber: 'MOV-20260615-000002',
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(5),
      createdByUserId: 1,
    });

    expect(result?.averageCost?.toFixed(2)).toBe('100.00');
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('uses receipt cost as average cost when no valued stock exists', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 7,
      averageCost: null,
    });
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue(null);
    balancesRepository.increaseBalance.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(5),
    });
    movementsRepository.createMovement.mockResolvedValue({
      id: 9,
      totalCost: new Prisma.Decimal(750),
    });

    const result = await repository.receiveStock({
      movementNumber: 'MOV-20260615-000003',
      itemId: 7,
      locationId: 4,
      quantity: new Prisma.Decimal(5),
      unitCost: new Prisma.Decimal(150),
      createdByUserId: 1,
    });

    expect(result?.averageCost?.toFixed(2)).toBe('150.00');
  });

  it('rejects the transaction when item or location is no longer active', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue(null);
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue(null);

    await expect(
      repository.receiveStock({
        movementNumber: 'MOV-20260615-000004',
        itemId: 7,
        locationId: 4,
        quantity: new Prisma.Decimal(5),
        createdByUserId: 1,
      }),
    ).resolves.toBeNull();

    expect(balancesRepository.increaseBalance).not.toHaveBeenCalled();
    expect(movementsRepository.createMovement).not.toHaveBeenCalled();
  });
});
