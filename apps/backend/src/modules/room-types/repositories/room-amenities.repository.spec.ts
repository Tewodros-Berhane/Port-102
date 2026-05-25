import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { RoomAmenitiesRepository } from './room-amenities.repository';

describe('RoomAmenitiesRepository', () => {
  let repository: RoomAmenitiesRepository;
  let prisma: {
    roomAmenity: {
      create: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      roomAmenity: {
        create: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomAmenitiesRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<RoomAmenitiesRepository>(RoomAmenitiesRepository);
  });

  it('creates amenities through PrismaService', async () => {
    await repository.createAmenity({
      name: 'Wi-Fi',
      key: 'wifi',
      description: null,
    });

    expect(prisma.roomAmenity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Wi-Fi',
          key: 'wifi',
          description: null,
        },
      }),
    );
  });

  it('finds duplicate keys while excluding the current amenity when requested', async () => {
    await repository.findByKey('wifi', 7);

    expect(prisma.roomAmenity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          key: 'wifi',
          id: {
            not: 7,
          },
        },
      }),
    );
  });

  it('lists amenities with search, active filter, pagination, and stable ordering', async () => {
    prisma.roomAmenity.count.mockResolvedValue(0);
    prisma.roomAmenity.findMany.mockResolvedValue([]);

    await repository.listAmenities({
      skip: 10,
      take: 5,
      search: 'wifi',
      isActive: true,
    });

    expect(prisma.roomAmenity.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isActive: true,
        OR: expect.any(Array),
      }),
    });
    expect(prisma.roomAmenity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ name: 'asc' }, { key: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('soft-updates amenities by id', async () => {
    await repository.updateAmenity(7, {
      isActive: false,
    });

    expect(prisma.roomAmenity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 7,
        },
        data: {
          isActive: false,
        },
      }),
    );
  });
});
