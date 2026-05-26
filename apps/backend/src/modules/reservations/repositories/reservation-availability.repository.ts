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
