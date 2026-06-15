import { Test, TestingModule } from '@nestjs/testing';

import { Prisma, StockMovementType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockBalancesRepository } from './stock-balances.repository';
import { StockIssuesRepository } from './stock-issues.repository';
import { StockMovementsRepository } from './stock-movements.repository';

describe('StockIssuesRepository', () => {
  let repository: StockIssuesRepository;
  let prisma: { $transaction: jest.Mock };
  let balancesRepository: {
    findBalance: jest.Mock;
    decreaseBalance: jest.Mock;
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
    };
    movementsRepository = {
      createMovement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockIssuesRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: StockBalancesRepository, useValue: balancesRepository },
        { provide: StockMovementsRepository, useValue: movementsRepository },
      ],
    }).compile();

    repository = module.get(StockIssuesRepository);
  });

  it('decrements stock and creates a valued issue movement transactionally', async () => {
    const averageCost = new Prisma.Decimal(145.5);
    const quantity = new Prisma.Decimal(10);
    tx.inventoryItem.findFirst.mockResolvedValue({ id: 7, averageCost });
    tx.inventoryLocation.findFirst.mockResolvedValue({ id: 4 });
    balancesRepository.findBalance.mockResolvedValue({
      quantity: new Prisma.Decimal(25),
    });
    balancesRepository.decreaseBalance.mockResolvedValue({
      id: 1,
      quantity: new Prisma.Decimal(15),
    });
    movementsRepository.createMovement.mockResolvedValue({ id: 9 });

    const result = await repository.issueStock({
      movementNumber: 'MOV-20260615-000001',
      itemId: 7,
      locationId: 4,
      quantity,
      referenceType: 'DEPARTMENT',
      referenceId: 6,
      createdByUserId: 1,
    });

    expect(result.status).toBe('ISSUED');
    expect(movementsRepository.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StockMovementType.ISSUE,
        quantity,
        unitCost: averageCost,
        totalCost: new Prisma.Decimal(1455),
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

});
