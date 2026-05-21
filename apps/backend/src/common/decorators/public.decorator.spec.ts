import 'reflect-metadata';

import { IS_PUBLIC_ROUTE_KEY, Public } from './public.decorator';

class TestController {
  @Public()
  publicRoute() {
    return true;
  }
}

describe('Public decorator', () => {
  it('marks a route as public', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_ROUTE_KEY,
        TestController.prototype.publicRoute,
      ),
    ).toBe(true);
  });
});
