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
    }).compile();

    repository = module.get<RoomTypesRepository>(RoomTypesRepository);
  });

  it('creates room types through PrismaService', async () => {
    await repository.createRoomType({
      name: 'Deluxe King',
      code: 'DLX-KING',
      description: null,
      baseOccupancy: 2,
      maxOccupancy: 3,
      baseRate: '125.50',
    });

    expect(prisma.roomType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Deluxe King',
          code: 'DLX-KING',
          description: null,
          baseOccupancy: 2,
          maxOccupancy: 3,
          baseRate: '125.50',
        },
      }),
    );
  });

  it('finds duplicate codes while excluding the current room type when requested', async () => {
    await repository.findByCode('DLX-KING', 11);

    expect(prisma.roomType.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          code: 'DLX-KING',
          id: {
            not: 11,
          },
        },
      }),
    );
  });

  it('lists room types with search, active filter, pagination, and stable ordering', async () => {
    prisma.roomType.count.mockResolvedValue(0);
    prisma.roomType.findMany.mockResolvedValue([]);

    await repository.listRoomTypes({
      skip: 10,
      take: 5,
      search: 'deluxe',
      isActive: true,
    });

    expect(prisma.roomType.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isActive: true,
        OR: expect.any(Array),
      }),
    });
    expect(prisma.roomType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ name: 'asc' }, { code: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('counts active rooms assigned to a room type', async () => {
    await repository.countActiveRooms(11);

    expect(prisma.room.count).toHaveBeenCalledWith({
      where: {
        roomTypeId: 11,
        isActive: true,
      },
    });
  });

  it('creates and deletes room type amenity assignments', async () => {
    await repository.assignAmenities(11, [5, 6]);
    await repository.removeAmenity(11, 5);

    expect(prisma.roomTypeAmenity.createMany).toHaveBeenCalledWith({
      data: [
        {
          roomTypeId: 11,
          amenityId: 5,
        },
        {
          roomTypeId: 11,
          amenityId: 6,
        },
      ],
      skipDuplicates: false,
    });
    expect(prisma.roomTypeAmenity.delete).toHaveBeenCalledWith({
      where: {
        roomTypeId_amenityId: {
          roomTypeId: 11,
          amenityId: 5,
        },
      },
    });
  });
});
