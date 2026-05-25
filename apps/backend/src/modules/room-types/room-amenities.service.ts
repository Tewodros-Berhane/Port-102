import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateRoomAmenityDto } from './dto/create-room-amenity.dto';
import { GetRoomAmenitiesQueryDto } from './dto/get-room-amenities-query.dto';
import { UpdateRoomAmenityDto } from './dto/update-room-amenity.dto';
import {
  RoomAmenityRecord,
  RoomAmenitiesRepository,
} from './repositories/room-amenities.repository';

@Injectable()
export class RoomAmenitiesService {
  constructor(
    private readonly roomAmenitiesRepository: RoomAmenitiesRepository,
  ) {}

  async create(
    _currentUser: CurrentUserPayload,
    createRoomAmenityDto: CreateRoomAmenityDto,
  ) {
    const name = this.normalizeRequiredString(
      createRoomAmenityDto.name,
      'Amenity name is required.',
    );
    const key = this.normalizeAmenityKey(createRoomAmenityDto.key);
    const existingAmenity = await this.roomAmenitiesRepository.findByKey(key);

    if (existingAmenity) {
      throw new ConflictException('Amenity key already exists.');
    }

    const amenity = await this.roomAmenitiesRepository.createAmenity({
      name,
      key,
      description: this.normalizeOptionalString(
        createRoomAmenityDto.description,
      ),
    });

    return this.serializeAmenity(amenity);
  }

  async list(
    _currentUser: CurrentUserPayload,
    query: GetRoomAmenitiesQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, amenities] = await this.roomAmenitiesRepository.listAmenities(
      {
        skip: (page - 1) * limit,
        take: limit,
        search: search ?? undefined,
        isActive: query.isActive,
      },
    );

    return {
      items: amenities.map((amenity) => this.serializeAmenity(amenity)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, amenityId: number) {
    const amenity = await this.findRequiredAmenity(amenityId);

    return this.serializeAmenity(amenity);
  }

  async update(
    _currentUser: CurrentUserPayload,
    amenityId: number,
    updateRoomAmenityDto: UpdateRoomAmenityDto,
  ) {
    const amenity = await this.findRequiredAmenity(amenityId);
    const data: {
      name?: string;
      key?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (updateRoomAmenityDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateRoomAmenityDto.name,
        'Amenity name is required.',
      );
    }

    if (updateRoomAmenityDto.key !== undefined) {
      const key = this.normalizeAmenityKey(updateRoomAmenityDto.key);

      if (key !== amenity.key) {
        const duplicateAmenity = await this.roomAmenitiesRepository.findByKey(
          key,
          amenity.id,
        );

        if (duplicateAmenity) {
          throw new ConflictException('Amenity key already exists.');
        }
      }

      data.key = key;
    }

    if (updateRoomAmenityDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateRoomAmenityDto.description,
      );
    }

    if (updateRoomAmenityDto.isActive !== undefined) {
      data.isActive = updateRoomAmenityDto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return this.serializeAmenity(amenity);
    }

    const updatedAmenity = await this.roomAmenitiesRepository.updateAmenity(
      amenity.id,
      data,
    );

    return this.serializeAmenity(updatedAmenity);
  }

  async remove(_currentUser: CurrentUserPayload, amenityId: number) {
    const amenity = await this.findRequiredAmenity(amenityId);

    if (!amenity.isActive) {
      return this.serializeAmenity(amenity);
    }

    const updatedAmenity = await this.roomAmenitiesRepository.updateAmenity(
      amenity.id,
      {
        isActive: false,
      },
    );

    return this.serializeAmenity(updatedAmenity);
  }

  private async findRequiredAmenity(amenityId: number) {
    const amenity = await this.roomAmenitiesRepository.findAmenity(amenityId);

    if (!amenity) {
      throw new NotFoundException('Room amenity was not found.');
    }

    return amenity;
  }

  private serializeAmenity(amenity: RoomAmenityRecord) {
    return {
      id: amenity.id,
      name: amenity.name,
      key: amenity.key,
      description: amenity.description,
      isActive: amenity.isActive,
      createdAt: amenity.createdAt,
      updatedAt: amenity.updatedAt,
    };
  }

  private normalizeAmenityKey(key: string) {
    const normalized = this.normalizeRequiredString(
      key,
      'Amenity key is required.',
    ).toLowerCase();

    if (!/^[a-z0-9_.-]+$/.test(normalized)) {
      throw new BadRequestException(
        'Amenity key may only contain letters, numbers, underscores, periods, and hyphens.',
      );
    }

    return normalized;
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
