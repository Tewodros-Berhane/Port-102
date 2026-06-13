/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { REQUIRED_PERMISSIONS_KEY } from '../src/common/decorators/permissions.decorator';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import {
  MenuItemStatus,
  OutletType,
  PosOrderPaymentStatus,
  PosOrderSource,
  PosOrderStatus,
  PosPaymentMethod,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { RestaurantService } from '../src/modules/restaurant/restaurant.service';

type TestUser = CurrentUserPayload & {
  permissions: string[];
};

type RequestWithTestUser = {
  headers: { authorization?: string };
  user?: TestUser;
};

const cashierUser: TestUser = {
  sub: 21,
  email: 'cashier@demo-hotel.com',
  roleKey: 'RESTAURANT_CASHIER',
  roleId: 12,
  departmentId: 6,
  tokenVersion: 0,
  permissions: [
    'pos.dashboard.read',
    'pos.orders.create',
    'pos.orders.read',
    'pos.orders.update',
    'pos.orders.close',
    'pos.orders.cancel',
    'pos.payments.record',
    'pos.receipts.generate',
    'pos.charge_to_room',
    'pos.menu_items.create',
    'pos.menu_items.read',
    'pos.menu_items.update',
    'pos.menu_items.delete',
    'outlet_sales.read',
    'in_house_guests.read',
  ],
};

const limitedUser: TestUser = {
  ...cashierUser,
  sub: 22,
  email: 'limited.restaurant@demo-hotel.com',
  permissions: ['pos.orders.read'],
};

const usersByToken = new Map<string, TestUser>([
  ['cashier-token', cashierUser],
  ['limited-token', limitedUser],
]);

const outlet = {
  id: 4,
  name: 'Main Restaurant',
  code: 'MAIN',
  type: OutletType.RESTAURANT,
  description: 'Main hotel restaurant.',
  isActive: true,
};

const menuItem = {
  id: 7,
  outletId: 4,
  name: 'Special Tibs',
  code: 'TIBS-01',
  category: 'Main Course',
  description: 'Beef tibs served with injera.',
  price: '450',
  status: MenuItemStatus.ACTIVE,
};

const order = {
  id: 9,
  orderNumber: 'POS-20260613-123450',
  outletId: 4,
  status: PosOrderStatus.OPEN,
  paymentStatus: PosOrderPaymentStatus.UNPAID,
  source: PosOrderSource.TABLE_SERVICE,
  tableNumber: 'T-12',
  totalAmount: '900',
  paidAmount: '0',
  balanceAmount: '900',
  items: [],
  payments: [],
};

function requiredPermissions(context: ExecutionContext) {
  return [
    ...((Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getClass()) as
      | string[]
      | undefined) ?? []),
    ...((Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getHandler()) as
      | string[]
      | undefined) ?? []),
  ];
}

