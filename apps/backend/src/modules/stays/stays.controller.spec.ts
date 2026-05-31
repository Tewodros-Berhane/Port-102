import { Test, TestingModule } from '@nestjs/testing';

import { StayStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FoliosService } from '../folios/folios.service';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';

describe('StaysController', () => {
  let controller: StaysController;
  let staysService: {
    list: jest.Mock;
    getById: jest.Mock;
    listActive: jest.Mock;
    listInHouseGuests: jest.Mock;
    checkOut: jest.Mock;
    assignRoom: jest.Mock;
    updateRoomAssignment: jest.Mock;
    moveRoom: jest.Mock;
    extendStay: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    staysService = {
      list: jest.fn(),
      getById: jest.fn(),
      listActive: jest.fn(),
      listInHouseGuests: jest.fn(),
      checkOut: jest.fn(),
      assignRoom: jest.fn(),
      updateRoomAssignment: jest.fn(),
      moveRoom: jest.fn(),
      extendStay: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaysController],
      providers: [
        {
          provide: StaysService,
          useValue: staysService,
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

    controller = module.get<StaysController>(StaysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates stay listing', () => {
    const query = {
      page: 2,
      limit: 10,
      search: 'marta',
    };

    controller.list(currentUser, query);

    expect(staysService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates active stay listing', () => {
    const query = {
      status: StayStatus.CHECKED_OUT,
    };

    controller.listActive(currentUser, query);

    expect(staysService.listActive).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates in-house guest listing', () => {
    const query = {
      search: '101',
    };

    controller.listInHouseGuests(currentUser, query);

    expect(staysService.listInHouseGuests).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates stay detail lookup', () => {
    controller.getById(currentUser, 40);

    expect(staysService.getById).toHaveBeenCalledWith(currentUser, 40);
  });

  it('delegates stay checkout', () => {
    const dto = {
      notes: 'Guest settled at front desk.',
    };

    controller.checkOut(currentUser, 40, dto);

    expect(staysService.checkOut).toHaveBeenCalledWith(currentUser, 40, dto);
  });

  it('delegates stay room assignment', () => {
    const dto = {
      reservationRoomId: 30,
      roomId: 10,
      reason: 'Additional room.',
    };

    controller.assignRoom(currentUser, 40, dto);

    expect(staysService.assignRoom).toHaveBeenCalledWith(currentUser, 40, dto);
  });

  it('delegates stay room assignment update', () => {
    const dto = {
      reason: 'Corrected note.',
    };

    controller.updateRoomAssignment(currentUser, 40, 50, dto);

    expect(staysService.updateRoomAssignment).toHaveBeenCalledWith(
      currentUser,
      40,
      50,
      dto,
    );
  });

  it('delegates stay room move', () => {
    const dto = {
      fromAssignmentId: 50,
      toRoomId: 10,
      reason: 'Guest requested quieter room.',
    };

    controller.moveRoom(currentUser, 40, dto);

    expect(staysService.moveRoom).toHaveBeenCalledWith(currentUser, 40, dto);
  });

  it('delegates stay extension', () => {
    const dto = {
      newExpectedCheckOutDate: '2026-06-15',
      reason: 'Guest requested one additional night.',
    };

    controller.extendStay(currentUser, 40, dto);

    expect(staysService.extendStay).toHaveBeenCalledWith(currentUser, 40, dto);
  });
});
