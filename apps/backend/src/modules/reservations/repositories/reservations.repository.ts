import { Injectable } from '@nestjs/common';

import {
  Prisma,
  ReservationSource,
  ReservationStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const reservationRoomSelect = {
  id: true,
  reservationId: true,
  roomTypeId: true,
  roomId: true,
  status: true,
  rate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  roomType: {
    select: {
      id: true,
      name: true,
      code: true,
      baseOccupancy: true,
      maxOccupancy: true,
      baseRate: true,
      isActive: true,
    },
  },
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      roomTypeId: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
} as const;

const reservationSelect = {
  id: true,
  reservationNumber: true,
  guestId: true,
  status: true,
  source: true,
  checkInDate: true,
  checkOutDate: true,
  adults: true,
  children: true,
  specialRequests: true,
  internalNotes: true,
  cancellationReason: true,
  cancelledAt: true,
  noShowAt: true,
  createdByUserId: true,
  cancelledByUserId: true,
  createdAt: true,
  updatedAt: true,
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
  createdBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  cancelledBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  rooms: {
    select: reservationRoomSelect,
    orderBy: {
      id: 'asc',
    },
  },
} as const;

export type ReservationRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationSelect;
}>;

type ReservationClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'reservation'
>;

@Injectable()
export class ReservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(operation);
  }

  createReservation(
    data: Prisma.ReservationCreateInput,
    client: ReservationClient = this.prisma,
  ) {
    return client.reservation.create({
      data,
      select: reservationSelect,
    });
  }

  findReservation(reservationId: number) {
    return this.prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
      select: reservationSelect,
    });
  }

  findByReservationNumber(reservationNumber: string) {
    return this.prisma.reservation.findUnique({
      where: {
        reservationNumber,
      },
      select: reservationSelect,
    });
  }

  listReservations({
    skip,
    take,
    search,
    status,
    source,
    guestId,
    checkInFrom,
    checkInTo,
    checkOutFrom,
    checkOutTo,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: ReservationStatus;
    source?: ReservationSource;
    guestId?: number;
    checkInFrom?: Date;
    checkInTo?: Date;
    checkOutFrom?: Date;
    checkOutTo?: Date;
  }) {
    const where: Prisma.ReservationWhereInput = {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(guestId === undefined ? {} : { guestId }),
      ...(checkInFrom || checkInTo
        ? {
            checkInDate: {
              ...(checkInFrom ? { gte: checkInFrom } : {}),
              ...(checkInTo ? { lte: checkInTo } : {}),
            },
          }
        : {}),
      ...(checkOutFrom || checkOutTo
        ? {
            checkOutDate: {
              ...(checkOutFrom ? { gte: checkOutFrom } : {}),
              ...(checkOutTo ? { lte: checkOutTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                reservationNumber: {
                  contains: search,
                  mode: 'insensitive',
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
                guest: {
                  phone: {
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
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        skip,
        take,
        select: reservationSelect,
        orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updateReservation(
    reservationId: number,
    data: Prisma.ReservationUncheckedUpdateInput,
    client: ReservationClient = this.prisma,
  ) {
    return client.reservation.update({
      where: {
        id: reservationId,
      },
      data,
      select: reservationSelect,
    });
  }
}
