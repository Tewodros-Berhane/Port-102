import { Injectable } from '@nestjs/common';

import {
  HousekeepingIssueStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
} as const;

const issueSelect = {
  id: true,
  issueNumber: true,
  taskId: true,
  roomId: true,
  reportedByUserId: true,
  status: true,
  title: true,
  description: true,
  photoUrl: true,
  resolvedAt: true,
  resolvedByUserId: true,
  resolutionNotes: true,
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
  task: {
    select: {
      id: true,
      taskNumber: true,
      roomId: true,
      type: true,
      status: true,
      priority: true,
    },
  },
  reportedBy: {
    select: userSummarySelect,
  },
  resolvedBy: {
    select: userSummarySelect,
  },
} as const;

export type HousekeepingIssueRecord = Prisma.HousekeepingIssueGetPayload<{
  select: typeof issueSelect;
}>;

type HousekeepingIssueClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'housekeepingIssue'
>;

@Injectable()
export class HousekeepingIssuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createIssue(
    data: Prisma.HousekeepingIssueUncheckedCreateInput,
    client: HousekeepingIssueClient = this.prisma,
  ) {
    return client.housekeepingIssue.create({
      data,
      select: issueSelect,
    });
  }

  findIssue(issueId: number, client: HousekeepingIssueClient = this.prisma) {
    return client.housekeepingIssue.findUnique({
      where: {
        id: issueId,
      },
      select: issueSelect,
    });
  }

  findByIssueNumber(
    issueNumber: string,
    client: HousekeepingIssueClient = this.prisma,
  ) {
    return client.housekeepingIssue.findUnique({
      where: {
        issueNumber,
      },
      select: issueSelect,
    });
  }

  listIssues({
    skip,
    take,
    search,
    status,
    roomId,
    taskId,
    reportedByUserId,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: HousekeepingIssueStatus;
    roomId?: number;
    taskId?: number;
    reportedByUserId?: number;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.HousekeepingIssueWhereInput = {
      ...(status ? { status } : {}),
      ...(roomId === undefined ? {} : { roomId }),
      ...(taskId === undefined ? {} : { taskId }),
      ...(reportedByUserId === undefined ? {} : { reportedByUserId }),
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
      this.prisma.housekeepingIssue.count({ where }),
      this.prisma.housekeepingIssue.findMany({
        where,
        skip,
        take,
        select: issueSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  countIssues(where: Prisma.HousekeepingIssueWhereInput) {
    return this.prisma.housekeepingIssue.count({ where });
  }

  updateIssue(
    issueId: number,
    data: Prisma.HousekeepingIssueUncheckedUpdateInput,
    client: HousekeepingIssueClient = this.prisma,
  ) {
    return client.housekeepingIssue.update({
      where: {
        id: issueId,
      },
      data,
      select: issueSelect,
    });
  }

  private searchWhere(search?: string): Prisma.HousekeepingIssueWhereInput {
    return search
      ? {
          OR: [
            {
              issueNumber: {
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
          ],
        }
      : {};
  }
}
