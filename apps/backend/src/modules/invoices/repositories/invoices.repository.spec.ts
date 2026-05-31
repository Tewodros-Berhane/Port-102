import { InvoiceStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InvoicesRepository } from './invoices.repository';

describe('InvoicesRepository', () => {
  let repository: InvoicesRepository;
  let prisma: {
    $transaction: jest.Mock;
    invoice: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      invoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new InvoicesRepository(prisma as unknown as PrismaService);
  });

  it('runs invoice work inside a Prisma transaction', async () => {
    const operation = jest.fn();

    await repository.runInTransaction(operation);

    expect(prisma.$transaction).toHaveBeenCalledWith(operation);
  });

  it('creates invoices with the standard projection', async () => {
    await repository.createInvoice({
      invoiceNumber: 'INV-20260530-000001',
      folioId: 10,
      subtotalAmount: '150',
      discountAmount: '0',
      taxAmount: '0',
      serviceAmount: '0',
      totalAmount: '150',
      issuedByUserId: 1,
    });

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          invoiceNumber: 'INV-20260530-000001',
          folioId: 10,
          subtotalAmount: '150',
          discountAmount: '0',
          taxAmount: '0',
          serviceAmount: '0',
          totalAmount: '150',
          issuedByUserId: 1,
        },
        select: expect.objectContaining({
          id: true,
          invoiceNumber: true,
          folio: expect.any(Object),
          issuedBy: expect.any(Object),
        }),
      }),
    );
  });

  it('finds the latest issued invoice for a folio', async () => {
    await repository.findIssuedInvoiceByFolioId(10);

    expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          folioId: 10,
          status: InvoiceStatus.ISSUED,
        },
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('lists invoices with filters, pagination, search, and stable ordering', async () => {
    prisma.invoice.count.mockResolvedValue(0);
    prisma.invoice.findMany.mockResolvedValue([]);

    await repository.listInvoices({
      skip: 10,
      take: 5,
      search: 'INV',
      status: InvoiceStatus.ISSUED,
      folioId: 10,
      issuedFrom: new Date('2026-05-01T00:00:00.000Z'),
      issuedTo: new Date('2026-05-31T23:59:59.000Z'),
    });

    expect(prisma.invoice.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: InvoiceStatus.ISSUED,
        folioId: 10,
        issuedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});
