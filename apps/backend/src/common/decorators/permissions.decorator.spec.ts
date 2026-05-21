import 'reflect-metadata';

import { Permissions, REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';

class TestController {
  @Permissions('users.read', 'users.create')
  restrictedRoute() {
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
});
