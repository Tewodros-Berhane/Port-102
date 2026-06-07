import { Injectable } from '@nestjs/common';

import { MenuItemStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const menuItemSelect = {
  id: true,
  outletId: true,
  name: true,
  code: true,
  category: true,
  description: true,
  price: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  outlet: {
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
    },
  },
} as const;

export type MenuItemRecord = Prisma.MenuItemGetPayload<{
  select: typeof menuItemSelect;
}>;

@Injectable()
export class MenuItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMenuItem(data: Prisma.MenuItemUncheckedCreateInput) {
    return this.prisma.menuItem.create({
      data,
      select: menuItemSelect,
    });
  }

  findMenuItem(menuItemId: number) {
    return this.prisma.menuItem.findUnique({
      where: {
        id: menuItemId,
      },
      select: menuItemSelect,
    });
  }

  findByOutletAndCode(
    outletId: number,
    code: string,
    excludeMenuItemId?: number,
  ) {
    return this.prisma.menuItem.findFirst({
      where: {
        outletId,
        code,
        ...(excludeMenuItemId ? { id: { not: excludeMenuItemId } } : {}),
      },
      select: menuItemSelect,
    });
  }

  listMenuItems({
    skip,
    take,
    search,
    outletId,
    status,
    category,
  }: {
    skip: number;
    take: number;
    search?: string;
    outletId?: number;
    status?: MenuItemStatus;
    category?: string;
  }) {
    const where: Prisma.MenuItemWhereInput = {
      ...(outletId === undefined ? {} : { outletId }),
      ...(status ? { status } : {}),
      ...(category
        ? {
            category: {
              equals: category,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.menuItem.count({ where }),
      this.prisma.menuItem.findMany({
        where,
        skip,
        take,
        select: menuItemSelect,
        orderBy: [{ outletId: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updateMenuItem(
    menuItemId: number,
    data: Prisma.MenuItemUncheckedUpdateInput,
  ) {
    return this.prisma.menuItem.update({
      where: {
        id: menuItemId,
      },
      data,
      select: menuItemSelect,
    });
  }
}
