import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
    activate: jest.Mock;
    resetPassword: jest.Mock;
    assignRole: jest.Mock;
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
    usersService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      resetPassword: jest.fn(),
      assignRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
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

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates user creation', () => {
    const dto = {
      email: 'USER@DEMO-HOTEL.COM',
      fullName: 'Demo User',
      password: 'Password123!',
      roleId: 2,
    };

    controller.create(currentUser, dto);

    expect(usersService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates paginated user listing', () => {
    const query = { page: 2, pageSize: 10 };

    controller.list(currentUser, query);

    expect(usersService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates user detail lookup', () => {
    controller.getById(currentUser, 5);

    expect(usersService.getById).toHaveBeenCalledWith(currentUser, 5);
  });

  it('delegates user updates', () => {
    const dto = { fullName: 'Updated User' };

    controller.update(currentUser, 5, dto);

    expect(usersService.update).toHaveBeenCalledWith(currentUser, 5, dto);
  });

  it('delegates activation changes', () => {
    controller.deactivate(currentUser, 5);
    controller.activate(currentUser, 5);

    expect(usersService.deactivate).toHaveBeenCalledWith(currentUser, 5);
    expect(usersService.activate).toHaveBeenCalledWith(currentUser, 5);
  });

  it('delegates password resets and role assignment', () => {
    controller.resetPassword(currentUser, 5, { newPassword: 'Password123!' });
    controller.assignRole(currentUser, 5, { roleId: 3 });

    expect(usersService.resetPassword).toHaveBeenCalledWith(currentUser, 5, {
      newPassword: 'Password123!',
    });
    expect(usersService.assignRole).toHaveBeenCalledWith(currentUser, 5, {
      roleId: 3,
    });
  });
});
