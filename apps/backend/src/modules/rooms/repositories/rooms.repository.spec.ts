import { Test, TestingModule } from '@nestjs/testing';

import {
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RoomsRepository } from './rooms.repository';

describe('RoomsRepository', () => {
  let repository: RoomsRepository;
  let prisma: {
    room: {
      create: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    roomStatusLog: {
      createMany: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      room: {
        create: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      roomStatusLog: {
        createMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<RoomsRepository>(RoomsRepository);
  });

  it('creates rooms through PrismaService', async () => {
    await repository.createRoom({
      roomNumber: '101',
      displayName: 'Deluxe 101',
      floorId: 3,
      roomTypeId: 4,
      notes: null,
    });

    expect(prisma.room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          roomNumber: '101',
          displayName: 'Deluxe 101',
          floorId: 3,
