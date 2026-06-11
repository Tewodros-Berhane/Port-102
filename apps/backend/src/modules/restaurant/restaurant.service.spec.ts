/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  MenuItemStatus,
  OutletType,
  PosOrderPaymentStatus,
  PosOrderSource,
  PosOrderStatus,
  PosPaymentMethod,
  Prisma,
  FolioStatus,
  StayStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RestaurantService } from './restaurant.service';
import { MenuItemsRepository } from './repositories/menu-items.repository';
import { OutletsRepository } from './repositories/outlets.repository';
import { PosOrderItemsRepository } from './repositories/pos-order-items.repository';
import { PosOrderPaymentsRepository } from './repositories/pos-order-payments.repository';
import { PosOrdersRepository } from './repositories/pos-orders.repository';
import { PosRoomChargesRepository } from './repositories/pos-room-charges.repository';
import { RestaurantReportsRepository } from './repositories/restaurant-reports.repository';

const currentUser = {
  sub: 1,
  email: 'admin@demo-hotel.com',
  roleKey: 'HOTEL_ADMIN',
  roleId: 2,
  departmentId: null,
  tokenVersion: 0,
};

const now = new Date('2026-06-07T12:00:00.000Z');

function createOutlet(overrides: Record<string, unknown> = {}) {
  return {
    id: 4,
    name: 'Main Restaurant',
    code: 'MAIN-RESTAURANT',
    type: OutletType.RESTAURANT,
    description: 'Main hotel restaurant.',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMenuItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    outletId: 4,
    name: 'Special Tibs',
    code: 'TIBS-01',
    category: 'Main Course',
    description: 'Beef tibs served with injera.',
    price: new Prisma.Decimal(450),
    status: MenuItemStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    outlet: {
      id: 4,
      name: 'Main Restaurant',
      code: 'MAIN-RESTAURANT',
      type: OutletType.RESTAURANT,
      isActive: true,
    },
    ...overrides,
  };
}

function createOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    orderNumber: 'POS-20260607-000001',
    outletId: 4,
    status: PosOrderStatus.OPEN,
    paymentStatus: PosOrderPaymentStatus.UNPAID,
    source: PosOrderSource.MANUAL,
    tableNumber: null,
    roomId: null,
    stayId: null,
    folioId: null,
    subtotalAmount: new Prisma.Decimal(0),
    discountAmount: new Prisma.Decimal(0),
    taxAmount: new Prisma.Decimal(0),
    serviceAmount: new Prisma.Decimal(0),
    totalAmount: new Prisma.Decimal(0),
    paidAmount: new Prisma.Decimal(0),
    balanceAmount: new Prisma.Decimal(0),
    notes: null,
    cancelledReason: null,
    createdByUserId: 1,
    closedByUserId: null,
    cancelledByUserId: null,
    closedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    outlet: {
      id: 4,
      name: 'Main Restaurant',
      code: 'MAIN-RESTAURANT',
      type: OutletType.RESTAURANT,
      isActive: true,
    },
    createdBy: {
      id: 1,
      email: currentUser.email,
      fullName: 'Hotel Admin',
    },
    closedBy: null,
    cancelledBy: null,
    items: [],
    payments: [],
    ...overrides,
  };
}

function createOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    orderId: 9,
    menuItemId: 7,
    description: 'Special Tibs',
    quantity: 2,
    unitPrice: new Prisma.Decimal(450),
    totalAmount: new Prisma.Decimal(900),
    notes: null,
    isVoided: false,
    voidReason: null,
    createdAt: now,
    updatedAt: now,
    menuItem: {
      id: 7,
      name: 'Special Tibs',
      code: 'TIBS-01',
      category: 'Main Course',
      status: MenuItemStatus.ACTIVE,
    },
    ...overrides,
  };
}

function createPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 15,
    paymentNumber: 'POS-PAY-20260608-000001',
    orderId: 9,
    amount: new Prisma.Decimal(450),
    method: PosPaymentMethod.CASH,
    reference: null,
    notes: null,
    recordedByUserId: 1,
    recordedAt: now,
    isVoided: false,
    voidReason: null,
    voidedAt: null,
    createdAt: now,
    updatedAt: now,
    recordedBy: {
      id: 1,
      email: currentUser.email,
      fullName: 'Hotel Admin',
    },
    ...overrides,
  };
}