describe('Restaurant POS API (e2e)', () => {
  let app: INestApplication;

  const restaurantService = {
    getDashboard: jest.fn(),
    getSalesSummary: jest.fn(),
    getOutletSalesSummary: jest.fn(),
    searchInHouseGuests: jest.fn(),
    createOutlet: jest.fn(),
    listOutlets: jest.fn(),
    getOutletById: jest.fn(),
    updateOutlet: jest.fn(),
    deactivateOutlet: jest.fn(),
    createMenuItem: jest.fn(),
    listMenuItems: jest.fn(),
    getMenuItemById: jest.fn(),
    updateMenuItem: jest.fn(),
    deactivateMenuItem: jest.fn(),
    markMenuItemOutOfStock: jest.fn(),
    markMenuItemActive: jest.fn(),
    createOrder: jest.fn(),
    listOrders: jest.fn(),
    getOrderById: jest.fn(),
    updateOrder: jest.fn(),
    addOrderItem: jest.fn(),
    updateOrderItem: jest.fn(),
    voidOrderItem: jest.fn(),
    recordOrderPayment: jest.fn(),
    chargeOrderToRoom: jest.fn(),
    generateOrderReceipt: jest.fn(),
    closeOrder: jest.fn(),
    cancelOrder: jest.fn(),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://postgres:postgres@localhost:5432/port_102?schema=public';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const httpRequest = context
            .switchToHttp()
            .getRequest<RequestWithTestUser>();
          const token = httpRequest.headers.authorization?.replace(
            /^Bearer\s+/i,
            '',
          );

          if (!token || !usersByToken.has(token)) {
            throw new UnauthorizedException('Authentication required.');
          }

          httpRequest.user = usersByToken.get(token);
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const required = requiredPermissions(context);
          const httpRequest = context
            .switchToHttp()
            .getRequest<RequestWithTestUser>();
          const userPermissions = httpRequest.user?.permissions ?? [];

          if (
            required.every((permission) => userPermissions.includes(permission))
          ) {
            return true;
          }

          throw new ForbiddenException('Missing required permission.');
        },
      })
      .overrideProvider(RestaurantService)
      .useValue(restaurantService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    restaurantService.getDashboard.mockResolvedValue({
      openOrders: 1,
      grossSales: '900',
    });
    restaurantService.getSalesSummary.mockResolvedValue({
      totalOrders: 1,
      grossSales: '900',
    });
    restaurantService.getOutletSalesSummary.mockResolvedValue({
      outlet,
      totalOrders: 1,
      grossSales: '900',
    });
    restaurantService.searchInHouseGuests.mockResolvedValue({
      items: [
        {
          id: 42,
          stayNumber: 'STAY-42',
          guest: { firstName: 'Sara', lastName: 'Bekele' },
          roomAssignment: { roomId: 11, room: { roomNumber: '101' } },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    restaurantService.createOutlet.mockResolvedValue(outlet);
    restaurantService.listOutlets.mockResolvedValue({
      items: [outlet],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    restaurantService.getOutletById.mockResolvedValue(outlet);
    restaurantService.updateOutlet.mockResolvedValue(outlet);
    restaurantService.deactivateOutlet.mockResolvedValue({
      ...outlet,
      isActive: false,
    });
    restaurantService.createMenuItem.mockResolvedValue(menuItem);
    restaurantService.listMenuItems.mockResolvedValue({
      items: [menuItem],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    restaurantService.getMenuItemById.mockResolvedValue(menuItem);
    restaurantService.updateMenuItem.mockResolvedValue(menuItem);
    restaurantService.deactivateMenuItem.mockResolvedValue({
      ...menuItem,
      status: MenuItemStatus.INACTIVE,
    });
    restaurantService.markMenuItemOutOfStock.mockResolvedValue({
      ...menuItem,
      status: MenuItemStatus.OUT_OF_STOCK,
    });
    restaurantService.markMenuItemActive.mockResolvedValue(menuItem);
    restaurantService.createOrder.mockResolvedValue(order);
    restaurantService.listOrders.mockResolvedValue({
      items: [order],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    restaurantService.getOrderById.mockResolvedValue(order);
    restaurantService.updateOrder.mockResolvedValue(order);
    restaurantService.addOrderItem.mockResolvedValue(order);
    restaurantService.updateOrderItem.mockResolvedValue(order);
    restaurantService.voidOrderItem.mockResolvedValue(order);
    restaurantService.recordOrderPayment.mockResolvedValue({
      payment: { id: 15, method: PosPaymentMethod.CASH, amount: '900' },
      order: {
        ...order,
        paymentStatus: PosOrderPaymentStatus.PAID,
        paidAmount: '900',
        balanceAmount: '0',
      },
    });
    restaurantService.chargeOrderToRoom.mockResolvedValue({
      order: {
        ...order,
        status: PosOrderStatus.CLOSED,
        paymentStatus: PosOrderPaymentStatus.CHARGED_TO_ROOM,
        balanceAmount: '0',
      },
      folioCharge: { id: 18, totalAmount: '900' },
    });
    restaurantService.generateOrderReceipt.mockResolvedValue({
      receiptNumber: `POS-RCT-${order.orderNumber}`,
      order,
      totals: { totalAmount: '900', balanceAmount: '0' },
    });
    restaurantService.closeOrder.mockResolvedValue({
      ...order,
      status: PosOrderStatus.CLOSED,
      balanceAmount: '0',
    });
    restaurantService.cancelOrder.mockResolvedValue({
      ...order,
      status: PosOrderStatus.CANCELLED,
      cancelledReason: 'Guest cancelled.',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated restaurant requests', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/orders')
      .expect(401);
  });

  it('rejects restaurant users without the required permission', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders')
      .set('Authorization', 'Bearer limited-token')
      .send({ outletId: 4 })
      .expect(403);
  });

  it('returns the restaurant dashboard', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/restaurant/dashboard')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(response.body).toMatchObject({
      data: { openOrders: 1, grossSales: '900' },
    });
  });

  it('rejects dashboard access without the dashboard permission', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/dashboard')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);
  });

  it('transforms restaurant dashboard query parameters', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/restaurant/dashboard?outletId=4&createdFrom=2026-06-01T00:00:00.000Z',
      )
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.getDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({
        outletId: 4,
        createdFrom: '2026-06-01T00:00:00.000Z',
      }),
    );
  });

  it('propagates dashboard range errors from the service', async () => {
    restaurantService.getDashboard.mockRejectedValueOnce(
      new BadRequestException(
        'Report start date cannot be after the end date.',
      ),
    );

    await request(app.getHttpServer())
      .get(
        '/api/restaurant/dashboard?createdFrom=2026-06-30T00:00:00.000Z&createdTo=2026-06-01T00:00:00.000Z',
      )
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('returns restaurant sales summaries', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/sales-summary')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/restaurant/outlets/4/sales-summary')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.getOutletSalesSummary).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      4,
      expect.any(Object),
    );
  });

  it('transforms restaurant sales date filters', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/restaurant/sales-summary?createdFrom=2026-06-01T00:00:00.000Z&createdTo=2026-06-30T23:59:59.999Z',
      )
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.getSalesSummary).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({
        createdFrom: '2026-06-01T00:00:00.000Z',
        createdTo: '2026-06-30T23:59:59.999Z',
      }),
    );
  });

  it('keeps outlet sales summary routing ahead of outlet detail handling', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/outlets/4/sales-summary')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.getOutletSalesSummary).toHaveBeenCalled();
    expect(restaurantService.getOutletById).not.toHaveBeenCalled();
  });

  it('rejects invalid restaurant dashboard dates', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/dashboard?createdFrom=invalid')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('rejects invalid restaurant dashboard outlet IDs', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/dashboard?outletId=0')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('searches in-house guests before room charging', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/restaurant/in-house-guests/search?search=101&page=1&limit=10')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(response.body.data.items[0].stayNumber).toBe('STAY-42');
    expect(restaurantService.searchInHouseGuests).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({ search: '101', page: 1, limit: 10 }),
    );
  });

  it('applies default pagination to in-house guest searches', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/in-house-guests/search')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.searchInHouseGuests).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('rejects in-house guest search without permission', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/in-house-guests/search')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);
  });

  it('rejects oversized in-house guest search limits', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/in-house-guests/search?limit=101')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('supports outlet CRUD operations', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/outlets')
      .set('Authorization', 'Bearer cashier-token')
      .send({ name: 'Main Restaurant', code: 'MAIN', type: 'RESTAURANT' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/restaurant/outlets')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/restaurant/outlets/4')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/restaurant/outlets/4')
      .set('Authorization', 'Bearer cashier-token')
      .send({ name: 'Updated Restaurant' })
      .expect(200);
    await request(app.getHttpServer())
      .delete('/api/restaurant/outlets/4')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
  });

  it('transforms restaurant outlet list filters', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/outlets?page=2&limit=10&type=CAFE&isActive=false')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.listOutlets).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({
        page: 2,
        limit: 10,
        type: OutletType.CAFE,
        isActive: false,
      }),
    );
  });

  it('rejects outlet creation without menu create permission', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/outlets')
      .set('Authorization', 'Bearer limited-token')
      .send({ name: 'Cafe', code: 'CAFE', type: OutletType.CAFE })
      .expect(403);
  });

  it('returns outlet uniqueness conflicts from the service', async () => {
    restaurantService.createOutlet.mockRejectedValueOnce(
      new ConflictException('Outlet code already exists.'),
    );

    await request(app.getHttpServer())
      .post('/api/restaurant/outlets')
      .set('Authorization', 'Bearer cashier-token')
      .send({ name: 'Duplicate', code: 'MAIN', type: OutletType.CAFE })
      .expect(409);
  });

  it('rejects unknown restaurant outlet types', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/outlets')
      .set('Authorization', 'Bearer cashier-token')
      .send({ name: 'Unknown', code: 'UNKNOWN', type: 'KIOSK' })
      .expect(400);
  });

  it('rejects empty restaurant outlet names', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/outlets')
      .set('Authorization', 'Bearer cashier-token')
      .send({ name: '', code: 'EMPTY', type: OutletType.CAFE })
      .expect(400);
  });

  it('rejects restaurant outlet list limits above 100', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/outlets?limit=101')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('rejects non-whitelisted restaurant outlet fields', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/outlets')
      .set('Authorization', 'Bearer cashier-token')
      .send({
        name: 'Cafe',
        code: 'CAFE',
        type: OutletType.CAFE,
        hotelId: 99,
      })
      .expect(400);
  });

  it('rejects malformed restaurant outlet path IDs', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/outlets/not-a-number')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('rejects outlet deactivation without menu delete permission', async () => {
    await request(app.getHttpServer())
      .delete('/api/restaurant/outlets/4')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);
  });

  it('supports menu item management operations', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/menu-items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ outletId: 4, name: 'Special Tibs', code: 'TIBS-01', price: 450 })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/restaurant/menu-items?outletId=4')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/restaurant/menu-items/7/mark-out-of-stock')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/restaurant/menu-items/7/mark-active')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
  });

  it('rejects menu item creation without permission', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/menu-items')
      .set('Authorization', 'Bearer limited-token')
      .send({ outletId: 4, name: 'Tea', code: 'TEA', price: 50 })
      .expect(403);
  });

  it('returns menu item uniqueness conflicts from the service', async () => {
    restaurantService.createMenuItem.mockRejectedValueOnce(
      new ConflictException('Menu item code already exists for this outlet.'),
    );

    await request(app.getHttpServer())
      .post('/api/restaurant/menu-items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ outletId: 4, name: 'Duplicate', code: 'TIBS-01', price: 450 })
      .expect(409);
  });

  it('returns and updates a menu item by ID', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/menu-items/7')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/restaurant/menu-items/7')
      .set('Authorization', 'Bearer cashier-token')
      .send({ price: 475 })
      .expect(200);

    expect(restaurantService.updateMenuItem).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      7,
      expect.objectContaining({ price: 475 }),
    );
  });

  it('transforms restaurant menu list filters', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/restaurant/menu-items?page=2&limit=10&outletId=4&status=ACTIVE&category=Main',
      )
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.listMenuItems).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({
        page: 2,
        limit: 10,
        outletId: 4,
        status: MenuItemStatus.ACTIVE,
        category: 'Main',
      }),
    );
  });

  it('rejects menu item updates without permission', async () => {
    await request(app.getHttpServer())
      .patch('/api/restaurant/menu-items/7')
      .set('Authorization', 'Bearer limited-token')
      .send({ price: 500 })
      .expect(403);
  });

  it('deactivates a restaurant menu item', async () => {
    const response = await request(app.getHttpServer())
      .delete('/api/restaurant/menu-items/7')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(response.body.data.status).toBe(MenuItemStatus.INACTIVE);
  });

  it('rejects non-positive restaurant menu prices', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/menu-items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ outletId: 4, name: 'Invalid', code: 'INVALID', price: 0 })
      .expect(400);
  });

  it('rejects invalid restaurant menu outlet IDs', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/menu-items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ outletId: 0, name: 'Tea', code: 'TEA', price: 50 })
      .expect(400);
  });

  it('rejects unknown restaurant menu statuses', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/menu-items?status=DISCONTINUED')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('rejects non-whitelisted restaurant menu fields', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/menu-items')
      .set('Authorization', 'Bearer cashier-token')
      .send({
        outletId: 4,
        name: 'Tea',
        code: 'TEA',
        price: 50,
        costPrice: 10,
      })
      .expect(400);
  });

  it('rejects malformed restaurant menu item path IDs', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/menu-items/not-a-number')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('creates and lists POS orders', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders')
      .set('Authorization', 'Bearer cashier-token')
      .send({
        outletId: 4,
        source: PosOrderSource.TABLE_SERVICE,
        tableNumber: 'T-12',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/restaurant/orders?page=1&limit=10')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({ outletId: 4, tableNumber: 'T-12' }),
    );
  });

  it('transforms POS order list filters', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/restaurant/orders?page=2&limit=10&outletId=4&status=OPEN&paymentStatus=UNPAID&source=TABLE_SERVICE',
      )
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);

    expect(restaurantService.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      expect.objectContaining({
        page: 2,
        limit: 10,
        outletId: 4,
        status: PosOrderStatus.OPEN,
        paymentStatus: PosOrderPaymentStatus.UNPAID,
        source: PosOrderSource.TABLE_SERVICE,
      }),
    );
  });

  it('rejects unknown POS order sources', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders')
      .set('Authorization', 'Bearer cashier-token')
      .send({ outletId: 4, source: 'PHONE_APP' })
      .expect(400);
  });

  it('rejects unknown POS order status filters', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/orders?status=ARCHIVED')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('rejects POS order list limits above 100', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/orders?limit=101')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('rejects non-whitelisted POS order fields', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders')
      .set('Authorization', 'Bearer cashier-token')
      .send({ outletId: 4, hotelId: 99 })
      .expect(400);
  });

  it('rejects malformed POS order path IDs', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/orders/not-a-number')
      .set('Authorization', 'Bearer cashier-token')
      .expect(400);
  });

  it('returns and updates a POS order by ID', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/orders/9')
      .set('Authorization', 'Bearer cashier-token')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9')
      .set('Authorization', 'Bearer cashier-token')
      .send({ tableNumber: 'T-14' })
      .expect(200);

    expect(restaurantService.updateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
      expect.objectContaining({ tableNumber: 'T-14' }),
    );
  });

  it('rejects POS order updates without permission', async () => {
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9')
      .set('Authorization', 'Bearer limited-token')
      .send({ tableNumber: 'T-15' })
      .expect(403);
  });

  it('returns invalid POS order transition conflicts', async () => {
    restaurantService.updateOrder.mockRejectedValueOnce(
      new ConflictException('Only open POS orders can be updated.'),
    );

    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9')
      .set('Authorization', 'Bearer cashier-token')
      .send({ tableNumber: 'T-15' })
      .expect(409);
  });

  it('adds, updates, and voids POS order items', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ menuItemId: 7, quantity: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9/items/12')
      .set('Authorization', 'Bearer cashier-token')
      .send({ quantity: 3 })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9/items/12/void')
      .set('Authorization', 'Bearer cashier-token')
      .send({ reason: 'Guest cancelled this item.' })
      .expect(200);
  });

  it('delegates POS item changes with parsed route IDs', async () => {
    expect(restaurantService.addOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
      expect.objectContaining({ menuItemId: 7, quantity: 2 }),
    );
    expect(restaurantService.updateOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
      12,
      expect.objectContaining({ quantity: 3 }),
    );
    expect(restaurantService.voidOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
      12,
      expect.objectContaining({ reason: 'Guest cancelled this item.' }),
    );
  });

  it('rejects POS item additions without update permission', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/items')
      .set('Authorization', 'Bearer limited-token')
      .send({ menuItemId: 7, quantity: 1 })
      .expect(403);
  });

  it('returns unavailable menu item conflicts from the service', async () => {
    restaurantService.addOrderItem.mockRejectedValueOnce(
      new ConflictException('Only active menu items can be added to an order.'),
    );

    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ menuItemId: 7, quantity: 1 })
      .expect(409);
  });

  it('rejects invalid POS item quantities', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ menuItemId: 7, quantity: 0 })
      .expect(400);
  });

  it('rejects invalid POS menu item identifiers', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/items')
      .set('Authorization', 'Bearer cashier-token')
      .send({ menuItemId: 0, quantity: 1 })
      .expect(400);
  });

  it('requires a POS item void reason', async () => {
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9/items/12/void')
      .set('Authorization', 'Bearer cashier-token')
      .send({ reason: '' })
      .expect(400);
  });

  it('records a direct POS payment', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/payments')
      .set('Authorization', 'Bearer cashier-token')
      .send({ amount: 900, method: PosPaymentMethod.CASH })
      .expect(201);

    expect(response.body.data.order.paymentStatus).toBe(
      PosOrderPaymentStatus.PAID,
    );
  });

  it('delegates direct POS payment details', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/payments')
      .set('Authorization', 'Bearer cashier-token')
      .send({
        amount: 450,
        method: PosPaymentMethod.CARD,
        reference: 'CARD-123',
      })
      .expect(201);

    expect(restaurantService.recordOrderPayment).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
      expect.objectContaining({
        amount: 450,
        method: PosPaymentMethod.CARD,
        reference: 'CARD-123',
      }),
    );
  });

  it('rejects direct POS payment recording without permission', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/payments')
      .set('Authorization', 'Bearer limited-token')
      .send({ amount: 900, method: PosPaymentMethod.CASH })
      .expect(403);
  });

  it('returns POS overpayment errors from the service', async () => {
    restaurantService.recordOrderPayment.mockRejectedValueOnce(
      new BadRequestException(
        'Payment amount cannot exceed the POS order balance.',
      ),
    );

    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/payments')
      .set('Authorization', 'Bearer cashier-token')
      .send({ amount: 901, method: PosPaymentMethod.CASH })
      .expect(400);
  });

  it('rejects non-positive direct POS payments', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/payments')
      .set('Authorization', 'Bearer cashier-token')
      .send({ amount: 0, method: PosPaymentMethod.CASH })
      .expect(400);
  });

  it('rejects unknown direct POS payment methods', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/payments')
      .set('Authorization', 'Bearer cashier-token')
      .send({ amount: 100, method: 'CHEQUE' })
      .expect(400);
  });

  it('charges an order to an active room folio', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/charge-to-room')
      .set('Authorization', 'Bearer cashier-token')
      .send({ stayId: 42, closeOrder: true })
      .expect(201);

    expect(response.body.data.folioCharge.totalAmount).toBe('900');
  });

  it('delegates room charges that keep the order open', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/charge-to-room')
      .set('Authorization', 'Bearer cashier-token')
      .send({ stayId: 42, closeOrder: false })
      .expect(201);

    expect(restaurantService.chargeOrderToRoom).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
      { stayId: 42, closeOrder: false },
    );
  });

  it('rejects room charging without charge-to-room permission', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/charge-to-room')
      .set('Authorization', 'Bearer limited-token')
      .send({ stayId: 42 })
      .expect(403);
  });

  it('rejects invalid room-charge stay identifiers', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/charge-to-room')
      .set('Authorization', 'Bearer cashier-token')
      .send({ stayId: 0 })
      .expect(400);
  });

  it('returns a conflict when an order is charged to room twice', async () => {
    restaurantService.chargeOrderToRoom.mockRejectedValueOnce(
      new ConflictException('POS order has already been charged to a folio.'),
    );

    const response = await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/charge-to-room')
      .set('Authorization', 'Bearer cashier-token')
      .send({ stayId: 42 })
      .expect(409);

    expect(response.body.message).toBe(
      'POS order has already been charged to a folio.',
    );
  });

  it('returns inactive stay room-charge conflicts', async () => {
    restaurantService.chargeOrderToRoom.mockRejectedValueOnce(
      new ConflictException('Only active stays can receive POS room charges.'),
    );

    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/charge-to-room')
      .set('Authorization', 'Bearer cashier-token')
      .send({ stayId: 42 })
      .expect(409);
  });

  it('generates a settled POS order receipt', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/receipt')
      .set('Authorization', 'Bearer cashier-token')
      .expect(201);

    expect(response.body.data.receiptNumber).toBe(
      `POS-RCT-${order.orderNumber}`,
    );
  });

  it('delegates POS receipt generation with a parsed order ID', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/receipt')
      .set('Authorization', 'Bearer cashier-token')
      .expect(201);

    expect(restaurantService.generateOrderReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
    );
  });

  it('rejects POS receipt generation without permission', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/receipt')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);
  });

  it('returns unsettled POS receipt conflicts from the service', async () => {
    restaurantService.generateOrderReceipt.mockRejectedValueOnce(
      new ConflictException(
        'POS order must be fully settled before generating a receipt.',
      ),
    );

    await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/receipt')
      .set('Authorization', 'Bearer cashier-token')
      .expect(409);
  });

  it('closes and cancels POS orders', async () => {
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9/close')
      .set('Authorization', 'Bearer cashier-token')
      .send({ notes: 'Payment verified.' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/10/cancel')
      .set('Authorization', 'Bearer cashier-token')
      .send({ reason: 'Guest cancelled.' })
      .expect(200);
  });

  it('delegates POS lifecycle payloads with parsed order IDs', async () => {
    expect(restaurantService.closeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      9,
      { notes: 'Payment verified.' },
    );
    expect(restaurantService.cancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ sub: cashierUser.sub }),
      10,
      { reason: 'Guest cancelled.' },
    );
  });

  it('rejects oversized POS close notes', async () => {
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9/close')
      .set('Authorization', 'Bearer cashier-token')
      .send({ notes: 'N'.repeat(501) })
      .expect(400);
  });

  it('returns unpaid POS order close conflicts', async () => {
    restaurantService.closeOrder.mockRejectedValueOnce(
      new ConflictException(
        'POS order must have no unpaid balance before closing.',
      ),
    );

    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/9/close')
      .set('Authorization', 'Bearer cashier-token')
      .send({})
      .expect(409);
  });

  it('rejects sales summary access without permission', async () => {
    await request(app.getHttpServer())
      .get('/api/restaurant/sales-summary')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);
  });

  it('rejects invalid order and cancellation payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/restaurant/orders')
      .set('Authorization', 'Bearer cashier-token')
      .send({ outletId: 0 })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/10/cancel')
      .set('Authorization', 'Bearer cashier-token')
      .send({ reason: '' })
      .expect(400);
  });

  it('returns closed POS order cancellation conflicts', async () => {
    restaurantService.cancelOrder.mockRejectedValueOnce(
      new ConflictException('Only open POS orders can be modified.'),
    );

    await request(app.getHttpServer())
      .patch('/api/restaurant/orders/10/cancel')
      .set('Authorization', 'Bearer cashier-token')
      .send({ reason: 'Too late.' })
      .expect(409);
  });

  it('returns missing outlet report errors from the service', async () => {
    restaurantService.getOutletSalesSummary.mockRejectedValueOnce(
      new NotFoundException('Outlet was not found.'),
    );

    await request(app.getHttpServer())
      .get('/api/restaurant/outlets/404/sales-summary')
      .set('Authorization', 'Bearer cashier-token')
      .expect(404);
  });
});
