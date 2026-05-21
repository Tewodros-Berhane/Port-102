import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: {
    list: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    assignPermissions: jest.Mock;
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
    rolesService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignPermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: rolesService,
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

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates role listing and detail lookup', () => {
    controller.list(currentUser);
    controller.getById(currentUser, 2);

    expect(rolesService.list).toHaveBeenCalledWith(currentUser);
    expect(rolesService.getById).toHaveBeenCalledWith(currentUser, 2);
  });

  it('delegates custom role creation', () => {
    const dto = {
      key: 'NIGHT_AUDITOR',
      name: 'Night Auditor',
      permissionKeys: ['reports.daily_summary.read'],
    };

    controller.create(currentUser, dto);

    expect(rolesService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates role updates and deletion', () => {
    const dto = {
      name: 'Updated Role',
    };

    controller.update(currentUser, 2, dto);
    controller.remove(currentUser, 2);

    expect(rolesService.update).toHaveBeenCalledWith(currentUser, 2, dto);
    expect(rolesService.remove).toHaveBeenCalledWith(currentUser, 2);
  });

  it('delegates role-permission assignment', () => {
    const dto = {
      permissionKeys: ['users.read'],
    };

    controller.assignPermissions(currentUser, 2, dto);

    expect(rolesService.assignPermissions).toHaveBeenCalledWith(
      currentUser,
      2,
      dto,
    );
  });
});
