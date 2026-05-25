import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FloorsRepository } from '../floors/repositories/floors.repository';
import { RoomTypesRepository } from '../room-types/repositories/room-types.repository';
import { ClearRoomOutOfOrderDto } from './dto/clear-room-out-of-order.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GetRoomStatusLogsQueryDto } from './dto/get-room-status-logs-query.dto';
import { GetRoomsQueryDto } from './dto/get-rooms-query.dto';
import { MarkRoomOutOfOrderDto } from './dto/mark-room-out-of-order.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import {
  RoomRecord,
  RoomsRepository,
  RoomStatusLogRecord,
} from './repositories/rooms.repository';

type RoomStatusField =
  | 'occupancyStatus'
  | 'cleaningStatus'
  | 'maintenanceStatus';

type RoomStatusChange = {
  field: RoomStatusField;
  oldValue: string;
  newValue: string;
};

type RoomStatusUpdateData = {
  occupancyStatus?: RoomOccupancyStatus;
  cleaningStatus?: RoomCleaningStatus;
  maintenanceStatus?: RoomMaintenanceStatus;
};

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly floorsRepository: FloorsRepository,
    private readonly roomTypesRepository: RoomTypesRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(currentUser: CurrentUserPayload, createRoomDto: CreateRoomDto) {
    const roomNumber = this.normalizeRequiredString(
      createRoomDto.roomNumber,
      'Room number is required.',
    );
    const existingRoom =
      await this.roomsRepository.findByRoomNumber(roomNumber);

    if (existingRoom) {
      throw new ConflictException('Room number already exists.');
    }

    await this.ensureActiveRoomType(createRoomDto.roomTypeId);

    if (createRoomDto.floorId !== undefined && createRoomDto.floorId !== null) {
      await this.ensureActiveFloor(createRoomDto.floorId);
    }

    const room = await this.roomsRepository.createRoom({
      roomNumber,
      displayName: this.normalizeOptionalString(createRoomDto.displayName),
      floorId: createRoomDto.floorId ?? null,
      roomTypeId: createRoomDto.roomTypeId,
      notes: this.normalizeOptionalString(createRoomDto.notes),
    });

    await this.recordRoomAudit(currentUser, 'rooms.created', room, {
      roomNumber: room.roomNumber,
      floorId: room.floorId,
      roomTypeId: room.roomTypeId,
    });

    return this.serializeRoom(room);
  }

  async list(_currentUser: CurrentUserPayload, query: GetRoomsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, rooms] = await this.roomsRepository.listRooms({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      floorId: query.floorId,
      roomTypeId: query.roomTypeId,
      occupancyStatus: query.occupancyStatus,
      cleaningStatus: query.cleaningStatus,
      maintenanceStatus: query.maintenanceStatus,
      isActive: query.isActive,
    });

    return {
      items: rooms.map((room) => this.serializeRoom(room)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, roomId: number) {
    const room = await this.findRequiredRoom(roomId);

    return this.serializeRoom(room);
  }

  async getAvailabilitySummary(_currentUser: CurrentUserPayload) {
    const sellableWhere = {
      isActive: true,
      occupancyStatus: RoomOccupancyStatus.VACANT,
      cleaningStatus: {
        in: [RoomCleaningStatus.CLEAN, RoomCleaningStatus.INSPECTED],
      },
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    };

    const [total, active, inactive, sellable, occupied, dirty, unavailable] =
      await Promise.all([
        this.roomsRepository.countRooms({}),
        this.roomsRepository.countRooms({ isActive: true }),
        this.roomsRepository.countRooms({ isActive: false }),
        this.roomsRepository.countRooms(sellableWhere),
        this.roomsRepository.countRooms({
          isActive: true,
          occupancyStatus: RoomOccupancyStatus.OCCUPIED,
        }),
        this.roomsRepository.countRooms({
          isActive: true,
          cleaningStatus: RoomCleaningStatus.DIRTY,
        }),
        this.roomsRepository.countRooms({
          isActive: true,
          OR: [
            {
              occupancyStatus: {
                not: RoomOccupancyStatus.VACANT,
              },
            },
            {
              cleaningStatus: {
                notIn: [RoomCleaningStatus.CLEAN, RoomCleaningStatus.INSPECTED],
              },
            },
            {
              maintenanceStatus: {
                not: RoomMaintenanceStatus.AVAILABLE,
              },
            },
          ],
        }),
      ]);

    return {
      total,
      active,
      inactive,
      sellable,
      unavailable,
      occupied,
      dirty,
      criteria: {
        isActive: true,
        occupancyStatus: RoomOccupancyStatus.VACANT,
        cleaningStatuses: [
          RoomCleaningStatus.CLEAN,
          RoomCleaningStatus.INSPECTED,
        ],
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      },
    };
  }

  async getStatusSummary(_currentUser: CurrentUserPayload) {
    const [
      total,
      active,
      inactive,
      vacant,
      occupied,
      clean,
      dirty,
      inspected,
      available,
      outOfOrder,
      outOfService,
      underMaintenance,
    ] = await Promise.all([
      this.roomsRepository.countRooms({}),
      this.roomsRepository.countRooms({ isActive: true }),
      this.roomsRepository.countRooms({ isActive: false }),
      this.roomsRepository.countRooms({
        isActive: true,
        occupancyStatus: RoomOccupancyStatus.VACANT,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        occupancyStatus: RoomOccupancyStatus.OCCUPIED,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        cleaningStatus: RoomCleaningStatus.CLEAN,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        cleaningStatus: RoomCleaningStatus.DIRTY,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_SERVICE,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      }),
    ]);

    return {
      total,
      active,
      inactive,
      occupancy: {
        vacant,
        occupied,
      },
      cleaning: {
        clean,
        dirty,
        inspected,
      },
      maintenance: {
        available,
        outOfOrder,
        outOfService,
        underMaintenance,
      },
    };
  }

  async update(
    currentUser: CurrentUserPayload,
    roomId: number,
    updateRoomDto: UpdateRoomDto,
  ) {
    const room = await this.findRequiredRoom(roomId);
    const data: {
      roomNumber?: string;
      displayName?: string | null;
      floorId?: number | null;
      roomTypeId?: number;
      notes?: string | null;
    } = {};

    if (updateRoomDto.roomNumber !== undefined) {
      const roomNumber = this.normalizeRequiredString(
        updateRoomDto.roomNumber,
        'Room number is required.',
      );

      if (roomNumber !== room.roomNumber) {
        const duplicateRoom = await this.roomsRepository.findByRoomNumber(
          roomNumber,
          room.id,
        );

        if (duplicateRoom) {
          throw new ConflictException('Room number already exists.');
        }
      }

      data.roomNumber = roomNumber;
    }

    if (updateRoomDto.displayName !== undefined) {
      data.displayName = this.normalizeOptionalString(
        updateRoomDto.displayName,
      );
    }

    if (updateRoomDto.floorId !== undefined) {
      if (updateRoomDto.floorId !== null) {
        await this.ensureActiveFloor(updateRoomDto.floorId);
      }

      data.floorId = updateRoomDto.floorId;
    }

    if (updateRoomDto.roomTypeId !== undefined) {
      await this.ensureActiveRoomType(updateRoomDto.roomTypeId);
      data.roomTypeId = updateRoomDto.roomTypeId;
    }

    if (updateRoomDto.notes !== undefined) {
      data.notes = this.normalizeOptionalString(updateRoomDto.notes);
    }

    if (Object.keys(data).length === 0) {
      return this.serializeRoom(room);
    }

    const updatedRoom = await this.roomsRepository.updateRoom(room.id, data);

    await this.recordRoomAudit(currentUser, 'rooms.updated', updatedRoom, {
      previous: this.auditSnapshot(room),
      changes: data,
    });

    return this.serializeRoom(updatedRoom);
  }

  async remove(currentUser: CurrentUserPayload, roomId: number) {
    const room = await this.findRequiredRoom(roomId);

    if (!room.isActive) {
      return this.serializeRoom(room);
    }

