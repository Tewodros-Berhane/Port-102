import { ExecutionContext } from '@nestjs/common';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';
import { getCurrentUser } from './current-user.decorator';

const currentUser: CurrentUserPayload = {
  sub: 1,
  email: 'admin@port102.test',
  hotelId: 10,
  membershipId: 20,
  roleKey: 'HOTEL_ADMIN',
  tokenVersion: 0,
};

function createContext(user?: CurrentUserPayload) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('CurrentUser decorator factory', () => {
  it('returns the full authenticated user payload', () => {
    expect(getCurrentUser(undefined, createContext(currentUser))).toEqual(
      currentUser,
    );
  });

  it('returns a selected user payload property', () => {
    expect(getCurrentUser('email', createContext(currentUser))).toBe(
      currentUser.email,
    );
  });

  it('returns undefined when no authenticated user is attached', () => {
    expect(getCurrentUser(undefined, createContext())).toBeUndefined();
    expect(getCurrentUser('email', createContext())).toBeUndefined();
  });
});
