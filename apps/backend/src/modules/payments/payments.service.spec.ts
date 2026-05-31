import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  FolioStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReceiptStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FoliosRepository } from '../folios/repositories/folios.repository';
import { ReceiptsRepository } from '../invoices/repositories/receipts.repository';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repositories/payments.repository';

describe('PaymentsService', () => {
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
    subtotalAmount: new Prisma.Decimal(200),
    discountAmount: new Prisma.Decimal(0),
    taxAmount: new Prisma.Decimal(0),
    serviceAmount: new Prisma.Decimal(0),
    totalAmount: new Prisma.Decimal(200),
    paidAmount: new Prisma.Decimal(20),
    balanceAmount: new Prisma.Decimal(180),
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
  const paidFolio = {
    ...folio,
    paidAmount: new Prisma.Decimal(70),
    balanceAmount: new Prisma.Decimal(130),
  };
  const payment = {
    id: 90,
    paymentNumber: 'PAY-20260610-123450',
    folioId: 70,
    amount: new Prisma.Decimal(50),
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
    folio: {
      id: 70,
      folioNumber: 'FOL-20260610-123450',
      stayId: 40,
      guestId: 12,
      status: FolioStatus.OPEN,
      totalAmount: new Prisma.Decimal(200),
      paidAmount: new Prisma.Decimal(70),
      balanceAmount: new Prisma.Decimal(130),
    },
    recordedBy: {
      id: 1,
      email: 'frontdesk@demo-hotel.com',
      fullName: 'Front Desk User',
    },
  };
  const receipt = {
    id: 100,
    receiptNumber: 'RCT-20260610-123450',
    folioId: 70,
    paymentId: 90,
    status: ReceiptStatus.ISSUED,
    amount: new Prisma.Decimal(50),
    issuedByUserId: 1,
    issuedAt: new Date('2026-06-10T09:00:00.000Z'),
    voidedAt: null,
    voidReason: null,
    createdAt: new Date('2026-06-10T09:00:00.000Z'),
    updatedAt: new Date('2026-06-10T09:00:00.000Z'),
    folio: payment.folio,
    payment: {
      id: 90,
      paymentNumber: 'PAY-20260610-123450',
      amount: new Prisma.Decimal(50),
      method: PaymentMethod.CASH,
      status: PaymentStatus.RECORDED,
      recordedAt: new Date('2026-06-10T09:00:00.000Z'),
    },
    issuedBy: payment.recordedBy,
  };

  let service: PaymentsService;
  let paymentsRepository: {
    runInTransaction: jest.Mock;
    createPayment: jest.Mock;
    findPayment: jest.Mock;
    findByPaymentNumber: jest.Mock;
    listPayments: jest.Mock;
    updatePayment: jest.Mock;
  };
  let foliosRepository: {
    findFolio: jest.Mock;
    updateFolio: jest.Mock;
  };
  let receiptsRepository: {
    createReceipt: jest.Mock;
    findByReceiptNumber: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };

  beforeEach(async () => {
    paymentsRepository = {
      runInTransaction: jest
        .fn()
        .mockImplementation((operation) => operation({ transaction: true })),
      createPayment: jest.fn().mockResolvedValue(payment),
      findPayment: jest.fn().mockResolvedValue(payment),
      findByPaymentNumber: jest.fn().mockResolvedValue(null),
      listPayments: jest.fn().mockResolvedValue([1, [payment]]),
      updatePayment: jest.fn().mockResolvedValue({
        ...payment,
        status: PaymentStatus.VOIDED,
        voidedAt: new Date('2026-06-10T10:00:00.000Z'),
        voidReason: 'Duplicate payment entry.',
      }),
    };
    foliosRepository = {
      findFolio: jest.fn().mockResolvedValue(folio),
      updateFolio: jest.fn().mockImplementation((_folioId, data) =>
        Promise.resolve({
          ...folio,
          ...data,
          totalAmount: new Prisma.Decimal(
            data.totalAmount ?? folio.totalAmount,
          ),
          paidAmount: new Prisma.Decimal(data.paidAmount ?? folio.paidAmount),
          balanceAmount: new Prisma.Decimal(
            data.balanceAmount ?? folio.balanceAmount,
          ),
        }),
      ),
    };
    receiptsRepository = {
      createReceipt: jest.fn().mockResolvedValue(receipt),
      findByReceiptNumber: jest.fn().mockResolvedValue(null),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PaymentsRepository,
          useValue: paymentsRepository,
        },
        {
          provide: FoliosRepository,
          useValue: foliosRepository,
        },
        {
          provide: ReceiptsRepository,
          useValue: receiptsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('records a payment, updates folio balance, and generates a receipt', async () => {
    const result = await service.record(currentUser, {
      folioId: 70,
      amount: 50,
      method: PaymentMethod.CASH,
      reference: ' AUTH-123456 ',
      notes: ' Guest paid at front desk. ',
      generateReceipt: true,
    });

    expect(paymentsRepository.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentNumber: expect.stringMatching(/^PAY-\d{8}-\d{6}$/),
        folioId: 70,
        amount: '50.00',
        method: PaymentMethod.CASH,
        status: PaymentStatus.RECORDED,
        reference: 'AUTH-123456',
        notes: 'Guest paid at front desk.',
        recordedByUserId: 1,
      }),
      { transaction: true },
    );
    expect(foliosRepository.updateFolio).toHaveBeenCalledWith(
      70,
      {
        paidAmount: '70.00',
        balanceAmount: '130.00',
      },
      { transaction: true },
    );
    expect(receiptsRepository.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptNumber: expect.stringMatching(/^RCT-\d{8}-\d{6}$/),
        folioId: 70,
        paymentId: 90,
        amount: '50.00',
        issuedByUserId: 1,
      }),
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payments.recorded',
        entityType: 'Payment',
        entityId: '90',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'receipts.generated',
        entityType: 'Receipt',
        entityId: '100',
      }),
    );
    expect(result).toMatchObject({
      payment: {
        id: 90,
        amount: '50',
        status: PaymentStatus.RECORDED,
      },
      folio: {
        id: 70,
        paidAmount: '70',
        balanceAmount: '130',
      },
      receipt: {
        id: 100,
        amount: '50',
      },
    });
  });

  it('records a payment without a receipt when not requested', async () => {
    const result = await service.record(currentUser, {
      folioId: 70,
      amount: 50,
      method: PaymentMethod.CASH,
      generateReceipt: false,
    });

    expect(receiptsRepository.createReceipt).not.toHaveBeenCalled();
    expect(result.receipt).toBeNull();
  });

  it('rejects overpayments and non-open folios', async () => {
    await expect(
      service.record(currentUser, {
        folioId: 70,
        amount: 181,
        method: PaymentMethod.CASH,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(paymentsRepository.createPayment).not.toHaveBeenCalled();

    foliosRepository.findFolio.mockResolvedValueOnce({
      ...folio,
      status: FolioStatus.CLOSED,
    });

    await expect(
      service.record(currentUser, {
        folioId: 70,
        amount: 50,
        method: PaymentMethod.CASH,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('lists payments with pagination and filters', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      limit: 5,
      search: ' PAY ',
      status: PaymentStatus.RECORDED,
      method: PaymentMethod.CARD,
      folioId: 70,
      recordedFrom: '2026-06-01',
      recordedTo: '2026-06-30',
    });

    expect(paymentsRepository.listPayments).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      search: 'PAY',
      status: PaymentStatus.RECORDED,
      method: PaymentMethod.CARD,
      folioId: 70,
      recordedFrom: new Date('2026-06-01T00:00:00.000Z'),
      recordedTo: new Date('2026-06-30T00:00:00.000Z'),
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

  it('lists payments for a required folio', async () => {
    await service.listByFolio(currentUser, 70, {
      page: 1,
      limit: 20,
    });

    expect(foliosRepository.findFolio).toHaveBeenCalledWith(70, undefined);
    expect(paymentsRepository.listPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        folioId: 70,
      }),
    );
  });

  it('gets one payment by id', async () => {
    const result = await service.getById(currentUser, 90);

    expect(paymentsRepository.findPayment).toHaveBeenCalledWith(90, undefined);
    expect(result).toMatchObject({
      id: 90,
      paymentNumber: 'PAY-20260610-123450',
    });
  });

  it('rejects missing payment and folio lookups', async () => {
    paymentsRepository.findPayment.mockResolvedValueOnce(null);

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

  it('voids a recorded payment and restores folio balance', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce(paidFolio);

    const result = await service.void(currentUser, 90, {
      voidReason: ' Duplicate payment entry. ',
    });

    expect(paymentsRepository.updatePayment).toHaveBeenCalledWith(
      90,
      expect.objectContaining({
        status: PaymentStatus.VOIDED,
        voidReason: 'Duplicate payment entry.',
      }),
      { transaction: true },
    );
    expect(foliosRepository.updateFolio).toHaveBeenCalledWith(
      70,
      {
        paidAmount: '20.00',
        balanceAmount: '180.00',
      },
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payments.voided',
        entityType: 'Payment',
        entityId: '90',
      }),
    );
    expect(result).toMatchObject({
      payment: {
        id: 90,
        status: PaymentStatus.VOIDED,
        voidReason: 'Duplicate payment entry.',
      },
    });
  });

  it('rejects voiding missing or non-recorded payments', async () => {
    paymentsRepository.findPayment.mockResolvedValueOnce(null);

    await expect(
      service.void(currentUser, 999, {
        voidReason: 'Duplicate payment entry.',
      }),
    ).rejects.toThrow(NotFoundException);

    paymentsRepository.findPayment.mockResolvedValueOnce({
      ...payment,
      status: PaymentStatus.VOIDED,
    });

    await expect(
      service.void(currentUser, 90, {
        voidReason: 'Duplicate payment entry.',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
