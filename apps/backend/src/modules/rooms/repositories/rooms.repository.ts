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
}>;

export type RoomStatusLogRecord = Prisma.RoomStatusLogGetPayload<{
  select: typeof roomStatusLogSelect;
}>;

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRoom(data: {
    roomNumber: string;
    displayName?: string | null;
    floorId?: number | null;
    roomTypeId: number;
    notes?: string | null;
  }) {
    return this.prisma.room.create({
      data: {
        roomNumber: data.roomNumber,
        displayName: data.displayName ?? null,
        floorId: data.floorId ?? null,
        roomTypeId: data.roomTypeId,
        notes: data.notes ?? null,
      },
      select: roomSelect,
    });
  }

  findByRoomNumber(roomNumber: string, excludeRoomId?: number) {
    return this.prisma.room.findFirst({
      where: {
        roomNumber,
        ...(excludeRoomId ? { id: { not: excludeRoomId } } : {}),
      },
      select: roomSelect,
    });
  }

  listRooms({
    skip,
    take,
    search,
    floorId,
    roomTypeId,
    occupancyStatus,
    cleaningStatus,
    maintenanceStatus,
    isActive,
  }: {
    skip: number;
    take: number;
    search?: string;
    floorId?: number;
    roomTypeId?: number;
    occupancyStatus?: RoomOccupancyStatus;
    cleaningStatus?: RoomCleaningStatus;
    maintenanceStatus?: RoomMaintenanceStatus;
    isActive?: boolean;
  }) {
    const where: Prisma.RoomWhereInput = {
      ...(isActive === undefined ? {} : { isActive }),
      ...(floorId === undefined ? {} : { floorId }),
      ...(roomTypeId === undefined ? {} : { roomTypeId }),
      ...(occupancyStatus ? { occupancyStatus } : {}),
      ...(cleaningStatus ? { cleaningStatus } : {}),
      ...(maintenanceStatus ? { maintenanceStatus } : {}),
      ...(search
