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

    controller.create(currentUser, dto);

    expect(roomsService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates paginated room listing', () => {
    const query = {
      page: 2,
      limit: 10,
      isActive: true,
    };

    controller.list(currentUser, query);

    expect(roomsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates room detail, update, and removal', () => {
    const updateDto = {
      displayName: 'Updated 101',
    };

    controller.getById(currentUser, 9);
    controller.update(currentUser, 9, updateDto);
    controller.remove(currentUser, 9);

    expect(roomsService.getById).toHaveBeenCalledWith(currentUser, 9);
    expect(roomsService.update).toHaveBeenCalledWith(currentUser, 9, updateDto);
    expect(roomsService.remove).toHaveBeenCalledWith(currentUser, 9);
  });

  it('delegates room summary endpoints', () => {
    controller.getAvailabilitySummary(currentUser);
    controller.getStatusSummary(currentUser);

    expect(roomsService.getAvailabilitySummary).toHaveBeenCalledWith(
      currentUser,
    );
    expect(roomsService.getStatusSummary).toHaveBeenCalledWith(currentUser);
  });

  it('delegates room status logs and status updates', () => {
    const query = {
      page: 2,
      limit: 10,
    };
    const statusDto = {
      cleaningStatus: RoomCleaningStatus.CLEAN,
      reason: 'Inspection complete',
    };

    controller.listStatusLogs(currentUser, 9, query);
    controller.updateStatus(currentUser, 9, statusDto);
    controller.markOutOfOrder(currentUser, 9, {
      reason: 'AC repair',
    });
    controller.clearOutOfOrder(currentUser, 9, {
      reason: 'Repair complete',
    });

    expect(roomsService.listStatusLogs).toHaveBeenCalledWith(
      currentUser,
      9,
      query,
    );
    expect(roomsService.updateStatus).toHaveBeenCalledWith(
      currentUser,
      9,
      statusDto,
    );
    expect(roomsService.markOutOfOrder).toHaveBeenCalledWith(currentUser, 9, {
      reason: 'AC repair',
    });
    expect(roomsService.clearOutOfOrder).toHaveBeenCalledWith(currentUser, 9, {
      reason: 'Repair complete',
    });
  });
});
