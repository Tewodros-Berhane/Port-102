import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentsRepository } from './payments.repository';

describe('PaymentsRepository', () => {
  let repository: PaymentsRepository;
  let prisma: {
    $transaction: jest.Mock;
    payment: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new PaymentsRepository(prisma as unknown as PrismaService);
  });

  it('runs payment work inside a Prisma transaction', async () => {
    const operation = jest.fn();

    await repository.runInTransaction(operation);

    expect(prisma.$transaction).toHaveBeenCalledWith(operation);
  });

  it('creates payments with the standard projection', async () => {
    await repository.createPayment({
      paymentNumber: 'PAY-20260530-000001',
      folioId: 10,
      amount: '150',
      method: PaymentMethod.CASH,
      recordedByUserId: 1,
    });

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          paymentNumber: 'PAY-20260530-000001',
          folioId: 10,
          amount: '150',
          method: PaymentMethod.CASH,
          recordedByUserId: 1,
        },
        select: expect.objectContaining({
          id: true,
          paymentNumber: true,
          folio: expect.any(Object),
          recordedBy: expect.any(Object),
        }),
      }),
    );
  });

  it('lists payments with filters, pagination, search, and stable ordering', async () => {
    prisma.payment.count.mockResolvedValue(0);
    prisma.payment.findMany.mockResolvedValue([]);

    await repository.listPayments({
      skip: 10,
      take: 5,
      search: 'reference',
      status: PaymentStatus.RECORDED,
      method: PaymentMethod.CARD,
      folioId: 10,
      recordedFrom: new Date('2026-05-01T00:00:00.000Z'),
      recordedTo: new Date('2026-05-31T23:59:59.000Z'),
    });

    expect(prisma.payment.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: PaymentStatus.RECORDED,
        method: PaymentMethod.CARD,
        folioId: 10,
        recordedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});
