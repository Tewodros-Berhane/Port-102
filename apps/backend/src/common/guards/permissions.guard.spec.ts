import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsGuard, type PermissionsRequest } from './permissions.guard';

const currentUser: CurrentUserPayload = {
  sub: 1,
  email: 'admin@port102.test',
  hotelId: 10,
  membershipId: 20,
  roleKey: 'HOTEL_ADMIN',
  tokenVersion: 0,
};

const rolePermissions = {
  permissions: [
    {
      permission: {
        key: 'users.read',
      },
    },
    {
      permission: {
        key: 'users.create',
      },
    },
  ],
};

const hotelContext = {
  membership: {
    id: 20,
    userId: 1,
    hotelId: 10,
    roleId: 30,
    departmentId: null,
    status: 'ACTIVE',
  },
  hotel: {
    id: 10,
    name: 'Port 102 Demo Hotel',
    code: 'DEMO',
    status: 'ACTIVE',
    timezone: 'Africa/Nairobi',
    defaultCurrency: 'ETB',
  },
  role: {
    id: 30,
    key: 'HOTEL_ADMIN',
    name: 'Hotel Admin',
    isSystem: true,
    isActive: true,
  },
  department: null,
};

type PrismaMock = {
  role: {
    findFirst: jest.Mock;
  };
  hotelUser: {
    findFirst: jest.Mock;
  };
};

function createContext(request: Partial<PermissionsRequest> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => createContext,
    getClass: () => PermissionsGuard,
  } as ExecutionContext;
}

function createGuard({
  requiredPermissions = ['users.read'],
  isPublic = false,
  role = rolePermissions,
  membership = { role: rolePermissions },
}: {
  requiredPermissions?: string[];
  isPublic?: boolean;
  role?: typeof rolePermissions | null;
  membership?: { role: typeof rolePermissions } | null;
} = {}) {
  const prisma: PrismaMock = {
    role: {
      findFirst: jest.fn().mockResolvedValue(role),
    },
    hotelUser: {
      findFirst: jest.fn().mockResolvedValue(membership),
    },
  };
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    getAllAndMerge: jest.fn().mockReturnValue(requiredPermissions),
  } as unknown as Reflector;

  return {
    guard: new PermissionsGuard(prisma as unknown as PrismaService, reflector),
    prisma,
    reflector,
  };
}

describe('PermissionsGuard', () => {
  it('skips public routes', async () => {
    const { guard, prisma } = createGuard({ isPublic: true });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prisma.role.findFirst).not.toHaveBeenCalled();
    expect(prisma.hotelUser.findFirst).not.toHaveBeenCalled();
  });

  it('allows routes without required permissions', async () => {
    const { guard, prisma } = createGuard({ requiredPermissions: [] });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prisma.role.findFirst).not.toHaveBeenCalled();
    expect(prisma.hotelUser.findFirst).not.toHaveBeenCalled();
  });

  it('rejects permission checks without an authenticated user payload', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows users whose membership role has every required permission', async () => {
    const { guard, prisma } = createGuard({
      requiredPermissions: ['users.read', 'users.create'],
    });
    const request: Partial<PermissionsRequest> = {
      user: currentUser,
      hotelContext,
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(prisma.role.findFirst).toHaveBeenCalledWith({
      where: {
        id: hotelContext.membership.roleId,
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
    expect(prisma.hotelUser.findFirst).not.toHaveBeenCalled();
    expect(request.permissionKeys).toEqual(['users.read', 'users.create']);
  });

  it('falls back to reading permissions through the active membership', async () => {
    const { guard, prisma } = createGuard({
      requiredPermissions: ['users.read'],
    });
    const request: Partial<PermissionsRequest> = {
      user: currentUser,
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(prisma.hotelUser.findFirst).toHaveBeenCalledWith({
      where: {
        id: currentUser.membershipId,
        userId: currentUser.sub,
        hotelId: currentUser.hotelId,
        status: 'ACTIVE',
        hotel: {
          status: 'ACTIVE',
        },
        role: {
          isActive: true,
        },
      },
      include: {
        role: {
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
        },
      },
    });
    expect(prisma.role.findFirst).not.toHaveBeenCalled();
    expect(request.permissionKeys).toEqual(['users.read', 'users.create']);
  });

  it('rejects users missing a required permission', async () => {
    const { guard } = createGuard({
      requiredPermissions: ['users.delete'],
    });

    await expect(
      guard.canActivate(createContext({ user: currentUser, hotelContext })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects users without an active membership role', async () => {
    const { guard } = createGuard({
      role: null,
    });

    await expect(
      guard.canActivate(createContext({ user: currentUser, hotelContext })),
    ).rejects.toThrow('Hotel access is not allowed.');
  });
});
