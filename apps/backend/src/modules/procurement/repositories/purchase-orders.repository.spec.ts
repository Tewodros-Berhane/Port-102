/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PurchaseOrderStatus } from '../../../generated/prisma/client';
import { PurchaseOrdersRepository } from './purchase-orders.repository';

describe('PurchaseOrdersRepository', () => {
  let tx: {
    purchaseRequest: { updateMany: jest.Mock };
    purchaseOrder: { create: jest.Mock };
  };
  const prisma = {
    inventoryItem: { findMany: jest.fn() },
    purchaseOrder: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const repository = new PurchaseOrdersRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      purchaseRequest: { updateMany: jest.fn() },
      purchaseOrder: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));
  });

  it('lists orders with status, supplier, dates, search, and pagination', async () => {
    prisma.purchaseOrder.count.mockResolvedValue(0);
    prisma.purchaseOrder.findMany.mockResolvedValue([]);
    const createdFrom = new Date('2026-07-01T00:00:00.000Z');

    await repository.listOrders({
      skip: 20,
      take: 20,
      search: 'coffee',
      status: PurchaseOrderStatus.ORDERED,
      supplierId: 3,
      createdFrom,
    });

    expect(prisma.purchaseOrder.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: PurchaseOrderStatus.ORDERED,
        supplierId: 3,
        createdAt: { gte: createdFrom },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        select: expect.any(Object),
      }),
    );
  });

  it('claims an approved request before creating its purchase order', async () => {
    tx.purchaseRequest.updateMany.mockResolvedValue({ count: 1 });
    tx.purchaseOrder.create.mockResolvedValue({ id: 9 });

    await expect(
      repository.convertRequestToOrder({
        requestId: 4,
        orderNumber: 'PO-9',
        createdByUserId: 7,
        items: [{ itemId: 2, quantity: 5 }],
      }),
    ).resolves.toEqual({ id: 9 });
    expect(tx.purchaseRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 4, status: 'APPROVED' },
      data: { status: 'CONVERTED_TO_PO' },
    });
    expect(tx.purchaseOrder.create).toHaveBeenCalled();
  });

  it('does not create an order when the request claim fails', async () => {
    tx.purchaseRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      repository.convertRequestToOrder({
        requestId: 4,
        orderNumber: 'PO-9',
        createdByUserId: 7,
        items: [{ itemId: 2, quantity: 5 }],
      }),
    ).resolves.toBeNull();
    expect(tx.purchaseOrder.create).not.toHaveBeenCalled();
  });
});
