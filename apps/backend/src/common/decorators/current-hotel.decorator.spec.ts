import { ExecutionContext } from '@nestjs/common';

import { getCurrentHotel } from './current-hotel.decorator';

function createContext(hotelId?: number) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: hotelId === undefined ? undefined : { hotelId },
      }),
    }),
  } as ExecutionContext;
}

describe('CurrentHotel decorator factory', () => {
  it('returns the active hotel id from the authenticated user payload', () => {
    expect(getCurrentHotel(undefined, createContext(10))).toBe(10);
  });

  it('returns undefined when no authenticated user is attached', () => {
    expect(getCurrentHotel(undefined, createContext())).toBeUndefined();
  });
});
