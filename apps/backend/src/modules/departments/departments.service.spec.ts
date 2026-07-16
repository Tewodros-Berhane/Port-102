import { Test } from '@nestjs/testing';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DepartmentsService } from './departments.service';
import { DepartmentsRepository } from './repositories/departments.repository';

describe('DepartmentsService', () => {
  const user = {
    sub: 1,
    email: 'admin@test.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };
  const department = {
    id: 3,
    key: 'FRONT_DESK',
    name: 'Front Desk',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let service: DepartmentsService;
  let repository: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    repository = {
      findByKey: jest.fn(),
      create: jest.fn().mockResolvedValue(department),
      list: jest.fn().mockResolvedValue([1, [department]]),
      findById: jest.fn().mockResolvedValue(department),
      update: jest.fn().mockResolvedValue({ ...department, isActive: false }),
      countActiveAssignments: jest
        .fn()
        .mockResolvedValue({ users: 0, employees: 0 }),
    };
    audit = { record: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: DepartmentsRepository, useValue: repository },
        { provide: AuditLogsService, useValue: audit },
      ],
    }).compile();
    service = module.get(DepartmentsService);
  });

  it('creates a normalized unique department and audits it', async () => {
    await service.create(user, { key: 'front_desk', name: ' Front Desk ' });
    expect(repository.create).toHaveBeenCalledWith({
      key: 'FRONT_DESK',
      name: 'Front Desk',
      description: null,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'departments.created',
        entityType: 'Department',
      }),
    );
  });
  it('rejects a duplicate key', async () => {
    repository.findByKey.mockResolvedValue(department);
    await expect(
      service.create(user, { key: 'FRONT_DESK', name: 'Front Desk' }),
    ).rejects.toThrow('Department key already exists.');
  });
  it('lists with server pagination and filters', async () => {
    await service.list(user, {
      page: 2,
      limit: 10,
      search: ' desk ',
      isActive: true,
    });
    expect(repository.list).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'desk',
      isActive: true,
    });
  });
  it('returns detail and updates fields', async () => {
    expect(await service.getById(user, 3)).toEqual(department);
    await service.update(user, 3, { name: 'Reception' });
    expect(repository.update).toHaveBeenCalledWith(3, { name: 'Reception' });
  });
  it('rejects missing detail', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(user, 99)).rejects.toThrow(
      'Department was not found.',
    );
  });
  it('protects active user and employee assignments', async () => {
    repository.countActiveAssignments.mockResolvedValue({
      users: 1,
      employees: 1,
    });
    await expect(service.remove(user, 3)).rejects.toThrow(
      'Cannot deactivate a department with active users or employees assigned.',
    );
  });
  it('soft deactivates and audits an unused department', async () => {
    const result = await service.remove(user, 3);
    expect(result.isActive).toBe(false);
    expect(repository.update).toHaveBeenCalledWith(3, { isActive: false });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'departments.deactivated' }),
    );
  });
});
