import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const floorSelect = {
  id: true,
  number: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type FloorRecord = Prisma.FloorGetPayload<{
  select: typeof floorSelect;
}>;

@Injectable()
export class FloorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createFloor(data: {
    name: string;
    number?: number | null;
    description?: string | null;
  }) {
    return this.prisma.floor.create({
      data: {
        name: data.name,
        number: data.number ?? null,
        description: data.description ?? null,
      },
      select: floorSelect,
    });
  }

  findByName(name: string, excludeFloorId?: number) {
    return this.prisma.floor.findFirst({
      where: {
        name,
        ...(excludeFloorId ? { id: { not: excludeFloorId } } : {}),
      },
      select: floorSelect,
    });
  }

  listFloors({
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
    const where: Prisma.FloorWhereInput = {
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
      this.prisma.floor.count({ where }),
      this.prisma.floor.findMany({
        where,
        skip,
        take,
        select: floorSelect,
        orderBy: [{ number: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  findFloor(floorId: number) {
    return this.prisma.floor.findUnique({
      where: {
        id: floorId,
      },
      select: floorSelect,
    });
  }

  updateFloor(
    floorId: number,
    data: {
      name?: string;
      number?: number | null;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.floor.update({
      where: {
        id: floorId,
      },
      data,
      select: floorSelect,
    });
  }

  countActiveRooms(floorId: number) {
    return this.prisma.room.count({
      where: {
        floorId,
        isActive: true,
      },
    });
  }
}
