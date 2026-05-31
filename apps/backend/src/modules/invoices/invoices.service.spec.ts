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
});
