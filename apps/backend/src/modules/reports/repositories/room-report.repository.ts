import { Injectable } from '@nestjs/common';

import {
  Prisma,
  ReservationStatus,
  StayStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RoomReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  listRooms(
    filters: {
      floorId?: number;
      roomTypeId?: number;
      occupancyStatus?: Prisma.EnumRoomOccupancyStatusFilter['equals'];
      cleaningStatus?: Prisma.EnumRoomCleaningStatusFilter['equals'];
      maintenanceStatus?: Prisma.EnumRoomMaintenanceStatusFilter['equals'];
    } = {},
  ) {
    return this.prisma.room.findMany({
      where: { isActive: true, ...filters },
      select: {
        id: true,
        roomNumber: true,
        displayName: true,
        occupancyStatus: true,
        cleaningStatus: true,
        maintenanceStatus: true,
        floor: { select: { id: true, name: true, number: true } },
        roomType: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ floor: { number: 'asc' } }, { roomNumber: 'asc' }],
    });
  }

  listReservationsForArrivalDeparture(from: Date, to: Date) {
    return this.prisma.reservation.findMany({
      where: {
        OR: [
          { checkInDate: { gte: from, lte: to } },
          { checkOutDate: { gte: from, lte: to } },
        ],
      },
      select: {
        id: true,
        reservationNumber: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        guest: { select: { id: true, firstName: true, lastName: true } },
        stay: {
          select: {
            id: true,
            stayNumber: true,
            status: true,
            checkedInAt: true,
            checkedOutAt: true,
            expectedCheckOutDate: true,
          },
        },
      },
      orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }],
    });
  }

  listStaysOverlapping(from: Date, to: Date) {
    return this.prisma.stay.findMany({
      where: {
        checkedInAt: { lte: to },
        OR: [{ checkedOutAt: null }, { checkedOutAt: { gte: from } }],
      },
      select: {
        id: true,
        status: true,
        checkedInAt: true,
        checkedOutAt: true,
        expectedCheckOutDate: true,
        roomAssignments: {
          select: {
            roomId: true,
            assignedAt: true,
            releasedAt: true,
            room: { select: { roomTypeId: true } },
          },
        },
      },
    });
  }

  countActiveStays() {
    return this.prisma.stay.count({ where: { status: StayStatus.ACTIVE } });
  }

  countReservationsCreated(from: Date, to: Date) {
    return this.prisma.reservation.count({
      where: { createdAt: { gte: from, lte: to } },
    });
  }

  countReservationsByStatus(from: Date, to: Date, status: ReservationStatus) {
    return this.prisma.reservation.count({
      where: {
        status,
        OR: [
          { checkInDate: { gte: from, lte: to } },
          { checkOutDate: { gte: from, lte: to } },
          { updatedAt: { gte: from, lte: to } },
        ],
      },
    });
  }

  listOverdueStays(now: Date) {
    return this.prisma.stay.findMany({
      where: { status: StayStatus.ACTIVE, expectedCheckOutDate: { lt: now } },
      select: {
        id: true,
        stayNumber: true,
        expectedCheckOutDate: true,
        guest: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { expectedCheckOutDate: 'asc' },
      take: 100,
    });
  }
}
