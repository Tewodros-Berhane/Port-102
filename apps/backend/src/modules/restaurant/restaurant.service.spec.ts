/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  MenuItemStatus,
  OutletType,
  PosOrderPaymentStatus,
  PosOrderSource,
  PosOrderStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RestaurantService } from './restaurant.service';
import { MenuItemsRepository } from './repositories/menu-items.repository';
import { OutletsRepository } from './repositories/outlets.repository';
import { PosOrdersRepository } from './repositories/pos-orders.repository';

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
});
