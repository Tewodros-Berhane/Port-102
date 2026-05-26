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
