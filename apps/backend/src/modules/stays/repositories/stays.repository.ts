import { Injectable } from '@nestjs/common';

import { Prisma, StayStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const stayRoomAssignmentSelect = {
  id: true,
  stayId: true,
  roomId: true,
  reservationRoomId: true,
  status: true,
  assignedAt: true,
  releasedAt: true,
  assignedByUserId: true,
  releasedByUserId: true,
  reason: true,
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      roomTypeId: true,
      occupancyStatus: true,
      cleaningStatus: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
  reservationRoom: {
    select: {
      id: true,
      reservationId: true,
      roomTypeId: true,
      roomId: true,
      status: true,
    },
  },
} as const;

const stayRoomAssignmentsOrderBy: Prisma.StayRoomAssignmentOrderByWithRelationInput[] =
  [{ status: 'asc' }, { assignedAt: 'desc' }, { id: 'desc' }];

const staySelect = {
  id: true,
  stayNumber: true,
  reservationId: true,
  guestId: true,
  status: true,
  checkedInAt: true,
  expectedCheckOutDate: true,
  checkedOutAt: true,
  checkedInByUserId: true,
  checkedOutByUserId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  reservation: {
    select: {
      id: true,
      reservationNumber: true,
      status: true,
      source: true,
      checkInDate: true,
      checkOutDate: true,
      adults: true,
      children: true,
    },
  },
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  checkedInBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  checkedOutBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  roomAssignments: {
    select: stayRoomAssignmentSelect,
    orderBy: stayRoomAssignmentsOrderBy,
  },
} as const;

export type StayRecord = Prisma.StayGetPayload<{
  select: typeof staySelect;
}>;

type StayClient = Pick<PrismaService | Prisma.TransactionClient, 'stay'>;

@Injectable()
export class StaysRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(operation);
  }

  createStay(
    data: Prisma.StayUncheckedCreateInput,
    client: StayClient = this.prisma,
  ) {
    return client.stay.create({
      data,
      select: staySelect,
    });
  }

  findStay(stayId: number, client: StayClient = this.prisma) {
    return client.stay.findUnique({
      where: {
        id: stayId,
      },
      select: staySelect,
    });
  }

  findStayByReservationId(
    reservationId: number,
    client: StayClient = this.prisma,
  ) {
    return client.stay.findUnique({
      where: {
        reservationId,
      },
      select: staySelect,
    });
  }

  findStayByStayNumber(stayNumber: string) {
    return this.prisma.stay.findUnique({
      where: {
        stayNumber,
      },
      select: staySelect,
    });
  }

  listStays({
    skip,
    take,
    search,
    status,
    guestId,
    checkedInFrom,
    checkedInTo,
    expectedCheckOutFrom,
    expectedCheckOutTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: StayStatus;
    guestId?: number;
    checkedInFrom?: Date;
    checkedInTo?: Date;
    expectedCheckOutFrom?: Date;
    expectedCheckOutTo?: Date;
  }) {
    const where: Prisma.StayWhereInput = {
      ...(status ? { status } : {}),
      ...(guestId === undefined ? {} : { guestId }),
      ...(checkedInFrom || checkedInTo
        ? {
            checkedInAt: {
              ...(checkedInFrom ? { gte: checkedInFrom } : {}),
              ...(checkedInTo ? { lte: checkedInTo } : {}),
            },
          }
        : {}),
      ...(expectedCheckOutFrom || expectedCheckOutTo
        ? {
            expectedCheckOutDate: {
              ...(expectedCheckOutFrom ? { gte: expectedCheckOutFrom } : {}),
              ...(expectedCheckOutTo ? { lte: expectedCheckOutTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                stayNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                reservation: {
                  reservationNumber: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                guest: {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                guest: {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                guest: {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                roomAssignments: {
                  some: {
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
        select: staySelect,
        orderBy: [{ checkedInAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
  }

  updateStay(
    stayId: number,
    data: Prisma.StayUncheckedUpdateInput,
    client: StayClient = this.prisma,
  ) {
    return client.stay.update({
      where: {
        id: stayId,
      },
      data,
      select: staySelect,
    });
  }
}
