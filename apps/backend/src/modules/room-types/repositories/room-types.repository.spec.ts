import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { RoomTypesRepository } from './room-types.repository';

describe('RoomTypesRepository', () => {
  let repository: RoomTypesRepository;
  let prisma: {
    roomType: {
      create: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    room: {
      count: jest.Mock;
    };
    roomTypeAmenity: {
      findMany: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      roomType: {
        create: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      room: {
        count: jest.fn(),
      },
      roomTypeAmenity: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomTypesRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
