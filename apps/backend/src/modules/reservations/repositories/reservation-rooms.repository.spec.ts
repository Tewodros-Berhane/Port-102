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