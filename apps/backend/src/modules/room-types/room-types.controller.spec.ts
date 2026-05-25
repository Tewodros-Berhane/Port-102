import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

describe('RoomTypesController', () => {
  let controller: RoomTypesController;
  let roomTypesService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    assignAmenities: jest.Mock;
    removeAmenity: jest.Mock;
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
    roomTypesService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignAmenities: jest.fn(),
      removeAmenity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomTypesController],
      providers: [
        {
          provide: RoomTypesService,
          useValue: roomTypesService,
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

    controller = module.get<RoomTypesController>(RoomTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
