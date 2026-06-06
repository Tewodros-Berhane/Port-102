import { Injectable } from '@nestjs/common';

import {
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketStatus,
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

const roomSummarySelect = {
  id: true,
  roomNumber: true,
  displayName: true,
  floorId: true,
  roomTypeId: true,
  occupancyStatus: true,
  cleaningStatus: true,
  maintenanceStatus: true,
  isActive: true,
} as const;

const assetSummarySelect = {
  id: true,
  assetNumber: true,
  name: true,
  category: true,
  location: true,
  roomId: true,
  status: true,
} as const;

const maintenanceTicketSelect = {
  id: true,
  ticketNumber: true,
  roomId: true,
  assetId: true,
  source: true,
  sourceType: true,
  sourceId: true,
  issueType: true,
  status: true,
  priority: true,
  title: true,
  description: true,
  reportedByUserId: true,
  assignedToUserId: true,
  assignedByUserId: true,
  assignedAt: true,
  startedAt: true,
  completedAt: true,
  approvedAt: true,
  rejectedAt: true,
  cancelledAt: true,
  completedByUserId: true,
  approvedByUserId: true,
  rejectedByUserId: true,
  cancelledByUserId: true,
  completionNotes: true,
  approvalNotes: true,
  rejectionReason: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  room: {
    select: roomSummarySelect,
  },
  asset: {
    select: assetSummarySelect,
  },
  reportedBy: {
    select: userSummarySelect,
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
  approvedBy: {
    select: userSummarySelect,
  },
  rejectedBy: {
    select: userSummarySelect,
  },
  cancelledBy: {
    select: userSummarySelect,
  },
  notes: {
    select: {
      id: true,
      ticketId: true,
      authorUserId: true,
      note: true,
      createdAt: true,
      author: {
        select: userSummarySelect,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  photos: {
    select: {
      id: true,
      ticketId: true,
      uploadedByUserId: true,
      url: true,
      description: true,
      createdAt: true,
      uploadedBy: {
        select: userSummarySelect,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} as const;

export type MaintenanceTicketRecord = Prisma.MaintenanceTicketGetPayload<{
  select: typeof maintenanceTicketSelect;
}>;

type MaintenanceTicketClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'maintenanceTicket'
>;

type UserClient = Pick<PrismaService | Prisma.TransactionClient, 'user'>;

@Injectable()
export class MaintenanceTicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    callback: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(callback);
  }

  createTicket(
    data: Prisma.MaintenanceTicketUncheckedCreateInput,
    client: MaintenanceTicketClient = this.prisma,
  ) {
    return client.maintenanceTicket.create({
      data,
      select: maintenanceTicketSelect,
    });
  }

  findTicket(ticketId: number, client: MaintenanceTicketClient = this.prisma) {
    return client.maintenanceTicket.findUnique({
      where: {
        id: ticketId,
      },
      select: maintenanceTicketSelect,
    });
  }

  findByTicketNumber(
    ticketNumber: string,
    client: MaintenanceTicketClient = this.prisma,
  ) {
    return client.maintenanceTicket.findUnique({
      where: {
        ticketNumber,
      },
      select: {
        id: true,
      },
    });
  }

  findActiveTicketBySource(
    {
      sourceType,
      sourceId,
    }: {
      sourceType: string;
      sourceId: number;
    },
    client: MaintenanceTicketClient = this.prisma,
  ) {
    return client.maintenanceTicket.findFirst({
      where: {
        sourceType,
        sourceId,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
      select: maintenanceTicketSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  updateTicket(
    ticketId: number,
    data: Prisma.MaintenanceTicketUncheckedUpdateInput,
    client: MaintenanceTicketClient = this.prisma,
  ) {
    return client.maintenanceTicket.update({
      where: {
        id: ticketId,
      },
      data,
      select: maintenanceTicketSelect,
    });
  }

  listTickets({
    skip,
    take,
    search,
    status,
    priority,
    issueType,
    roomId,
    assetId,
    assignedToUserId,
    createdFrom,
    createdTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: MaintenanceTicketStatus;
    priority?: MaintenancePriority;
    issueType?: MaintenanceIssueType;
    roomId?: number;
    assetId?: number;
    assignedToUserId?: number;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const where: Prisma.MaintenanceTicketWhereInput = {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(issueType ? { issueType } : {}),
      ...(roomId === undefined ? {} : { roomId }),
      ...(assetId === undefined ? {} : { assetId }),
      ...(assignedToUserId === undefined ? {} : { assignedToUserId }),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                ticketNumber: {
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
                asset: {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                asset: {
                  assetNumber: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.maintenanceTicket.count({ where }),
      this.prisma.maintenanceTicket.findMany({
        where,
        skip,
        take,
        select: maintenanceTicketSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  findActiveUser(userId: number, client: UserClient = this.prisma) {
    return client.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
      select: userSummarySelect,
    });
  }
}
