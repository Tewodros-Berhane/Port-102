import { Injectable } from '@nestjs/common';

import {
  Prisma,
  ReservationRoomStatus,
  ReservationStatus,
  RoomMaintenanceStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const availabilityRoomSelect = {
  id: true,
  roomNumber: true,
  displayName: true,
  floorId: true,
  roomTypeId: true,
  occupancyStatus: true,
  cleaningStatus: true,
  maintenanceStatus: true,
  isActive: true,
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
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
} as const;

const availabilityRoomTypeSelect = {
  id: true,
  name: true,
  code: true,
  baseOccupancy: true,
  maxOccupancy: true,
  baseRate: true,
  isActive: true,
} as const;

export type AvailabilityRoomRecord = Prisma.RoomGetPayload<{
  select: typeof availabilityRoomSelect;
}>;

export type AvailabilityRoomTypeRecord = Prisma.RoomTypeGetPayload<{
  select: typeof availabilityRoomTypeSelect;
}>;

@Injectable()
export class ReservationAvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  listRoomTypesForAvailability({
    roomTypeId,
    minOccupancy,
  }: {
    roomTypeId?: number;
    minOccupancy?: number;
  }) {
    return this.prisma.roomType.findMany({
      where: {
        isActive: true,
        ...(roomTypeId === undefined ? {} : { id: roomTypeId }),
        ...(minOccupancy === undefined
          ? {}
          : {
              maxOccupancy: {
                gte: minOccupancy,
              },
            }),
      },
      select: availabilityRoomTypeSelect,
      orderBy: [{ name: 'asc' }, { code: 'asc' }, { id: 'asc' }],
    });
  }

  countPhysicalRooms(roomTypeId?: number) {
    return this.prisma.room.count({
      where: this.physicalAvailabilityWhere(roomTypeId),
    });
  }

  countReservedRooms({
    roomTypeId,
    checkInDate,
    checkOutDate,
    excludeReservationId,
    excludeReservationRoomId,
  }: {
    roomTypeId: number;
    checkInDate: Date;
    checkOutDate: Date;
    excludeReservationId?: number;
    excludeReservationRoomId?: number;
  }) {
    return this.prisma.reservationRoom.count({
      where: this.overlappingReservationRoomWhere({
        roomTypeId,
        checkInDate,
        checkOutDate,
        excludeReservationId,
        excludeReservationRoomId,
      }),
    });
  }

  countOverlappingRoomReservations({
    roomId,
    checkInDate,
    checkOutDate,
    excludeReservationId,
    excludeReservationRoomId,
  }: {
    roomId: number;
    checkInDate: Date;
    checkOutDate: Date;
    excludeReservationId?: number;
    excludeReservationRoomId?: number;
  }) {
    return this.prisma.reservationRoom.count({
      where: this.overlappingReservationRoomWhere({
        roomId,
        checkInDate,
        checkOutDate,
        excludeReservationId,
        excludeReservationRoomId,
      }),
    });
  }

  listAvailableRooms({
    roomTypeId,
    checkInDate,
    checkOutDate,
    excludeReservationId,
    excludeReservationRoomId,
  }: {
    roomTypeId?: number;
    checkInDate: Date;
    checkOutDate: Date;
    excludeReservationId?: number;
    excludeReservationRoomId?: number;
  }) {
    return this.prisma.room.findMany({
      where: {
        ...this.physicalAvailabilityWhere(roomTypeId),
        reservationRooms: {
          none: this.overlappingReservationRoomWhere({
            checkInDate,
            checkOutDate,
            excludeReservationId,
            excludeReservationRoomId,
          }),
        },
      },
      select: availabilityRoomSelect,
      orderBy: [{ roomNumber: 'asc' }, { id: 'asc' }],
    });
  }

  private physicalAvailabilityWhere(
    roomTypeId?: number,
  ): Prisma.RoomWhereInput {
    return {
      ...(roomTypeId === undefined ? {} : { roomTypeId }),
      isActive: true,
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    };
  }

  private overlappingReservationRoomWhere({
    roomId,
    roomTypeId,
    checkInDate,
    checkOutDate,
    excludeReservationId,
    excludeReservationRoomId,
  }: {
    roomId?: number;
    roomTypeId?: number;
    checkInDate: Date;
    checkOutDate: Date;
    excludeReservationId?: number;
    excludeReservationRoomId?: number;
  }): Prisma.ReservationRoomWhereInput {
    return {
      ...(roomId === undefined ? {} : { roomId }),
      ...(roomTypeId === undefined ? {} : { roomTypeId }),
      ...(excludeReservationRoomId === undefined
        ? {}
        : {
            id: {
              not: excludeReservationRoomId,
            },
          }),
      status: {
        not: ReservationRoomStatus.CANCELLED,
      },
      reservation: {
        ...(excludeReservationId === undefined
          ? {}
          : {
              id: {
                not: excludeReservationId,
              },
            }),
        status: {
          notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
        },
        checkInDate: {
          lt: checkOutDate,
        },
        checkOutDate: {
          gt: checkInDate,
        },
      },
    };
  }
}
