import { Injectable } from '@nestjs/common';

import {
  MenuItemStatus,
  PosOrderPaymentStatus,
  PosOrderStatus,
  Prisma,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface RestaurantReportFilters {
  outletId?: number;
  createdFrom?: Date;
  createdTo?: Date;
}

const inHouseStaySelect = {
  id: true,
  stayNumber: true,
  expectedCheckOutDate: true,
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  },
  folio: {
    select: {
      id: true,
      folioNumber: true,
      status: true,
      balanceAmount: true,
    },
  },
  roomAssignments: {
    where: { status: StayRoomAssignmentStatus.ACTIVE },
    select: {
      roomId: true,
      assignedAt: true,
      room: {
        select: {
          id: true,
          roomNumber: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
    take: 1,
  },
} as const;

export type InHouseStayRecord = Prisma.StayGetPayload<{
  select: typeof inHouseStaySelect;
}>;

@Injectable()
export class RestaurantReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(filters: RestaurantReportFilters) {
    const orderWhere = this.orderWhere(filters);
    const closedOrderWhere: Prisma.PosOrderWhereInput = {
      ...orderWhere,
      status: PosOrderStatus.CLOSED,
    };
    const paymentWhere: Prisma.PosOrderPaymentWhereInput = {
      isVoided: false,
      order: { is: closedOrderWhere },
    };

    const [
      totalOrders,
      closedOrders,
      cancelledOrders,
      grossSales,
      directPayments,
      roomCharges,
      unpaidBalance,
      outletGroups,
      paymentGroups,
    ] = await Promise.all([
      this.prisma.posOrder.count({ where: orderWhere }),
      this.prisma.posOrder.count({ where: closedOrderWhere }),
      this.prisma.posOrder.count({
        where: { ...orderWhere, status: PosOrderStatus.CANCELLED },
      }),
      this.prisma.posOrder.aggregate({
        where: closedOrderWhere,
        _sum: { totalAmount: true },
      }),
      this.prisma.posOrderPayment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
      }),
      this.prisma.posOrder.aggregate({
        where: {
          ...closedOrderWhere,
          paymentStatus: PosOrderPaymentStatus.CHARGED_TO_ROOM,
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.posOrder.aggregate({
        where: {
          ...orderWhere,
          status: PosOrderStatus.OPEN,
          balanceAmount: { gt: 0 },
        },
        _sum: { balanceAmount: true },
      }),
      this.prisma.posOrder.groupBy({
        by: ['outletId'],
        where: closedOrderWhere,
        _count: { _all: true },
        _sum: { totalAmount: true },
        orderBy: { outletId: 'asc' },
      }),
      this.prisma.posOrderPayment.groupBy({
        by: ['method'],
        where: paymentWhere,
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { method: 'asc' },
      }),
    ]);
    const outletIds = outletGroups.map((group) => group.outletId);
    const outlets = outletIds.length
      ? await this.prisma.outlet.findMany({
          where: { id: { in: outletIds } },
          select: { id: true, name: true, code: true },
        })
      : [];

    return {
      totalOrders,
      closedOrders,
      cancelledOrders,
      grossSales: grossSales._sum.totalAmount,
      directPayments: directPayments._sum.amount,
      roomCharges: roomCharges._sum.totalAmount,
      unpaidBalance: unpaidBalance._sum.balanceAmount,
      outletGroups,
      paymentGroups,
      outlets,
    };
  }

  async getDashboardCounts(filters: RestaurantReportFilters) {
    const orderWhere = this.orderWhere(filters);

    const [openOrders, unpaidOrders, activeOutlets, unavailableMenuItems] =
      await Promise.all([
        this.prisma.posOrder.count({
          where: { ...orderWhere, status: PosOrderStatus.OPEN },
        }),
        this.prisma.posOrder.count({
          where: {
            ...orderWhere,
            status: PosOrderStatus.OPEN,
            balanceAmount: { gt: 0 },
          },
        }),
        this.prisma.outlet.count({
          where: {
            isActive: true,
            ...(filters.outletId === undefined ? {} : { id: filters.outletId }),
          },
        }),
        this.prisma.menuItem.count({
          where: {
            status: {
              in: [MenuItemStatus.INACTIVE, MenuItemStatus.OUT_OF_STOCK],
            },
            ...(filters.outletId === undefined
              ? {}
              : { outletId: filters.outletId }),
          },
        }),
      ]);

    return { openOrders, unpaidOrders, activeOutlets, unavailableMenuItems };
  }

  searchInHouseGuests({
    skip,
    take,
    search,
  }: {
    skip: number;
    take: number;
    search?: string;
  }) {
    const where: Prisma.StayWhereInput = {
      status: StayStatus.ACTIVE,
      roomAssignments: {
        some: { status: StayRoomAssignmentStatus.ACTIVE },
      },
      ...(search
        ? {
            OR: [
              { stayNumber: { contains: search, mode: 'insensitive' } },
              {
                guest: {
                  is: {
                    OR: [
                      {
                        firstName: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        lastName: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
              {
                roomAssignments: {
                  some: {
                    status: StayRoomAssignmentStatus.ACTIVE,
                    room: {
                      roomNumber: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.stay.count({ where }),
      this.prisma.stay.findMany({
        where,
        skip,
        take,
        select: inHouseStaySelect,
        orderBy: [{ checkedInAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  private orderWhere(
    filters: RestaurantReportFilters,
  ): Prisma.PosOrderWhereInput {
    return {
      ...(filters.outletId === undefined ? {} : { outletId: filters.outletId }),
      ...(filters.createdFrom || filters.createdTo
        ? {
            createdAt: {
              ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
              ...(filters.createdTo ? { lte: filters.createdTo } : {}),
            },
          }
        : {}),
    };
  }
}