describe('RestaurantService', () => {
  let service: RestaurantService;
  let outletsRepository: {
    createOutlet: jest.Mock;
    findOutlet: jest.Mock;
    findByCode: jest.Mock;
    listOutlets: jest.Mock;
    updateOutlet: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };
  let menuItemsRepository: {
    createMenuItem: jest.Mock;
    findMenuItem: jest.Mock;
    findByOutletAndCode: jest.Mock;
    listMenuItems: jest.Mock;
    updateMenuItem: jest.Mock;
  };
  let posOrdersRepository: {
    createOrder: jest.Mock;
    findOrder: jest.Mock;
    findByOrderNumber: jest.Mock;
    listOrders: jest.Mock;
    updateOrder: jest.Mock;
    runInTransaction: jest.Mock;
  };
  let posOrderItemsRepository: {
    createOrderItem: jest.Mock;
    findOrderItem: jest.Mock;
    updateOrderItem: jest.Mock;
  };
  let posOrderPaymentsRepository: {
    createPayment: jest.Mock;
    findByPaymentNumber: jest.Mock;
  };
  let posRoomChargesRepository: {
    findStay: jest.Mock;
    findOrderCharge: jest.Mock;
    createCharge: jest.Mock;
    incrementFolio: jest.Mock;
  };
  let restaurantReportsRepository: {
    getDashboardCounts: jest.Mock;
    getSalesSummary: jest.Mock;
    searchInHouseGuests: jest.Mock;
  };

  beforeEach(async () => {
    outletsRepository = {
      createOutlet: jest.fn(),
      findOutlet: jest.fn(),
      findByCode: jest.fn(),
      listOutlets: jest.fn(),
      updateOutlet: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn(),
    };
    menuItemsRepository = {
      createMenuItem: jest.fn(),
      findMenuItem: jest.fn(),
      findByOutletAndCode: jest.fn(),
      listMenuItems: jest.fn(),
      updateMenuItem: jest.fn(),
    };
    posOrdersRepository = {
      createOrder: jest.fn(),
      findOrder: jest.fn(),
      findByOrderNumber: jest.fn(),
      listOrders: jest.fn(),
      updateOrder: jest.fn(),
      runInTransaction: jest.fn(
        (operation: (client: object) => Promise<unknown>) => operation({}),
      ),
    };
    posOrderItemsRepository = {
      createOrderItem: jest.fn(),
      findOrderItem: jest.fn(),
      updateOrderItem: jest.fn(),
    };
    posOrderPaymentsRepository = {
      createPayment: jest.fn(),
      findByPaymentNumber: jest.fn(),
    };
    posRoomChargesRepository = {
      findStay: jest.fn(),
      findOrderCharge: jest.fn(),
      createCharge: jest.fn(),
      incrementFolio: jest.fn(),
    };
    restaurantReportsRepository = {
      getDashboardCounts: jest.fn(),
      getSalesSummary: jest.fn(),
      searchInHouseGuests: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: OutletsRepository,
          useValue: outletsRepository,
        },
        {
          provide: MenuItemsRepository,
          useValue: menuItemsRepository,
        },
        {
          provide: PosOrdersRepository,
          useValue: posOrdersRepository,
        },
        {
          provide: PosOrderItemsRepository,
          useValue: posOrderItemsRepository,
        },
        {
          provide: PosOrderPaymentsRepository,
          useValue: posOrderPaymentsRepository,
        },
        {
          provide: PosRoomChargesRepository,
          useValue: posRoomChargesRepository,
        },
        {
          provide: RestaurantReportsRepository,
          useValue: restaurantReportsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
  });

  it('creates an outlet with normalized code and audit log', async () => {
    outletsRepository.findByCode.mockResolvedValue(null);
    outletsRepository.createOutlet.mockResolvedValue(createOutlet());

    const result = await service.createOutlet(currentUser, {
      name: ' Main Restaurant ',
      code: ' main-restaurant ',
      type: OutletType.RESTAURANT,
      description: ' Main hotel restaurant. ',
    });

    expect(outletsRepository.createOutlet).toHaveBeenCalledWith({
      name: 'Main Restaurant',
      code: 'MAIN-RESTAURANT',
      type: OutletType.RESTAURANT,
      description: 'Main hotel restaurant.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'restaurant.outlets.created',
        entityType: 'Outlet',
        entityId: '4',
      }),
    );
    expect(result.code).toBe('MAIN-RESTAURANT');
  });

  it('rejects duplicate outlet codes', async () => {
    outletsRepository.findByCode.mockResolvedValue(createOutlet());

    await expect(
      service.createOutlet(currentUser, {
        name: 'Duplicate',
        code: 'main-restaurant',
        type: OutletType.CAFE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists outlets with pagination and filters', async () => {
    outletsRepository.listOutlets.mockResolvedValue([1, [createOutlet()]]);

    const result = await service.listOutlets(currentUser, {
      page: 2,
      limit: 10,
      search: ' main ',
      type: OutletType.RESTAURANT,
      isActive: true,
    });

    expect(outletsRepository.listOutlets).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'main',
      type: OutletType.RESTAURANT,
      isActive: true,
    });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns outlet details and rejects missing outlets', async () => {
    outletsRepository.findOutlet.mockResolvedValueOnce(createOutlet());

    await expect(service.getOutletById(currentUser, 4)).resolves.toEqual(
      expect.objectContaining({
        id: 4,
        code: 'MAIN-RESTAURANT',
      }),
    );

    outletsRepository.findOutlet.mockResolvedValueOnce(null);

    await expect(
      service.getOutletById(currentUser, 404),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an outlet and validates changed code uniqueness', async () => {
    outletsRepository.findOutlet.mockResolvedValue(createOutlet());
    outletsRepository.findByCode.mockResolvedValue(null);
    outletsRepository.updateOutlet.mockResolvedValue(
      createOutlet({
        name: 'Garden Restaurant',
        code: 'GARDEN-RESTAURANT',
      }),
    );

    const result = await service.updateOutlet(currentUser, 4, {
      name: ' Garden Restaurant ',
      code: 'garden-restaurant',
    });

    expect(outletsRepository.findByCode).toHaveBeenCalledWith(
      'GARDEN-RESTAURANT',
      4,
    );
    expect(outletsRepository.updateOutlet).toHaveBeenCalledWith(4, {
      name: 'Garden Restaurant',
      code: 'GARDEN-RESTAURANT',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.outlets.updated',
      }),
    );
    expect(result.code).toBe('GARDEN-RESTAURANT');
  });

  it('soft-deactivates an outlet and records an audit log', async () => {
    outletsRepository.findOutlet.mockResolvedValue(createOutlet());
    outletsRepository.updateOutlet.mockResolvedValue(
      createOutlet({ isActive: false }),
    );

    const result = await service.deactivateOutlet(currentUser, 4);

    expect(outletsRepository.updateOutlet).toHaveBeenCalledWith(4, {
      isActive: false,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.outlets.deactivated',
      }),
    );
    expect(result.isActive).toBe(false);
  });

  it('returns an already inactive outlet without another update', async () => {
    outletsRepository.findOutlet.mockResolvedValue(
      createOutlet({ isActive: false }),
    );

    await service.deactivateOutlet(currentUser, 4);

    expect(outletsRepository.updateOutlet).not.toHaveBeenCalled();
    expect(auditLogsService.record).not.toHaveBeenCalled();
  });

  it('creates a menu item with normalized values and an audit log', async () => {
    outletsRepository.findOutlet.mockResolvedValue(createOutlet());
    menuItemsRepository.findByOutletAndCode.mockResolvedValue(null);
    menuItemsRepository.createMenuItem.mockResolvedValue(createMenuItem());

    const result = await service.createMenuItem(currentUser, {
      outletId: 4,
      name: ' Special Tibs ',
      code: ' tibs-01 ',
      category: ' Main Course ',
      description: ' Beef tibs served with injera. ',
      price: 450,
    });

    expect(menuItemsRepository.createMenuItem).toHaveBeenCalledWith({
      outletId: 4,
      name: 'Special Tibs',
      code: 'TIBS-01',
      category: 'Main Course',
      description: 'Beef tibs served with injera.',
      price: new Prisma.Decimal(450),
      status: MenuItemStatus.ACTIVE,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.menu_items.created',
        entityType: 'MenuItem',
        entityId: '7',
      }),
    );
    expect(result.price).toBe('450');
  });

  it('rejects duplicate menu codes within the same outlet', async () => {
    outletsRepository.findOutlet.mockResolvedValue(createOutlet());
    menuItemsRepository.findByOutletAndCode.mockResolvedValue(createMenuItem());

    await expect(
      service.createMenuItem(currentUser, {
        outletId: 4,
        name: 'Duplicate Tibs',
        code: 'tibs-01',
        price: 400,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects menu item creation for an inactive outlet', async () => {
    outletsRepository.findOutlet.mockResolvedValue(
      createOutlet({ isActive: false }),
    );

    await expect(
      service.createMenuItem(currentUser, {
        outletId: 4,
        name: 'Special Tibs',
        code: 'tibs-01',
        price: 450,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates and marks menu items out of stock', async () => {
    menuItemsRepository.findMenuItem.mockResolvedValue(createMenuItem());
    menuItemsRepository.findByOutletAndCode.mockResolvedValue(null);
    menuItemsRepository.updateMenuItem
      .mockResolvedValueOnce(
        createMenuItem({
          name: 'Special Beef Tibs',
          price: new Prisma.Decimal(475),
        }),
      )
      .mockResolvedValueOnce(
        createMenuItem({ status: MenuItemStatus.OUT_OF_STOCK }),
      );

    const updated = await service.updateMenuItem(currentUser, 7, {
      name: ' Special Beef Tibs ',
      price: 475,
    });
    const outOfStock = await service.markMenuItemOutOfStock(currentUser, 7);

    expect(menuItemsRepository.updateMenuItem).toHaveBeenNthCalledWith(1, 7, {
      name: 'Special Beef Tibs',
      price: new Prisma.Decimal(475),
    });
    expect(menuItemsRepository.updateMenuItem).toHaveBeenNthCalledWith(2, 7, {
      status: MenuItemStatus.OUT_OF_STOCK,
    });
    expect(updated.price).toBe('475');
    expect(outOfStock.status).toBe(MenuItemStatus.OUT_OF_STOCK);
  });

  it('lists menu items with pagination and filters', async () => {
    menuItemsRepository.listMenuItems.mockResolvedValue([
      1,
      [createMenuItem()],
    ]);

    const result = await service.listMenuItems(currentUser, {
      page: 2,
      limit: 10,
      search: ' tibs ',
      outletId: 4,
      status: MenuItemStatus.ACTIVE,
      category: ' Main Course ',
    });

    expect(menuItemsRepository.listMenuItems).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'tibs',
      outletId: 4,
      status: MenuItemStatus.ACTIVE,
      category: 'Main Course',
    });
    expect(result.pagination.total).toBe(1);
  });

  it('creates an empty open order for an active outlet', async () => {
    outletsRepository.findOutlet.mockResolvedValue(createOutlet());
    posOrdersRepository.findByOrderNumber.mockResolvedValue(null);
    posOrdersRepository.createOrder.mockImplementation(
      (data: Record<string, unknown>) =>
        Promise.resolve(createOrder({ orderNumber: data.orderNumber })),
    );

    const result = await service.createOrder(currentUser, {
      outletId: 4,
      source: PosOrderSource.TABLE_SERVICE,
      tableNumber: ' T-12 ',
      notes: ' Waiter ticket 42 ',
    });

    expect(posOrdersRepository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: expect.stringMatching(/^POS-\d{8}-\d{6}$/),
        outletId: 4,
        source: PosOrderSource.TABLE_SERVICE,
        tableNumber: 'T-12',
        notes: 'Waiter ticket 42',
        createdByUserId: 1,
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.orders.created',
        entityType: 'PosOrder',
      }),
    );
    expect(result.status).toBe(PosOrderStatus.OPEN);
    expect(result.totalAmount).toBe('0');
  });

  it('rejects order creation for an inactive outlet', async () => {
    outletsRepository.findOutlet.mockResolvedValue(
      createOutlet({ isActive: false }),
    );

    await expect(
      service.createOrder(currentUser, { outletId: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists orders with pagination and filters', async () => {
    posOrdersRepository.listOrders.mockResolvedValue([1, [createOrder()]]);

    const result = await service.listOrders(currentUser, {
      page: 1,
      limit: 20,
      search: ' T-12 ',
      outletId: 4,
      status: PosOrderStatus.OPEN,
      paymentStatus: PosOrderPaymentStatus.UNPAID,
      source: PosOrderSource.TABLE_SERVICE,
      createdFrom: '2026-06-01',
      createdTo: '2026-06-30T23:59:59.999Z',
    });

    expect(posOrdersRepository.listOrders).toHaveBeenCalledWith({
      skip: 0,
      take: 20,
      search: 'T-12',
      outletId: 4,
      status: PosOrderStatus.OPEN,
      paymentStatus: PosOrderPaymentStatus.UNPAID,
      source: PosOrderSource.TABLE_SERVICE,
      createdFrom: new Date('2026-06-01'),
      createdTo: new Date('2026-06-30T23:59:59.999Z'),
    });
    expect(result.pagination.total).toBe(1);
  });

  it('updates only open order metadata and audits the change', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(createOrder());
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({
        source: PosOrderSource.TABLE_SERVICE,
        tableNumber: 'T-14',
      }),
    );

    const result = await service.updateOrder(currentUser, 9, {
      source: PosOrderSource.TABLE_SERVICE,
      tableNumber: ' T-14 ',
    });

    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(9, {
      source: PosOrderSource.TABLE_SERVICE,
      tableNumber: 'T-14',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.orders.updated',
      }),
    );
    expect(result.tableNumber).toBe('T-14');
  });

  it('rejects metadata updates on closed orders', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({ status: PosOrderStatus.CLOSED }),
    );

    await expect(
      service.updateOrder(currentUser, 9, { tableNumber: 'T-14' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adds an order item and recalculates totals', async () => {
    const order = createOrder();
    const item = createOrderItem();
    posOrdersRepository.findOrder
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(createOrder({ items: [item] }));
    menuItemsRepository.findMenuItem.mockResolvedValue(createMenuItem());
    posOrderItemsRepository.createOrderItem.mockResolvedValue(item);
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({
        items: [item],
        subtotalAmount: new Prisma.Decimal(900),
        totalAmount: new Prisma.Decimal(900),
        balanceAmount: new Prisma.Decimal(900),
      }),
    );

    const result = await service.addOrderItem(currentUser, 9, {
      menuItemId: 7,
      quantity: 2,
      notes: ' No raw onion ',
    });

    expect(posOrderItemsRepository.createOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 9,
        menuItemId: 7,
        quantity: 2,
        unitPrice: new Prisma.Decimal(450),
        totalAmount: new Prisma.Decimal(900),
        notes: 'No raw onion',
      }),
      {},
    );
    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        subtotalAmount: new Prisma.Decimal(900),
        totalAmount: new Prisma.Decimal(900),
        balanceAmount: new Prisma.Decimal(900),
      }),
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.order_items.added',
      }),
    );
    expect(result.totalAmount).toBe('900');
  });

  it('rejects adding inactive menu items to an order', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(createOrder());
    menuItemsRepository.findMenuItem.mockResolvedValue(
      createMenuItem({ status: MenuItemStatus.OUT_OF_STOCK }),
    );

    await expect(
      service.addOrderItem(currentUser, 9, {
        menuItemId: 7,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates an order item and recalculates totals', async () => {
    const item = createOrderItem({ quantity: 2 });
    const updatedItem = createOrderItem({
      quantity: 3,
      totalAmount: new Prisma.Decimal(1350),
    });
    posOrdersRepository.findOrder
      .mockResolvedValueOnce(createOrder({ items: [item] }))
      .mockResolvedValueOnce(createOrder({ items: [updatedItem] }));
    posOrderItemsRepository.findOrderItem.mockResolvedValue(item);
    posOrderItemsRepository.updateOrderItem.mockResolvedValue(updatedItem);
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({
        items: [updatedItem],
        subtotalAmount: new Prisma.Decimal(1350),
        totalAmount: new Prisma.Decimal(1350),
        balanceAmount: new Prisma.Decimal(1350),
      }),
    );

    const result = await service.updateOrderItem(currentUser, 9, 12, {
      quantity: 3,
    });

    expect(posOrderItemsRepository.updateOrderItem).toHaveBeenCalledWith(
      12,
      expect.objectContaining({
        quantity: 3,
        totalAmount: new Prisma.Decimal(1350),
      }),
      {},
    );
    expect(result.balanceAmount).toBe('1350');
  });

  it('voids an order item and recalculates totals', async () => {
    const item = createOrderItem();
    const voidedItem = createOrderItem({
      isVoided: true,
      voidReason: 'Guest cancelled.',
    });
    posOrdersRepository.findOrder
      .mockResolvedValueOnce(createOrder({ items: [item] }))
      .mockResolvedValueOnce(createOrder({ items: [voidedItem] }));
    posOrderItemsRepository.findOrderItem.mockResolvedValue(item);
    posOrderItemsRepository.updateOrderItem.mockResolvedValue(voidedItem);
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({
        items: [voidedItem],
        subtotalAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(0),
      }),
    );

    const result = await service.voidOrderItem(currentUser, 9, 12, {
      reason: ' Guest cancelled. ',
    });

    expect(posOrderItemsRepository.updateOrderItem).toHaveBeenCalledWith(
      12,
      {
        isVoided: true,
        voidReason: 'Guest cancelled.',
      },
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.order_items.voided',
      }),
    );
    expect(result.totalAmount).toBe('0');
  });

  it('rejects line-item edits on closed orders', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({ status: PosOrderStatus.CLOSED }),
    );

    await expect(
      service.addOrderItem(currentUser, 9, { menuItemId: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('records a partial direct payment and updates order balance', async () => {
    const order = createOrder({
      totalAmount: new Prisma.Decimal(900),
      balanceAmount: new Prisma.Decimal(900),
      items: [createOrderItem()],
    });
    const payment = createPayment({ amount: new Prisma.Decimal(400) });
    posOrdersRepository.findOrder.mockResolvedValue(order);
    posOrderPaymentsRepository.findByPaymentNumber.mockResolvedValue(null);
    posOrderPaymentsRepository.createPayment.mockResolvedValue(payment);
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({
        totalAmount: new Prisma.Decimal(900),
        paidAmount: new Prisma.Decimal(400),
        balanceAmount: new Prisma.Decimal(500),
        paymentStatus: PosOrderPaymentStatus.PARTIALLY_PAID,
        items: [createOrderItem()],
        payments: [payment],
      }),
    );

    const result = await service.recordOrderPayment(currentUser, 9, {
      amount: 400,
      method: PosPaymentMethod.CASH,
      reference: ' CASH-1 ',
    });

    expect(posOrderPaymentsRepository.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentNumber: expect.stringMatching(/^POS-PAY-\d{8}-\d{6}$/),
        amount: new Prisma.Decimal(400),
        method: PosPaymentMethod.CASH,
        reference: 'CASH-1',
        recordedByUserId: 1,
      }),
      {},
    );
    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        paidAmount: new Prisma.Decimal(400),
        balanceAmount: new Prisma.Decimal(500),
        paymentStatus: PosOrderPaymentStatus.PARTIALLY_PAID,
      }),
      {},
    );
    expect(result.order.balanceAmount).toBe('500');
  });

  it('marks an order paid when direct payment clears the balance', async () => {
    const order = createOrder({
      totalAmount: new Prisma.Decimal(900),
      balanceAmount: new Prisma.Decimal(900),
    });
    posOrdersRepository.findOrder.mockResolvedValue(order);
    posOrderPaymentsRepository.findByPaymentNumber.mockResolvedValue(null);
    posOrderPaymentsRepository.createPayment.mockResolvedValue(
      createPayment({ amount: new Prisma.Decimal(900) }),
    );
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({
        totalAmount: new Prisma.Decimal(900),
        paidAmount: new Prisma.Decimal(900),
        balanceAmount: new Prisma.Decimal(0),
        paymentStatus: PosOrderPaymentStatus.PAID,
      }),
    );

    const result = await service.recordOrderPayment(currentUser, 9, {
      amount: 900,
      method: PosPaymentMethod.CARD,
    });

    expect(result.order.paymentStatus).toBe(PosOrderPaymentStatus.PAID);
    expect(result.order.balanceAmount).toBe('0');
  });

  it('rejects POS overpayments and direct room-charge payments', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        totalAmount: new Prisma.Decimal(900),
        balanceAmount: new Prisma.Decimal(900),
      }),
    );

    await expect(
      service.recordOrderPayment(currentUser, 9, {
        amount: 901,
        method: PosPaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.recordOrderPayment(currentUser, 9, {
        amount: 100,
        method: PosPaymentMethod.ROOM_CHARGE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('posts an order balance to an active stay folio and closes the order', async () => {
    const order = createOrder({
      totalAmount: new Prisma.Decimal(900),
      balanceAmount: new Prisma.Decimal(900),
    });
    const chargedOrder = createOrder({
      status: PosOrderStatus.CLOSED,
      paymentStatus: PosOrderPaymentStatus.CHARGED_TO_ROOM,
      roomId: 11,
      stayId: 42,
      folioId: 7,
      totalAmount: new Prisma.Decimal(900),
      balanceAmount: new Prisma.Decimal(0),
      closedByUserId: 1,
      closedAt: now,
    });
    posOrdersRepository.findOrder.mockResolvedValue(order);
    posRoomChargesRepository.findStay.mockResolvedValue({
      id: 42,
      stayNumber: 'STAY-42',
      status: StayStatus.ACTIVE,
      folio: {
        id: 7,
        folioNumber: 'FOL-7',
        status: FolioStatus.OPEN,
        subtotalAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(0),
      },
      roomAssignments: [
        { id: 3, roomId: 11, room: { id: 11, roomNumber: '101' } },
      ],
    });
    posRoomChargesRepository.findOrderCharge.mockResolvedValue(null);
    posRoomChargesRepository.createCharge.mockResolvedValue({
      id: 18,
      folioId: 7,
      type: 'POS_CHARGE',
      description: 'POS charge',
      quantity: 1,
      unitAmount: new Prisma.Decimal(900),
      totalAmount: new Prisma.Decimal(900),
      sourceType: 'POS_ORDER',
      sourceId: 9,
      postedByUserId: 1,
      postedAt: now,
    });
    posRoomChargesRepository.incrementFolio.mockResolvedValue({
      id: 7,
      folioNumber: 'FOL-7',
      status: FolioStatus.OPEN,
      subtotalAmount: new Prisma.Decimal(900),
      totalAmount: new Prisma.Decimal(900),
      paidAmount: new Prisma.Decimal(0),
      balanceAmount: new Prisma.Decimal(900),
    });
    posOrdersRepository.updateOrder.mockResolvedValue(chargedOrder);

    const result = await service.chargeOrderToRoom(currentUser, 9, {
      stayId: 42,
    });

    expect(posRoomChargesRepository.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        folioId: 7,
        sourceType: 'POS_ORDER',
        sourceId: 9,
        totalAmount: new Prisma.Decimal(900),
      }),
      {},
    );
    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        roomId: 11,
        stayId: 42,
        folioId: 7,
        paymentStatus: PosOrderPaymentStatus.CHARGED_TO_ROOM,
        status: PosOrderStatus.CLOSED,
      }),
      {},
    );
    expect(result.folioCharge.totalAmount).toBe('900');
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.orders.charged_to_room',
      }),
    );
  });

  it('rejects room charges for inactive stays and duplicate folio charges', async () => {
    const order = createOrder({
      totalAmount: new Prisma.Decimal(900),
      balanceAmount: new Prisma.Decimal(900),
    });
    posOrdersRepository.findOrder.mockResolvedValue(order);
    posRoomChargesRepository.findStay.mockResolvedValueOnce({
      id: 42,
      stayNumber: 'STAY-42',
      status: StayStatus.CHECKED_OUT,
      folio: null,
      roomAssignments: [],
    });

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);

    posRoomChargesRepository.findStay.mockResolvedValueOnce({
      id: 42,
      stayNumber: 'STAY-42',
      status: StayStatus.ACTIVE,
      folio: {
        id: 7,
        folioNumber: 'FOL-7',
        status: FolioStatus.OPEN,
        subtotalAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(0),
      },
      roomAssignments: [
        { id: 3, roomId: 11, room: { id: 11, roomNumber: '101' } },
      ],
    });
    posRoomChargesRepository.findOrderCharge.mockResolvedValueOnce({ id: 18 });

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a room charge when the stay does not exist', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({ balanceAmount: new Prisma.Decimal(100) }),
    );
    posRoomChargesRepository.findStay.mockResolvedValue(null);

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 404 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a stay without an active room assignment', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({ balanceAmount: new Prisma.Decimal(100) }),
    );
    posRoomChargesRepository.findStay.mockResolvedValue({
      id: 42,
      status: StayStatus.ACTIVE,
      folio: { id: 7, status: FolioStatus.OPEN },
      roomAssignments: [],
    });

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a stay without an open folio', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({ balanceAmount: new Prisma.Decimal(100) }),
    );
    posRoomChargesRepository.findStay.mockResolvedValue({
      id: 42,
      status: StayStatus.ACTIVE,
      folio: { id: 7, status: FolioStatus.CLOSED },
      roomAssignments: [{ roomId: 11 }],
    });

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects charging an order without an outstanding balance', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(createOrder());

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(posRoomChargesRepository.findStay).not.toHaveBeenCalled();
  });

  it('rejects an order already linked to a folio', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        folioId: 7,
        balanceAmount: new Prisma.Decimal(100),
      }),
    );

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an order already marked as charged to room', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        paymentStatus: PosOrderPaymentStatus.CHARGED_TO_ROOM,
        balanceAmount: new Prisma.Decimal(100),
      }),
    );

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects charging a closed POS order', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        status: PosOrderStatus.CLOSED,
        balanceAmount: new Prisma.Decimal(100),
      }),
    );

    await expect(
      service.chargeOrderToRoom(currentUser, 9, { stayId: 42 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('closes a fully paid POS order and records an audit log', async () => {
    const order = createOrder({
      paymentStatus: PosOrderPaymentStatus.PAID,
      paidAmount: new Prisma.Decimal(900),
      totalAmount: new Prisma.Decimal(900),
    });
    const closedOrder = createOrder({
      ...order,
      status: PosOrderStatus.CLOSED,
      closedByUserId: 1,
      closedAt: now,
    });
    posOrdersRepository.findOrder.mockResolvedValue(order);
    posOrdersRepository.updateOrder.mockResolvedValue(closedOrder);

    const result = await service.closeOrder(currentUser, 9, {});

    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: PosOrderStatus.CLOSED,
        closedByUserId: 1,
        closedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(PosOrderStatus.CLOSED);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'restaurant.orders.closed' }),
    );
  });

  it('rejects closing a POS order with an unpaid balance', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({ balanceAmount: new Prisma.Decimal(100) }),
    );

    await expect(service.closeOrder(currentUser, 9, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(posOrdersRepository.updateOrder).not.toHaveBeenCalled();
  });

  it('stores normalized notes when closing a POS order', async () => {
    const order = createOrder();
    posOrdersRepository.findOrder.mockResolvedValue(order);
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({
        status: PosOrderStatus.CLOSED,
        notes: 'Payment verified.',
      }),
    );

    await service.closeOrder(currentUser, 9, {
      notes: ' Payment verified. ',
    });

    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ notes: 'Payment verified.' }),
    );
  });

  it('cancels an open POS order and records an audit log', async () => {
    const order = createOrder();
    const cancelledOrder = createOrder({
      status: PosOrderStatus.CANCELLED,
      cancelledReason: 'Guest cancelled.',
      cancelledByUserId: 1,
      cancelledAt: now,
    });
    posOrdersRepository.findOrder.mockResolvedValue(order);
    posOrdersRepository.updateOrder.mockResolvedValue(cancelledOrder);

    const result = await service.cancelOrder(currentUser, 9, {
      reason: 'Guest cancelled.',
    });

    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: PosOrderStatus.CANCELLED,
        cancelledReason: 'Guest cancelled.',
        cancelledByUserId: 1,
        cancelledAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(PosOrderStatus.CANCELLED);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'restaurant.orders.cancelled' }),
    );
  });

  it('normalizes the POS order cancellation reason', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(createOrder());
    posOrdersRepository.updateOrder.mockResolvedValue(
      createOrder({ status: PosOrderStatus.CANCELLED }),
    );

    await service.cancelOrder(currentUser, 9, {
      reason: ' Guest cancelled. ',
    });

    expect(posOrdersRepository.updateOrder).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ cancelledReason: 'Guest cancelled.' }),
    );
  });

  it('rejects cancelling a closed POS order', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({ status: PosOrderStatus.CLOSED }),
    );

    await expect(
      service.cancelOrder(currentUser, 9, { reason: 'Too late.' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(posOrdersRepository.updateOrder).not.toHaveBeenCalled();
  });

  it('generates a receipt for a paid closed POS order', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        status: PosOrderStatus.CLOSED,
        paymentStatus: PosOrderPaymentStatus.PAID,
        totalAmount: new Prisma.Decimal(900),
        paidAmount: new Prisma.Decimal(900),
      }),
    );

    const result = await service.generateOrderReceipt(currentUser, 9);

    expect(result.receiptNumber).toBe('POS-RCT-POS-20260607-000001');
    expect(result.totals.totalAmount).toBe('900');
  });

  it('omits voided items from generated POS receipts', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        status: PosOrderStatus.CLOSED,
        paymentStatus: PosOrderPaymentStatus.PAID,
        items: [
          createOrderItem(),
          createOrderItem({ id: 13, isVoided: true }),
        ],
      }),
    );

    const result = await service.generateOrderReceipt(currentUser, 9);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(12);
  });

  it('generates a receipt for a room-charged order', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        status: PosOrderStatus.CLOSED,
        paymentStatus: PosOrderPaymentStatus.CHARGED_TO_ROOM,
        roomId: 11,
        stayId: 42,
        folioId: 7,
      }),
    );

    const result = await service.generateOrderReceipt(currentUser, 9);

    expect(result.order).toEqual(
      expect.objectContaining({ roomId: 11, stayId: 42, folioId: 7 }),
    );
  });

  it('rejects receipt generation for an open order', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(createOrder());

    await expect(
      service.generateOrderReceipt(currentUser, 9),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects receipt generation for an unsettled closed order', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        status: PosOrderStatus.CLOSED,
        paymentStatus: PosOrderPaymentStatus.UNPAID,
      }),
    );

    await expect(
      service.generateOrderReceipt(currentUser, 9),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('audits generated POS receipts', async () => {
    posOrdersRepository.findOrder.mockResolvedValue(
      createOrder({
        status: PosOrderStatus.CLOSED,
        paymentStatus: PosOrderPaymentStatus.PAID,
      }),
    );

    await service.generateOrderReceipt(currentUser, 9);

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restaurant.receipts.generated',
        entityType: 'PosOrder',
      }),
    );
  });

  it('returns a zero-backed restaurant dashboard', async () => {
    restaurantReportsRepository.getDashboardCounts.mockResolvedValue({
      openOrders: 0,
      unpaidOrders: 0,
      activeOutlets: 1,
      unavailableMenuItems: 0,
    });
    restaurantReportsRepository.getSalesSummary.mockResolvedValue({
      totalOrders: 0,
      closedOrders: 0,
      cancelledOrders: 0,
      grossSales: null,
      directPayments: null,
      roomCharges: null,
      unpaidBalance: null,
      outletGroups: [],
      paymentGroups: [],
      outlets: [],
    });

    const result = await service.getDashboard(currentUser, {});

    expect(result.grossSales).toBe('0');
    expect(result.openOrders).toBe(0);
    expect(result.period.createdFrom).toBeInstanceOf(Date);
  });

  it('validates dashboard outlet filters', async () => {
    outletsRepository.findOutlet.mockResolvedValue(null);

    await expect(
      service.getDashboard(currentUser, { outletId: 404 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      restaurantReportsRepository.getDashboardCounts,
    ).not.toHaveBeenCalled();
  });

  it('serializes outlet and payment method sales groups', async () => {
    restaurantReportsRepository.getSalesSummary.mockResolvedValue({
      totalOrders: 2,
      closedOrders: 2,
      cancelledOrders: 0,
      grossSales: new Prisma.Decimal(900),
      directPayments: new Prisma.Decimal(400),
      roomCharges: new Prisma.Decimal(500),
      unpaidBalance: null,
      outletGroups: [
        {
          outletId: 4,
          _count: { _all: 2 },
          _sum: { totalAmount: new Prisma.Decimal(900) },
        },
      ],
      paymentGroups: [
        {
          method: PosPaymentMethod.CASH,
          _count: { _all: 1 },
          _sum: { amount: new Prisma.Decimal(400) },
        },
      ],
      outlets: [{ id: 4, name: 'Main Restaurant', code: 'MAIN' }],
    });

    const result = await service.getSalesSummary(currentUser, {});

    expect(result.grossSales).toBe('900');
    expect(result.salesByOutlet[0].orderCount).toBe(2);
    expect(result.salesByPaymentMethod[0].amount).toBe('400');
  });
});
