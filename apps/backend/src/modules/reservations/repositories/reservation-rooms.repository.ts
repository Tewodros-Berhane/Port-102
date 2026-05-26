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

