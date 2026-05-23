import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RoleKey } from '../../generated/prisma/client';
import { RolesGuard } from './roles.guard';

const currentUser = {
  sub: 1,
  email: 'admin@demo-hotel.com',
  roleKey: RoleKey.HOTEL_ADMIN,
  roleId: 2,
  departmentId: 3,
  tokenVersion: 0,
};

function createContext(request: Record<string, unknown> = {}) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createGuard({
  isPublic = false,
  requiredRoles = [RoleKey.HOTEL_ADMIN],
}: {
  isPublic?: boolean;
  requiredRoles?: string[];
} = {}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    getAllAndMerge: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;

  return {
    guard: new RolesGuard(reflector),
    reflector,
  };
}

describe('RolesGuard', () => {
  it('skips public routes', async () => {
    const { guard, reflector } = createGuard({ isPublic: true });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(reflector.getAllAndMerge).not.toHaveBeenCalled();
  });

  it('allows routes without required roles', async () => {
    const { guard } = createGuard({ requiredRoles: [] });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('rejects role checks without an authenticated user', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows users whose direct role key is required', async () => {
    const { guard } = createGuard({ requiredRoles: [RoleKey.HOTEL_ADMIN] });
    const request = { user: currentUser };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(request).toMatchObject({ roleKey: RoleKey.HOTEL_ADMIN });
  });

  it('rejects users missing a required role', async () => {
    const { guard } = createGuard({ requiredRoles: [RoleKey.ACCOUNTANT] });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow(ForbiddenException);
  });
});
