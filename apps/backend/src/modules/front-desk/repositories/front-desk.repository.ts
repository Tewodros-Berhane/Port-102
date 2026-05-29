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
