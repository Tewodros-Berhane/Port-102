import { Test, TestingModule } from '@nestjs/testing';

import { StayStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';

describe('StaysController', () => {
  let controller: StaysController;
  let staysService: {
    list: jest.Mock;
    getById: jest.Mock;
    listActive: jest.Mock;
    listInHouseGuests: jest.Mock;
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
});
