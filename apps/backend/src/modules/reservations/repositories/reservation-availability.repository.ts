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

export type AvailabilityRoomRecord = Prisma.RoomGetPayload<{
  select: typeof availabilityRoomSelect;
}>;

@Injectable()
export class ReservationAvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  countPhysicalRooms(roomTypeId: number) {
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
    roomTypeId: number;
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
