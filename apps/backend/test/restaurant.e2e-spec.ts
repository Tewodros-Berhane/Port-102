/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
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

  it('charges an order to an active room folio', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/charge-to-room')
      .set('Authorization', 'Bearer cashier-token')
      .send({ stayId: 42, closeOrder: true })
      .expect(201);

    expect(response.body.data.folioCharge.totalAmount).toBe('900');
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

  it('generates a settled POS order receipt', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/restaurant/orders/9/receipt')
      .set('Authorization', 'Bearer cashier-token')
      .expect(201);

    expect(response.body.data.receiptNumber).toBe(
      `POS-RCT-${order.orderNumber}`,
    );
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
});
