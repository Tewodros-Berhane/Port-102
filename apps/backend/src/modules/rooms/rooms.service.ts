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

    const updatedRoom = await this.roomsRepository.updateRoom(room.id, {
      isActive: false,
    });

    await this.recordRoomAudit(currentUser, 'rooms.deactivated', updatedRoom, {
      previous: {
        isActive: room.isActive,
      },
      changes: {
        isActive: false,
      },
    });

    return this.serializeRoom(updatedRoom);
  }

  async updateStatus(
    currentUser: CurrentUserPayload,
    roomId: number,
    updateRoomStatusDto: UpdateRoomStatusDto,
  ) {
    const room = await this.findRequiredRoom(roomId);
    const data: RoomStatusUpdateData = {};

    if (updateRoomStatusDto.occupancyStatus !== undefined) {
      data.occupancyStatus = updateRoomStatusDto.occupancyStatus;
    }

    if (updateRoomStatusDto.cleaningStatus !== undefined) {
      data.cleaningStatus = updateRoomStatusDto.cleaningStatus;
    }

    if (updateRoomStatusDto.maintenanceStatus !== undefined) {
      data.maintenanceStatus = updateRoomStatusDto.maintenanceStatus;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one room status field is required.',
      );
    }

    const changes = this.buildStatusChanges(room, data);

    if (changes.length === 0) {
      return this.serializeRoom(room);
    }

    return this.applyStatusChanges({
      currentUser,
      room,
      data,
      changes,
      reason: this.normalizeOptionalString(updateRoomStatusDto.reason),
      auditAction: 'rooms.status_updated',
    });
  }

  async markOutOfOrder(
    currentUser: CurrentUserPayload,
    roomId: number,
    markRoomOutOfOrderDto: MarkRoomOutOfOrderDto,
  ) {
    const room = await this.findRequiredRoom(roomId);
    const data = {
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    };
    const changes = this.buildStatusChanges(room, data);

    if (changes.length === 0) {
      return this.serializeRoom(room);
    }

    return this.applyStatusChanges({
      currentUser,
      room,
      data,
      changes,
      reason: this.normalizeOptionalString(markRoomOutOfOrderDto.reason),
      auditAction: 'rooms.marked_out_of_order',
    });
  }

  async clearOutOfOrder(
    currentUser: CurrentUserPayload,
    roomId: number,
    clearRoomOutOfOrderDto: ClearRoomOutOfOrderDto,
  ) {
    const room = await this.findRequiredRoom(roomId);
    const data = {
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    };
    const changes = this.buildStatusChanges(room, data);

    if (changes.length === 0) {
      return this.serializeRoom(room);
    }

    return this.applyStatusChanges({
      currentUser,
      room,
      data,
      changes,
      reason: this.normalizeOptionalString(clearRoomOutOfOrderDto.reason),
      auditAction: 'rooms.cleared_out_of_order',
    });
  }

  async listStatusLogs(
    _currentUser: CurrentUserPayload,
    roomId: number,
    query: GetRoomStatusLogsQueryDto,
  ) {
    await this.findRequiredRoom(roomId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, statusLogs] = await this.roomsRepository.listStatusLogs({
      roomId,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: statusLogs.map((statusLog) => this.serializeStatusLog(statusLog)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async findRequiredRoom(roomId: number) {
    const room = await this.roomsRepository.findRoom(roomId);

    if (!room) {
      throw new NotFoundException('Room was not found.');
    }

    return room;
  }

  private async ensureActiveFloor(floorId: number) {
    const floor = await this.floorsRepository.findFloor(floorId);

    if (!floor) {
      throw new NotFoundException('Floor was not found.');
    }

    if (!floor.isActive) {
      throw new BadRequestException('Cannot assign an inactive floor.');
    }
  }

  private async ensureActiveRoomType(roomTypeId: number) {
    const roomType = await this.roomTypesRepository.findRoomType(roomTypeId);

    if (!roomType) {
      throw new NotFoundException('Room type was not found.');
    }

    if (!roomType.isActive) {
      throw new BadRequestException('Cannot assign an inactive room type.');
    }
  }

  private serializeRoom(room: RoomRecord) {
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      displayName: room.displayName,
      floorId: room.floorId,
      roomTypeId: room.roomTypeId,
      occupancyStatus: room.occupancyStatus,
      cleaningStatus: room.cleaningStatus,
      maintenanceStatus: room.maintenanceStatus,
      notes: room.notes,
      isActive: room.isActive,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      floor: room.floor
        ? {
            id: room.floor.id,
            number: room.floor.number,
            name: room.floor.name,
            isActive: room.floor.isActive,
          }
        : null,
      roomType: {
        id: room.roomType.id,
        name: room.roomType.name,
        code: room.roomType.code,
        baseOccupancy: room.roomType.baseOccupancy,
        maxOccupancy: room.roomType.maxOccupancy,
        baseRate: this.serializeBaseRate(room.roomType.baseRate),
        isActive: room.roomType.isActive,
      },
    };
  }

  private serializeStatusLog(statusLog: RoomStatusLogRecord) {
    return {
      id: statusLog.id,
      roomId: statusLog.roomId,
      field: statusLog.field,
      oldValue: statusLog.oldValue,
      newValue: statusLog.newValue,
      reason: statusLog.reason,
      createdAt: statusLog.createdAt,
      actor: statusLog.actorUser
        ? {
            id: statusLog.actorUser.id,
            email: statusLog.actorUser.email,
            fullName: statusLog.actorUser.fullName,
          }
        : null,
    };
  }

  private async applyStatusChanges({
    currentUser,
    room,
    data,
    changes,
    reason,
    auditAction,
  }: {
    currentUser: CurrentUserPayload;
    room: RoomRecord;
    data: RoomStatusUpdateData;
    changes: RoomStatusChange[];
    reason: string | null;
    auditAction: string;
  }) {
    const updatedRoom = await this.roomsRepository.updateRoom(room.id, data);

    await this.roomsRepository.createStatusLogs(
      changes.map((change) => ({
        roomId: room.id,
        actorUserId: currentUser.sub,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        reason,
      })),
    );

    await this.recordRoomAudit(currentUser, auditAction, updatedRoom, {
      previous: this.statusChangeSnapshot(changes, 'oldValue'),
      changes: this.statusChangeSnapshot(changes, 'newValue'),
      reason,
    });

    return this.serializeRoom(updatedRoom);
  }

  private buildStatusChanges(room: RoomRecord, data: RoomStatusUpdateData) {
    const changes: RoomStatusChange[] = [];

    this.collectStatusChange(changes, room, data, 'occupancyStatus');
    this.collectStatusChange(changes, room, data, 'cleaningStatus');
    this.collectStatusChange(changes, room, data, 'maintenanceStatus');

    return changes;
  }

  private collectStatusChange(
    changes: RoomStatusChange[],
    room: RoomRecord,
    data: RoomStatusUpdateData,
    field: RoomStatusField,
  ) {
    const newValue = data[field];

    if (newValue === undefined || newValue === room[field]) {
      return;
    }

    changes.push({
      field,
      oldValue: room[field],
      newValue,
    });
  }

  private statusChangeSnapshot(
    changes: RoomStatusChange[],
    valueKey: 'oldValue' | 'newValue',
  ) {
    const snapshot: Record<string, string> = {};

    for (const change of changes) {
      snapshot[change.field] = change[valueKey];
    }

    return snapshot;
  }

  private recordRoomAudit(
    currentUser: CurrentUserPayload,
    action: string,
    room: RoomRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Room',
      entityId: String(room.id),
      metadata,
    });
  }

  private auditSnapshot(room: RoomRecord) {
    return {
      roomNumber: room.roomNumber,
      displayName: room.displayName,
      floorId: room.floorId,
      roomTypeId: room.roomTypeId,
      notes: room.notes,
      isActive: room.isActive,
    };
  }

  private serializeBaseRate(value: Prisma.Decimal | null) {
    return value?.toString() ?? null;
  }

  private normalizeRequiredString(value: string, message: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }
}
