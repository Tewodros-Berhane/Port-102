import 'reflect-metadata';

import {
  ANY_REQUIRED_PERMISSIONS_KEY,
  AnyPermissions,
  Permissions,
  REQUIRED_PERMISSIONS_KEY,
} from './permissions.decorator';

class TestController {
  @Permissions('users.read', 'users.create')
  restrictedRoute() {
    return true;
  }

  @AnyPermissions(
    'housekeeping.tasks.start',
    'housekeeping.tasks.start.assigned',
  )
  eitherPermissionRoute() {
    return true;
  }
}

describe('Permissions decorator', () => {
  it('stores required permission keys on the route handler', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        TestController.prototype.restrictedRoute,
      ),
    ).toEqual(['users.read', 'users.create']);
  });

  it('stores any required permission keys on the route handler', () => {
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        TestController.prototype.eitherPermissionRoute,
      ),
    ).toEqual([
      'housekeeping.tasks.start',
      'housekeeping.tasks.start.assigned',
    ]);
  });
});
