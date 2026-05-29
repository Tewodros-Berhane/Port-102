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
