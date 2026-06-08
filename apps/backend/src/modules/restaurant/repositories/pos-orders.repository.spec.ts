/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import {
  PosOrderPaymentStatus,
  PosOrderSource,
  PosOrderStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PosOrdersRepository } from './pos-orders.repository';

describe('PosOrdersRepository', () => {
  let repository: PosOrdersRepository;
  let prisma: {
    $transaction: jest.Mock;
    posOrder: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      posOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosOrdersRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<PosOrdersRepository>(PosOrdersRepository);
  });

  it('runs grouped POS writes in a transaction', async () => {
    const operation = jest.fn().mockResolvedValue('done');
    prisma.$transaction.mockResolvedValue('done');

    await repository.runInTransaction(operation);

    expect(prisma.$transaction).toHaveBeenCalledWith(operation, {
      isolationLevel: 'Serializable',
    });
  });

  it('creates and finds orders through PrismaService', async () => {
    await repository.createOrder({
      orderNumber: 'POS-20260607-000001',
      outletId: 2,
      createdByUserId: 1,
    });
    await repository.findOrder(9);
    await repository.findByOrderNumber('POS-20260607-000001');

    expect(prisma.posOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          orderNumber: 'POS-20260607-000001',
          outletId: 2,
          createdByUserId: 1,
        },
      }),
    );
    expect(prisma.posOrder.findUnique).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: 9 } }),
    );
    expect(prisma.posOrder.findUnique).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { orderNumber: 'POS-20260607-000001' },
      }),
    );
  });

  it('lists orders with operational filters', async () => {
    prisma.posOrder.count.mockResolvedValue(0);
    prisma.posOrder.findMany.mockResolvedValue([]);
    const createdFrom = new Date('2026-06-01T00:00:00.000Z');
    const createdTo = new Date('2026-06-30T23:59:59.999Z');

    await repository.listOrders({
      skip: 10,
      take: 10,
      search: 'T-12',
      outletId: 2,
      status: PosOrderStatus.OPEN,
      paymentStatus: PosOrderPaymentStatus.UNPAID,
      source: PosOrderSource.TABLE_SERVICE,
      createdFrom,
      createdTo,
    });

    expect(prisma.posOrder.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        outletId: 2,
        status: PosOrderStatus.OPEN,
        paymentStatus: PosOrderPaymentStatus.UNPAID,
        source: PosOrderSource.TABLE_SERVICE,
        createdAt: {
          gte: createdFrom,
          lte: createdTo,
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.posOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('updates orders through PrismaService', async () => {
    await repository.updateOrder(9, {
      tableNumber: 'T-14',
    });

    expect(prisma.posOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9 },
        data: { tableNumber: 'T-14' },
      }),
    );
  });
});
