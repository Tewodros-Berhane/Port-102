import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    findAssignableRole: jest.Mock;
    findActiveDepartment: jest.Mock;
    findByEmailForManagement: jest.Mock;
    createUser: jest.Mock;
    listUsers: jest.Mock;
    findUserProfile: jest.Mock;
    updateUserProfile: jest.Mock;
    updatePassword: jest.Mock;
    revokeActiveRefreshTokensForUser: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
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

  const role = {
    id: 2,
    key: 'hotel_admin',
    systemKey: 'HOTEL_ADMIN',
    name: 'Hotel Admin',
  };
  const department = {
    id: 3,
    key: 'ADMINISTRATION',
    name: 'Administration',
  };

  function createUser(overrides: Record<string, unknown> = {}) {
    return {
      id: 5,
      email: 'user@demo-hotel.com',
      fullName: 'Demo User',
      phone: null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      role,
      department,
      ...overrides,
    };
  }

  beforeEach(async () => {
    usersRepository = {
      findAssignableRole: jest.fn().mockResolvedValue(role),
      findActiveDepartment: jest.fn().mockResolvedValue(department),
      findByEmailForManagement: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockResolvedValue({ id: 5 }),
      listUsers: jest.fn().mockResolvedValue([1, [createUser()]]),
      findUserProfile: jest.fn().mockResolvedValue(createUser()),
      updateUserProfile: jest.fn().mockResolvedValue(createUser()),
      updatePassword: jest.fn(),
      revokeActiveRefreshTokensForUser: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(4),
          },
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates a user with direct roleId and optional departmentId', async () => {
    const result = await service.create(currentUser, {
      email: ' USER@DEMO-HOTEL.COM ',
      fullName: ' Demo User ',
      password: 'Password123!',
      roleId: 2,
      departmentId: 3,
      phone: ' 555 ',
    });

    expect(result).toMatchObject({
      id: 5,
      email: 'user@demo-hotel.com',
      role: {
        id: 2,
        key: 'HOTEL_ADMIN',
      },
      department,
    });
    expect(usersRepository.createUser).toHaveBeenCalledWith({
      email: 'user@demo-hotel.com',
      passwordHash: expect.any(String),
      fullName: 'Demo User',
      phone: '555',
      roleId: 2,
      departmentId: 3,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'users.created',
      entityType: 'User',
      entityId: '5',
      metadata: {
        targetUserId: 5,
        roleId: 2,
        departmentId: 3,
      },
    });
  });

  it('rejects duplicate emails globally', async () => {
    usersRepository.findByEmailForManagement.mockResolvedValue(createUser());

    await expect(
      service.create(currentUser, {
        email: 'user@demo-hotel.com',
        fullName: 'Demo User',
        password: 'Password123!',
        roleId: 2,
      }),
    ).rejects.toThrow('Email is already in use.');
  });

  it('lists users without hotel filters', async () => {
    await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      search: ' demo ',
    });

    expect(usersRepository.listUsers).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'demo',
    });
  });

  it('updates a user profile directly', async () => {
    await service.update(currentUser, 5, {
      email: 'UPDATED@DEMO-HOTEL.COM',
      fullName: ' Updated User ',
      departmentId: null,
    });

    expect(usersRepository.updateUserProfile).toHaveBeenCalledWith(5, {
      email: 'updated@demo-hotel.com',
      fullName: 'Updated User',
      departmentId: null,
    });
  });

  it('deactivates and activates users with actorUserId audit logs', async () => {
    await service.deactivate(currentUser, 5);
    await service.activate(currentUser, 5);

    expect(usersRepository.updateUserProfile).toHaveBeenCalledWith(5, {
      status: 'INACTIVE',
    });
    expect(usersRepository.updateUserProfile).toHaveBeenCalledWith(5, {
      status: 'ACTIVE',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'users.deactivated',
      entityType: 'User',
      entityId: '5',
      metadata: {
        targetUserId: 5,
      },
    });
  });

  it('resets passwords and revokes existing refresh tokens', async () => {
    await expect(
      service.resetPassword(currentUser, 5, {
        newPassword: 'NewPassword123!',
      }),
    ).resolves.toEqual({ passwordReset: true });

    expect(usersRepository.updatePassword).toHaveBeenCalledWith(
      5,
      expect.any(String),
    );
    expect(
      usersRepository.revokeActiveRefreshTokensForUser,
    ).toHaveBeenCalledWith(5);
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'auth.password_reset',
      entityType: 'User',
      entityId: '5',
      metadata: {
        targetUserId: 5,
        scope: 'admin_reset',
      },
    });
  });

  it('assigns a direct roleId on the user record', async () => {
    await service.assignRole(currentUser, 5, {
      roleId: 4,
      departmentId: null,
    });

    expect(usersRepository.findAssignableRole).toHaveBeenCalledWith(4);
    expect(usersRepository.updateUserProfile).toHaveBeenCalledWith(5, {
      roleId: 4,
      departmentId: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'users.role_assigned',
      entityType: 'User',
      entityId: '5',
      metadata: {
        targetUserId: 5,
        roleId: 4,
        departmentId: null,
      },
    });
  });

  it('throws when a user is missing', async () => {
    usersRepository.findUserProfile.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'User was not found.',
    );
  });
});
