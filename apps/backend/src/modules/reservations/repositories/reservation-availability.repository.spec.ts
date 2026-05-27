import { Test, TestingModule } from '@nestjs/testing';

import {
  ReservationRoomStatus,
  ReservationStatus,
  RoomMaintenanceStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReservationAvailabilityRepository } from './reservation-availability.repository';

describe('ReservationAvailabilityRepository', () => {
  let repository: ReservationAvailabilityRepository;
  let prisma: {
    room: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    roomType: {
      findMany: jest.Mock;
    };
    reservationRoom: {
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      room: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      roomType: {
        findMany: jest.fn(),
      },
      reservationRoom: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationAvailabilityRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<ReservationAvailabilityRepository>(
      ReservationAvailabilityRepository,
    );
  });

  it('counts physically available rooms for a room type', async () => {
    await repository.countPhysicalRooms(4);

    expect(prisma.room.count).toHaveBeenCalledWith({
      where: {
        roomTypeId: 4,
        isActive: true,
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      },
    });
  });

  it('lists active room types for availability searches', async () => {
    await repository.listRoomTypesForAvailability({
      roomTypeId: 4,
      minOccupancy: 2,
    });

    expect(prisma.roomType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          id: 4,
          maxOccupancy: {
            gte: 2,
          },
        },
        orderBy: [{ name: 'asc' }, { code: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('counts overlapping reserved inventory by room type', async () => {
    await repository.countReservedRooms({
      roomTypeId: 4,
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
    });

    expect(prisma.reservationRoom.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        roomTypeId: 4,
        status: {
          not: ReservationRoomStatus.CANCELLED,
        },
        reservation: expect.objectContaining({
          status: {
            notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
          },
          checkInDate: {
            lt: new Date('2026-06-12T00:00:00.000Z'),
          },
          checkOutDate: {
            gt: new Date('2026-06-10T00:00:00.000Z'),
          },
        }),
      }),
    });
  });

  it('lists available rooms excluding overlapping reservation rooms', async () => {
    await repository.listAvailableRooms({
      roomTypeId: 4,
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
    });

    expect(prisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roomTypeId: 4,
          isActive: true,
          maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
          reservationRooms: {
            none: expect.objectContaining({
              reservation: expect.objectContaining({
                checkInDate: {
                  lt: new Date('2026-06-12T00:00:00.000Z'),
                },
                checkOutDate: {
                  gt: new Date('2026-06-10T00:00:00.000Z'),
                },
              }),
            }),
          },
        }),
        orderBy: [{ roomNumber: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
