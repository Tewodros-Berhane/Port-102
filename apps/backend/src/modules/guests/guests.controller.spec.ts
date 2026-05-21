import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

describe('GuestsController', () => {
  let controller: GuestsController;
  let guestsService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    hotelId: 10,
    membershipId: 20,
    roleKey: 'HOTEL_ADMIN',
    tokenVersion: 0,
  };

  beforeEach(async () => {
    guestsService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestsController],
      providers: [
        {
          provide: GuestsService,
          useValue: guestsService,
        },
        {
          provide: PrismaService,
          useValue: {
            hotelUser: {
              findFirst: jest.fn(),
            },
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<GuestsController>(GuestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates guest creation', () => {
    const dto = {
      firstName: 'Demo',
      lastName: 'Guest',
    };

    controller.create(currentUser, dto);

    expect(guestsService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates paginated guest listing', () => {
    const query = { page: 2, pageSize: 10 };

    controller.list(currentUser, query);

    expect(guestsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates guest detail lookup and updates', () => {
    controller.getById(currentUser, 5);
    controller.update(currentUser, 5, { firstName: 'Updated' });

    expect(guestsService.getById).toHaveBeenCalledWith(currentUser, 5);
    expect(guestsService.update).toHaveBeenCalledWith(currentUser, 5, {
      firstName: 'Updated',
    });
  });
});
