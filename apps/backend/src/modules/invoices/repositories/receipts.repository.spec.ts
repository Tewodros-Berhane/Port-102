import { ReceiptStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReceiptsRepository } from './receipts.repository';

describe('ReceiptsRepository', () => {
  let repository: ReceiptsRepository;
  let prisma: {
    receipt: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      receipt: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new ReceiptsRepository(prisma as unknown as PrismaService);
  });

  it('creates receipts with the standard projection', async () => {
    await repository.createReceipt({
      receiptNumber: 'RCT-20260530-000001',
      folioId: 10,
      paymentId: 20,
      amount: '150',
      issuedByUserId: 1,
    });

    expect(prisma.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          receiptNumber: 'RCT-20260530-000001',
          folioId: 10,
          paymentId: 20,
          amount: '150',
          issuedByUserId: 1,
        },
        select: expect.objectContaining({
          id: true,
          receiptNumber: true,
          folio: expect.any(Object),
          payment: expect.any(Object),
          issuedBy: expect.any(Object),
        }),
      }),
    );
  });

  it('lists receipts with filters, pagination, search, and stable ordering', async () => {
    prisma.receipt.count.mockResolvedValue(0);
    prisma.receipt.findMany.mockResolvedValue([]);

    await repository.listReceipts({
      skip: 10,
      take: 5,
      search: 'RCT',
      status: ReceiptStatus.ISSUED,
      folioId: 10,
      paymentId: 20,
      issuedFrom: new Date('2026-05-01T00:00:00.000Z'),
      issuedTo: new Date('2026-05-31T23:59:59.000Z'),
    });

    expect(prisma.receipt.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: ReceiptStatus.ISSUED,
        folioId: 10,
        paymentId: 20,
        issuedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.receipt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});
