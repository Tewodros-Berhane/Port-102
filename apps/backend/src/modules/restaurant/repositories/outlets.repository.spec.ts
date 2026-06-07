/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { OutletType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutletsRepository } from './outlets.repository';

describe('OutletsRepository', () => {
  let repository: OutletsRepository;
  let prisma: {
    outlet: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      outlet: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<OutletsRepository>(OutletsRepository);
  });

  it('creates outlets through PrismaService', async () => {
    await repository.createOutlet({
      name: 'Main Restaurant',
      code: 'MAIN-RESTAURANT',
      type: OutletType.RESTAURANT,
    });

    expect(prisma.outlet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Main Restaurant',
          code: 'MAIN-RESTAURANT',
          type: OutletType.RESTAURANT,
        },
      }),
    );
  });

  it('finds outlets by id and code', async () => {
    await repository.findOutlet(4);
    await repository.findByCode('MAIN-RESTAURANT', 4);

    expect(prisma.outlet.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 4,
        },
      }),
    );
    expect(prisma.outlet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          code: 'MAIN-RESTAURANT',
          id: {
            not: 4,
          },
        },
      }),
    );
  });

  it('lists outlets with filters and pagination', async () => {
    prisma.outlet.count.mockResolvedValue(0);
    prisma.outlet.findMany.mockResolvedValue([]);

    await repository.listOutlets({
      skip: 10,
      take: 10,
      search: 'main',
      type: OutletType.RESTAURANT,
      isActive: true,
    });

    expect(prisma.outlet.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        type: OutletType.RESTAURANT,
        isActive: true,
        OR: expect.any(Array),
      }),
    });
    expect(prisma.outlet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates outlets through PrismaService', async () => {
    await repository.updateOutlet(4, {
      isActive: false,
    });

    expect(prisma.outlet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 4,
        },
        data: {
          isActive: false,
        },
      }),
    );
  });
});
