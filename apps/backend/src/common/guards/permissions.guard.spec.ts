import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsGuard } from './permissions.guard';

const currentUser = {
  sub: 1,
  email: 'admin@demo-hotel.com',
  roleKey: 'HOTEL_ADMIN',
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
  requiredPermissions = ['users.read'],
  rolePermissions = ['users.read', 'roles.read'],
}: {
  isPublic?: boolean;
  requiredPermissions?: string[];
  rolePermissions?: string[] | null;
} = {}) {
  const prisma = {
    role: {
      findFirst: jest.fn().mockResolvedValue(
        rolePermissions
          ? {
              permissions: rolePermissions.map((key) => ({
                permission: { key },
              })),
            }
          : null,
      ),
    },
  } as unknown as PrismaService;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    getAllAndMerge: jest.fn().mockReturnValue(requiredPermissions),
  } as unknown as Reflector;

  return {
    guard: new PermissionsGuard(prisma, reflector),
    prisma,
    reflector,
  };
}

describe('PermissionsGuard', () => {
  it('skips public routes', async () => {
    const { guard, prisma } = createGuard({ isPublic: true });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prisma.role.findFirst).not.toHaveBeenCalled();
  });

  it('allows routes without required permissions', async () => {
    const { guard, prisma } = createGuard({ requiredPermissions: [] });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prisma.role.findFirst).not.toHaveBeenCalled();
  });

  it('rejects protected routes without an authenticated user', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows users whose direct role has every required permission', async () => {
    const { guard, prisma } = createGuard({
      requiredPermissions: ['users.read', 'roles.read'],
      rolePermissions: ['roles.read', 'users.read', 'users.create'],
    });
    const request = { user: currentUser };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(prisma.role.findFirst).toHaveBeenCalledWith({
      where: {
        id: currentUser.roleId,
        isActive: true,
      },
      include: {
        permissions: {
          where: {
            permission: {
              isActive: true,
            },
          },
          include: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });
    expect(request).toMatchObject({
      permissionKeys: ['roles.read', 'users.read', 'users.create'],
    });
  });

  it('rejects users missing a required permission', async () => {
    const { guard } = createGuard({
      requiredPermissions: ['users.delete'],
      rolePermissions: ['users.read'],
    });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects users without an active role permission set', async () => {
    const { guard } = createGuard({ rolePermissions: null });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow('Role access is not allowed.');
  });
});
