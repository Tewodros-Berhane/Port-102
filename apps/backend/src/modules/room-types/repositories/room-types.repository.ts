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
