import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RolesRepository } from './repositories/roles.repository';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let rolesRepository: {
    listRoles: jest.Mock;
    findRole: jest.Mock;
    findRoleByKey: jest.Mock;
    findActivePermissionsByKeys: jest.Mock;
    createCustomRole: jest.Mock;
    updateRole: jest.Mock;
    replaceRolePermissions: jest.Mock;
    deleteRole: jest.Mock;
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

  const usersRead = {
    id: 11,
    key: 'users.read',
    name: 'Read Users',
    category: 'users',
    description: null,
    isActive: true,
  };
  const usersCreate = {
    id: 12,
    key: 'users.create',
    name: 'Create Users',
    category: 'users',
    description: null,
    isActive: true,
  };

  function createRole(overrides: Record<string, unknown> = {}) {
    return {
      id: 2,
      key: 'NIGHT_AUDITOR',
      systemKey: null,
      name: 'Night Auditor',
      description: 'Night audit role',
      isSystem: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      permissions: [
        {
          permission: usersCreate,
        },
        {
          permission: usersRead,
        },
      ],
      ...overrides,
    };
  }

  beforeEach(async () => {
    rolesRepository = {
      listRoles: jest.fn().mockResolvedValue([createRole()]),
      findRole: jest.fn().mockResolvedValue(createRole()),
      findRoleByKey: jest.fn().mockResolvedValue(null),
      findActivePermissionsByKeys: jest
        .fn()
        .mockResolvedValue([usersCreate, usersRead]),
      createCustomRole: jest.fn().mockResolvedValue(createRole()),
      updateRole: jest.fn().mockResolvedValue(createRole({ name: 'Updated' })),
      replaceRolePermissions: jest.fn().mockResolvedValue(createRole()),
      deleteRole: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: rolesRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('lists global roles with permission keys', async () => {
    await expect(service.list(currentUser)).resolves.toEqual({
      items: [
        {
          id: 2,
          key: 'NIGHT_AUDITOR',
          name: 'Night Auditor',
          description: 'Night audit role',
          isSystem: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          permissions: [
            {
              id: 12,
              key: 'users.create',
              name: 'Create Users',
              category: 'users',
              description: null,
            },
            {
              id: 11,
              key: 'users.read',
              name: 'Read Users',
              category: 'users',
              description: null,
            },
          ],
        },
      ],
    });

    expect(rolesRepository.listRoles).toHaveBeenCalled();
  });

  it('creates a custom role with validated permissions', async () => {
    const result = await service.create(currentUser, {
      key: ' night_auditor ',
      name: ' Night Auditor ',
      description: ' Night audit role ',
      permissionKeys: ['users.read', 'users.create'],
    });

    expect(result).toMatchObject({
      id: 2,
      key: 'NIGHT_AUDITOR',
    });
    expect(rolesRepository.findRoleByKey).toHaveBeenCalledWith('NIGHT_AUDITOR');
    expect(rolesRepository.createCustomRole).toHaveBeenCalledWith({
      key: 'NIGHT_AUDITOR',
      name: 'Night Auditor',
      description: 'Night audit role',
      permissionIds: [12, 11],
    });
  });

  it('rejects duplicate role keys globally', async () => {
    rolesRepository.findRoleByKey.mockResolvedValue(createRole());

    await expect(
      service.create(currentUser, {
        key: 'NIGHT_AUDITOR',
        name: 'Night Auditor',
      }),
    ).rejects.toThrow('Role key already exists.');
  });

  it('rejects permission keys outside the active catalog', async () => {
    rolesRepository.findActivePermissionsByKeys.mockResolvedValue([usersRead]);

    await expect(
      service.assignPermissions(currentUser, 2, {
        permissionKeys: ['users.read', 'users.delete'],
      }),
    ).rejects.toThrow(
      'One or more permissions do not exist in the active catalog.',
    );
  });

  it('updates custom roles and replaces permissions when provided', async () => {
    rolesRepository.findActivePermissionsByKeys.mockResolvedValueOnce([
      usersRead,
    ]);

    await service.update(currentUser, 2, {
      key: 'night_manager',
      name: 'Night Manager',
      permissionKeys: ['users.read'],
    });

    expect(rolesRepository.updateRole).toHaveBeenCalledWith(2, {
      key: 'NIGHT_MANAGER',
      name: 'Night Manager',
    });
    expect(rolesRepository.replaceRolePermissions).toHaveBeenCalledWith(
      2,
      [11],
    );
  });

  it('protects system role keys from changes', async () => {
    rolesRepository.findRole.mockResolvedValue(
      createRole({
        key: 'hotel_admin',
        systemKey: 'HOTEL_ADMIN',
        isSystem: true,
      }),
    );

    await expect(
      service.update(currentUser, 2, { key: 'OTHER_KEY' }),
    ).rejects.toThrow('System role keys cannot be changed.');
  });

  it('rejects deleting system roles and deletes custom roles', async () => {
    rolesRepository.findRole.mockResolvedValueOnce(
      createRole({ isSystem: true }),
    );

    await expect(service.remove(currentUser, 2)).rejects.toThrow(
      'System roles cannot be deleted.',
    );

    rolesRepository.findRole.mockResolvedValueOnce(createRole());

    await expect(service.remove(currentUser, 2)).resolves.toEqual({
      deleted: true,
    });
    expect(rolesRepository.deleteRole).toHaveBeenCalledWith(2);
  });

  it('records actorUserId when role permissions change', async () => {
    rolesRepository.findActivePermissionsByKeys.mockResolvedValueOnce([
      usersRead,
    ]);

    await service.assignPermissions(currentUser, 2, {
      permissionKeys: ['users.read'],
    });

    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'roles.permissions_changed',
      entityType: 'Role',
      entityId: '2',
      metadata: {
        roleId: 2,
        permissionKeys: ['users.read'],
      },
    });
  });
});
