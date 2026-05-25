import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const roomAmenitySelect = {
  id: true,
  name: true,
  key: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type RoomAmenityRecord = Prisma.RoomAmenityGetPayload<{
  select: typeof roomAmenitySelect;
}>;

@Injectable()
export class RoomAmenitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createAmenity(data: {
    name: string;
    key: string;
    description?: string | null;
  }) {
    return this.prisma.roomAmenity.create({
      data: {
        name: data.name,
        key: data.key,
        description: data.description ?? null,
      },
      select: roomAmenitySelect,
    });
  }

  findByKey(key: string, excludeAmenityId?: number) {
    return this.prisma.roomAmenity.findFirst({
      where: {
        key,
        ...(excludeAmenityId ? { id: { not: excludeAmenityId } } : {}),
      },
      select: roomAmenitySelect,
    });
  }

  listAmenities({
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
    const where: Prisma.RoomAmenityWhereInput = {
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
                key: {
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
      this.prisma.roomAmenity.count({ where }),
      this.prisma.roomAmenity.findMany({
        where,
        skip,
        take,
        select: roomAmenitySelect,
        orderBy: [{ name: 'asc' }, { key: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  findAmenity(amenityId: number) {
    return this.prisma.roomAmenity.findUnique({
      where: {
        id: amenityId,
      },
      select: roomAmenitySelect,
    });
  }

  updateAmenity(
    amenityId: number,
    data: {
      name?: string;
      key?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.roomAmenity.update({
      where: {
        id: amenityId,
      },
      data,
      select: roomAmenitySelect,
    });
  }
}
