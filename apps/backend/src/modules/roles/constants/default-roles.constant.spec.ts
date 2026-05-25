import { DEFAULT_PERMISSION_KEYS } from '../../permissions/constants/default-permissions.constant';
import { DEFAULT_ROLE_KEYS, DEFAULT_ROLES } from './default-roles.constant';

const ROOM_INVENTORY_PERMISSION_KEYS = [
  'floors.create',
  'floors.read',
  'floors.update',
  'floors.delete',
  'room_types.create',
  'room_types.read',
  'room_types.update',
  'room_types.delete',
  'room_amenities.create',
  'room_amenities.read',
  'room_amenities.update',
  'room_amenities.delete',
  'rooms.create',
  'rooms.read',
  'rooms.update',
  'rooms.delete',
  'rooms.status.read',
  'rooms.status.update',
  'rooms.out_of_order.mark',
  'rooms.out_of_order.clear',
  'rooms.availability.read',
] as const;

function getRolePermissions(roleKey: (typeof DEFAULT_ROLE_KEYS)[number]) {
  const role = DEFAULT_ROLES.find((defaultRole) => defaultRole.key === roleKey);

  expect(role).toBeDefined();

  return role?.permissions ?? [];
}

describe('default role permissions', () => {
  it('defines every default role exactly once', () => {
    const seededRoleKeys = DEFAULT_ROLES.map((role) => role.key);

    expect(new Set(seededRoleKeys).size).toBe(DEFAULT_ROLE_KEYS.length);
    expect(seededRoleKeys.toSorted()).toEqual(
      [...DEFAULT_ROLE_KEYS].toSorted(),
    );
  });

  it('does not reference permissions outside the default catalog', () => {
    const permissionKeys = new Set(DEFAULT_PERMISSION_KEYS);
    const unknownPermissions = DEFAULT_ROLES.flatMap((role) =>
      role.permissions.filter((permission) => !permissionKeys.has(permission)),
    );

    expect(unknownPermissions).toEqual([]);
  });

  it('does not define duplicate permission keys', () => {
    expect(new Set(DEFAULT_PERMISSION_KEYS).size).toBe(
      DEFAULT_PERMISSION_KEYS.length,
    );
  });

  it('includes every room inventory permission in the seed catalog', () => {
    expect(DEFAULT_PERMISSION_KEYS).toEqual(
      expect.arrayContaining([...ROOM_INVENTORY_PERMISSION_KEYS]),
    );
  });

  it('gives hotel admin full room inventory management access', () => {
    expect(getRolePermissions('HOTEL_ADMIN')).toEqual(
      expect.arrayContaining([...ROOM_INVENTORY_PERMISSION_KEYS]),
    );
  });
});
