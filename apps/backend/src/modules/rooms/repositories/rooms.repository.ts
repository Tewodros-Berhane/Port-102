import { Injectable } from '@nestjs/common';

import {
  Prisma,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const floorSelect = {
  id: true,
  number: true,
  name: true,
  isActive: true,
} as const;

const roomTypeSelect = {
  id: true,
  name: true,
  code: true,
  baseOccupancy: true,
  maxOccupancy: true,
  baseRate: true,
  isActive: true,
} as const;

const roomSelect = {
  id: true,
  roomNumber: true,
  displayName: true,
  floorId: true,
  roomTypeId: true,
  occupancyStatus: true,
  cleaningStatus: true,
  maintenanceStatus: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  floor: {
    select: floorSelect,
  },
  roomType: {
    select: roomTypeSelect,
  },
} as const;

const roomStatusLogSelect = {
  id: true,
  roomId: true,
  actorUserId: true,
  field: true,
  oldValue: true,
  newValue: true,
  reason: true,
  createdAt: true,
  actorUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type RoomRecord = Prisma.RoomGetPayload<{
  select: typeof roomSelect;
