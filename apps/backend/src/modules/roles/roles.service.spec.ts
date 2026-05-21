import { Test, TestingModule } from '@nestjs/testing';

import { RolesRepository } from './repositories/roles.repository';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let rolesRepository: {
    listVisibleRoles: jest.Mock;
    findVisibleRole: jest.Mock;
    findHotelRoleByKey: jest.Mock;
    findActivePermissionsByKeys: jest.Mock;
    createCustomRole: jest.Mock;
    updateRole: jest.Mock;
    replaceRolePermissions: jest.Mock;
    deleteRole: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    hotelId: 10,
    membershipId: 20,
    roleKey: 'HOTEL_ADMIN',
    tokenVersion: 0,
  };
  const now = new Date('2026-05-21T00:00:00.000Z');
  const permission = {
    id: 1,
    key: 'users.read',
    name: 'Users Read',
    category: 'users_roles',
    description: null,
    isActive: true,
  };
  const customRole = {
    id: 2,
    hotelId: 10,
    key: 'NIGHT_AUDITOR',
    systemKey: null,
    name: 'Night Auditor',
    description: null,
    isSystem: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    permissions: [
      {
        permission,
      },
    ],
  };
  const systemRole = {
    ...customRole,
    id: 3,
    hotelId: null,
    key: 'HOTEL_ADMIN',
    systemKey: 'HOTEL_ADMIN',
    name: 'Hotel Admin',
    isSystem: true,
  };

  beforeEach(async () => {
    rolesRepository = {
      listVisibleRoles: jest.fn().mockResolvedValue([systemRole, customRole]),
      findVisibleRole: jest.fn().mockResolvedValue(customRole),
      findHotelRoleByKey: jest.fn(),
      findActivePermissionsByKeys: jest.fn().mockResolvedValue([permission]),
      createCustomRole: jest.fn().mockResolvedValue(customRole),
      updateRole: jest.fn().mockResolvedValue(customRole),
      replaceRolePermissions: jest.fn().mockResolvedValue(customRole),
      deleteRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: rolesRepository,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists system and current hotel roles with permission keys', async () => {
    await expect(service.list(currentUser)).resolves.toMatchObject({
      items: [
        {
          id: 3,
          hotelId: null,
          key: 'HOTEL_ADMIN',
          isSystem: true,
          permissions: [
            {
              key: 'users.read',
            },
          ],
        },
        {
          id: 2,
          hotelId: 10,
          key: 'NIGHT_AUDITOR',
          isSystem: false,
        },
      ],
    });
    expect(rolesRepository.listVisibleRoles).toHaveBeenCalledWith(10);
  });

  it('creates a custom hotel role with validated permissions', async () => {
    await service.create(currentUser, {
      key: 'night_auditor',
      name: ' Night Auditor ',
      permissionKeys: ['users.read'],
    });

    expect(rolesRepository.findHotelRoleByKey).toHaveBeenCalledWith(
      10,
      'NIGHT_AUDITOR',
    );
    expect(rolesRepository.findActivePermissionsByKeys).toHaveBeenCalledWith([
      'users.read',
    ]);
    expect(rolesRepository.createCustomRole).toHaveBeenCalledWith({
      hotelId: 10,
      key: 'NIGHT_AUDITOR',
      name: 'Night Auditor',
      description: null,
      permissionIds: [1],
    });
  });

  it('rejects duplicate custom role keys in the same hotel', async () => {
    rolesRepository.findHotelRoleByKey.mockResolvedValue(customRole);

    await expect(
      service.create(currentUser, {
        key: 'NIGHT_AUDITOR',
        name: 'Night Auditor',
      }),
    ).rejects.toThrow('Role key already exists in this hotel.');
  });

  it('rejects permission keys outside the active catalog', async () => {
    rolesRepository.findActivePermissionsByKeys.mockResolvedValue([]);

    await expect(
      service.assignPermissions(currentUser, 2, {
        permissionKeys: ['missing.permission'],
      }),
    ).rejects.toThrow(
      'One or more permissions do not exist in the active catalog.',
    );
  });

  it('updates custom roles and replaces permissions when provided', async () => {
    await service.update(currentUser, 2, {
      key: 'night_manager',
      name: 'Night Manager',
      permissionKeys: ['users.read'],
    });

    expect(rolesRepository.updateRole).toHaveBeenCalledWith(2, {
      key: 'NIGHT_MANAGER',
      name: 'Night Manager',
    });
    expect(rolesRepository.replaceRolePermissions).toHaveBeenCalledWith(2, [1]);
  });

  it('protects system role keys from changes', async () => {
    rolesRepository.findVisibleRole.mockResolvedValue(systemRole);

    await expect(
      service.update(currentUser, 3, {
        key: 'OTHER_ROLE',
      }),
    ).rejects.toThrow('System role keys cannot be changed.');
  });

  it('rejects deleting system roles', async () => {
    rolesRepository.findVisibleRole.mockResolvedValue(systemRole);

    await expect(service.remove(currentUser, 3)).rejects.toThrow(
      'System roles cannot be deleted.',
    );
  });

  it('deletes custom hotel roles', async () => {
    await expect(service.remove(currentUser, 2)).resolves.toEqual({
      deleted: true,
    });
    expect(rolesRepository.deleteRole).toHaveBeenCalledWith(2);
  });

  it('rejects roles outside the current hotel scope', async () => {
    rolesRepository.findVisibleRole.mockResolvedValue(null);

    await expect(service.getById(currentUser, 99)).rejects.toThrow(
      'Role was not found in this hotel.',
    );
  });
});
