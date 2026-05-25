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

  it('delegates room type creation', () => {
    const dto = {
      name: 'Deluxe King',
      code: 'DLX-KING',
    };

    controller.create(currentUser, dto);

    expect(roomTypesService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates paginated room type listing', () => {
    const query = {
      page: 2,
      limit: 10,
      isActive: true,
    };

    controller.list(currentUser, query);

    expect(roomTypesService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates room type detail, update, and removal', () => {
    const updateDto = {
      name: 'Updated Deluxe',
    };

    controller.getById(currentUser, 11);
    controller.update(currentUser, 11, updateDto);
    controller.remove(currentUser, 11);

    expect(roomTypesService.getById).toHaveBeenCalledWith(currentUser, 11);
    expect(roomTypesService.update).toHaveBeenCalledWith(
      currentUser,
      11,
      updateDto,
    );
    expect(roomTypesService.remove).toHaveBeenCalledWith(currentUser, 11);
  });

  it('delegates amenity assignment and removal', () => {
    const dto = {
      amenityIds: [5],
    };

    controller.assignAmenities(currentUser, 11, dto);
    controller.removeAmenity(currentUser, 11, 5);

    expect(roomTypesService.assignAmenities).toHaveBeenCalledWith(
      currentUser,
      11,
      dto,
    );
    expect(roomTypesService.removeAmenity).toHaveBeenCalledWith(
      currentUser,
      11,
      5,
    );
  });
});
