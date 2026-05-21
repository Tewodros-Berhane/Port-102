import { Test, TestingModule } from '@nestjs/testing';

import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './repositories/employees.repository';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeesRepository: {
    findActiveDepartment: jest.Mock;
    findEmployeeByNumber: jest.Mock;
    createEmployee: jest.Mock;
    listEmployees: jest.Mock;
    findEmployeeProfile: jest.Mock;
    updateEmployee: jest.Mock;
    findHotelUser: jest.Mock;
    findEmployeeLinkedToUser: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    hotelId: 10,
    membershipId: 20,
    roleKey: 'HOTEL_ADMIN',
    tokenVersion: 0,
  };
  const now = new Date('2026-05-22T00:00:00.000Z');
  const employeeProfile = {
    id: 5,
    hotelId: 10,
    employeeNumber: 'EMP-001',
    firstName: 'Demo',
    lastName: 'Employee',
    email: 'employee@demo-hotel.com',
    phone: '+251911111111',
    jobTitle: 'Supervisor',
    status: 'ACTIVE',
    hireDate: now,
    createdAt: now,
    updatedAt: now,
    department: {
      id: 3,
      key: 'HOUSEKEEPING',
      name: 'Housekeeping',
    },
    user: null,
  };

  beforeEach(async () => {
    employeesRepository = {
      findActiveDepartment: jest.fn().mockResolvedValue({ id: 3 }),
      findEmployeeByNumber: jest.fn(),
      createEmployee: jest.fn().mockResolvedValue(employeeProfile),
      listEmployees: jest.fn().mockResolvedValue([1, [employeeProfile]]),
      findEmployeeProfile: jest.fn().mockResolvedValue(employeeProfile),
      updateEmployee: jest.fn().mockResolvedValue({ count: 1 }),
      findHotelUser: jest.fn().mockResolvedValue({
        userId: 9,
        user: {
          id: 9,
        },
      }),
      findEmployeeLinkedToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: EmployeesRepository,
          useValue: employeesRepository,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an employee without a linked login user', async () => {
    const result = await service.create(currentUser, {
      employeeNumber: ' EMP-001 ',
      firstName: ' Demo ',
      lastName: ' Employee ',
      email: ' EMPLOYEE@DEMO-HOTEL.COM ',
      phone: ' +251911111111 ',
      jobTitle: ' Supervisor ',
      departmentId: 3,
      hireDate: '2026-05-22',
    });

    expect(employeesRepository.findActiveDepartment).toHaveBeenCalledWith(
      10,
      3,
    );
    expect(employeesRepository.findEmployeeByNumber).toHaveBeenCalledWith(
      10,
      'EMP-001',
    );
    expect(employeesRepository.createEmployee).toHaveBeenCalledWith({
      hotelId: 10,
      departmentId: 3,
      employeeNumber: 'EMP-001',
      firstName: 'Demo',
      lastName: 'Employee',
      email: 'employee@demo-hotel.com',
      phone: '+251911111111',
      jobTitle: 'Supervisor',
      hireDate: new Date('2026-05-22'),
    });
    expect(result).toMatchObject({
      id: 5,
      employeeNumber: 'EMP-001',
      user: null,
    });
  });

  it('rejects duplicate employee numbers inside the same hotel', async () => {
    employeesRepository.findEmployeeByNumber.mockResolvedValue(employeeProfile);

    await expect(
      service.create(currentUser, {
        employeeNumber: 'EMP-001',
        firstName: 'Demo',
        lastName: 'Employee',
      }),
    ).rejects.toThrow('Employee number already exists in this hotel.');
  });

  it('lists employees with pagination metadata', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      search: ' demo ',
      status: 'ACTIVE',
    });

    expect(employeesRepository.listEmployees).toHaveBeenCalledWith({
      hotelId: 10,
      skip: 10,
      take: 10,
      search: 'demo',
      status: 'ACTIVE',
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('rejects employee lookups outside the current hotel', async () => {
    employeesRepository.findEmployeeProfile.mockResolvedValue(null);

    await expect(service.getById(currentUser, 5)).rejects.toThrow(
      'Employee was not found in this hotel.',
    );
  });

  it('updates an employee profile in the current hotel', async () => {
    await service.update(currentUser, 5, {
      employeeNumber: 'EMP-002',
      firstName: 'Updated',
      departmentId: 3,
      hireDate: null,
    });

    expect(employeesRepository.updateEmployee).toHaveBeenCalledWith(10, 5, {
      employeeNumber: 'EMP-002',
      firstName: 'Updated',
      departmentId: 3,
      hireDate: null,
    });
  });

  it('deactivates an employee profile in the current hotel', async () => {
    await service.deactivate(currentUser, 5);

    expect(employeesRepository.updateEmployee).toHaveBeenCalledWith(10, 5, {
      status: 'INACTIVE',
    });
  });

  it('links an employee to an active current-hotel user', async () => {
    await service.linkUser(currentUser, 5, { userId: 9 });

    expect(employeesRepository.findHotelUser).toHaveBeenCalledWith(10, 9);
    expect(employeesRepository.findEmployeeLinkedToUser).toHaveBeenCalledWith(
      10,
      9,
    );
    expect(employeesRepository.updateEmployee).toHaveBeenCalledWith(10, 5, {
      userId: 9,
    });
  });

  it('rejects linking a user from outside the current hotel', async () => {
    employeesRepository.findHotelUser.mockResolvedValue(null);

    await expect(
      service.linkUser(currentUser, 5, { userId: 9 }),
    ).rejects.toThrow('User does not belong to the current hotel.');
  });

  it('rejects linking a user already linked to another employee', async () => {
    employeesRepository.findEmployeeLinkedToUser.mockResolvedValue({
      id: 99,
    });

    await expect(
      service.linkUser(currentUser, 5, { userId: 9 }),
    ).rejects.toThrow('User is already linked to another employee.');
  });
});
