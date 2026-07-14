import { ConflictException } from '@nestjs/common';

import {
  GoodsReceivedStatus,
  InventoryItemType,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  StockMovementType,
  SupplierStatus,
} from '../../src/generated/prisma/client';
import type { CurrentUserPayload } from '../../src/modules/auth/types/current-user-payload.type';
import { ProcurementService } from '../../src/modules/procurement/procurement.service';
import { GoodsReceivedRepository } from '../../src/modules/procurement/repositories/goods-received.repository';
import {
  createIntegrationContext,
  type IntegrationContext,
  resetIntegrationDatabase,
} from './integration-test-context';

describe('Procurement PostgreSQL integration', () => {
  let context: IntegrationContext;
  let service: ProcurementService;
  let user: CurrentUserPayload;

  beforeAll(async () => {
    context = await createIntegrationContext();
    service = context.app.get(ProcurementService);
  });

  beforeEach(async () => {
    context.user = await resetIntegrationDatabase(context.prisma);
    user = {
      sub: context.user.id,
      email: context.user.email,
      roleKey: 'HOTEL_ADMIN',
      roleId: context.user.roleId,
      departmentId: null,
      tokenVersion: 0,
    };
  });

  afterAll(async () => context?.app.close());

  async function seedMasterData() {
    const item = await context.prisma.inventoryItem.create({
      data: {
        itemNumber: `PROC-ITEM-${Date.now()}-${Math.random()}`,
        name: 'Procurement item',
        type: InventoryItemType.CLEANING_SUPPLY,
        unitOfMeasure: 'unit',
      },
    });
    const location = await context.prisma.inventoryLocation.create({
      data: {
        code: `PROC-LOC-${Date.now()}-${Math.random()}`,
        name: 'Receiving store',
      },
    });
    const supplier = await context.prisma.supplier.create({
      data: {
        supplierNumber: `SUP-${Date.now()}-${Math.random()}`,
        name: 'Integration Supplier',
      },
    });
    return { item, location, supplier };
  }

  async function approvedOrder(quantity = 10) {
    const data = await seedMasterData();
    const request = await service.createPurchaseRequest(user, {
      reason: 'Integration purchase',
      items: [{ itemId: data.item.id, quantity, estimatedUnitCost: 5 }],
    });
    await service.submitPurchaseRequest(user, request.id, {});
    await service.approvePurchaseRequest(user, request.id, {});
    const order = await service.createPurchaseOrderFromRequest(
      user,
      request.id,
      {
        supplierId: data.supplier.id,
      },
    );
    await service.approvePurchaseOrder(user, order.id, {});
    await service.markPurchaseOrderOrdered(user, order.id, {});
    return { ...data, request, order };
  }

  it('only converts approved requests, copies items, and marks the request converted', async () => {
    const { item, supplier } = await seedMasterData();
    const request = await service.createPurchaseRequest(user, {
      items: [{ itemId: item.id, quantity: 3, estimatedUnitCost: 7 }],
    });
    await expect(
      service.createPurchaseOrderFromRequest(user, request.id, {
        supplierId: supplier.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await service.submitPurchaseRequest(user, request.id, {});
    await service.approvePurchaseRequest(user, request.id, {});
    const order = await service.createPurchaseOrderFromRequest(
      user,
      request.id,
      {
        supplierId: supplier.id,
      },
    );
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      itemId: item.id,
      quantity: '3.00',
      unitCost: '7.00',
    });
    expect(
      (
        await context.prisma.purchaseRequest.findUniqueOrThrow({
          where: { id: request.id },
        })
      ).status,
    ).toBe(PurchaseRequestStatus.CONVERTED_TO_PO);
    await expect(
      service.createPurchaseOrderFromRequest(user, request.id, {
        supplierId: supplier.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires active suppliers for purchase orders', async () => {
    const { item, supplier } = await seedMasterData();
    await context.prisma.supplier.update({
      where: { id: supplier.id },
      data: { status: SupplierStatus.INACTIVE },
    });
    await expect(
      service.createPurchaseOrder(user, {
        supplierId: supplier.id,
        items: [{ itemId: item.id, quantity: 1, unitCost: 1 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps draft GRNs stock-neutral, then posts stock and partial PO receipt atomically', async () => {
    const { item, location, supplier, order } = await approvedOrder(10);
    const grn = await service.createGoodsReceived(user, {
      purchaseOrderId: order.id,
      supplierId: supplier.id,
      locationId: location.id,
      items: [{ itemId: item.id, quantity: 4, unitCost: 6 }],
    });
    expect(grn.status).toBe(GoodsReceivedStatus.DRAFT);
    expect(
      await context.prisma.stockBalance.count({ where: { itemId: item.id } }),
    ).toBe(0);

    await service.postGoodsReceived(user, grn.id, {});
    const balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: {
        itemId_locationId: { itemId: item.id, locationId: location.id },
      },
    });
    expect(balance.quantity.toString()).toBe('4');
    expect(
      await context.prisma.stockMovement.count({
        where: {
          itemId: item.id,
          type: StockMovementType.RECEIPT,
          referenceType: 'GOODS_RECEIVED',
          referenceId: grn.id,
        },
      }),
    ).toBe(1);
    const storedOrder = await context.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(storedOrder.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
    expect(storedOrder.items[0].receivedQuantity.toString()).toBe('4');
  });

  it('marks the purchase order received after cumulative full receipt', async () => {
    const { item, location, supplier, order } = await approvedOrder(10);
    for (const quantity of [4, 6]) {
      const grn = await service.createGoodsReceived(user, {
        purchaseOrderId: order.id,
        supplierId: supplier.id,
        locationId: location.id,
        items: [{ itemId: item.id, quantity, unitCost: 5 }],
      });
      await service.postGoodsReceived(user, grn.id, {});
    }
    const storedOrder = await context.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(storedOrder.status).toBe(PurchaseOrderStatus.RECEIVED);
    expect(storedOrder.items[0].receivedQuantity.toString()).toBe('10');
  });

  it('does not post a GRN twice or post a cancelled GRN', async () => {
    const { item, location, supplier, order } = await approvedOrder(5);
    const posted = await service.createGoodsReceived(user, {
      purchaseOrderId: order.id,
      supplierId: supplier.id,
      locationId: location.id,
      items: [{ itemId: item.id, quantity: 2, unitCost: 5 }],
    });
    await service.postGoodsReceived(user, posted.id, {});
    await expect(
      service.postGoodsReceived(user, posted.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    const cancelled = await service.createGoodsReceived(user, {
      purchaseOrderId: order.id,
      supplierId: supplier.id,
      locationId: location.id,
      items: [{ itemId: item.id, quantity: 1, unitCost: 5 }],
    });
    await service.cancelGoodsReceived(user, cancelled.id, {
      reason: 'Not delivered',
    });
    await expect(
      service.postGoodsReceived(user, cancelled.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back all GRN changes when a movement insert fails', async () => {
    const { item, location, supplier, order } = await approvedOrder(5);
    const grn = await service.createGoodsReceived(user, {
      purchaseOrderId: order.id,
      supplierId: supplier.id,
      locationId: location.id,
      items: [{ itemId: item.id, quantity: 2, unitCost: 5 }],
    });
    const repository = context.app.get(GoodsReceivedRepository);
    await context.prisma.stockMovement.create({
      data: {
        movementNumber: 'DUPLICATE-GRN-MOVEMENT',
        itemId: item.id,
        type: StockMovementType.RECEIPT,
        quantity: 1,
      },
    });
    await expect(
      repository.postGoodsReceived({
        grnId: grn.id,
        movementNumbers: ['DUPLICATE-GRN-MOVEMENT'],
        postedAt: new Date(),
        actorUserId: context.user.id,
      }),
    ).rejects.toBeDefined();
    expect(
      await context.prisma.stockBalance.count({ where: { itemId: item.id } }),
    ).toBe(0);
    expect(
      (
        await context.prisma.goodsReceived.findUniqueOrThrow({
          where: { id: grn.id },
        })
      ).status,
    ).toBe(GoodsReceivedStatus.DRAFT);
    expect(
      (
        await context.prisma.purchaseOrderItem.findFirstOrThrow({
          where: { purchaseOrderId: order.id, itemId: item.id },
        })
      ).receivedQuantity.toString(),
    ).toBe('0');
  });

  it('does not double-post a GRN under competing posting attempts', async () => {
    const { item, location, supplier, order } = await approvedOrder(5);
    const grn = await service.createGoodsReceived(user, {
      purchaseOrderId: order.id,
      supplierId: supplier.id,
      locationId: location.id,
      items: [{ itemId: item.id, quantity: 2, unitCost: 5 }],
    });
    const repository = context.app.get(GoodsReceivedRepository);

    await Promise.allSettled([
      repository.postGoodsReceived({
        grnId: grn.id,
        movementNumbers: [`CONCURRENT-GRN-A-${Date.now()}`],
        postedAt: new Date(),
        actorUserId: context.user.id,
      }),
      repository.postGoodsReceived({
        grnId: grn.id,
        movementNumbers: [`CONCURRENT-GRN-B-${Date.now()}`],
        postedAt: new Date(),
        actorUserId: context.user.id,
      }),
    ]);

    const balance = await context.prisma.stockBalance.findUniqueOrThrow({
      where: {
        itemId_locationId: { itemId: item.id, locationId: location.id },
      },
    });
    expect(balance.quantity.toString()).toBe('2');
    expect(
      await context.prisma.stockMovement.count({
        where: { referenceType: 'GOODS_RECEIVED', referenceId: grn.id },
      }),
    ).toBe(1);
  });
});
