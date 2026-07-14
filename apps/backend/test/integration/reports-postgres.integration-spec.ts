import {
  FolioLineItemType,
  FolioStatus,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  MaintenanceTicketStatus,
  OutletType,
  PaymentMethod,
  PaymentStatus,
  PosOrderPaymentStatus,
  PosOrderStatus,
  PosPaymentMethod,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StayStatus,
} from '../../src/generated/prisma/client';
import { ReportsService } from '../../src/modules/reports/reports.service';
import {
  createIntegrationContext,
  type IntegrationContext,
  resetIntegrationDatabase,
} from './integration-test-context';

describe('Reports PostgreSQL integration', () => {
  let context: IntegrationContext;
  let reports: ReportsService;
  const reportDate = new Date('2026-07-14T10:00:00.000Z');
  const query = { from: '2026-07-14', to: '2026-07-14' };

  beforeAll(async () => {
    context = await createIntegrationContext();
    reports = context.app.get(ReportsService);
  });

  beforeEach(async () => {
    context.user = await resetIntegrationDatabase(context.prisma);
  });

  afterAll(async () => context?.app.close());

  async function seedStay(suffix: string, status = StayStatus.ACTIVE) {
    const guest = await context.prisma.guest.create({
      data: { firstName: 'Report', lastName: suffix },
    });
    const reservation = await context.prisma.reservation.create({
      data: {
        reservationNumber: `RES-${suffix}`,
        guestId: guest.id,
        status:
          status === StayStatus.ACTIVE
            ? ReservationStatus.CHECKED_IN
            : ReservationStatus.CHECKED_OUT,
        checkInDate: new Date('2026-07-14T08:00:00.000Z'),
        checkOutDate: new Date('2026-07-15T08:00:00.000Z'),
        createdAt: reportDate,
      },
    });
    const stay = await context.prisma.stay.create({
      data: {
        stayNumber: `STAY-${suffix}`,
        reservationId: reservation.id,
        guestId: guest.id,
        status,
        checkedInAt: reportDate,
        expectedCheckOutDate: reservation.checkOutDate,
        ...(status === StayStatus.CHECKED_OUT
          ? { checkedOutAt: new Date('2026-07-14T18:00:00.000Z') }
          : {}),
      },
    });
    const folio = await context.prisma.folio.create({
      data: {
        folioNumber: `FOLIO-${suffix}`,
        stayId: stay.id,
        guestId: guest.id,
        status: FolioStatus.OPEN,
      },
    });
    return { guest, reservation, stay, folio };
  }

  it('consolidates room, direct POS, and room-charge POS revenue exactly once', async () => {
    const { folio } = await seedStay('REVENUE');
    await context.prisma.folioLineItem.createMany({
      data: [
        {
          folioId: folio.id,
          type: FolioLineItemType.ROOM_CHARGE,
          description: 'Room',
          quantity: 1,
          unitAmount: 100,
          totalAmount: 100,
          postedAt: reportDate,
        },
        {
          folioId: folio.id,
          type: FolioLineItemType.POS_CHARGE,
          description: 'Room POS',
          quantity: 1,
          unitAmount: 50,
          totalAmount: 50,
          sourceType: 'POS_ORDER',
          sourceId: 900,
          postedAt: reportDate,
        },
      ],
    });
    const outlet = await context.prisma.outlet.create({
      data: {
        code: 'OUT-REV',
        name: 'Restaurant',
        type: OutletType.RESTAURANT,
      },
    });
    const directOrder = await context.prisma.posOrder.create({
      data: {
        orderNumber: 'POS-DIRECT',
        outletId: outlet.id,
        status: PosOrderStatus.CLOSED,
        paymentStatus: PosOrderPaymentStatus.PAID,
        totalAmount: 25,
        paidAmount: 25,
        createdAt: reportDate,
      },
    });
    await context.prisma.posOrderPayment.createMany({
      data: [
        {
          paymentNumber: 'POSPAY-DIRECT',
          orderId: directOrder.id,
          amount: 25,
          method: PosPaymentMethod.CASH,
          recordedAt: reportDate,
        },
        {
          paymentNumber: 'POSPAY-ROOM',
          orderId: directOrder.id,
          amount: 50,
          method: PosPaymentMethod.ROOM_CHARGE,
          recordedAt: reportDate,
        },
      ],
    });

    const result = await reports.getRevenue(query);
    expect(result).toMatchObject({
      roomRevenue: '100.00',
      outletRevenue: '75.00',
      netRevenue: '175.00',
    });
  });

  it('combines valid folio and direct POS payments while excluding voids', async () => {
    const { folio } = await seedStay('PAYMENTS');
    await context.prisma.payment.createMany({
      data: [
        {
          paymentNumber: 'PAY-VALID',
          folioId: folio.id,
          amount: 100,
          method: PaymentMethod.CARD,
          status: PaymentStatus.RECORDED,
          recordedAt: reportDate,
        },
        {
          paymentNumber: 'PAY-VOID',
          folioId: folio.id,
          amount: 20,
          method: PaymentMethod.CASH,
          status: PaymentStatus.VOIDED,
          recordedAt: reportDate,
        },
      ],
    });
    const outlet = await context.prisma.outlet.create({
      data: { code: 'OUT-PAY', name: 'Cafe', type: OutletType.CAFE },
    });
    const order = await context.prisma.posOrder.create({
      data: {
        orderNumber: 'POS-PAY',
        outletId: outlet.id,
        status: PosOrderStatus.CLOSED,
        createdAt: reportDate,
      },
    });
    await context.prisma.posOrderPayment.createMany({
      data: [
        {
          paymentNumber: 'POS-PAY-VALID',
          orderId: order.id,
          amount: 30,
          method: PosPaymentMethod.CASH,
          recordedAt: reportDate,
        },
        {
          paymentNumber: 'POS-PAY-VOID',
          orderId: order.id,
          amount: 5,
          method: PosPaymentMethod.CARD,
          isVoided: true,
          recordedAt: reportDate,
        },
      ],
    });

    const result = await reports.getPayments(query);
    expect(result).toMatchObject({
      folioPayments: '100.00',
      directPosPayments: '30.00',
      totalNonVoidedPayments: '130.00',
      voidedFolioPaymentAmount: '20.00',
    });
  });

  it('uses only sellable rooms in the occupancy denominator', async () => {
    const roomType = await context.prisma.roomType.create({
      data: { code: 'RPT-TYPE', name: 'Report Room' },
    });
    await context.prisma.room.createMany({
      data: [
        {
          roomNumber: 'RPT-101',
          roomTypeId: roomType.id,
          occupancyStatus: RoomOccupancyStatus.OCCUPIED,
        },
        {
          roomNumber: 'RPT-102',
          roomTypeId: roomType.id,
          occupancyStatus: RoomOccupancyStatus.VACANT,
        },
        {
          roomNumber: 'RPT-103',
          roomTypeId: roomType.id,
          occupancyStatus: RoomOccupancyStatus.VACANT,
          cleaningStatus: RoomCleaningStatus.DIRTY,
          maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
        },
      ],
    });
    const result = await reports.getOccupancy(query);
    expect(result.current).toMatchObject({
      totalSellableRooms: 2,
      occupiedRooms: 1,
      outOfOrderRooms: 1,
      occupancyRate: 50,
    });
  });

  it('derives a daily summary from known operational events', async () => {
    const { stay, folio } = await seedStay('DAILY', StayStatus.CHECKED_OUT);
    await context.prisma.folioLineItem.create({
      data: {
        folioId: folio.id,
        type: FolioLineItemType.ROOM_CHARGE,
        description: 'Room',
        quantity: 1,
        unitAmount: 80,
        totalAmount: 80,
        postedAt: reportDate,
      },
    });
    await context.prisma.payment.create({
      data: {
        paymentNumber: 'PAY-DAILY',
        folioId: folio.id,
        amount: 80,
        method: PaymentMethod.CASH,
        recordedAt: reportDate,
      },
    });
    const roomType = await context.prisma.roomType.create({
      data: { code: 'DAILY-TYPE', name: 'Daily Room' },
    });
    const room = await context.prisma.room.create({
      data: {
        roomNumber: 'DAILY-101',
        roomTypeId: roomType.id,
        cleaningStatus: RoomCleaningStatus.DIRTY,
      },
    });
    await context.prisma.housekeepingTask.create({
      data: {
        taskNumber: 'HK-DAILY',
        roomId: room.id,
        type: HousekeepingTaskType.CHECKOUT_CLEANING,
        status: HousekeepingTaskStatus.COMPLETED,
        completedAt: reportDate,
        createdAt: reportDate,
      },
    });
    await context.prisma.maintenanceTicket.create({
      data: {
        ticketNumber: 'MT-DAILY',
        roomId: room.id,
        title: 'Daily ticket',
        status: MaintenanceTicketStatus.COMPLETED,
        completedAt: reportDate,
        createdAt: reportDate,
      },
    });

    const result = await reports.getDailySummary(query);
    expect(result).toMatchObject({
      arrivals: 1,
      departures: 0,
      checkIns: 1,
      checkouts: 1,
      reservationsCreated: 1,
      folioCharges: '80.00',
      paymentsReceived: '80.00',
      housekeepingTasksCompleted: 1,
      maintenanceTicketsOpened: 1,
      maintenanceTicketsCompleted: 1,
    });
    expect(stay.status).toBe(StayStatus.CHECKED_OUT);
  });
});
