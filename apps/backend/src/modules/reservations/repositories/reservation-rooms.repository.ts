import { Injectable } from '@nestjs/common';

import {
  Prisma,
  ReservationRoomStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const reservationRoomSelect = {
  id: true,
  reservationId: true,
  roomTypeId: true,
  roomId: true,
  status: true,
  rate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  roomType: {
    select: {
      id: true,
      name: true,
      code: true,
      baseOccupancy: true,
      maxOccupancy: true,
      baseRate: true,
      isActive: true,
    },
  },
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      roomTypeId: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
} as const;

export type ReservationRoomRecord = Prisma.ReservationRoomGetPayload<{
  select: typeof reservationRoomSelect;
}>;

type ReservationRoomClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'reservationRoom'
>;

@Injectable()
export class ReservationRoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createReservationRoom(
    data: Prisma.ReservationRoomUncheckedCreateInput,
    client: ReservationRoomClient = this.prisma,
  ) {
    return client.reservationRoom.create({
      data,
      select: reservationRoomSelect,
    });
  }

  findReservationRoom(reservationRoomId: number) {
    return this.prisma.reservationRoom.findUnique({
      where: {
        id: reservationRoomId,
      },
      select: reservationRoomSelect,
    });
  }

  listReservationRooms(reservationId: number) {
    return this.prisma.reservationRoom.findMany({
      where: {
        reservationId,
      },
      select: reservationRoomSelect,
      orderBy: {
        id: 'asc',
      },
    });
  }

  updateReservationRoom(
    reservationRoomId: number,
    data: Prisma.ReservationRoomUncheckedUpdateInput,
    client: ReservationRoomClient = this.prisma,
  ) {
