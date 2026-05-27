import { Test, TestingModule } from '@nestjs/testing';

import { ReservationRoomStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReservationRoomsRepository } from './reservation-rooms.repository';

describe('ReservationRoomsRepository', () => {
  let repository: ReservationRoomsRepository;
  let prisma: {
    reservationRoom: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      reservationRoom: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationRoomsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<ReservationRoomsRepository>(
      ReservationRoomsRepository,
    );
  });

  it('creates reservation rooms through PrismaService', async () => {
    await repository.createReservationRoom({
      reservationId: 20,
      roomTypeId: 4,
      roomId: 9,
      rate: '150',
      notes: 'Near elevator',
    });

    expect(prisma.reservationRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          reservationId: 20,
          roomTypeId: 4,
          roomId: 9,
          rate: '150',
          notes: 'Near elevator',
        },
      }),
    );
  });

  it('updates all rooms for a reservation', async () => {
    await repository.updateRoomsForReservation(20, {
      status: ReservationRoomStatus.CANCELLED,
    });

    expect(prisma.reservationRoom.updateMany).toHaveBeenCalledWith({
      where: {
        reservationId: 20,
      },
      data: {
        status: ReservationRoomStatus.CANCELLED,
      },
    });
  });

  it('updates one reservation room', async () => {
    await repository.updateReservationRoom(30, {
      roomId: null,
      rate: '145',
    });

    expect(prisma.reservationRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 30,
        },
        data: {
          roomId: null,
          rate: '145',
        },
      }),
    );
  });

  it('removes one reservation room', async () => {
    await repository.removeReservationRoom(30);

    expect(prisma.reservationRoom.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 30,
        },
      }),
    );
  });

  it('counts active reservation rooms', async () => {
    await repository.countActiveRooms(20);

    expect(prisma.reservationRoom.count).toHaveBeenCalledWith({
      where: {
        reservationId: 20,
        status: {
          not: ReservationRoomStatus.CANCELLED,
        },
      },
    });
  });
});
