import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { RoomAmenitiesController } from './room-amenities.controller';
import { RoomAmenitiesService } from './room-amenities.service';

describe('RoomAmenitiesController', () => {
  let controller: RoomAmenitiesController;
  let roomAmenitiesService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
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
    roomAmenitiesService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomAmenitiesController],
      providers: [
        {
          provide: RoomAmenitiesService,
          useValue: roomAmenitiesService,
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

    controller = module.get<RoomAmenitiesController>(RoomAmenitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates room amenity creation', () => {
    const dto = {
      name: 'Wi-Fi',
      key: 'wifi',
    };

    controller.create(currentUser, dto);

    expect(roomAmenitiesService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates paginated room amenity listing', () => {
    const query = {
      page: 2,
      limit: 10,
      isActive: true,
    };

    controller.list(currentUser, query);

    expect(roomAmenitiesService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates room amenity detail, update, and removal', () => {
    const updateDto = {
      name: 'Updated Wi-Fi',
    };

    controller.getById(currentUser, 7);
    controller.update(currentUser, 7, updateDto);
    controller.remove(currentUser, 7);

    expect(roomAmenitiesService.getById).toHaveBeenCalledWith(currentUser, 7);
    expect(roomAmenitiesService.update).toHaveBeenCalledWith(
      currentUser,
      7,
      updateDto,
    );
    expect(roomAmenitiesService.remove).toHaveBeenCalledWith(currentUser, 7);
  });
});
