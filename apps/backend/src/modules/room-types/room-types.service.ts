import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AssignRoomTypeAmenitiesDto } from './dto/assign-room-type-amenities.dto';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { GetRoomTypesQueryDto } from './dto/get-room-types-query.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomAmenitiesRepository } from './repositories/room-amenities.repository';
import {
  RoomTypeRecord,
  RoomTypesRepository,
} from './repositories/room-types.repository';

@Injectable()
export class RoomTypesService {
  constructor(
    private readonly roomTypesRepository: RoomTypesRepository,
    private readonly roomAmenitiesRepository: RoomAmenitiesRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    currentUser: CurrentUserPayload,
    createRoomTypeDto: CreateRoomTypeDto,
  ) {
    const name = this.normalizeRequiredString(
      createRoomTypeDto.name,
      'Room type name is required.',
    );
    const code = this.normalizeRoomTypeCode(createRoomTypeDto.code);
    const baseOccupancy = createRoomTypeDto.baseOccupancy ?? 1;
    const maxOccupancy = createRoomTypeDto.maxOccupancy ?? baseOccupancy;

    this.assertValidOccupancy(baseOccupancy, maxOccupancy);

    const existingRoomType = await this.roomTypesRepository.findByCode(code);

    if (existingRoomType) {
      throw new ConflictException('Room type code already exists.');
    }

    const roomType = await this.roomTypesRepository.createRoomType({
      name,
      code,
      description: this.normalizeOptionalString(createRoomTypeDto.description),
      baseOccupancy,
      maxOccupancy,
      baseRate: this.normalizeBaseRate(createRoomTypeDto.baseRate),
    });

    await this.recordRoomTypeAudit(
      currentUser,
      'room_types.created',
      roomType,
      {
        name: roomType.name,
        code: roomType.code,
        baseOccupancy: roomType.baseOccupancy,
        maxOccupancy: roomType.maxOccupancy,
        baseRate: this.serializeBaseRate(roomType.baseRate),
      },
    );

    return this.serializeRoomType(roomType);
  }

  async list(_currentUser: CurrentUserPayload, query: GetRoomTypesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, roomTypes] = await this.roomTypesRepository.listRoomTypes({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      isActive: query.isActive,
    });

    return {
      items: roomTypes.map((roomType) => this.serializeRoomType(roomType)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, roomTypeId: number) {
    const roomType = await this.findRequiredRoomType(roomTypeId);

    return this.serializeRoomType(roomType);
  }

  async update(
    currentUser: CurrentUserPayload,
    roomTypeId: number,
    updateRoomTypeDto: UpdateRoomTypeDto,
  ) {
    const roomType = await this.findRequiredRoomType(roomTypeId);
    const data: {
      name?: string;
      code?: string;
      description?: string | null;
      baseOccupancy?: number;
      maxOccupancy?: number;
      baseRate?: string | null;
      isActive?: boolean;
    } = {};

    if (updateRoomTypeDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateRoomTypeDto.name,
        'Room type name is required.',
      );
    }

    if (updateRoomTypeDto.code !== undefined) {
      const code = this.normalizeRoomTypeCode(updateRoomTypeDto.code);

      if (code !== roomType.code) {
        const duplicateRoomType = await this.roomTypesRepository.findByCode(
          code,
          roomType.id,
        );

        if (duplicateRoomType) {
          throw new ConflictException('Room type code already exists.');
        }
      }

      data.code = code;
    }

    if (updateRoomTypeDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateRoomTypeDto.description,
      );
    }

    if (updateRoomTypeDto.baseOccupancy !== undefined) {
      data.baseOccupancy = updateRoomTypeDto.baseOccupancy;
    }

    if (updateRoomTypeDto.maxOccupancy !== undefined) {
      data.maxOccupancy = updateRoomTypeDto.maxOccupancy;
    }

    this.assertValidOccupancy(
      data.baseOccupancy ?? roomType.baseOccupancy,
      data.maxOccupancy ?? roomType.maxOccupancy,
    );

    if (updateRoomTypeDto.baseRate !== undefined) {
      data.baseRate = this.normalizeBaseRate(updateRoomTypeDto.baseRate);
    }

    if (updateRoomTypeDto.isActive !== undefined) {
      if (updateRoomTypeDto.isActive === false && roomType.isActive) {
        await this.ensureRoomTypeCanBeDeactivated(roomType.id);
      }

      data.isActive = updateRoomTypeDto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return this.serializeRoomType(roomType);
    }

    const updatedRoomType = await this.roomTypesRepository.updateRoomType(
      roomType.id,
      data,
    );

    await this.recordRoomTypeAudit(
      currentUser,
      'room_types.updated',
      updatedRoomType,
      {
        previous: this.auditSnapshot(roomType),
        changes: data,
      },
    );

    return this.serializeRoomType(updatedRoomType);
  }

  async remove(currentUser: CurrentUserPayload, roomTypeId: number) {
    const roomType = await this.findRequiredRoomType(roomTypeId);

    if (!roomType.isActive) {
      return this.serializeRoomType(roomType);
    }

    await this.ensureRoomTypeCanBeDeactivated(roomType.id);

    const updatedRoomType = await this.roomTypesRepository.updateRoomType(
      roomType.id,
      {
        isActive: false,
      },
    );

    await this.recordRoomTypeAudit(
      currentUser,
      'room_types.deactivated',
      updatedRoomType,
      {
        previous: {
          isActive: roomType.isActive,
        },
        changes: {
          isActive: false,
        },
      },
    );

    return this.serializeRoomType(updatedRoomType);
  }

  async assignAmenities(
    currentUser: CurrentUserPayload,
    roomTypeId: number,
    assignRoomTypeAmenitiesDto: AssignRoomTypeAmenitiesDto,
  ) {
    const roomType = await this.findRequiredRoomType(roomTypeId);

    if (!roomType.isActive) {
      throw new BadRequestException(
        'Cannot assign amenities to an inactive room type.',
      );
    }

    const amenityIds = assignRoomTypeAmenitiesDto.amenityIds;
    await this.ensureAmenitiesAreActive(amenityIds);

    const existingAssignments =
      await this.roomTypesRepository.findAssignedAmenityIds(
        roomType.id,
        amenityIds,
      );

    if (existingAssignments.length > 0) {
      throw new ConflictException(
        'One or more amenities are already assigned to this room type.',
      );
    }

    await this.roomTypesRepository.assignAmenities(roomType.id, amenityIds);
    const updatedRoomType = await this.findRequiredRoomType(roomType.id);

    await this.recordRoomTypeAudit(
      currentUser,
      'room_types.amenities_assigned',
      updatedRoomType,
      {
        amenityIds,
      },
    );

    return this.serializeRoomType(updatedRoomType);
  }

  async removeAmenity(
    currentUser: CurrentUserPayload,
