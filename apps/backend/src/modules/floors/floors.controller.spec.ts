import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';

describe('FloorsController', () => {
  let controller: FloorsController;
  let floorsService: {
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
    floorsService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FloorsController],
      providers: [
        {
          provide: FloorsService,
          useValue: floorsService,
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

    controller = module.get<FloorsController>(FloorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates floor creation', () => {
    const dto = {
      name: 'First Floor',
      number: 1,
    };

    controller.create(currentUser, dto);

    expect(floorsService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates floor listing', () => {
    const query = {
      page: 2,
      limit: 10,
      isActive: true,
    };

    controller.list(currentUser, query);

    expect(floorsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates floor detail, update, and removal', () => {
    const updateDto = {
      name: 'Updated Floor',
    };

    controller.getById(currentUser, 10);
    controller.update(currentUser, 10, updateDto);
    controller.remove(currentUser, 10);

    expect(floorsService.getById).toHaveBeenCalledWith(currentUser, 10);
    expect(floorsService.update).toHaveBeenCalledWith(
      currentUser,
      10,
      updateDto,
    );
    expect(floorsService.remove).toHaveBeenCalledWith(currentUser, 10);
  });
});
