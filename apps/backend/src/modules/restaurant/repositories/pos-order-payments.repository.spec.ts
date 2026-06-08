/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { PosPaymentMethod, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PosOrderPaymentsRepository } from './pos-order-payments.repository';

describe('PosOrderPaymentsRepository', () => {
  let repository: PosOrderPaymentsRepository;
  let prisma: {
    posOrderPayment: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      posOrderPayment: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosOrderPaymentsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(PosOrderPaymentsRepository);
  });

  it('creates and finds POS payments through PrismaService', async () => {
    await repository.createPayment({
      paymentNumber: 'POS-PAY-20260608-000001',
      orderId: 9,
      amount: new Prisma.Decimal(450),
      method: PosPaymentMethod.CASH,
    });
    await repository.findByPaymentNumber('POS-PAY-20260608-000001');

    expect(prisma.posOrderPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentNumber: 'POS-PAY-20260608-000001',
          orderId: 9,
        }),
      }),
    );
    expect(prisma.posOrderPayment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { paymentNumber: 'POS-PAY-20260608-000001' },
      }),
    );
  });
});
