import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { FloorsRepository } from './floors.repository';

describe('FloorsRepository', () => {
  let repository: FloorsRepository;
  let prisma: {
    floor: {
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
  };

  beforeEach(async () => {
    prisma = {
      floor: {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloorsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<FloorsRepository>(FloorsRepository);
  });

  it('creates floors through PrismaService', async () => {
    await repository.createFloor({
      name: 'First Floor',
      number: 1,
      description: null,
    });

    expect(prisma.floor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'First Floor',
          number: 1,
          description: null,
        },
      }),
    );
  });

  it('finds duplicate names while excluding the current floor when requested', async () => {
    await repository.findByName('First Floor', 10);

    expect(prisma.floor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: 'First Floor',
          id: {
            not: 10,
          },
        },
      }),
    );
  });

  it('lists floors with search, active filter, pagination, and stable ordering', async () => {
    prisma.floor.count.mockResolvedValue(0);
    prisma.floor.findMany.mockResolvedValue([]);

    await repository.listFloors({
      skip: 10,
      take: 5,
      search: 'first',
      isActive: true,
    });

    expect(prisma.floor.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isActive: true,
        OR: expect.any(Array),
      }),
    });
    expect(prisma.floor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ number: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('counts active rooms assigned to a floor', async () => {
    await repository.countActiveRooms(10);

    expect(prisma.room.count).toHaveBeenCalledWith({
      where: {
        floorId: 10,
        isActive: true,
      },
    });
  });
});
