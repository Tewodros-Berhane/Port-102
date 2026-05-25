import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { GetFloorsQueryDto } from './dto/get-floors-query.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import {
  FloorRecord,
  FloorsRepository,
} from './repositories/floors.repository';

@Injectable()
export class FloorsService {
  constructor(
    private readonly floorsRepository: FloorsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    currentUser: CurrentUserPayload,
    createFloorDto: CreateFloorDto,
  ) {
    const name = this.normalizeRequiredString(
      createFloorDto.name,
      'Floor name is required.',
    );
    const existingFloor = await this.floorsRepository.findByName(name);

    if (existingFloor) {
      throw new ConflictException('Floor name already exists.');
    }

    const floor = await this.floorsRepository.createFloor({
      name,
      number: createFloorDto.number ?? null,
      description: this.normalizeOptionalString(createFloorDto.description),
    });

    await this.recordFloorAudit(currentUser, 'floors.created', floor, {
      name: floor.name,
      number: floor.number,
    });

    return this.serializeFloor(floor);
  }

  async list(_currentUser: CurrentUserPayload, query: GetFloorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, floors] = await this.floorsRepository.listFloors({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      isActive: query.isActive,
    });

    return {
      items: floors.map((floor) => this.serializeFloor(floor)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, floorId: number) {
    const floor = await this.findRequiredFloor(floorId);

    return this.serializeFloor(floor);
  }

  async update(
    currentUser: CurrentUserPayload,
    floorId: number,
    updateFloorDto: UpdateFloorDto,
  ) {
    const floor = await this.findRequiredFloor(floorId);
    const data: {
      name?: string;
      number?: number | null;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (updateFloorDto.name !== undefined) {
      const name = this.normalizeRequiredString(
        updateFloorDto.name,
        'Floor name is required.',
      );

      if (name !== floor.name) {
        const duplicateFloor = await this.floorsRepository.findByName(
          name,
          floor.id,
        );

        if (duplicateFloor) {
          throw new ConflictException('Floor name already exists.');
        }
      }

      data.name = name;
    }

    if (updateFloorDto.number !== undefined) {
      data.number = updateFloorDto.number;
    }

    if (updateFloorDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateFloorDto.description,
      );
    }

    if (updateFloorDto.isActive !== undefined) {
      if (updateFloorDto.isActive === false && floor.isActive) {
        await this.ensureFloorCanBeDeactivated(floor.id);
      }

      data.isActive = updateFloorDto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return this.serializeFloor(floor);
    }

    const updatedFloor = await this.floorsRepository.updateFloor(
      floor.id,
      data,
    );

    await this.recordFloorAudit(currentUser, 'floors.updated', updatedFloor, {
      previous: {
        name: floor.name,
        number: floor.number,
        description: floor.description,
        isActive: floor.isActive,
      },
      changes: data,
    });

    return this.serializeFloor(updatedFloor);
  }

  async remove(currentUser: CurrentUserPayload, floorId: number) {
    const floor = await this.findRequiredFloor(floorId);

    if (!floor.isActive) {
      return this.serializeFloor(floor);
    }

    await this.ensureFloorCanBeDeactivated(floor.id);

    const updatedFloor = await this.floorsRepository.updateFloor(floor.id, {
      isActive: false,
    });

    await this.recordFloorAudit(
      currentUser,
      'floors.deactivated',
      updatedFloor,
      {
        previous: {
          isActive: floor.isActive,
        },
        changes: {
          isActive: false,
        },
      },
    );

    return this.serializeFloor(updatedFloor);
  }

  private async findRequiredFloor(floorId: number) {
    const floor = await this.floorsRepository.findFloor(floorId);

    if (!floor) {
      throw new NotFoundException('Floor was not found.');
    }

    return floor;
  }

  private async ensureFloorCanBeDeactivated(floorId: number) {
    const activeRoomCount =
      await this.floorsRepository.countActiveRooms(floorId);

    if (activeRoomCount > 0) {
      throw new BadRequestException(
        'Cannot deactivate a floor with active rooms assigned.',
      );
    }
  }

  private serializeFloor(floor: FloorRecord) {
    return {
      id: floor.id,
      number: floor.number,
      name: floor.name,
      description: floor.description,
      isActive: floor.isActive,
      createdAt: floor.createdAt,
      updatedAt: floor.updatedAt,
    };
  }

  private recordFloorAudit(
    currentUser: CurrentUserPayload,
    action: string,
    floor: FloorRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Floor',
      entityId: String(floor.id),
      metadata,
    });
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
