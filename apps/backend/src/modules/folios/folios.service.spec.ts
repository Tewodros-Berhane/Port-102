import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  ApprovalRequestType,
  ApprovalStatus,
  FolioLineItemType,
  FolioStatus,
  Prisma,
  StayStatus,
} from '../../generated/prisma/client';
import { ApprovalRequestsService } from '../approval-requests/approval-requests.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FoliosService } from './folios.service';
import { FolioLineItemsRepository } from './repositories/folio-line-items.repository';
import { FoliosRepository } from './repositories/folios.repository';

describe('FoliosService', () => {
  const currentUser = {
    sub: 1,
    email: 'frontdesk@demo-hotel.com',
    roleKey: 'FRONT_DESK_CASHIER',
    roleId: 4,
    departmentId: null,
    tokenVersion: 0,
  };
  const stay = {
    id: 40,
    stayNumber: 'STAY-20260610-123450',
    guestId: 12,
    status: StayStatus.ACTIVE,
    checkedInAt: new Date('2026-06-10T08:00:00.000Z'),
    expectedCheckOutDate: new Date('2026-06-12T00:00:00.000Z'),
    reservationId: 20,
    reservation: {
      id: 20,
      reservationNumber: 'RES-20260610-123450',
      status: 'CHECKED_IN',
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
    },
    guest: {
      id: 12,
      firstName: 'Marta',
      lastName: 'Tesfaye',
      email: 'marta@example.com',
      phone: null,
      status: 'ACTIVE',
    },
  };
  const folio = {
    id: 70,
    folioNumber: 'FOL-20260610-123450',
    stayId: 40,
    guestId: 12,
    status: FolioStatus.OPEN,
    subtotalAmount: new Prisma.Decimal(0),
    discountAmount: new Prisma.Decimal(0),
    taxAmount: new Prisma.Decimal(0),
    serviceAmount: new Prisma.Decimal(0),
    totalAmount: new Prisma.Decimal(0),
    paidAmount: new Prisma.Decimal(0),
    balanceAmount: new Prisma.Decimal(0),
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
      status: StayStatus.ACTIVE,
      checkedInAt: new Date('2026-06-10T08:00:00.000Z'),
      expectedCheckOutDate: new Date('2026-06-12T00:00:00.000Z'),
    },
    guest: stay.guest,
    openedBy: {
      id: 1,
      email: 'frontdesk@demo-hotel.com',
      fullName: 'Front Desk User',
    },
    closedBy: null,
  };
  const chargedFolio = {
    ...folio,
    subtotalAmount: new Prisma.Decimal(200),
    totalAmount: new Prisma.Decimal(200),
    balanceAmount: new Prisma.Decimal(200),
  };
  const settledFolio = {
    ...chargedFolio,
    paidAmount: new Prisma.Decimal(200),
    balanceAmount: new Prisma.Decimal(0),
  };
  const lineItem = {
    id: 80,
    folioId: 70,
    type: FolioLineItemType.MANUAL_CHARGE,
    description: 'Extra bed charge',
    quantity: 2,
    unitAmount: new Prisma.Decimal(100),
    totalAmount: new Prisma.Decimal(200),
    isVoided: false,
    voidReason: null,
    sourceType: null,
    sourceId: null,
    postedByUserId: 1,
    postedAt: new Date('2026-06-10T09:00:00.000Z'),
    createdAt: new Date('2026-06-10T09:00:00.000Z'),
    updatedAt: new Date('2026-06-10T09:00:00.000Z'),
    postedBy: {
      id: 1,
      email: 'frontdesk@demo-hotel.com',
      fullName: 'Front Desk User',
    },
  };
  const discountLineItem = {
    ...lineItem,
    id: 81,
    type: FolioLineItemType.DISCOUNT,
    description: 'Service recovery discount',
    quantity: 1,
    unitAmount: new Prisma.Decimal(20),
    totalAmount: new Prisma.Decimal(20),
    sourceType: 'folio_discount',
  };
  const approvalRequest = {
    id: 90,
    type: ApprovalRequestType.LARGE_DISCOUNT,
    status: ApprovalStatus.PENDING,
    title: 'Large folio discount for FOL-20260610-123450',
    reason: 'Guest recovery.',
    payload: {
      folioId: 70,
    },
    decisionNote: null,
    decidedAt: null,
    createdAt: new Date('2026-06-10T09:30:00.000Z'),
    updatedAt: new Date('2026-06-10T09:30:00.000Z'),
    requestedBy: {
      user: {
        id: 1,
        email: 'frontdesk@demo-hotel.com',
        fullName: 'Front Desk User',
      },
    },
    decidedBy: null,
  };

  let service: FoliosService;
  let foliosRepository: {
    findStayForFolio: jest.Mock;
    findByStayId: jest.Mock;
    findByFolioNumber: jest.Mock;
    runInTransaction: jest.Mock;
    createFolio: jest.Mock;
    listFolios: jest.Mock;
    findFolio: jest.Mock;
    updateFolio: jest.Mock;
  };
  let folioLineItemsRepository: {
    createLineItem: jest.Mock;
    findLineItem: jest.Mock;
    listLineItems: jest.Mock;
    updateLineItem: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };
  let approvalRequestsService: {
    create: jest.Mock;
  };

  beforeEach(async () => {
    foliosRepository = {
      findStayForFolio: jest.fn().mockResolvedValue(stay),
      findByStayId: jest.fn().mockResolvedValue(null),
      findByFolioNumber: jest.fn().mockResolvedValue(null),
      runInTransaction: jest
        .fn()
        .mockImplementation((operation) => operation({ transaction: true })),
      createFolio: jest.fn().mockResolvedValue(folio),
      listFolios: jest.fn().mockResolvedValue([1, [folio]]),
      findFolio: jest.fn().mockResolvedValue(folio),
      updateFolio: jest.fn().mockImplementation((_folioId, data) => {
        if (data.status === FolioStatus.VOIDED) {
          return Promise.resolve({
            ...folio,
            status: FolioStatus.VOIDED,
          });
        }

        if (data.status === FolioStatus.CLOSED) {
          return Promise.resolve({
            ...settledFolio,
            ...data,
          });
        }

        return Promise.resolve({
          ...chargedFolio,
          ...data,
          subtotalAmount: new Prisma.Decimal(
            data.subtotalAmount ?? chargedFolio.subtotalAmount,
          ),
          discountAmount: new Prisma.Decimal(
            data.discountAmount ?? chargedFolio.discountAmount,
          ),
          taxAmount: new Prisma.Decimal(
            data.taxAmount ?? chargedFolio.taxAmount,
          ),
          serviceAmount: new Prisma.Decimal(
            data.serviceAmount ?? chargedFolio.serviceAmount,
          ),
          totalAmount: new Prisma.Decimal(
            data.totalAmount ?? chargedFolio.totalAmount,
          ),
          balanceAmount: new Prisma.Decimal(
            data.balanceAmount ?? chargedFolio.balanceAmount,
          ),
        });
      }),
    };
    folioLineItemsRepository = {
      createLineItem: jest.fn().mockResolvedValue(lineItem),
      findLineItem: jest.fn().mockResolvedValue(lineItem),
      listLineItems: jest.fn().mockResolvedValue([lineItem]),
      updateLineItem: jest.fn().mockResolvedValue({
        ...lineItem,
        isVoided: true,
        voidReason: 'Wrong folio.',
      }),
    };
    auditLogsService = {
      record: jest.fn(),
    };
    approvalRequestsService = {
      create: jest.fn().mockResolvedValue(approvalRequest),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoliosService,
        {
          provide: FoliosRepository,
          useValue: foliosRepository,
        },
        {
          provide: FolioLineItemsRepository,
          useValue: folioLineItemsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
        {
          provide: ApprovalRequestsService,
          useValue: approvalRequestsService,
        },
      ],
    }).compile();

    service = module.get<FoliosService>(FoliosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('opens a folio for an active stay', async () => {
    const result = await service.create(currentUser, {
      stayId: 40,
      guestId: 12,
    });

    expect(foliosRepository.findStayForFolio).toHaveBeenCalledWith(40);
    expect(foliosRepository.findByFolioNumber).toHaveBeenCalled();
    expect(foliosRepository.createFolio).toHaveBeenCalledWith(
      expect.objectContaining({
        folioNumber: expect.stringMatching(/^FOL-\d{8}-\d{6}$/),
        stayId: 40,
        guestId: 12,
        openedByUserId: 1,
      }),
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'folios.created',
        entityType: 'Folio',
        entityId: '70',
      }),
    );
    expect(result).toMatchObject({
      id: 70,
      folioNumber: 'FOL-20260610-123450',
      subtotalAmount: '0',
      balanceAmount: '0',
    });
  });

  it('returns the existing folio when the stay already has one', async () => {
    foliosRepository.findByStayId.mockResolvedValueOnce(folio);

    const result = await service.openForStay(currentUser, 40);

    expect(foliosRepository.createFolio).not.toHaveBeenCalled();
    expect(auditLogsService.record).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 70,
      stayId: 40,
    });
  });

  it('rejects folio opening for a missing stay', async () => {
    foliosRepository.findStayForFolio.mockResolvedValueOnce(null);

    await expect(service.openForStay(currentUser, 999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects folio opening for inactive stays', async () => {
    foliosRepository.findStayForFolio.mockResolvedValueOnce({
      ...stay,
      status: StayStatus.CHECKED_OUT,
    });

    await expect(service.openForStay(currentUser, 40)).rejects.toThrow(
      ConflictException,
    );
    expect(foliosRepository.createFolio).not.toHaveBeenCalled();
  });

  it('rejects folio guest mismatches', async () => {
    await expect(
      service.create(currentUser, {
        stayId: 40,
        guestId: 99,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(foliosRepository.createFolio).not.toHaveBeenCalled();
  });

  it('lists folios with pagination and filters', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      limit: 5,
      search: ' FOL ',
      status: FolioStatus.OPEN,
      stayId: 40,
      guestId: 12,
      openedFrom: '2026-06-01',
      openedTo: '2026-06-30',
    });

    expect(foliosRepository.listFolios).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      search: 'FOL',
      status: FolioStatus.OPEN,
      stayId: 40,
      guestId: 12,
      openedFrom: new Date('2026-06-01T00:00:00.000Z'),
      openedTo: new Date('2026-06-30T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      items: [
        {
          id: 70,
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

  it('gets one folio by id', async () => {
    const result = await service.getById(currentUser, 70);

    expect(foliosRepository.findFolio).toHaveBeenCalledWith(70);
    expect(result).toMatchObject({
      id: 70,
      folioNumber: 'FOL-20260610-123450',
    });
  });

  it('rejects missing folio lookups', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce(null);

    await expect(service.getById(currentUser, 999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('gets one folio by stay id', async () => {
    foliosRepository.findByStayId.mockResolvedValueOnce(folio);

    const result = await service.getByStayId(currentUser, 40);

    expect(foliosRepository.findByStayId).toHaveBeenCalledWith(40);
    expect(result).toMatchObject({
      id: 70,
      stayId: 40,
    });
  });

  it('rejects missing stay folio lookups', async () => {
    foliosRepository.findByStayId.mockResolvedValueOnce(null);

    await expect(service.getByStayId(currentUser, 999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates an open folio status', async () => {
    const result = await service.update(currentUser, 70, {
      status: FolioStatus.VOIDED,
    });

    expect(foliosRepository.updateFolio).toHaveBeenCalledWith(70, {
      status: FolioStatus.VOIDED,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'folios.updated',
        entityType: 'Folio',
        entityId: '70',
      }),
    );
    expect(result).toMatchObject({
      status: FolioStatus.VOIDED,
    });
  });

  it('rejects closing through the general update endpoint', async () => {
    await expect(
      service.update(currentUser, 70, {
        status: FolioStatus.CLOSED,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(foliosRepository.updateFolio).not.toHaveBeenCalled();
  });

  it('rejects status changes for non-open folios', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce({
      ...folio,
      status: FolioStatus.VOIDED,
    });

    await expect(
      service.update(currentUser, 70, {
        status: FolioStatus.OPEN,
      }),
    ).rejects.toThrow(ConflictException);
    expect(foliosRepository.updateFolio).not.toHaveBeenCalled();
  });

  it('adds a line item and recalculates folio totals', async () => {
    const result = await service.addLineItem(currentUser, 70, {
      type: FolioLineItemType.MANUAL_CHARGE,
      description: ' Extra bed charge ',
      quantity: 2,
      unitAmount: 100,
    });

    expect(folioLineItemsRepository.createLineItem).toHaveBeenCalledWith(
      {
        folioId: 70,
        type: FolioLineItemType.MANUAL_CHARGE,
        description: 'Extra bed charge',
        quantity: 2,
        unitAmount: '100.00',
        totalAmount: '200.00',
        sourceType: null,
        sourceId: null,
        postedByUserId: 1,
      },
      { transaction: true },
    );
    expect(folioLineItemsRepository.listLineItems).toHaveBeenCalledWith({
      folioId: 70,
      includeVoided: false,
      client: { transaction: true },
    });
    expect(foliosRepository.updateFolio).toHaveBeenCalledWith(
      70,
      expect.objectContaining({
        subtotalAmount: '200.00',
        totalAmount: '200.00',
        balanceAmount: '200.00',
      }),
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'folios.line_item_added',
        entityType: 'Folio',
        entityId: '70',
      }),
    );
    expect(result).toMatchObject({
      folio: {
        id: 70,
        subtotalAmount: '200',
        balanceAmount: '200',
      },
      lineItems: [
        {
          id: 80,
          totalAmount: '200',
        },
      ],
      totals: {
        totalAmount: '200',
        balanceAmount: '200',
      },
    });
  });

  it('rejects adding discount line items through the charge endpoint', async () => {
    await expect(
      service.addLineItem(currentUser, 70, {
        type: FolioLineItemType.DISCOUNT,
        description: 'Discount',
        quantity: 1,
        unitAmount: 10,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(folioLineItemsRepository.createLineItem).not.toHaveBeenCalled();
  });

  it('applies a small percentage discount and recalculates folio totals', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce(chargedFolio);
    folioLineItemsRepository.listLineItems.mockResolvedValueOnce([
      lineItem,
      discountLineItem,
    ]);

    const result = await service.applyDiscount(currentUser, 70, {
      description: ' Service recovery discount ',
      percent: 10,
      reason: ' Room readiness was delayed. ',
    });

    expect(folioLineItemsRepository.createLineItem).toHaveBeenCalledWith(
      {
        folioId: 70,
        type: FolioLineItemType.DISCOUNT,
        description: 'Service recovery discount',
        quantity: 1,
        unitAmount: '20.00',
        totalAmount: '20.00',
        sourceType: 'folio_discount',
        sourceId: null,
        postedByUserId: 1,
      },
      { transaction: true },
    );
    expect(foliosRepository.updateFolio).toHaveBeenCalledWith(
      70,
      expect.objectContaining({
        subtotalAmount: '200.00',
        discountAmount: '20.00',
        totalAmount: '180.00',
        balanceAmount: '180.00',
      }),
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'folios.discount_applied',
        entityType: 'Folio',
        entityId: '70',
      }),
    );
    expect(result).toMatchObject({
      folio: {
        id: 70,
        discountAmount: '20',
        totalAmount: '180',
        balanceAmount: '180',
      },
      totals: {
        discountAmount: '20',
        totalAmount: '180',
      },
      lineItems: [
        {
          id: 80,
        },
        {
          id: 81,
          type: FolioLineItemType.DISCOUNT,
          totalAmount: '20',
        },
      ],
    });
  });

  it('applies a small fixed discount amount', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce(chargedFolio);
    folioLineItemsRepository.listLineItems.mockResolvedValueOnce([
      lineItem,
      {
        ...discountLineItem,
        totalAmount: new Prisma.Decimal(15),
        unitAmount: new Prisma.Decimal(15),
      },
    ]);

    await service.applyDiscount(currentUser, 70, {
      description: 'Service recovery discount',
      amount: 15,
    });

    expect(folioLineItemsRepository.createLineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        unitAmount: '15.00',
        totalAmount: '15.00',
      }),
      { transaction: true },
    );
    expect(approvalRequestsService.create).not.toHaveBeenCalled();
  });

  it('creates a large discount approval request instead of applying the discount', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce(chargedFolio);

    const result = await service.applyDiscount(currentUser, 70, {
      description: 'Guest recovery discount',
      percent: 15,
      reason: 'Guest recovery.',
    });

    expect(approvalRequestsService.create).toHaveBeenCalledWith(currentUser, {
      type: ApprovalRequestType.LARGE_DISCOUNT,
      title: 'Large folio discount for FOL-20260610-123450',
      reason: 'Guest recovery.',
      payload: expect.objectContaining({
        folioId: 70,
        requestedAmount: '30.00',
        requestedPercent: '15.00',
        subtotalAmount: '200.00',
        smallDiscountLimitPercent: '10.00',
      }),
    });
    expect(folioLineItemsRepository.createLineItem).not.toHaveBeenCalled();
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'folios.discount_approval_requested',
        entityType: 'Folio',
        entityId: '70',
      }),
    );
    expect(result).toMatchObject({
      status: 'APPROVAL_REQUIRED',
      approvalRequest: {
        id: 90,
        type: ApprovalRequestType.LARGE_DISCOUNT,
        status: ApprovalStatus.PENDING,
      },
    });
  });

  it('rejects discount requests without exactly one discount basis', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce(chargedFolio);

    await expect(
      service.applyDiscount(currentUser, 70, {
        description: 'Discount',
      }),
    ).rejects.toThrow(BadRequestException);

    foliosRepository.findFolio.mockResolvedValueOnce(chargedFolio);

    await expect(
      service.applyDiscount(currentUser, 70, {
        description: 'Discount',
        amount: 10,
        percent: 10,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects discounts on closed or empty folios', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce({
      ...chargedFolio,
      status: FolioStatus.CLOSED,
    });

    await expect(
      service.applyDiscount(currentUser, 70, {
        description: 'Discount',
        amount: 10,
      }),
    ).rejects.toThrow(ConflictException);

    foliosRepository.findFolio.mockResolvedValueOnce(folio);

    await expect(
      service.applyDiscount(currentUser, 70, {
        description: 'Discount',
        amount: 10,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects adding line items to non-open folios', async () => {
    foliosRepository.findFolio.mockResolvedValueOnce({
      ...folio,
      status: FolioStatus.CLOSED,
    });

    await expect(
      service.addLineItem(currentUser, 70, {
        type: FolioLineItemType.MANUAL_CHARGE,
        description: 'Charge',
        quantity: 1,
        unitAmount: 10,
      }),
    ).rejects.toThrow(ConflictException);
    expect(folioLineItemsRepository.createLineItem).not.toHaveBeenCalled();
  });

  it('voids a line item and recalculates folio totals', async () => {
    folioLineItemsRepository.listLineItems.mockResolvedValueOnce([]);

    const result = await service.voidLineItem(currentUser, 70, 80, {
      voidReason: ' Wrong folio. ',
    });

    expect(folioLineItemsRepository.findLineItem).toHaveBeenCalledWith(80);
    expect(folioLineItemsRepository.updateLineItem).toHaveBeenCalledWith(
      80,
      {
        isVoided: true,
        voidReason: 'Wrong folio.',
      },
      { transaction: true },
    );
    expect(foliosRepository.updateFolio).toHaveBeenCalledWith(
      70,
      expect.objectContaining({
        subtotalAmount: '0.00',
        totalAmount: '0.00',
        balanceAmount: '0.00',
      }),
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'folios.line_item_voided',
        entityType: 'Folio',
        entityId: '70',
      }),
    );
    expect(result).toMatchObject({
      folio: {
        id: 70,
        totalAmount: '0',
        balanceAmount: '0',
      },
      lineItems: [],
    });
  });

  it('rejects voiding a line item from another folio', async () => {
    folioLineItemsRepository.findLineItem.mockResolvedValueOnce({
      ...lineItem,
      folioId: 999,
    });

    await expect(
      service.voidLineItem(currentUser, 70, 80, {
        voidReason: 'Wrong folio.',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(folioLineItemsRepository.updateLineItem).not.toHaveBeenCalled();
  });

  it('rejects voiding an already voided line item', async () => {
    folioLineItemsRepository.findLineItem.mockResolvedValueOnce({
      ...lineItem,
      isVoided: true,
    });

    await expect(
      service.voidLineItem(currentUser, 70, 80, {
        voidReason: 'Wrong folio.',
      }),
    ).rejects.toThrow(ConflictException);
    expect(folioLineItemsRepository.updateLineItem).not.toHaveBeenCalled();
  });

  it('returns folio summary with line items', async () => {
    const result = await service.getSummary(currentUser, 70);

    expect(folioLineItemsRepository.listLineItems).toHaveBeenCalledWith({
      folioId: 70,
    });
    expect(result).toMatchObject({
      folio: {
        id: 70,
      },
      lineItems: [
        {
          id: 80,
          unitAmount: '100',
          totalAmount: '200',
        },
      ],
      totals: {
        totalAmount: '0',
      },
    });
  });
});
