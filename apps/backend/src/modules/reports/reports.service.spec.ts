import { BadRequestException } from '@nestjs/common';

import {
  FolioLineItemType,
  PaymentMethod,
  PaymentStatus,
  PosOrderStatus,
  PosPaymentMethod,
  Prisma,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../generated/prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const rooms = { listRooms: jest.fn(), listStaysOverlapping: jest.fn() };
  const financial = {
    listFolioLineItems: jest.fn(),
    listFolioPayments: jest.fn(),
    listPosPayments: jest.fn(),
    countVoidedPayments: jest.fn(),
  };
  const operations = {};
  const supply = { listInventoryItems: jest.fn(), listMovements: jest.fn() };
  const propertySettings = {
    toPropertyDateRange: jest.fn(async (from?: string, to?: string) => ({
      from: new Date(`${from ?? '2026-07-01'}T00:00:00.000Z`),
      to: new Date(`${to ?? '2026-07-31'}T23:59:59.999Z`),
      timezone: 'UTC',
    })),
  };
  const service = new ReportsService(
    rooms as never,
    financial as never,
    operations as never,
    supply as never,
    propertySettings as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('consolidates folio revenue and direct POS payments without counting room-charge POS payments twice', async () => {
    financial.listFolioLineItems.mockResolvedValue([
      {
        id: 1,
        type: FolioLineItemType.ROOM_CHARGE,
        totalAmount: new Prisma.Decimal(100),
        postedAt: new Date(),
        sourceType: null,
      },
      {
        id: 2,
        type: FolioLineItemType.POS_CHARGE,
        totalAmount: new Prisma.Decimal(50),
        postedAt: new Date(),
        sourceType: 'POS_ORDER',
      },
      {
        id: 3,
        type: FolioLineItemType.DISCOUNT,
        totalAmount: new Prisma.Decimal(-10),
        postedAt: new Date(),
        sourceType: null,
      },
    ]);
    financial.listPosPayments.mockResolvedValue([
      {
        id: 1,
        amount: new Prisma.Decimal(25),
        method: PosPaymentMethod.CASH,
        isVoided: false,
        recordedAt: new Date(),
        order: { status: PosOrderStatus.CLOSED },
      },
      {
        id: 2,
        amount: new Prisma.Decimal(50),
        method: PosPaymentMethod.ROOM_CHARGE,
        isVoided: false,
        recordedAt: new Date(),
        order: { status: PosOrderStatus.CLOSED },
      },
    ]);

    const report = await service.getRevenue({
      from: '2026-07-01',
      to: '2026-07-31',
    });
    expect(report).toMatchObject({
      grossCharges: '175.00',
      discounts: '10.00',
      netRevenue: '165.00',
      roomRevenue: '100.00',
      outletRevenue: '75.00',
    });
  });

  it('excludes voided folio and POS payments and room-charge payment markers', async () => {
    financial.listFolioPayments.mockResolvedValue([
      {
        id: 1,
        amount: new Prisma.Decimal(100),
        method: PaymentMethod.CARD,
        status: PaymentStatus.RECORDED,
        recordedAt: new Date(),
      },
      {
        id: 2,
        amount: new Prisma.Decimal(20),
        method: PaymentMethod.CASH,
        status: PaymentStatus.VOIDED,
        recordedAt: new Date(),
      },
    ]);
    financial.listPosPayments.mockResolvedValue([
      {
        id: 1,
        amount: new Prisma.Decimal(30),
        method: PosPaymentMethod.CASH,
        isVoided: false,
        recordedAt: new Date(),
        order: { status: PosOrderStatus.CLOSED },
      },
      {
        id: 2,
        amount: new Prisma.Decimal(5),
        method: PosPaymentMethod.CARD,
        isVoided: true,
        recordedAt: new Date(),
        order: { status: PosOrderStatus.CLOSED },
      },
      {
        id: 3,
        amount: new Prisma.Decimal(50),
        method: PosPaymentMethod.ROOM_CHARGE,
        isVoided: false,
        recordedAt: new Date(),
        order: { status: PosOrderStatus.CLOSED },
      },
    ]);
    financial.countVoidedPayments.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(20) },
    });

    const report = await service.getPayments({
      from: '2026-07-01',
      to: '2026-07-31',
    });
    expect(report).toMatchObject({
      folioPayments: '100.00',
      directPosPayments: '30.00',
      totalNonVoidedPayments: '130.00',
      voidedFolioPaymentAmount: '20.00',
    });
  });

  it('excludes out-of-order rooms from the occupancy denominator', async () => {
    const roomType = { id: 1, code: 'STD', name: 'Standard' };
    rooms.listRooms.mockResolvedValue([
      {
        id: 1,
        occupancyStatus: RoomOccupancyStatus.OCCUPIED,
        cleaningStatus: RoomCleaningStatus.CLEAN,
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
        roomType,
      },
      {
        id: 2,
        occupancyStatus: RoomOccupancyStatus.VACANT,
        cleaningStatus: RoomCleaningStatus.CLEAN,
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
        roomType,
      },
      {
        id: 3,
        occupancyStatus: RoomOccupancyStatus.VACANT,
        cleaningStatus: RoomCleaningStatus.DIRTY,
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
        roomType,
      },
    ]);
    rooms.listStaysOverlapping.mockResolvedValue([]);

    const report = await service.getOccupancy({
      from: '2026-07-01',
      to: '2026-07-01',
    });
    expect(report.current).toMatchObject({
      totalSellableRooms: 2,
      occupiedRooms: 1,
      outOfOrderRooms: 1,
      occupancyRate: 50,
    });
  });

  it('reports zero-stock items even when no balance row exists', async () => {
    supply.listInventoryItems.mockResolvedValue([
      {
        id: 1,
        itemNumber: 'INV-1',
        name: 'Soap',
        type: 'ROOM_AMENITY',
        status: 'ACTIVE',
        reorderLevel: new Prisma.Decimal(5),
        averageCost: new Prisma.Decimal(2),
        balances: [],
      },
    ]);
    supply.listMovements.mockResolvedValue([]);
    const report = await service.getInventory({
      from: '2026-07-01',
      to: '2026-07-31',
    });
    expect(report.zeroStockItems).toHaveLength(1);
    expect(report.lowStockItems).toHaveLength(1);
    expect(report.totalStockValue).toBe('0.00');
  });

  it('rejects reversed and unreasonably long date ranges', async () => {
    await expect(
      service.getRevenue({ from: '2026-07-02', to: '2026-07-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getRevenue({ from: '2020-01-01', to: '2026-07-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
