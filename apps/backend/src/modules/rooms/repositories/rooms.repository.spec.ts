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
          roomTypeId: 4,
          notes: null,
        },
      }),
    );
  });

  it('finds duplicate room numbers while excluding the current room when requested', async () => {
    await repository.findByRoomNumber('101', 9);

    expect(prisma.room.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          roomNumber: '101',
          id: {
            not: 9,
          },
        },
      }),
    );
  });

  it('lists rooms with filters, pagination, search, and stable ordering', async () => {
    prisma.room.count.mockResolvedValue(0);
    prisma.room.findMany.mockResolvedValue([]);

    await repository.listRooms({
      skip: 10,
      take: 5,
      search: 'deluxe',
      floorId: 3,
      roomTypeId: 4,
      occupancyStatus: RoomOccupancyStatus.VACANT,
      cleaningStatus: RoomCleaningStatus.CLEAN,
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      isActive: true,
    });

    expect(prisma.room.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isActive: true,
        floorId: 3,
        roomTypeId: 4,
        occupancyStatus: RoomOccupancyStatus.VACANT,
        cleaningStatus: RoomCleaningStatus.CLEAN,
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
        OR: expect.any(Array),
      }),
    });
    expect(prisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ roomNumber: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates rooms by id', async () => {
    await repository.updateRoom(9, {
      displayName: null,
      floorId: null,
    });

    expect(prisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 9,
        },
        data: {
          displayName: null,
          floorId: null,
