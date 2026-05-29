import { Injectable } from '@nestjs/common';

import {
  Prisma,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const frontDeskReservationSelect = {
  id: true,
  reservationNumber: true,
  guestId: true,
  status: true,
  source: true,
  checkInDate: true,
  checkOutDate: true,
  adults: true,
  children: true,
  specialRequests: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  rooms: {
    select: {
      id: true,
      reservationId: true,
      roomTypeId: true,
      roomId: true,
      status: true,
      rate: true,
      notes: true,
      roomType: {
        select: {
          id: true,
          name: true,
          code: true,
          baseOccupancy: true,
          maxOccupancy: true,
          baseRate: true,
        },
      },
      room: {
        select: {
          id: true,
          roomNumber: true,
          displayName: true,
          roomTypeId: true,
          occupancyStatus: true,
          cleaningStatus: true,
          maintenanceStatus: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  },
} as const;

const frontDeskStayRoomAssignmentsOrderBy: Prisma.StayRoomAssignmentOrderByWithRelationInput[] =
  [{ assignedAt: 'asc' }, { id: 'asc' }];

const frontDeskStaySelect = {
  id: true,
  stayNumber: true,
  reservationId: true,
  guestId: true,
  status: true,
  checkedInAt: true,
  expectedCheckOutDate: true,
  checkedOutAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  reservation: {
    select: {
      id: true,
      reservationNumber: true,
      status: true,
      source: true,
      checkInDate: true,
      checkOutDate: true,
      adults: true,
      children: true,
    },
  },
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  roomAssignments: {
    where: {
      status: StayRoomAssignmentStatus.ACTIVE,
    },
    select: {
      id: true,
      stayId: true,
      roomId: true,
      reservationRoomId: true,
      status: true,
      assignedAt: true,
      room: {
        select: {
          id: true,
          roomNumber: true,
          displayName: true,
          roomTypeId: true,
          occupancyStatus: true,
          cleaningStatus: true,
          maintenanceStatus: true,
          isActive: true,
        },
      },
      reservationRoom: {
        select: {
          id: true,
          reservationId: true,
          roomTypeId: true,
          roomId: true,
          status: true,
        },
      },
    },
    orderBy: frontDeskStayRoomAssignmentsOrderBy,
  },
} as const;

export type FrontDeskReservationRecord = Prisma.ReservationGetPayload<{
  select: typeof frontDeskReservationSelect;
}>;

export type FrontDeskStayRecord = Prisma.StayGetPayload<{
  select: typeof frontDeskStaySelect;
}>;

@Injectable()
export class FrontDeskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardCounts({
    startDate,
    endDate,
  }: {
    startDate: Date;
    endDate: Date;
  }) {
    const [
      arrivalsToday,
      departuresToday,
      inHouseGuests,
      activeStays,
      vacantRooms,
      occupiedRooms,
      dirtyRooms,
      outOfOrderRooms,
      availablePhysicalRooms,
    ] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          status: ReservationStatus.CONFIRMED,
          checkInDate: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),
      this.prisma.stay.count({
        where: {
          status: StayStatus.ACTIVE,
          expectedCheckOutDate: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),
      this.prisma.stay.count({
        where: {
          status: StayStatus.ACTIVE,
        },
      }),
      this.prisma.stay.count({
        where: {
          status: StayStatus.ACTIVE,
        },
      }),
      this.prisma.room.count({
        where: {
          isActive: true,
          occupancyStatus: RoomOccupancyStatus.VACANT,
        },
      }),
      this.prisma.room.count({
        where: {
          isActive: true,
          occupancyStatus: RoomOccupancyStatus.OCCUPIED,
        },
      }),
      this.prisma.room.count({
