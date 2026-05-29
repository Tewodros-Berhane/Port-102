import { Test, TestingModule } from '@nestjs/testing';

import {
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StayStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FrontDeskRepository } from './front-desk.repository';

describe('FrontDeskRepository', () => {
  let repository: FrontDeskRepository;
  let prisma: {
    reservation: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    stay: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    room: {
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      reservation: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      stay: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      room: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrontDeskRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<FrontDeskRepository>(FrontDeskRepository);
  });

  it('counts front desk dashboard metrics through PrismaService', async () => {
    prisma.reservation.count.mockResolvedValueOnce(3);
    prisma.stay.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(8);
    prisma.room.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(10);

    const startDate = new Date('2026-06-10T00:00:00.000Z');
    const endDate = new Date('2026-06-11T00:00:00.000Z');
    const result = await repository.getDashboardCounts({
      startDate,
      endDate,
    });

    expect(prisma.reservation.count).toHaveBeenCalledWith({
      where: {
        status: ReservationStatus.CONFIRMED,
        checkInDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
    expect(prisma.room.count).toHaveBeenLastCalledWith({
      where: {
        isActive: true,
        occupancyStatus: RoomOccupancyStatus.VACANT,
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
        cleaningStatus: {
          in: [RoomCleaningStatus.CLEAN, RoomCleaningStatus.INSPECTED],
        },
      },
    });
    expect(result).toEqual({
      arrivalsToday: 3,
      departuresToday: 2,
      inHouseGuests: 8,
      activeStays: 8,
      vacantRooms: 12,
      occupiedRooms: 8,
      dirtyRooms: 4,
      outOfOrderRooms: 1,
      availablePhysicalRooms: 10,
    });
  });

  it('lists confirmed arrivals for a date range', async () => {
    prisma.reservation.count.mockResolvedValue(1);
    prisma.reservation.findMany.mockResolvedValue([]);

    const startDate = new Date('2026-06-10T00:00:00.000Z');
    const endDate = new Date('2026-06-11T00:00:00.000Z');

    await repository.listArrivals({
      skip: 20,
      take: 10,
      startDate,
      endDate,
      search: 'Marta',
    });

    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ReservationStatus.CONFIRMED,
          checkInDate: {
            gte: startDate,
            lt: endDate,
          },
          OR: expect.arrayContaining([
            {
              reservationNumber: {
                contains: 'Marta',
                mode: 'insensitive',
              },
            },
          ]),
        }),
        skip: 20,
        take: 10,
        orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }],
      }),
    );
  });

