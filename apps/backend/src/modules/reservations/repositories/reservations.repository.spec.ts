import { Test, TestingModule } from '@nestjs/testing';

import { ReservationSource } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReservationsRepository } from './reservations.repository';

describe('ReservationsRepository', () => {
  let repository: ReservationsRepository;
  let prisma: {
    $transaction: jest.Mock;
    reservation: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      reservation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<ReservationsRepository>(ReservationsRepository);
  });

  it('runs reservation work in a Prisma transaction', async () => {
    const callback = jest.fn();

    await repository.runInTransaction(callback);

    expect(prisma.$transaction).toHaveBeenCalledWith(callback);
  });

  it('creates reservations with nested room data through PrismaService', async () => {
    await repository.createReservation({
      reservationNumber: 'RES-20260527-000001',
      guest: {
        connect: {
          id: 12,
        },
      },
      source: ReservationSource.PHONE,
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
      adults: 2,
      children: 1,
      rooms: {
        create: [
          {
            roomType: {
              connect: {
                id: 4,
              },
            },
            room: {
              connect: {
                id: 9,
              },
            },
