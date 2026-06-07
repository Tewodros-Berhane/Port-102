/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';

import { MenuItemStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MenuItemsRepository } from './menu-items.repository';

describe('MenuItemsRepository', () => {
  let repository: MenuItemsRepository;
  let prisma: {
    menuItem: {
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
      menuItem: {
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
        MenuItemsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<MenuItemsRepository>(MenuItemsRepository);
  });

  it('creates and finds menu items through PrismaService', async () => {
    await repository.createMenuItem({
      outletId: 2,
      name: 'Special Tibs',
      code: 'TIBS-01',
      price: new Prisma.Decimal(450),
    });
    await repository.findMenuItem(7);
    await repository.findByOutletAndCode(2, 'TIBS-01', 7);

    expect(prisma.menuItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outletId: 2,
          code: 'TIBS-01',
        }),
      }),
    );
    expect(prisma.menuItem.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 } }),
    );
    expect(prisma.menuItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          outletId: 2,
          code: 'TIBS-01',
          id: { not: 7 },
        },
      }),
    );
  });

  it('lists menu items with pagination and filters', async () => {
    prisma.menuItem.count.mockResolvedValue(0);
    prisma.menuItem.findMany.mockResolvedValue([]);

    await repository.listMenuItems({
      skip: 20,
      take: 20,
      search: 'tibs',
      outletId: 2,
      status: MenuItemStatus.ACTIVE,
      category: 'Main Course',
    });

    expect(prisma.menuItem.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        outletId: 2,
        status: MenuItemStatus.ACTIVE,
        category: {
          equals: 'Main Course',
          mode: 'insensitive',
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [{ outletId: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates menu items through PrismaService', async () => {
    await repository.updateMenuItem(7, {
      status: MenuItemStatus.OUT_OF_STOCK,
    });

    expect(prisma.menuItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { status: MenuItemStatus.OUT_OF_STOCK },
      }),
    );
  });
});
