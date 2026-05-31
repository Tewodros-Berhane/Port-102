import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  FolioStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReceiptStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FoliosRepository } from '../folios/repositories/folios.repository';
import { PaymentsRepository } from '../payments/repositories/payments.repository';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './repositories/invoices.repository';
import { ReceiptsRepository } from './repositories/receipts.repository';

describe('InvoicesService', () => {
  const currentUser = {
    sub: 1,
    email: 'frontdesk@demo-hotel.com',
    roleKey: 'FRONT_DESK_CASHIER',
    roleId: 4,
    departmentId: null,
    tokenVersion: 0,
  };
  const folio = {
    id: 70,
    folioNumber: 'FOL-20260610-123450',
    stayId: 40,
    guestId: 12,
    status: FolioStatus.OPEN,
    subtotalAmount: new Prisma.Decimal(220),
    discountAmount: new Prisma.Decimal(20),
    taxAmount: new Prisma.Decimal(10),
    serviceAmount: new Prisma.Decimal(5),
    totalAmount: new Prisma.Decimal(215),
    paidAmount: new Prisma.Decimal(100),
    balanceAmount: new Prisma.Decimal(115),
    openedAt: new Date('2026-06-10T08:05:00.000Z'),
    closedAt: null,
    openedByUserId: 1,
    closedByUserId: null,
    createdAt: new Date('2026-06-10T08:05:00.000Z'),
    updatedAt: new Date('2026-06-10T08:05:00.000Z'),
    stay: {
      id: 40,
      stayNumber: 'STAY-20260610-123450',
      reservationId: 20,
      guestId: 12,
      status: 'ACTIVE',
      checkedInAt: new Date('2026-06-10T08:00:00.000Z'),
      expectedCheckOutDate: new Date('2026-06-12T00:00:00.000Z'),
    },
    guest: {
      id: 12,
      firstName: 'Marta',
      lastName: 'Tesfaye',
      email: 'marta@example.com',
      phone: null,
      status: 'ACTIVE',
    },
    openedBy: {
      id: 1,
      email: 'frontdesk@demo-hotel.com',
      fullName: 'Front Desk User',
    },
    closedBy: null,
  };
  const invoice = {
    id: 90,
    invoiceNumber: 'INV-20260610-123450',
    folioId: 70,
    status: InvoiceStatus.ISSUED,
    subtotalAmount: new Prisma.Decimal(220),
    discountAmount: new Prisma.Decimal(20),
    taxAmount: new Prisma.Decimal(10),
    serviceAmount: new Prisma.Decimal(5),
    totalAmount: new Prisma.Decimal(215),
    issuedByUserId: 1,
    issuedAt: new Date('2026-06-10T09:00:00.000Z'),
    voidedAt: null,
    voidReason: null,
    createdAt: new Date('2026-06-10T09:00:00.000Z'),
    updatedAt: new Date('2026-06-10T09:00:00.000Z'),
    folio: {
      id: 70,
      folioNumber: 'FOL-20260610-123450',
      stayId: 40,
      guestId: 12,
      status: FolioStatus.OPEN,
      totalAmount: new Prisma.Decimal(215),
      paidAmount: new Prisma.Decimal(100),
      balanceAmount: new Prisma.Decimal(115),
    },
    issuedBy: {
      id: 1,
      email: 'frontdesk@demo-hotel.com',
      fullName: 'Front Desk User',
    },
  };
  const payment = {
    id: 95,
    paymentNumber: 'PAY-20260610-123450',
    folioId: 70,
    amount: new Prisma.Decimal(100),
    method: PaymentMethod.CASH,
    status: PaymentStatus.RECORDED,
    reference: 'AUTH-123456',
    notes: 'Guest paid at front desk.',
    recordedByUserId: 1,
    recordedAt: new Date('2026-06-10T09:00:00.000Z'),
    voidedAt: null,
    voidReason: null,
    createdAt: new Date('2026-06-10T09:00:00.000Z'),
    updatedAt: new Date('2026-06-10T09:00:00.000Z'),
    folio: invoice.folio,
    recordedBy: invoice.issuedBy,
  };
  const receipt = {
    id: 100,
    receiptNumber: 'RCT-20260610-123450',
    folioId: 70,
    paymentId: 95,
    status: ReceiptStatus.ISSUED,
    amount: new Prisma.Decimal(100),
    issuedByUserId: 1,
    issuedAt: new Date('2026-06-10T09:05:00.000Z'),
    voidedAt: null,
    voidReason: null,
    createdAt: new Date('2026-06-10T09:05:00.000Z'),
    updatedAt: new Date('2026-06-10T09:05:00.000Z'),
    folio: invoice.folio,
    payment: {
      id: 95,
      paymentNumber: 'PAY-20260610-123450',
      amount: new Prisma.Decimal(100),
      method: PaymentMethod.CASH,
      status: PaymentStatus.RECORDED,
      recordedAt: new Date('2026-06-10T09:00:00.000Z'),
    },
    issuedBy: invoice.issuedBy,
  };

  let service: InvoicesService;
  let invoicesRepository: {
    runInTransaction: jest.Mock;
    createInvoice: jest.Mock;
    findInvoice: jest.Mock;
    findByInvoiceNumber: jest.Mock;
    findIssuedInvoiceByFolioId: jest.Mock;
    listInvoices: jest.Mock;
    updateInvoice: jest.Mock;
  };
  let foliosRepository: {
    findFolio: jest.Mock;
  };
  let receiptsRepository: {
    createReceipt: jest.Mock;
    findReceipt: jest.Mock;
    findByReceiptNumber: jest.Mock;
    listReceipts: jest.Mock;
    updateReceipt: jest.Mock;
  };
  let paymentsRepository: {
    findPayment: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };

  beforeEach(async () => {
    invoicesRepository = {
      runInTransaction: jest
        .fn()
        .mockImplementation((operation) => operation({ transaction: true })),
      createInvoice: jest.fn().mockResolvedValue(invoice),
      findInvoice: jest.fn().mockResolvedValue(invoice),
      findByInvoiceNumber: jest.fn().mockResolvedValue(null),
      findIssuedInvoiceByFolioId: jest.fn().mockResolvedValue(null),
      listInvoices: jest.fn().mockResolvedValue([1, [invoice]]),
      updateInvoice: jest.fn().mockResolvedValue({
        ...invoice,
        status: InvoiceStatus.VOIDED,
        voidedAt: new Date('2026-06-10T10:00:00.000Z'),
        voidReason: 'Invoice regenerated with corrected folio totals.',
      }),
    };
    foliosRepository = {
      findFolio: jest.fn().mockResolvedValue(folio),
    };
    receiptsRepository = {
      createReceipt: jest.fn().mockResolvedValue(receipt),
      findReceipt: jest.fn().mockResolvedValue(receipt),
      findByReceiptNumber: jest.fn().mockResolvedValue(null),
      listReceipts: jest.fn().mockResolvedValue([1, [receipt]]),
      updateReceipt: jest.fn().mockResolvedValue({
        ...receipt,
        status: ReceiptStatus.VOIDED,
        voidedAt: new Date('2026-06-10T10:00:00.000Z'),
        voidReason: 'Receipt issued against the wrong payment.',
      }),
    };
    paymentsRepository = {
      findPayment: jest.fn().mockResolvedValue(payment),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: InvoicesRepository,
          useValue: invoicesRepository,
        },
        {
          provide: ReceiptsRepository,
          useValue: receiptsRepository,
        },
        {
          provide: PaymentsRepository,
          useValue: paymentsRepository,
        },
        {
          provide: FoliosRepository,
          useValue: foliosRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates an invoice from current folio totals', async () => {
    const result = await service.generate(currentUser, {
      folioId: 70,
    });

    expect(foliosRepository.findFolio).toHaveBeenCalledWith(70, {
      transaction: true,
    });
    expect(invoicesRepository.findIssuedInvoiceByFolioId).toHaveBeenCalledWith(
      70,
      { transaction: true },
    );
    expect(invoicesRepository.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: expect.stringMatching(/^INV-\d{8}-\d{6}$/),
        folioId: 70,
        status: InvoiceStatus.ISSUED,
        subtotalAmount: '220.00',
        discountAmount: '20.00',
        taxAmount: '10.00',
        serviceAmount: '5.00',
        totalAmount: '215.00',
        issuedByUserId: 1,
      }),
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invoices.generated',
        entityType: 'Invoice',
        entityId: '90',
      }),
    );
    expect(result).toMatchObject({
      id: 90,
      invoiceNumber: 'INV-20260610-123450',
      subtotalAmount: '220',
      discountAmount: '20',
      totalAmount: '215',
      folio: {
        id: 70,
        balanceAmount: '115',
      },
    });
  });

  it('rejects duplicate active invoices and voided folios', async () => {
    invoicesRepository.findIssuedInvoiceByFolioId.mockResolvedValueOnce(
      invoice,
    );

    await expect(
      service.generate(currentUser, {
        folioId: 70,
      }),
    ).rejects.toThrow(ConflictException);
    expect(invoicesRepository.createInvoice).not.toHaveBeenCalled();

    foliosRepository.findFolio.mockResolvedValueOnce({
      ...folio,
      status: FolioStatus.VOIDED,
    });

    await expect(
      service.generate(currentUser, {
        folioId: 70,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('lists invoices with pagination and filters', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      limit: 5,
      search: ' INV ',
      status: InvoiceStatus.ISSUED,
      folioId: 70,
      issuedFrom: '2026-06-01',
      issuedTo: '2026-06-30',
    });

    expect(invoicesRepository.listInvoices).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      search: 'INV',
      status: InvoiceStatus.ISSUED,
      folioId: 70,
      issuedFrom: new Date('2026-06-01T00:00:00.000Z'),
      issuedTo: new Date('2026-06-30T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      items: [
        {
          id: 90,
        },
      ],
      pagination: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('lists invoices for a required folio', async () => {
    await service.listByFolio(currentUser, 70, {
      page: 1,
      limit: 20,
    });

    expect(foliosRepository.findFolio).toHaveBeenCalledWith(70, undefined);
    expect(invoicesRepository.listInvoices).toHaveBeenCalledWith(
      expect.objectContaining({
        folioId: 70,
      }),
    );
  });

  it('gets one invoice by id', async () => {
    const result = await service.getById(currentUser, 90);

    expect(invoicesRepository.findInvoice).toHaveBeenCalledWith(90, undefined);
    expect(result).toMatchObject({
      id: 90,
      invoiceNumber: 'INV-20260610-123450',
    });
  });

  it('voids an issued invoice', async () => {
    const result = await service.void(currentUser, 90, {
      voidReason: ' Invoice regenerated with corrected folio totals. ',
    });

    expect(invoicesRepository.updateInvoice).toHaveBeenCalledWith(
      90,
      expect.objectContaining({
        status: InvoiceStatus.VOIDED,
        voidReason: 'Invoice regenerated with corrected folio totals.',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invoices.voided',
        entityType: 'Invoice',
        entityId: '90',
      }),
    );
    expect(result).toMatchObject({
      id: 90,
      status: InvoiceStatus.VOIDED,
      voidReason: 'Invoice regenerated with corrected folio totals.',
    });
  });

  it('rejects missing invoice and folio lookups', async () => {
    invoicesRepository.findInvoice.mockResolvedValueOnce(null);

    await expect(service.getById(currentUser, 999)).rejects.toThrow(
      NotFoundException,
    );

    foliosRepository.findFolio.mockResolvedValueOnce(null);

    await expect(
      service.listByFolio(currentUser, 999, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects voiding non-issued invoices and blank reasons', async () => {
    invoicesRepository.findInvoice.mockResolvedValueOnce({
      ...invoice,
      status: InvoiceStatus.VOIDED,
    });

    await expect(
      service.void(currentUser, 90, {
        voidReason: 'Already voided.',
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.void(currentUser, 90, {
        voidReason: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('generates a receipt from a linked payment amount', async () => {
    const result = await service.generateReceipt(currentUser, {
      folioId: 70,
      paymentId: 95,
    });

    expect(foliosRepository.findFolio).toHaveBeenCalledWith(70, {
      transaction: true,
    });
    expect(paymentsRepository.findPayment).toHaveBeenCalledWith(95, {
      transaction: true,
    });
    expect(receiptsRepository.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptNumber: expect.stringMatching(/^RCT-\d{8}-\d{6}$/),
        folioId: 70,
        paymentId: 95,
        status: ReceiptStatus.ISSUED,
        amount: '100.00',
        issuedByUserId: 1,
      }),
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'receipts.generated',
        entityType: 'Receipt',
        entityId: '100',
      }),
    );
    expect(result).toMatchObject({
      id: 100,
      receiptNumber: 'RCT-20260610-123450',
      amount: '100',
      payment: {
        id: 95,
        amount: '100',
      },
    });
  });

  it('generates a receipt from a folio amount when no payment is linked', async () => {
    await service.generateReceipt(currentUser, {
      folioId: 70,
      amount: 75,
    });

    expect(paymentsRepository.findPayment).not.toHaveBeenCalled();
    expect(receiptsRepository.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        folioId: 70,
        paymentId: null,
        amount: '75.00',
      }),
      { transaction: true },
    );
  });

  it('rejects invalid receipt payment and amount combinations', async () => {
    await expect(
      service.generateReceipt(currentUser, {
        folioId: 70,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.generateReceipt(currentUser, {
        folioId: 70,
        paymentId: 95,
        amount: 99,
      }),
    ).rejects.toThrow(BadRequestException);

    paymentsRepository.findPayment.mockResolvedValueOnce({
      ...payment,
      folioId: 999,
    });

    await expect(
      service.generateReceipt(currentUser, {
        folioId: 70,
        paymentId: 95,
      }),
    ).rejects.toThrow(BadRequestException);

    paymentsRepository.findPayment.mockResolvedValueOnce({
      ...payment,
      status: PaymentStatus.VOIDED,
    });

    await expect(
      service.generateReceipt(currentUser, {
        folioId: 70,
        paymentId: 95,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('lists receipts with pagination and filters', async () => {
    const result = await service.listReceipts(currentUser, {
      page: 2,
      limit: 5,
      search: ' RCT ',
      status: ReceiptStatus.ISSUED,
      folioId: 70,
      paymentId: 95,
      issuedFrom: '2026-06-01',
      issuedTo: '2026-06-30',
    });

    expect(receiptsRepository.listReceipts).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      search: 'RCT',
      status: ReceiptStatus.ISSUED,
      folioId: 70,
      paymentId: 95,
      issuedFrom: new Date('2026-06-01T00:00:00.000Z'),
      issuedTo: new Date('2026-06-30T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      items: [
        {
          id: 100,
        },
      ],
      pagination: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('lists receipts for a required folio', async () => {
    await service.listReceiptsByFolio(currentUser, 70, {
      page: 1,
      limit: 20,
    });

    expect(foliosRepository.findFolio).toHaveBeenCalledWith(70, undefined);
    expect(receiptsRepository.listReceipts).toHaveBeenCalledWith(
      expect.objectContaining({
        folioId: 70,
      }),
    );
  });

  it('gets one receipt by id', async () => {
    const result = await service.getReceiptById(currentUser, 100);

    expect(receiptsRepository.findReceipt).toHaveBeenCalledWith(100, undefined);
    expect(result).toMatchObject({
      id: 100,
      receiptNumber: 'RCT-20260610-123450',
    });
  });

  it('voids an issued receipt', async () => {
    const result = await service.voidReceipt(currentUser, 100, {
      voidReason: ' Receipt issued against the wrong payment. ',
    });

    expect(receiptsRepository.updateReceipt).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        status: ReceiptStatus.VOIDED,
        voidReason: 'Receipt issued against the wrong payment.',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'receipts.voided',
        entityType: 'Receipt',
        entityId: '100',
      }),
    );
    expect(result).toMatchObject({
      id: 100,
      status: ReceiptStatus.VOIDED,
      voidReason: 'Receipt issued against the wrong payment.',
    });
  });

  it('rejects missing receipt/payment and invalid receipt voids', async () => {
    paymentsRepository.findPayment.mockResolvedValueOnce(null);

    await expect(
      service.generateReceipt(currentUser, {
        folioId: 70,
        paymentId: 999,
      }),
    ).rejects.toThrow(NotFoundException);

    receiptsRepository.findReceipt.mockResolvedValueOnce(null);

    await expect(service.getReceiptById(currentUser, 999)).rejects.toThrow(
      NotFoundException,
    );

    receiptsRepository.findReceipt.mockResolvedValueOnce({
      ...receipt,
      status: ReceiptStatus.VOIDED,
    });

    await expect(
      service.voidReceipt(currentUser, 100, {
        voidReason: 'Already voided.',
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.voidReceipt(currentUser, 100, {
        voidReason: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
