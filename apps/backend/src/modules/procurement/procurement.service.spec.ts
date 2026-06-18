import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  GoodsReceivedStatus,
  Prisma,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  SupplierStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProcurementService } from './procurement.service';
import { GoodsReceivedRepository } from './repositories/goods-received.repository';
import { ProcurementReportsRepository } from './repositories/procurement-reports.repository';
import { PurchaseOrdersRepository } from './repositories/purchase-orders.repository';
import { PurchaseRequestsRepository } from './repositories/purchase-requests.repository';
import { SuppliersRepository } from './repositories/suppliers.repository';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let suppliersRepository: {
    createSupplier: jest.Mock;
    findSupplier: jest.Mock;
    findBySupplierNumber: jest.Mock;
    listSuppliers: jest.Mock;
    updateSupplier: jest.Mock;
  };
  let purchaseRequestsRepository: {
    findActiveItems: jest.Mock;
    findByRequestNumber: jest.Mock;
    createRequest: jest.Mock;
    findRequest: jest.Mock;
    listRequests: jest.Mock;
    updateRequest: jest.Mock;
    countByStatus: jest.Mock;
  };
  let purchaseOrdersRepository: {
    findActiveItems: jest.Mock;
    findByOrderNumber: jest.Mock;
    createOrder: jest.Mock;
    findOrder: jest.Mock;
    listOrders: jest.Mock;
    updateOrder: jest.Mock;
    convertRequestToOrder: jest.Mock;
    countByStatus: jest.Mock;
  };
  let goodsReceivedRepository: {
    findActiveItems: jest.Mock;
    findActiveLocation: jest.Mock;
    findByGrnNumber: jest.Mock;
    createGoodsReceived: jest.Mock;
    findGoodsReceived: jest.Mock;
    listGoodsReceived: jest.Mock;
    cancelGoodsReceived: jest.Mock;
    postGoodsReceived: jest.Mock;
    countByStatus: jest.Mock;
  };
  let procurementReportsRepository: {
    getDashboardCounts: jest.Mock;
  };
  let auditLogsService: { record: jest.Mock };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };
  const supplier = {
    id: 3,
    supplierNumber: 'SUP-0001',
    name: 'Addis Fresh Foods',
    contactName: null,
    phone: null,
    email: 'orders@example.com',
    address: null,
    status: SupplierStatus.ACTIVE,
    notes: null,
    createdAt: new Date('2026-06-17T06:00:00.000Z'),
    updatedAt: new Date('2026-06-17T06:00:00.000Z'),
  };
  const request = {
    id: 7,
    requestNumber: 'PR-20260618-000001',
    status: PurchaseRequestStatus.DRAFT,
    departmentId: 2,
    requestedByUserId: currentUser.sub,
    approvedByUserId: null,
    rejectedByUserId: null,
    submittedAt: null,
    decidedAt: null,
    reason: 'Kitchen stock',
    decisionNote: null,
    notes: null,
    createdAt: new Date('2026-06-18T06:00:00.000Z'),
    updatedAt: new Date('2026-06-18T06:00:00.000Z'),
    department: { id: 2, name: 'Kitchen' },
    requestedBy: {
      id: currentUser.sub,
      email: currentUser.email,
      fullName: 'Admin',
    },
    approvedBy: null,
    rejectedBy: null,
    items: [
      {
        id: 11,
        itemId: 5,
        quantity: new Prisma.Decimal(4),
        estimatedUnitCost: new Prisma.Decimal(12.5),
        notes: null,
        item: {
          id: 5,
          itemNumber: 'ITM-1',
          name: 'Coffee Beans',
          unitOfMeasure: 'kg',
          status: 'ACTIVE',
        },
      },
    ],
  };
  const order = {
    id: 9,
    orderNumber: 'PO-20260618-000001',
    supplierId: supplier.id,
    purchaseRequestId: request.id,
    status: PurchaseOrderStatus.DRAFT,
    orderedAt: null,
    expectedAt: null,
    approvedByUserId: null,
    createdByUserId: currentUser.sub,
    notes: null,
    createdAt: new Date('2026-06-18T06:00:00.000Z'),
    updatedAt: new Date('2026-06-18T06:00:00.000Z'),
    supplier,
    purchaseRequest: {
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
    },
    approvedBy: null,
    createdBy: {
      id: currentUser.sub,
      email: currentUser.email,
      fullName: 'Admin',
    },
    items: [
      {
        id: 21,
        itemId: 5,
        quantity: new Prisma.Decimal(4),
        unitCost: new Prisma.Decimal(12.5),
        receivedQuantity: new Prisma.Decimal(0),
        notes: null,
        item: {
          id: 5,
          itemNumber: 'ITM-1',
          name: 'Coffee Beans',
          unitOfMeasure: 'kg',
          status: 'ACTIVE',
        },
      },
    ],
  };
  const grn = {
    id: 13,
    grnNumber: 'GRN-20260618-000001',
    purchaseOrderId: order.id,
    supplierId: supplier.id,
    locationId: 4,
    status: GoodsReceivedStatus.DRAFT,
    receivedByUserId: currentUser.sub,
    postedAt: null,
    notes: null,
    createdAt: new Date('2026-06-18T06:00:00.000Z'),
    updatedAt: new Date('2026-06-18T06:00:00.000Z'),
    purchaseOrder: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    },
    supplier,
    location: { id: 4, code: 'MAIN', name: 'Main Store', isActive: true },
    receivedBy: {
      id: currentUser.sub,
      email: currentUser.email,
      fullName: 'Admin',
    },
    items: [
      {
        id: 31,
        itemId: 5,
        quantity: new Prisma.Decimal(4),
        unitCost: new Prisma.Decimal(12.5),
        notes: null,
        item: {
          id: 5,
          itemNumber: 'ITM-1',
          name: 'Coffee Beans',
          unitOfMeasure: 'kg',
          averageCost: new Prisma.Decimal(12.5),
          status: 'ACTIVE',
        },
      },
    ],
  };

  beforeEach(async () => {
    suppliersRepository = {
      createSupplier: jest.fn(),
      findSupplier: jest.fn(),
      findBySupplierNumber: jest.fn(),
      listSuppliers: jest.fn(),
      updateSupplier: jest.fn(),
    };
    purchaseRequestsRepository = {
      findActiveItems: jest.fn(),
      findByRequestNumber: jest.fn(),
      createRequest: jest.fn(),
      findRequest: jest.fn(),
      listRequests: jest.fn(),
      updateRequest: jest.fn(),
      countByStatus: jest.fn(),
    };
    purchaseOrdersRepository = {
      findActiveItems: jest.fn(),
      findByOrderNumber: jest.fn(),
      createOrder: jest.fn(),
      findOrder: jest.fn(),
      listOrders: jest.fn(),
      updateOrder: jest.fn(),
      convertRequestToOrder: jest.fn(),
      countByStatus: jest.fn(),
    };
    goodsReceivedRepository = {
      findActiveItems: jest.fn(),
      findActiveLocation: jest.fn(),
      findByGrnNumber: jest.fn(),
      createGoodsReceived: jest.fn(),
      findGoodsReceived: jest.fn(),
      listGoodsReceived: jest.fn(),
      cancelGoodsReceived: jest.fn(),
      postGoodsReceived: jest.fn(),
      countByStatus: jest.fn(),
    };
    procurementReportsRepository = {
      getDashboardCounts: jest.fn(),
    };
    auditLogsService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: SuppliersRepository, useValue: suppliersRepository },
        {
          provide: PurchaseRequestsRepository,
          useValue: purchaseRequestsRepository,
        },
        {
          provide: PurchaseOrdersRepository,
          useValue: purchaseOrdersRepository,
        },
        { provide: GoodsReceivedRepository, useValue: goodsReceivedRepository },
        {
          provide: ProcurementReportsRepository,
          useValue: procurementReportsRepository,
        },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    service = module.get(ProcurementService);
  });

  it('creates a normalized supplier and records an audit log', async () => {
    suppliersRepository.findBySupplierNumber.mockResolvedValue(null);
    suppliersRepository.createSupplier.mockResolvedValue(supplier);

    await expect(
      service.createSupplier(currentUser, {
        supplierNumber: ' sup-0001 ',
        name: ' Addis Fresh Foods ',
        email: ' orders@example.com ',
      }),
    ).resolves.toEqual(supplier);

    expect(suppliersRepository.createSupplier).toHaveBeenCalledWith({
      supplierNumber: 'SUP-0001',
      name: 'Addis Fresh Foods',
      contactName: null,
      phone: null,
      email: 'orders@example.com',
      address: null,
      notes: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement.suppliers.created',
        entityType: 'Supplier',
        entityId: '3',
      }),
    );
  });

  it('rejects duplicate supplier numbers', async () => {
    suppliersRepository.findBySupplierNumber.mockResolvedValue(supplier);

    await expect(
      service.createSupplier(currentUser, {
        supplierNumber: 'SUP-0001',
        name: 'Duplicate Supplier',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(suppliersRepository.createSupplier).not.toHaveBeenCalled();
  });

  it('lists suppliers with normalized filters', async () => {
    suppliersRepository.listSuppliers.mockResolvedValue([1, [supplier]]);

    await expect(
      service.listSuppliers(currentUser, {
        page: 2,
        limit: 10,
        search: ' fresh ',
        status: SupplierStatus.ACTIVE,
      }),
    ).resolves.toEqual({
      items: [supplier],
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(suppliersRepository.listSuppliers).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'fresh',
      status: SupplierStatus.ACTIVE,
    });
  });

  it('throws when a supplier does not exist', async () => {
    suppliersRepository.findSupplier.mockResolvedValue(null);

    await expect(
      service.getSupplierById(currentUser, 99),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates supplier details and audits previous and current values', async () => {
    const updatedSupplier = {
      ...supplier,
      name: 'Addis Premium Foods',
    };
    suppliersRepository.findSupplier.mockResolvedValue(supplier);
    suppliersRepository.updateSupplier.mockResolvedValue(updatedSupplier);

    await expect(
      service.updateSupplier(currentUser, supplier.id, {
        name: ' Addis Premium Foods ',
      }),
    ).resolves.toEqual(updatedSupplier);

    expect(suppliersRepository.updateSupplier).toHaveBeenCalledWith(
      supplier.id,
      { name: 'Addis Premium Foods' },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement.suppliers.updated',
      }),
    );
  });

  it('soft-deactivates an active supplier and audits the change', async () => {
    const inactiveSupplier = {
      ...supplier,
      status: SupplierStatus.INACTIVE,
    };
    suppliersRepository.findSupplier.mockResolvedValue(supplier);
    suppliersRepository.updateSupplier.mockResolvedValue(inactiveSupplier);

    await expect(
      service.deactivateSupplier(currentUser, supplier.id),
    ).resolves.toEqual(inactiveSupplier);

    expect(suppliersRepository.updateSupplier).toHaveBeenCalledWith(
      supplier.id,
      { status: SupplierStatus.INACTIVE },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement.suppliers.deactivated',
      }),
    );
  });

  it('creates a purchase request with active items', async () => {
    purchaseRequestsRepository.findActiveItems.mockResolvedValue([{ id: 5 }]);
    purchaseRequestsRepository.findByRequestNumber.mockResolvedValue(null);
    purchaseRequestsRepository.createRequest.mockResolvedValue(request);

    await expect(
      service.createPurchaseRequest(currentUser, {
        departmentId: 2,
        reason: ' Kitchen stock ',
        items: [{ itemId: 5, quantity: 4, estimatedUnitCost: 12.5 }],
      }),
    ).resolves.toMatchObject({
      id: request.id,
      items: [{ quantity: '4.00', estimatedUnitCost: '12.50' }],
    });

    expect(purchaseRequestsRepository.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 2,
        requestedByUserId: currentUser.sub,
        reason: 'Kitchen stock',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement.purchase_requests.created',
      }),
    );
  });

  it('rejects purchase request creation when an item is inactive', async () => {
    purchaseRequestsRepository.findActiveItems.mockResolvedValue([]);

    await expect(
      service.createPurchaseRequest(currentUser, {
        items: [{ itemId: 5, quantity: 4 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('submits and approves a purchase request', async () => {
    const submitted = {
      ...request,
      status: PurchaseRequestStatus.SUBMITTED,
      submittedAt: new Date('2026-06-18T07:00:00.000Z'),
    };
    const approved = {
      ...submitted,
      status: PurchaseRequestStatus.APPROVED,
      approvedByUserId: currentUser.sub,
      decidedAt: new Date('2026-06-18T08:00:00.000Z'),
    };
    purchaseRequestsRepository.findRequest
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(submitted);
    purchaseRequestsRepository.updateRequest
      .mockResolvedValueOnce(submitted)
      .mockResolvedValueOnce(approved);

    await expect(
      service.submitPurchaseRequest(currentUser, request.id, {}),
    ).resolves.toMatchObject({ status: PurchaseRequestStatus.SUBMITTED });
    await expect(
      service.approvePurchaseRequest(currentUser, request.id, {
        decisionNote: 'Approved',
      }),
    ).resolves.toMatchObject({ status: PurchaseRequestStatus.APPROVED });
  });

  it('requires submitted purchase request before approval', async () => {
    purchaseRequestsRepository.findRequest.mockResolvedValue(request);

    await expect(
      service.approvePurchaseRequest(currentUser, request.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects purchase request with required reason', async () => {
    const submitted = {
      ...request,
      status: PurchaseRequestStatus.SUBMITTED,
    };
    purchaseRequestsRepository.findRequest.mockResolvedValue(submitted);
    purchaseRequestsRepository.updateRequest.mockResolvedValue({
      ...submitted,
      status: PurchaseRequestStatus.REJECTED,
      decisionNote: 'Not needed',
    });

    await expect(
      service.rejectPurchaseRequest(currentUser, request.id, {
        decisionNote: ' Not needed ',
      }),
    ).resolves.toMatchObject({
      status: PurchaseRequestStatus.REJECTED,
      decisionNote: 'Not needed',
    });
  });

  it('creates a purchase order from an approved request', async () => {
    const approvedRequest = {
      ...request,
      status: PurchaseRequestStatus.APPROVED,
    };
    purchaseRequestsRepository.findRequest.mockResolvedValue(approvedRequest);
    suppliersRepository.findSupplier.mockResolvedValue(supplier);
    purchaseOrdersRepository.findByOrderNumber.mockResolvedValue(null);
    purchaseOrdersRepository.convertRequestToOrder.mockResolvedValue(order);

    await expect(
      service.createPurchaseOrderFromRequest(currentUser, request.id, {
        supplierId: supplier.id,
      }),
    ).resolves.toMatchObject({
      id: order.id,
      items: [{ quantity: '4.00', unitCost: '12.50' }],
    });

    expect(purchaseOrdersRepository.convertRequestToOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: request.id,
        supplierId: supplier.id,
      }),
    );
  });

  it('approves and marks a purchase order ordered', async () => {
    const approved = {
      ...order,
      status: PurchaseOrderStatus.APPROVED,
      approvedByUserId: currentUser.sub,
    };
    purchaseOrdersRepository.findOrder
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(approved);
    purchaseOrdersRepository.updateOrder
      .mockResolvedValueOnce(approved)
      .mockResolvedValueOnce({
        ...approved,
        status: PurchaseOrderStatus.ORDERED,
      });

    await expect(
      service.approvePurchaseOrder(currentUser, order.id, {}),
    ).resolves.toMatchObject({ status: PurchaseOrderStatus.APPROVED });
    await expect(
      service.markPurchaseOrderOrdered(currentUser, order.id, {}),
    ).resolves.toMatchObject({ status: PurchaseOrderStatus.ORDERED });
  });

  it('creates a goods received note for active items and location', async () => {
    suppliersRepository.findSupplier.mockResolvedValue(supplier);
    purchaseOrdersRepository.findOrder.mockResolvedValue({
      ...order,
      status: PurchaseOrderStatus.ORDERED,
    });
    goodsReceivedRepository.findActiveLocation.mockResolvedValue({ id: 4 });
    goodsReceivedRepository.findActiveItems.mockResolvedValue([{ id: 5 }]);
    goodsReceivedRepository.findByGrnNumber.mockResolvedValue(null);
    goodsReceivedRepository.createGoodsReceived.mockResolvedValue(grn);

    await expect(
      service.createGoodsReceived(currentUser, {
        purchaseOrderId: order.id,
        supplierId: supplier.id,
        locationId: 4,
        items: [{ itemId: 5, quantity: 4, unitCost: 12.5 }],
      }),
    ).resolves.toMatchObject({
      id: grn.id,
      items: [{ quantity: '4.00', unitCost: '12.50' }],
    });
  });

  it('rejects goods received items that are not on the purchase order', async () => {
    purchaseOrdersRepository.findOrder.mockResolvedValue(order);
    goodsReceivedRepository.findActiveLocation.mockResolvedValue({ id: 4 });
    goodsReceivedRepository.findActiveItems.mockResolvedValue([{ id: 99 }]);

    await expect(
      service.createGoodsReceived(currentUser, {
        purchaseOrderId: order.id,
        locationId: 4,
        items: [{ itemId: 99, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('posts goods received and rejects duplicate posting', async () => {
    goodsReceivedRepository.findGoodsReceived
      .mockResolvedValueOnce(grn)
      .mockResolvedValueOnce(grn);
    goodsReceivedRepository.postGoodsReceived
      .mockResolvedValueOnce({
        status: 'POSTED',
        grn: {
          ...grn,
          status: GoodsReceivedStatus.POSTED,
          postedAt: new Date('2026-06-18T09:00:00.000Z'),
        },
      })
      .mockResolvedValueOnce({ status: 'ALREADY_POSTED', grn });

    await expect(
      service.postGoodsReceived(currentUser, grn.id, {}),
    ).resolves.toMatchObject({ status: GoodsReceivedStatus.POSTED });
    await expect(
      service.postGoodsReceived(currentUser, grn.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns procurement dashboard counts', async () => {
    procurementReportsRepository.getDashboardCounts.mockResolvedValue([
      2, 3, 4, 5, 6, 7, 8,
    ]);

    await expect(
      service.getProcurementDashboard(currentUser, {}),
    ).resolves.toEqual({
      pendingPurchaseRequests: 2,
      approvedPurchaseRequests: 3,
      openPurchaseOrders: 4,
      partiallyReceivedOrders: 5,
      receivedOrders: 6,
      activeSuppliers: 7,
      draftGoodsReceived: 8,
    });
  });
});
