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
    findActiveUser: jest.Mock;
    findEmployeeLinkedToUser: jest.Mock;
  };

  const now = new Date('2026-05-23T00:00:00.000Z');
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };
  const department = {
    id: 3,
    key: 'HOUSEKEEPING',
    name: 'Housekeeping',
  };
  const employee = {
    id: 5,
    employeeNumber: 'EMP-001',
    firstName: 'Demo',
    lastName: 'Employee',
    email: 'employee@demo-hotel.com',
    phone: null,
    jobTitle: 'Supervisor',
    status: 'ACTIVE',
    hireDate: null,
    createdAt: now,
    updatedAt: now,
    department,
    user: null,
  };

  beforeEach(async () => {
    employeesRepository = {
      findActiveDepartment: jest.fn().mockResolvedValue(department),
      findEmployeeByNumber: jest.fn().mockResolvedValue(null),
      createEmployee: jest.fn().mockResolvedValue(employee),
      listEmployees: jest.fn().mockResolvedValue([1, [employee]]),
      findEmployeeProfile: jest.fn().mockResolvedValue(employee),
      updateEmployee: jest.fn().mockResolvedValue({ count: 1 }),
      findActiveUser: jest.fn().mockResolvedValue({ id: 9 }),
      findEmployeeLinkedToUser: jest.fn().mockResolvedValue(null),
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

  it('creates an employee profile without hotel ownership fields', async () => {
    await service.create(currentUser, {
      firstName: ' Demo ',
      lastName: ' Employee ',
      departmentId: 3,
      employeeNumber: ' EMP-001 ',
      email: ' EMPLOYEE@DEMO-HOTEL.COM ',
      jobTitle: ' Supervisor ',
    });

    expect(employeesRepository.findActiveDepartment).toHaveBeenCalledWith(3);
    expect(employeesRepository.findEmployeeByNumber).toHaveBeenCalledWith(
      'EMP-001',
    );
    expect(employeesRepository.createEmployee).toHaveBeenCalledWith({
      departmentId: 3,
      employeeNumber: 'EMP-001',
      firstName: 'Demo',
      lastName: 'Employee',
      email: 'employee@demo-hotel.com',
      phone: null,
      jobTitle: 'Supervisor',
      hireDate: null,
    });
  });

  it('rejects duplicate employee numbers globally', async () => {
    employeesRepository.findEmployeeByNumber.mockResolvedValue(employee);

    await expect(
      service.create(currentUser, {
        firstName: 'Demo',
        lastName: 'Employee',
        employeeNumber: 'EMP-001',
      }),
    ).rejects.toThrow('Employee number already exists.');
  });

  it('lists employees without hotel filters', async () => {
    await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      search: ' demo ',
      status: 'ACTIVE',
    });

    expect(employeesRepository.listEmployees).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'demo',
      status: 'ACTIVE',
    });
  });

  it('throws when an employee is missing', async () => {
    employeesRepository.findEmployeeProfile.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Employee was not found.',
    );
  });

  it('updates an employee profile directly', async () => {
    await service.update(currentUser, 5, {
      employeeNumber: 'EMP-002',
      firstName: ' Updated ',
      departmentId: 3,
      hireDate: null,
    });

    expect(employeesRepository.updateEmployee).toHaveBeenCalledWith(5, {
      employeeNumber: 'EMP-002',
      firstName: 'Updated',
      departmentId: 3,
      hireDate: null,
    });
  });

  it('deactivates an employee profile directly', async () => {
    await service.deactivate(currentUser, 5);

    expect(employeesRepository.updateEmployee).toHaveBeenCalledWith(5, {
      status: 'INACTIVE',
    });
  });

  it('links an employee to an active user', async () => {
    await service.linkUser(currentUser, 5, { userId: 9 });

    expect(employeesRepository.findActiveUser).toHaveBeenCalledWith(9);
    expect(employeesRepository.findEmployeeLinkedToUser).toHaveBeenCalledWith(
      9,
    );
    expect(employeesRepository.updateEmployee).toHaveBeenCalledWith(5, {
      userId: 9,
    });
  });

  it('rejects linking an inactive or missing user', async () => {
    employeesRepository.findActiveUser.mockResolvedValue(null);

    await expect(
      service.linkUser(currentUser, 5, { userId: 9 }),
    ).rejects.toThrow('User is not active or does not exist.');
  });

  it('rejects linking a user already linked to another employee', async () => {
    employeesRepository.findEmployeeLinkedToUser.mockResolvedValue({
      id: 6,
      userId: 9,
    });

    await expect(
      service.linkUser(currentUser, 5, { userId: 9 }),
    ).rejects.toThrow('User is already linked to another employee.');
  });
});
