import {
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
  GoodsReceivedStatus,
  InventoryItemStatus,
  InventoryItemType,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  StockAdjustmentStatus,
  StockMovementType,
  SupplierStatus,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { ProcurementService } from '../src/modules/procurement/procurement.service';

type TestUser = CurrentUserPayload & {
  permissions: string[];
};

type RequestWithTestUser = {
  headers: { authorization?: string };
  user?: TestUser;
};

const storeManagerUser: TestUser = {
  sub: 51,
  email: 'store.manager@demo-hotel.com',
  roleKey: 'STORE_MANAGER',
  roleId: 15,
  departmentId: 8,
  tokenVersion: 0,
  permissions: [
    'inventory.items.create',
    'inventory.items.read',
    'inventory.items.update',
    'inventory.items.delete',
    'inventory.stock.receive',
    'inventory.stock.issue',
    'inventory.stock.transfer',
    'inventory.stock.adjust.request',
    'inventory.stock.adjust.approve',
    'inventory.reorder_alerts.read',
    'inventory.movements.read',
    'reports.inventory.read',
    'suppliers.create',
    'suppliers.read',
    'suppliers.update',
    'suppliers.delete',
    'purchase_requests.create',
    'purchase_requests.read',
    'purchase_requests.update',
    'purchase_requests.approve',
    'purchase_requests.reject',
    'purchase_orders.create',
    'purchase_orders.read',
    'purchase_orders.update',
    'purchase_orders.approve',
    'purchase_orders.cancel',
    'goods_received.create',
    'goods_received.read',
    'reports.procurement.read',
  ],
};

const limitedUser: TestUser = {
  ...storeManagerUser,
  sub: 52,
  email: 'limited.inventory@demo-hotel.com',
  permissions: ['inventory.items.read'],
};

const usersByToken = new Map<string, TestUser>([
  ['store-token', storeManagerUser],
  ['limited-token', limitedUser],
]);

const location = {
  id: 4,
  code: 'MAIN',
  name: 'Main Store',
  description: 'Primary inventory store',
  isActive: true,
};

const item = {
  id: 7,
  itemNumber: 'INV-COFFEE',
  name: 'Coffee Beans',
  type: InventoryItemType.FOOD,
  category: 'Beverage',
  unitOfMeasure: 'kg',
  reorderLevel: '5.00',
  reorderQuantity: '20.00',
  averageCost: '12.50',
  status: InventoryItemStatus.ACTIVE,
  description: null,
};

const supplier = {
  id: 3,
  supplierNumber: 'SUP-COFFEE',
  name: 'Addis Coffee Supply',
  status: SupplierStatus.ACTIVE,
};

const purchaseRequest = {
  id: 8,
  requestNumber: 'PR-20260619-000001',
  status: PurchaseRequestStatus.DRAFT,
  items: [{ itemId: item.id, quantity: '4.00' }],
};

const purchaseOrder = {
  id: 9,
  orderNumber: 'PO-20260619-000001',
  supplierId: supplier.id,
  purchaseRequestId: purchaseRequest.id,
  status: PurchaseOrderStatus.DRAFT,
  items: [{ itemId: item.id, quantity: '4.00', receivedQuantity: '0.00' }],
};

const goodsReceived = {
  id: 10,
  grnNumber: 'GRN-20260619-000001',
  purchaseOrderId: purchaseOrder.id,
  supplierId: supplier.id,
  locationId: location.id,
  status: GoodsReceivedStatus.DRAFT,
  items: [{ itemId: item.id, quantity: '4.00', unitCost: '12.50' }],
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

describe('Inventory and Procurement API (e2e)', () => {
  let app: INestApplication;

  const inventoryService = {
    getInventoryDashboard: jest.fn(),
    listReorderAlerts: jest.fn(),
    listStockBalances: jest.fn(),
    getStockBalancesByItem: jest.fn(),
    listStockMovements: jest.fn(),
    receiveStock: jest.fn(),
    issueStock: jest.fn(),
    transferStock: jest.fn(),
    createStockAdjustment: jest.fn(),
    listStockAdjustments: jest.fn(),
    getStockAdjustmentById: jest.fn(),
    approveStockAdjustment: jest.fn(),
    rejectStockAdjustment: jest.fn(),
    cancelStockAdjustment: jest.fn(),
    createItem: jest.fn(),
    listItems: jest.fn(),
    getItemById: jest.fn(),
    updateItem: jest.fn(),
    deactivateItem: jest.fn(),
    createLocation: jest.fn(),
    listLocations: jest.fn(),
    getLocationById: jest.fn(),
    updateLocation: jest.fn(),
    deactivateLocation: jest.fn(),
  };

  const procurementService = {
    getProcurementDashboard: jest.fn(),
    createPurchaseRequest: jest.fn(),
    listPurchaseRequests: jest.fn(),
    getPurchaseRequestById: jest.fn(),
    updatePurchaseRequest: jest.fn(),
    submitPurchaseRequest: jest.fn(),
    approvePurchaseRequest: jest.fn(),
    rejectPurchaseRequest: jest.fn(),
    cancelPurchaseRequest: jest.fn(),
    createPurchaseOrderFromRequest: jest.fn(),
    createPurchaseOrder: jest.fn(),
    listPurchaseOrders: jest.fn(),
    getPurchaseOrderById: jest.fn(),
    updatePurchaseOrder: jest.fn(),
    approvePurchaseOrder: jest.fn(),
    markPurchaseOrderOrdered: jest.fn(),
    cancelPurchaseOrder: jest.fn(),
    createGoodsReceived: jest.fn(),
    listGoodsReceived: jest.fn(),
    getGoodsReceivedById: jest.fn(),
    postGoodsReceived: jest.fn(),
    cancelGoodsReceived: jest.fn(),
    createSupplier: jest.fn(),
    listSuppliers: jest.fn(),
    getSupplierById: jest.fn(),
    updateSupplier: jest.fn(),
    deactivateSupplier: jest.fn(),
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
      .overrideProvider(InventoryService)
      .useValue(inventoryService)
      .overrideProvider(ProcurementService)
      .useValue(procurementService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    inventoryService.getInventoryDashboard.mockResolvedValue({
      totalActiveItems: 1,
      lowStockItems: 1,
      totalStockValue: '50.00',
      recentMovements: [],
      stockByItemType: {},
    });
    inventoryService.listReorderAlerts.mockResolvedValue({
      items: [
        {
          item,
          currentQuantity: '4.00',
          reorderLevel: '5.00',
          reorderQuantity: '20.00',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    inventoryService.listStockBalances.mockResolvedValue({
      items: [{ item, location, quantity: '4.00' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    inventoryService.getStockBalancesByItem.mockResolvedValue({
      items: [{ item, location, quantity: '4.00' }],
    });
    inventoryService.listStockMovements.mockResolvedValue({
      items: [
        {
          id: 20,
          itemId: item.id,
          locationId: location.id,
          type: StockMovementType.RECEIPT,
          quantity: '4.00',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    inventoryService.receiveStock.mockResolvedValue({
      movement: { id: 20, type: StockMovementType.RECEIPT },
      balance: { item, location, quantity: '4.00' },
    });
    inventoryService.issueStock.mockResolvedValue({
      movement: { id: 21, type: StockMovementType.ISSUE },
      balance: { item, location, quantity: '3.00' },
    });
    inventoryService.transferStock.mockResolvedValue({
      transferOutMovement: { id: 22, type: StockMovementType.TRANSFER_OUT },
      transferInMovement: { id: 23, type: StockMovementType.TRANSFER_IN },
    });
    inventoryService.createStockAdjustment.mockResolvedValue({
      id: 30,
      status: StockAdjustmentStatus.PENDING,
    });
    inventoryService.approveStockAdjustment.mockResolvedValue({
      adjustment: { id: 30, status: StockAdjustmentStatus.APPROVED },
    });
    inventoryService.listStockAdjustments.mockResolvedValue({ items: [] });
    inventoryService.getStockAdjustmentById.mockResolvedValue({ id: 30 });
    inventoryService.rejectStockAdjustment.mockResolvedValue({
      id: 30,
      status: StockAdjustmentStatus.REJECTED,
    });
    inventoryService.cancelStockAdjustment.mockResolvedValue({
      id: 30,
      status: StockAdjustmentStatus.CANCELLED,
    });
    inventoryService.createItem.mockResolvedValue(item);
    inventoryService.listItems.mockResolvedValue({
      items: [item],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    inventoryService.getItemById.mockResolvedValue(item);
    inventoryService.updateItem.mockResolvedValue({ ...item, name: 'Coffee' });
    inventoryService.deactivateItem.mockResolvedValue({
      ...item,
      status: InventoryItemStatus.INACTIVE,
    });
    inventoryService.createLocation.mockResolvedValue(location);
    inventoryService.listLocations.mockResolvedValue({
      items: [location],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    inventoryService.getLocationById.mockResolvedValue(location);
    inventoryService.updateLocation.mockResolvedValue({
      ...location,
      name: 'Updated Store',
    });
    inventoryService.deactivateLocation.mockResolvedValue({
      ...location,
      isActive: false,
    });
    procurementService.getProcurementDashboard.mockResolvedValue({
      pendingPurchaseRequests: 1,
      approvedPurchaseRequests: 1,
      openPurchaseOrders: 1,
      partiallyReceivedOrders: 0,
      receivedOrders: 0,
      activeSuppliers: 1,
      draftGoodsReceived: 1,
    });
    procurementService.createSupplier.mockResolvedValue(supplier);
    procurementService.listSuppliers.mockResolvedValue({
      items: [supplier],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    procurementService.getSupplierById.mockResolvedValue(supplier);
    procurementService.updateSupplier.mockResolvedValue({
      ...supplier,
      name: 'Updated Supplier',
    });
    procurementService.deactivateSupplier.mockResolvedValue({
      ...supplier,
      status: SupplierStatus.INACTIVE,
    });
    procurementService.createPurchaseRequest.mockResolvedValue(purchaseRequest);
    procurementService.listPurchaseRequests.mockResolvedValue({
      items: [purchaseRequest],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    procurementService.getPurchaseRequestById.mockResolvedValue(
      purchaseRequest,
    );
    procurementService.updatePurchaseRequest.mockResolvedValue(purchaseRequest);
    procurementService.submitPurchaseRequest.mockResolvedValue({
      ...purchaseRequest,
      status: PurchaseRequestStatus.SUBMITTED,
    });
    procurementService.approvePurchaseRequest.mockResolvedValue({
      ...purchaseRequest,
      status: PurchaseRequestStatus.APPROVED,
    });
    procurementService.rejectPurchaseRequest.mockResolvedValue({
      ...purchaseRequest,
      status: PurchaseRequestStatus.REJECTED,
    });
    procurementService.cancelPurchaseRequest.mockResolvedValue({
      ...purchaseRequest,
      status: PurchaseRequestStatus.CANCELLED,
    });
    procurementService.createPurchaseOrder.mockResolvedValue(purchaseOrder);
    procurementService.createPurchaseOrderFromRequest.mockResolvedValue(
      purchaseOrder,
    );
    procurementService.listPurchaseOrders.mockResolvedValue({
      items: [purchaseOrder],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    procurementService.getPurchaseOrderById.mockResolvedValue(purchaseOrder);
    procurementService.updatePurchaseOrder.mockResolvedValue(purchaseOrder);
    procurementService.approvePurchaseOrder.mockResolvedValue({
      ...purchaseOrder,
      status: PurchaseOrderStatus.APPROVED,
    });
    procurementService.markPurchaseOrderOrdered.mockResolvedValue({
      ...purchaseOrder,
      status: PurchaseOrderStatus.ORDERED,
    });
    procurementService.cancelPurchaseOrder.mockResolvedValue({
      ...purchaseOrder,
      status: PurchaseOrderStatus.CANCELLED,
    });
    procurementService.createGoodsReceived.mockResolvedValue(goodsReceived);
    procurementService.listGoodsReceived.mockResolvedValue({
      items: [goodsReceived],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    procurementService.getGoodsReceivedById.mockResolvedValue(goodsReceived);
    procurementService.postGoodsReceived.mockResolvedValue({
      ...goodsReceived,
      status: GoodsReceivedStatus.POSTED,
    });
    procurementService.cancelGoodsReceived.mockResolvedValue({
      ...goodsReceived,
      status: GoodsReceivedStatus.CANCELLED,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated inventory requests', async () => {
    await request(app.getHttpServer()).get('/api/inventory/items').expect(401);
  });

  it('rejects inventory users without stock receive permission', async () => {
    await request(app.getHttpServer())
      .post('/api/inventory/receive')
      .set('Authorization', 'Bearer limited-token')
      .send({ itemId: item.id, locationId: location.id, quantity: 1 })
      .expect(403);
  });

  it('creates an inventory location', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/inventory/locations')
      .set('Authorization', 'Bearer store-token')
      .send({ code: 'MAIN', name: 'Main Store' })
      .expect(201);

    expect(response.body).toMatchObject({ data: { id: location.id } });
    expect(inventoryService.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      { code: 'MAIN', name: 'Main Store' },
    );
  });

  it('creates an inventory item master record', async () => {
    const payload = {
      itemNumber: item.itemNumber,
      name: item.name,
      type: item.type,
      unitOfMeasure: item.unitOfMeasure,
      reorderLevel: 5,
      reorderQuantity: 20,
    };

    const response = await request(app.getHttpServer())
      .post('/api/inventory/items')
      .set('Authorization', 'Bearer store-token')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({ data: { id: item.id } });
    expect(inventoryService.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      payload,
    );
  });

  it('receives stock into an active location', async () => {
    const payload = {
      itemId: item.id,
      locationId: location.id,
      quantity: 4,
      unitCost: 12.5,
    };

    const response = await request(app.getHttpServer())
      .post('/api/inventory/receive')
      .set('Authorization', 'Bearer store-token')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      data: { movement: { type: StockMovementType.RECEIPT } },
    });
    expect(inventoryService.receiveStock).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      payload,
    );
  });

  it('issues stock from an active location', async () => {
    const payload = {
      itemId: item.id,
      locationId: location.id,
      quantity: 1,
      departmentId: 8,
      reason: 'Kitchen requisition',
    };

    const response = await request(app.getHttpServer())
      .post('/api/inventory/issue')
      .set('Authorization', 'Bearer store-token')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      data: { movement: { type: StockMovementType.ISSUE } },
    });
    expect(inventoryService.issueStock).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      payload,
    );
  });

  it('transfers stock between locations', async () => {
    const payload = {
      itemId: item.id,
      fromLocationId: location.id,
      toLocationId: 5,
      quantity: 2,
      reason: 'Move to outlet store',
    };

    const response = await request(app.getHttpServer())
      .post('/api/inventory/transfer')
      .set('Authorization', 'Bearer store-token')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      data: {
        transferOutMovement: { type: StockMovementType.TRANSFER_OUT },
        transferInMovement: { type: StockMovementType.TRANSFER_IN },
      },
    });
    expect(inventoryService.transferStock).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      payload,
    );
  });

  it('lists stock balances with pagination filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/inventory/balances?page=1&limit=10&locationId=4')
      .set('Authorization', 'Bearer store-token')
      .expect(200);

    expect(response.body).toMatchObject({
      data: { items: [{ quantity: '4.00' }] },
    });
    expect(inventoryService.listStockBalances).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      expect.objectContaining({ page: 1, limit: 10, locationId: 4 }),
    );
  });

  it('lists stock movement history', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/inventory/movements?type=RECEIPT&itemId=7')
      .set('Authorization', 'Bearer store-token')
      .expect(200);

    expect(response.body).toMatchObject({
      data: { items: [{ type: StockMovementType.RECEIPT }] },
    });
    expect(inventoryService.listStockMovements).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      expect.objectContaining({ type: StockMovementType.RECEIPT, itemId: 7 }),
    );
  });

  it('returns low-stock reorder alerts', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/inventory/reorder-alerts?locationId=4')
      .set('Authorization', 'Bearer store-token')
      .expect(200);

    expect(response.body).toMatchObject({
      data: { items: [{ currentQuantity: '4.00', reorderLevel: '5.00' }] },
    });
    expect(inventoryService.listReorderAlerts).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      expect.objectContaining({ locationId: 4 }),
    );
  });

  it('returns the inventory dashboard', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/inventory/dashboard?recentMovementsLimit=5')
      .set('Authorization', 'Bearer store-token')
      .expect(200);

    expect(response.body).toMatchObject({
      data: { totalActiveItems: 1, lowStockItems: 1 },
    });
    expect(inventoryService.getInventoryDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      expect.objectContaining({ recentMovementsLimit: 5 }),
    );
  });

  it('requests a stock adjustment', async () => {
    const payload = {
      itemId: item.id,
      locationId: location.id,
      quantity: -1,
      reason: 'Cycle count variance',
    };

    const response = await request(app.getHttpServer())
      .post('/api/inventory/adjustments')
      .set('Authorization', 'Bearer store-token')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      data: { status: StockAdjustmentStatus.PENDING },
    });
    expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      payload,
    );
  });

  it('approves a pending stock adjustment', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/inventory/adjustments/30/approve')
      .set('Authorization', 'Bearer store-token')
      .send({ decisionNote: 'Verified count sheet' })
      .expect(200);

    expect(response.body).toMatchObject({
      data: { adjustment: { status: StockAdjustmentStatus.APPROVED } },
    });
    expect(inventoryService.approveStockAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ sub: storeManagerUser.sub }),
      30,
      { decisionNote: 'Verified count sheet' },
    );
  });
});
