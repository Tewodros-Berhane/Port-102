import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { FrontDeskController } from './front-desk.controller';
import { FrontDeskService } from './front-desk.service';

describe('FrontDeskController', () => {
  let controller: FrontDeskController;
  let frontDeskService: {
    getDashboard: jest.Mock;
    listArrivals: jest.Mock;
    listDepartures: jest.Mock;
    listInHouse: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'frontdesk@demo-hotel.com',
    roleKey: 'FRONT_DESK_CASHIER',
    roleId: 4,
    departmentId: null,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    frontDeskService = {
      getDashboard: jest.fn(),
      listArrivals: jest.fn(),
      listDepartures: jest.fn(),
      listInHouse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FrontDeskController],
      providers: [
        {
          provide: FrontDeskService,
          useValue: frontDeskService,
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

    controller = module.get<FrontDeskController>(FrontDeskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates dashboard lookup', () => {
    const query = {
      date: '2026-06-10',
    };

    controller.getDashboard(currentUser, query);

    expect(frontDeskService.getDashboard).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates arrivals listing', () => {
    const query = {
      date: '2026-06-10',
      page: 2,
      limit: 10,
      search: 'marta',
    };

    controller.listArrivals(currentUser, query);

    expect(frontDeskService.listArrivals).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates departures listing', () => {
    const query = {
      date: '2026-06-10',
      page: 1,
      limit: 20,
    };

    controller.listDepartures(currentUser, query);

    expect(frontDeskService.listDepartures).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates in-house listing', () => {
    const query = {
      search: '101',
    };

    controller.listInHouse(currentUser, query);

    expect(frontDeskService.listInHouse).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });
});
