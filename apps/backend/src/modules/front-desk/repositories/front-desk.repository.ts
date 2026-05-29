import { Injectable } from '@nestjs/common';

import {
  Prisma,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const frontDeskReservationSelect = {
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
  rooms: {
    select: {
      id: true,
      reservationId: true,
      roomTypeId: true,
      roomId: true,
      status: true,
      rate: true,
      notes: true,
      roomType: {
        select: {
          id: true,
          name: true,
          code: true,
          baseOccupancy: true,
          maxOccupancy: true,
          baseRate: true,
        },
      },
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
    },
    orderBy: {
      id: 'asc',
    },
  },
} as const;

const frontDeskStayRoomAssignmentsOrderBy: Prisma.StayRoomAssignmentOrderByWithRelationInput[] =
  [{ assignedAt: 'asc' }, { id: 'asc' }];

const frontDeskStaySelect = {
  id: true,
  stayNumber: true,
  reservationId: true,
  guestId: true,
  status: true,
  checkedInAt: true,
  expectedCheckOutDate: true,
  checkedOutAt: true,
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
  roomAssignments: {
    where: {
      status: StayRoomAssignmentStatus.ACTIVE,
    },
    select: {
      id: true,
      stayId: true,
      roomId: true,
      reservationRoomId: true,
      status: true,
      assignedAt: true,
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
    },
    orderBy: frontDeskStayRoomAssignmentsOrderBy,
  },
} as const;

export type FrontDeskReservationRecord = Prisma.ReservationGetPayload<{
  select: typeof frontDeskReservationSelect;
}>;

export type FrontDeskStayRecord = Prisma.StayGetPayload<{
  select: typeof frontDeskStaySelect;
}>;

@Injectable()
export class FrontDeskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardCounts({
    startDate,
    endDate,
  }: {
    startDate: Date;
    endDate: Date;
  }) {
    const [
      arrivalsToday,
      departuresToday,
      inHouseGuests,
      activeStays,
      vacantRooms,
      occupiedRooms,
      dirtyRooms,
      outOfOrderRooms,
      availablePhysicalRooms,
    ] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          status: ReservationStatus.CONFIRMED,
          checkInDate: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),
      this.prisma.stay.count({
        where: {
          status: StayStatus.ACTIVE,
          expectedCheckOutDate: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),
      this.prisma.stay.count({
        where: {
          status: StayStatus.ACTIVE,
        },
      }),
      this.prisma.stay.count({
        where: {
          status: StayStatus.ACTIVE,
        },
      }),
      this.prisma.room.count({
        where: {
          isActive: true,
          occupancyStatus: RoomOccupancyStatus.VACANT,
        },
      }),
      this.prisma.room.count({
        where: {
          isActive: true,
          occupancyStatus: RoomOccupancyStatus.OCCUPIED,
        },
      }),
      this.prisma.room.count({
        where: {
          isActive: true,
          cleaningStatus: RoomCleaningStatus.DIRTY,
        },
      }),
      this.prisma.room.count({
        where: {
          isActive: true,
          maintenanceStatus: {
            in: [
              RoomMaintenanceStatus.OUT_OF_ORDER,
              RoomMaintenanceStatus.OUT_OF_SERVICE,
              RoomMaintenanceStatus.UNDER_MAINTENANCE,
            ],
          },
        },
      }),
      this.prisma.room.count({
        where: {
          isActive: true,
          occupancyStatus: RoomOccupancyStatus.VACANT,
          maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
          cleaningStatus: {
            in: [RoomCleaningStatus.CLEAN, RoomCleaningStatus.INSPECTED],
          },
        },
      }),
    ]);

    return {
      arrivalsToday,
      departuresToday,
      inHouseGuests,
      activeStays,
      vacantRooms,
      occupiedRooms,
      dirtyRooms,
      outOfOrderRooms,
      availablePhysicalRooms,
    };
  }

  listArrivals({
    skip,
    take,
    startDate,
    endDate,
    search,
  }: {
    skip: number;
    take: number;
    startDate: Date;
    endDate: Date;
    search?: string;
  }) {
    const where: Prisma.ReservationWhereInput = {
      status: ReservationStatus.CONFIRMED,
      checkInDate: {
        gte: startDate,
        lt: endDate,
      },
      ...this.reservationSearchWhere(search),
    };

    return Promise.all([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        skip,
        take,
        select: frontDeskReservationSelect,
        orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  listDepartures({
    skip,
    take,
    startDate,
    endDate,
    search,
  }: {
    skip: number;
    take: number;
    startDate: Date;
    endDate: Date;
    search?: string;
  }) {
    const where: Prisma.StayWhereInput = {
      status: StayStatus.ACTIVE,
      expectedCheckOutDate: {
        gte: startDate,
        lt: endDate,
      },
      ...this.staySearchWhere(search),
    };

    return Promise.all([
      this.prisma.stay.count({ where }),
      this.prisma.stay.findMany({
        where,
        skip,
        take,
        select: frontDeskStaySelect,
        orderBy: [{ expectedCheckOutDate: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  listInHouse({
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
      ...this.staySearchWhere(search),
    };

    return Promise.all([
      this.prisma.stay.count({ where }),
      this.prisma.stay.findMany({
        where,
        skip,
        take,
        select: frontDeskStaySelect,
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  private reservationSearchWhere(
    search?: string,
  ): Prisma.ReservationWhereInput {
    return search
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
            {
              rooms: {
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
      : {};
  }

  private staySearchWhere(search?: string): Prisma.StayWhereInput {
    return search
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
              guest: {
                phone: {
                  contains: search,
                  mode: 'insensitive',
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
      : {};
  }
}
