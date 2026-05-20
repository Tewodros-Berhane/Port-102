import { DEFAULT_PERMISSION_KEYS } from '../../permissions/constants/default-permissions.constant';
import { DEFAULT_ROLE_KEYS, DEFAULT_ROLES } from './default-roles.constant';

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
});
