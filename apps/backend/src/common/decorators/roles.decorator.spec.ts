import 'reflect-metadata';

import { REQUIRED_ROLES_KEY, Roles } from './roles.decorator';

class TestController {
  @Roles('HOTEL_ADMIN', 'GENERAL_MANAGER')
  restrictedRoute() {
    return true;
  }
}

describe('Roles decorator', () => {
  it('stores required role keys on the route handler', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_ROLES_KEY,
        TestController.prototype.restrictedRoute,
      ),
    ).toEqual(['HOTEL_ADMIN', 'GENERAL_MANAGER']);
  });
});
