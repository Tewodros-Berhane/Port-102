import { Injectable } from '@nestjs/common';

import {
  PreventiveMaintenanceStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const preventivePlanSelect = {
  id: true,
  planNumber: true,
  assetId: true,
  roomId: true,
  title: true,
  description: true,
  status: true,
  intervalDays: true,
  nextDueDate: true,
  lastCompletedAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  asset: {
    select: {
      id: true,
      assetNumber: true,
      name: true,
      category: true,
      status: true,
    },
  },
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
    },
  },
} as const;

export type PreventiveMaintenancePlanRecord =
  Prisma.PreventiveMaintenancePlanGetPayload<{
    select: typeof preventivePlanSelect;
  }>;

type PreventivePlanClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'preventiveMaintenancePlan'
>;

@Injectable()
export class PreventiveMaintenancePlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPlan(
    data: Prisma.PreventiveMaintenancePlanUncheckedCreateInput,
    client: PreventivePlanClient = this.prisma,
  ) {
    return client.preventiveMaintenancePlan.create({
      data,
      select: preventivePlanSelect,
    });
  }

  findPlan(planId: number, client: PreventivePlanClient = this.prisma) {
    return client.preventiveMaintenancePlan.findUnique({
      where: {
        id: planId,
      },
      select: preventivePlanSelect,
    });
  }

  findByPlanNumber(
    planNumber: string,
    client: PreventivePlanClient = this.prisma,
  ) {
    return client.preventiveMaintenancePlan.findUnique({
      where: {
        planNumber,
      },
      select: preventivePlanSelect,
    });
  }

  listPlans({
    skip,
    take,
    search,
    status,
    assetId,
    roomId,
    dueFrom,
    dueTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: PreventiveMaintenanceStatus;
    assetId?: number;
    roomId?: number;
    dueFrom?: Date;
    dueTo?: Date;
  }) {
    const where: Prisma.PreventiveMaintenancePlanWhereInput = {
      ...(status ? { status } : {}),
      ...(assetId === undefined ? {} : { assetId }),
      ...(roomId === undefined ? {} : { roomId }),
      ...(dueFrom || dueTo
        ? {
            nextDueDate: {
              ...(dueFrom ? { gte: dueFrom } : {}),
              ...(dueTo ? { lte: dueTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                planNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                asset: {
                  OR: [
                    {
                      assetNumber: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      name: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
              {
                room: {
                  OR: [
                    {
                      roomNumber: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      displayName: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.preventiveMaintenancePlan.count({ where }),
      this.prisma.preventiveMaintenancePlan.findMany({
        where,
        skip,
        take,
        select: preventivePlanSelect,
        orderBy: [{ nextDueDate: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updatePlan(
    planId: number,
    data: Prisma.PreventiveMaintenancePlanUncheckedUpdateInput,
    client: PreventivePlanClient = this.prisma,
  ) {
    return client.preventiveMaintenancePlan.update({
      where: {
        id: planId,
      },
      data,
      select: preventivePlanSelect,
    });
  }

  countPlans(where: Prisma.PreventiveMaintenancePlanWhereInput) {
    return this.prisma.preventiveMaintenancePlan.count({ where });
  }
}
