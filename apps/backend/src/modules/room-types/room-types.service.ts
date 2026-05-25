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
