/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GoodsReceivedStatus } from '../../../generated/prisma/client';
import { GoodsReceivedRepository } from './goods-received.repository';

describe('GoodsReceivedRepository', () => {
  const prisma = {
    inventoryItem: { findMany: jest.fn() },
    inventoryLocation: { findFirst: jest.fn() },
    goodsReceived: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const repository = new GoodsReceivedRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists GRNs with status, supplier, location, dates, search, and pagination', async () => {
    prisma.goodsReceived.count.mockResolvedValue(0);
    prisma.goodsReceived.findMany.mockResolvedValue([]);
    const createdTo = new Date('2026-07-31T23:59:59.999Z');

    await repository.listGoodsReceived({
      skip: 0,
      take: 25,
      search: 'invoice',
      status: GoodsReceivedStatus.DRAFT,
      supplierId: 3,
      locationId: 2,
      createdTo,
    });

    expect(prisma.goodsReceived.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: GoodsReceivedStatus.DRAFT,
        supplierId: 3,
        locationId: 2,
        createdAt: { lte: createdTo },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.goodsReceived.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 25,
        select: expect.any(Object),
      }),
    );
  });

  it('creates a draft GRN and nested items without posting stock', async () => {
    const items = [{ itemId: 5, quantity: 2 }];
    await repository.createGoodsReceived({
      grnNumber: 'GRN-1',
      locationId: 2,
      receivedByUserId: 7,
      items,
    });
    expect(prisma.goodsReceived.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ items: { create: items } }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('runs GRN posting inside a serializable transaction', async () => {
    prisma.$transaction.mockResolvedValue({ status: 'POSTED' });
    await repository.postGoodsReceived({
      grnId: 1,
      movementNumbers: ['MOV-1'],
      postedAt: new Date(),
      actorUserId: 7,
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    );
  });
});
