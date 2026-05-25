import { Test, TestingModule } from '@nestjs/testing';

import { RoomCleaningStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController', () => {
  let controller: RoomsController;
  let roomsService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    getAvailabilitySummary: jest.Mock;
    getStatusSummary: jest.Mock;
    listStatusLogs: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
    markOutOfOrder: jest.Mock;
    clearOutOfOrder: jest.Mock;
    remove: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    roomsService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      getAvailabilitySummary: jest.fn(),
      getStatusSummary: jest.fn(),
      listStatusLogs: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      markOutOfOrder: jest.fn(),
      clearOutOfOrder: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: roomsService,
        },
        {
          provide: PrismaService,
          useValue: {
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates room creation', () => {
    const dto = {
      roomNumber: '101',
      roomTypeId: 4,
    };

