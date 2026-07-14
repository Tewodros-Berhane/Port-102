/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PurchaseRequestStatus } from '../../../generated/prisma/client';
import { PurchaseRequestsRepository } from './purchase-requests.repository';

describe('PurchaseRequestsRepository', () => {
  const prisma = {
    inventoryItem: { findMany: jest.fn() },
    purchaseRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const repository = new PurchaseRequestsRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists requests with pagination, status, department, date, and search filters', async () => {
    prisma.purchaseRequest.count.mockResolvedValue(0);
    prisma.purchaseRequest.findMany.mockResolvedValue([]);
    const createdFrom = new Date('2026-07-01T00:00:00.000Z');
    const createdTo = new Date('2026-07-31T23:59:59.999Z');

    await repository.listRequests({
      skip: 10,
      take: 10,
      search: 'kitchen',
      status: PurchaseRequestStatus.SUBMITTED,
      departmentId: 4,
      createdFrom,
      createdTo,
    });

    expect(prisma.purchaseRequest.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: PurchaseRequestStatus.SUBMITTED,
        departmentId: 4,
        createdAt: { gte: createdFrom, lte: createdTo },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.purchaseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        select: expect.any(Object),
      }),
    );
  });

  it('creates a request and its items in one nested write', async () => {
    const items = [{ itemId: 2, quantity: 5 }];
    await repository.createRequest({
      requestNumber: 'PR-1',
      requestedByUserId: 7,
      items,
    });
    expect(prisma.purchaseRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ items: { create: items } }),
      }),
    );
  });
});
