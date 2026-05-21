import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let employeesService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
    linkUser: jest.Mock;
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
    employeesService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      linkUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: employeesService,
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

    controller = module.get<EmployeesController>(EmployeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates employee creation', () => {
    const dto = {
      firstName: 'Demo',
      lastName: 'Employee',
    };

    controller.create(currentUser, dto);

    expect(employeesService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates paginated employee listing', () => {
    const query = { page: 2, pageSize: 10 };

    controller.list(currentUser, query);

    expect(employeesService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates employee detail lookup and updates', () => {
    controller.getById(currentUser, 5);
    controller.update(currentUser, 5, { jobTitle: 'Supervisor' });

    expect(employeesService.getById).toHaveBeenCalledWith(currentUser, 5);
    expect(employeesService.update).toHaveBeenCalledWith(currentUser, 5, {
      jobTitle: 'Supervisor',
    });
  });

  it('delegates deactivation and user linking', () => {
    controller.deactivate(currentUser, 5);
    controller.linkUser(currentUser, 5, { userId: 9 });

    expect(employeesService.deactivate).toHaveBeenCalledWith(currentUser, 5);
    expect(employeesService.linkUser).toHaveBeenCalledWith(currentUser, 5, {
      userId: 9,
    });
  });
});
