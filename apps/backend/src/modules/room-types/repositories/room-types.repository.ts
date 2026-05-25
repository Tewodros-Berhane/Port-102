import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const amenitySelect = {
  id: true,
  name: true,
  key: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const roomTypeSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  baseOccupancy: true,
  maxOccupancy: true,
  baseRate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  amenities: {
    select: {
      createdAt: true,
      amenity: {
        select: amenitySelect,
      },
    },
    orderBy: {
      amenity: {
        name: 'asc',
      },
    },
  },
} as const;

export type RoomTypeRecord = Prisma.RoomTypeGetPayload<{
  select: typeof roomTypeSelect;
}>;

@Injectable()
export class RoomTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRoomType(data: {
    name: string;
    code: string;
    description?: string | null;
    baseOccupancy: number;
    maxOccupancy: number;
    baseRate?: string | null;
  }) {
    return this.prisma.roomType.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        baseOccupancy: data.baseOccupancy,
        maxOccupancy: data.maxOccupancy,
        baseRate: data.baseRate ?? null,
      },
      select: roomTypeSelect,
    });
  }

  findByCode(code: string, excludeRoomTypeId?: number) {
    return this.prisma.roomType.findFirst({
      where: {
        code,
        ...(excludeRoomTypeId ? { id: { not: excludeRoomTypeId } } : {}),
      },
      select: roomTypeSelect,
    });
  }

  listRoomTypes({
    skip,
    take,
    search,
    isActive,
  }: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.RoomTypeWhereInput = {
      ...(isActive === undefined ? {} : { isActive }),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.roomType.count({ where }),
      this.prisma.roomType.findMany({
        where,
        skip,
        take,
        select: roomTypeSelect,
        orderBy: [{ name: 'asc' }, { code: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  findRoomType(roomTypeId: number) {
    return this.prisma.roomType.findUnique({
      where: {
        id: roomTypeId,
      },
      select: roomTypeSelect,
    });
  }

  updateRoomType(
    roomTypeId: number,
    data: {
      name?: string;
      code?: string;
      description?: string | null;
      baseOccupancy?: number;
      maxOccupancy?: number;
      baseRate?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.roomType.update({
      where: {
        id: roomTypeId,
      },
      data,
      select: roomTypeSelect,
    });
  }

  countActiveRooms(roomTypeId: number) {
    return this.prisma.room.count({
      where: {
        roomTypeId,
        isActive: true,
      },
    });
  }

  findAssignedAmenityIds(roomTypeId: number, amenityIds: number[]) {
    return this.prisma.roomTypeAmenity.findMany({
      where: {
        roomTypeId,
        amenityId: {
          in: amenityIds,
        },
      },
      select: {
        amenityId: true,
      },
    });
  }

  assignAmenities(roomTypeId: number, amenityIds: number[]) {
    return this.prisma.roomTypeAmenity.createMany({
      data: amenityIds.map((amenityId) => ({
        roomTypeId,
        amenityId,
      })),
      skipDuplicates: false,
    });
  }

  removeAmenity(roomTypeId: number, amenityId: number) {
    return this.prisma.roomTypeAmenity.delete({
      where: {
        roomTypeId_amenityId: {
          roomTypeId,
          amenityId,
        },
      },
    });
  }
}
