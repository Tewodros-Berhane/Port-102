import { ConflictException } from '@nestjs/common';

import {
  FolioStatus,
  HousekeepingIssueStatus,
  MaintenanceTicketSource,
  OutletType,
  PosOrderPaymentStatus,
  PosOrderStatus,
  ReservationRoomStatus,
  ReservationStatus,
  RoomCleaningStatus,
  RoomOccupancyStatus,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../../src/generated/prisma/client';
import type { CurrentUserPayload } from '../../src/modules/auth/types/current-user-payload.type';
import { MaintenanceService } from '../../src/modules/maintenance/maintenance.service';
import { RestaurantService } from '../../src/modules/restaurant/restaurant.service';
import { StaysService } from '../../src/modules/stays/stays.service';
import {
  createIntegrationContext,
  type IntegrationContext,
  resetIntegrationDatabase,
} from './integration-test-context';

describe('Cross-module PostgreSQL integration', () => {
  let context: IntegrationContext;
  let user: CurrentUserPayload;

  beforeAll(async () => {
    context = await createIntegrationContext();
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

  async function seedActiveStay() {
    const suffix = `${Date.now()}-${Math.random()}`;
    const roomType = await context.prisma.roomType.create({
      data: { code: `TYPE-${suffix}`, name: `Room Type ${suffix}` },
    });
    const room = await context.prisma.room.create({
      data: {
        roomNumber: `ROOM-${suffix}`,
        roomTypeId: roomType.id,
        occupancyStatus: RoomOccupancyStatus.OCCUPIED,
        cleaningStatus: RoomCleaningStatus.CLEAN,
      },
    });
    const guest = await context.prisma.guest.create({
      data: { firstName: 'Database', lastName: 'Guest' },
    });
    const reservation = await context.prisma.reservation.create({
      data: {
        reservationNumber: `RES-${suffix}`,
        guestId: guest.id,
        status: ReservationStatus.CHECKED_IN,
        checkInDate: new Date('2026-07-13T12:00:00.000Z'),
        checkOutDate: new Date('2026-07-15T12:00:00.000Z'),
        createdByUserId: context.user.id,
      },
    });
    const reservationRoom = await context.prisma.reservationRoom.create({
      data: {
        reservationId: reservation.id,
        roomTypeId: roomType.id,
        roomId: room.id,
        status: ReservationRoomStatus.CHECKED_IN,
      },
    });
    const stay = await context.prisma.stay.create({
      data: {
        stayNumber: `STAY-${suffix}`,
        reservationId: reservation.id,
        guestId: guest.id,
        status: StayStatus.ACTIVE,
        expectedCheckOutDate: reservation.checkOutDate,
        checkedInByUserId: context.user.id,
      },
    });
    await context.prisma.stayRoomAssignment.create({
      data: {
        stayId: stay.id,
        roomId: room.id,
        reservationRoomId: reservationRoom.id,
        status: StayRoomAssignmentStatus.ACTIVE,
        assignedByUserId: context.user.id,
      },
    });
    const folio = await context.prisma.folio.create({
      data: {
        folioNumber: `FOLIO-${suffix}`,
        stayId: stay.id,
        guestId: guest.id,
        status: FolioStatus.OPEN,
        openedByUserId: context.user.id,
      },
    });
    return { roomType, room, guest, reservation, reservationRoom, stay, folio };
  }

  it('posts a POS room charge exactly once and recalculates the folio atomically', async () => {
    const data = await seedActiveStay();
    const outlet = await context.prisma.outlet.create({
      data: {
        code: `OUTLET-${Date.now()}`,
        name: 'Integration Restaurant',
        type: OutletType.RESTAURANT,
      },
    });
    const order = await context.prisma.posOrder.create({
      data: {
        orderNumber: `POS-${Date.now()}-${Math.random()}`,
        outletId: outlet.id,
        status: PosOrderStatus.OPEN,
        paymentStatus: PosOrderPaymentStatus.UNPAID,
        subtotalAmount: 125,
        totalAmount: 125,
        balanceAmount: 125,
        createdByUserId: context.user.id,
      },
    });
    const service = context.app.get(RestaurantService);

    await service.chargeOrderToRoom(user, order.id, { stayId: data.stay.id });
    const storedFolio = await context.prisma.folio.findUniqueOrThrow({
      where: { id: data.folio.id },
    });
    expect(storedFolio.totalAmount.toString()).toBe('125');
    expect(storedFolio.balanceAmount.toString()).toBe('125');
    expect(
      await context.prisma.folioLineItem.count({
        where: { sourceType: 'POS_ORDER', sourceId: order.id },
      }),
    ).toBe(1);
    await expect(
      service.chargeOrderToRoom(user, order.id, { stayId: data.stay.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks out atomically and creates one checkout-cleaning task', async () => {
    const data = await seedActiveStay();
    const service = context.app.get(StaysService);
    await service.checkOut(user, data.stay.id, { closeFolio: true });

    const [stay, room, tasks] = await Promise.all([
      context.prisma.stay.findUniqueOrThrow({ where: { id: data.stay.id } }),
      context.prisma.room.findUniqueOrThrow({ where: { id: data.room.id } }),
      context.prisma.housekeepingTask.findMany({
        where: {
          roomId: data.room.id,
          sourceType: 'STAY_CHECKOUT',
          sourceId: data.stay.id,
        },
      }),
    ]);
    expect(stay.status).toBe(StayStatus.CHECKED_OUT);
    expect(room.occupancyStatus).toBe(RoomOccupancyStatus.VACANT);
    expect(room.cleaningStatus).toBe(RoomCleaningStatus.DIRTY);
    expect(tasks).toHaveLength(1);
    await expect(
      service.checkOut(user, data.stay.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('converts an open housekeeping issue into one correctly sourced maintenance ticket', async () => {
    const data = await seedActiveStay();
    const issue = await context.prisma.housekeepingIssue.create({
      data: {
        issueNumber: `HK-ISSUE-${Date.now()}-${Math.random()}`,
        roomId: data.room.id,
        reportedByUserId: context.user.id,
        status: HousekeepingIssueStatus.OPEN,
        title: 'Leaking tap',
        description: 'Bathroom tap requires repair.',
      },
    });
    const service = context.app.get(MaintenanceService);
    const ticket = await service.createTicketFromHousekeepingIssue(
      user,
      issue.id,
      {},
    );
    expect(ticket).toMatchObject({
      source: MaintenanceTicketSource.HOUSEKEEPING,
      sourceType: 'HOUSEKEEPING_ISSUE',
      sourceId: issue.id,
      roomId: data.room.id,
    });
    await expect(
      service.createTicketFromHousekeepingIssue(user, issue.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
