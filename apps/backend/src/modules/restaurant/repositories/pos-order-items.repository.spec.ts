/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PosOrderItemsRepository } from './pos-order-items.repository';

describe('PosOrderItemsRepository', () => {
  let repository: PosOrderItemsRepository;
  let prisma: {
    posOrderItem: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      posOrderItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosOrderItemsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(PosOrderItemsRepository);
  });

  it('creates, finds, and updates order items through PrismaService', async () => {
    await repository.createOrderItem({
      orderId: 9,
      menuItemId: 7,
      quantity: 2,
      unitPrice: new Prisma.Decimal(450),
      totalAmount: new Prisma.Decimal(900),
    });
    await repository.findOrderItem(9, 12);
    await repository.updateOrderItem(12, {
      quantity: 3,
      totalAmount: new Prisma.Decimal(1350),
    });

    expect(prisma.posOrderItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: 9, menuItemId: 7 }),
      }),
    );
    expect(prisma.posOrderItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 12, orderId: 9 } }),
    );
    expect(prisma.posOrderItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12 },
        data: expect.objectContaining({ quantity: 3 }),
      }),
    );
  });
});
