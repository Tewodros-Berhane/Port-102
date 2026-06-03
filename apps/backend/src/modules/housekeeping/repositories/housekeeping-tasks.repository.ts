import { Injectable } from '@nestjs/common';

import {
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  Prisma,
  UserStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
} as const;

const taskSelect = {
  id: true,
  taskNumber: true,
  roomId: true,
  type: true,
  status: true,
  priority: true,
  assignedToUserId: true,
  assignedByUserId: true,
  startedAt: true,
  completedAt: true,
  inspectedAt: true,
  approvedAt: true,
  rejectedAt: true,
  cancelledAt: true,
  completedByUserId: true,
  inspectedByUserId: true,
  approvedByUserId: true,
  rejectedByUserId: true,
  cancelledByUserId: true,
  notes: true,
  completionNotes: true,
  inspectionNotes: true,
  rejectionReason: true,
  cancellationReason: true,
  sourceType: true,
  sourceId: true,
  createdAt: true,
  updatedAt: true,
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      floorId: true,
      roomTypeId: true,
      occupancyStatus: true,
      cleaningStatus: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
  assignedTo: {
    select: userSummarySelect,
  },
  assignedBy: {
    select: userSummarySelect,
  },
  completedBy: {
    select: userSummarySelect,
  },
  inspectedBy: {
    select: userSummarySelect,
  },
  approvedBy: {
    select: userSummarySelect,
  },
  rejectedBy: {
    select: userSummarySelect,
  },
  cancelledBy: {
    select: userSummarySelect,
  },
} as const;

const activeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
  role: {
    select: {
      id: true,
      key: true,
      systemKey: true,
      name: true,
      isActive: true,
    },
  },
} as const;

const productivityTaskSelect = {
  id: true,
  assignedToUserId: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  approvedAt: true,
  rejectedAt: true,
  assignedTo: {
    select: userSummarySelect,
  },
} as const;

export type HousekeepingTaskRecord = Prisma.HousekeepingTaskGetPayload<{
  select: typeof taskSelect;
}>;

export type HousekeepingProductivityTaskRecord =
  Prisma.HousekeepingTaskGetPayload<{
    select: typeof productivityTaskSelect;
  }>;

export type ActiveHousekeepingUserRecord = Prisma.UserGetPayload<{
  select: typeof activeUserSelect;
}>;

type HousekeepingTaskClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'housekeepingTask'
>;
type UserClient = Pick<PrismaService | Prisma.TransactionClient, 'user'>;

@Injectable()
export class HousekeepingTasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(operation);
  }

  createTask(
    data: Prisma.HousekeepingTaskUncheckedCreateInput,
    client: HousekeepingTaskClient = this.prisma,
  ) {
    return client.housekeepingTask.create({
      data,
      select: taskSelect,
    });
  }

  findTask(taskId: number, client: HousekeepingTaskClient = this.prisma) {
    return client.housekeepingTask.findUnique({
      where: {
        id: taskId,
      },
      select: taskSelect,
    });
  }

  findByTaskNumber(taskNumber: string) {
    return this.prisma.housekeepingTask.findUnique({
      where: {
        taskNumber,
      },
      select: taskSelect,
    });
  }

  listTasks({
    skip,
    take,
    search,
    status,
    type,
    priority,
    roomId,
    assignedToUserId,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: HousekeepingTaskStatus;
    type?: HousekeepingTaskType;
    priority?: HousekeepingPriority;
    roomId?: number;
    assignedToUserId?: number;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.HousekeepingTaskWhereInput = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(priority ? { priority } : {}),
      ...(roomId === undefined ? {} : { roomId }),
      ...(assignedToUserId === undefined ? {} : { assignedToUserId }),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
      ...this.searchWhere(search),
    };

    return Promise.all([
      this.prisma.housekeepingTask.count({ where }),
      this.prisma.housekeepingTask.findMany({
        where,
        skip,
        take,
        select: taskSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateTask(
    taskId: number,
    data: Prisma.HousekeepingTaskUncheckedUpdateInput,
    client: HousekeepingTaskClient = this.prisma,
  ) {
    return client.housekeepingTask.update({
      where: {
        id: taskId,
      },
      data,
      select: taskSelect,
    });
  }

  findActiveUser(userId: number, client: UserClient = this.prisma) {
    return client.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        role: {
          isActive: true,
        },
      },
      select: activeUserSelect,
    });
  }

  private searchWhere(search?: string): Prisma.HousekeepingTaskWhereInput {
    return search
      ? {
          OR: [
            {
              taskNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              notes: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              room: {
                roomNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              room: {
                displayName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              assignedTo: {
                fullName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              assignedTo: {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : {};
  }
}
