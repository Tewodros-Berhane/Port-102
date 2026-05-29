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

