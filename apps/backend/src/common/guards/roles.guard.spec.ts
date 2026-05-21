import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard, type RolesRequest } from './roles.guard';

const currentUser: CurrentUserPayload = {
  sub: 1,
  email: 'admin@port102.test',
  hotelId: 10,
  membershipId: 20,
  roleKey: 'HOTEL_ADMIN',
  tokenVersion: 0,
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
  hotelUser: {
    findFirst: jest.Mock;
  };
};

function createContext(request: Partial<RolesRequest> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => createContext,
    getClass: () => RolesGuard,
  } as ExecutionContext;
}

function createGuard({
  requiredRoles = ['HOTEL_ADMIN'],
  isPublic = false,
  membership = {
    role: {
      key: 'hotel-admin',
      systemKey: 'HOTEL_ADMIN',
    },
  },
}: {
  requiredRoles?: string[];
  isPublic?: boolean;
  membership?: { role: { key: string; systemKey: string | null } } | null;
} = {}) {
  const prisma: PrismaMock = {
    hotelUser: {
      findFirst: jest.fn().mockResolvedValue(membership),
    },
  };
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    getAllAndMerge: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;

  return {
    guard: new RolesGuard(prisma as unknown as PrismaService, reflector),
    prisma,
    reflector,
  };
}

describe('RolesGuard', () => {
  it('skips public routes', async () => {
    const { guard, prisma } = createGuard({ isPublic: true });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prisma.hotelUser.findFirst).not.toHaveBeenCalled();
  });

  it('allows routes without required roles', async () => {
    const { guard, prisma } = createGuard({ requiredRoles: [] });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prisma.hotelUser.findFirst).not.toHaveBeenCalled();
  });

  it('rejects role checks without an authenticated user payload', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows users whose current hotel context role is required', async () => {
    const { guard, prisma } = createGuard({
      requiredRoles: ['HOTEL_ADMIN', 'GENERAL_MANAGER'],
    });
    const request: Partial<RolesRequest> = {
      user: currentUser,
      hotelContext,
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(prisma.hotelUser.findFirst).not.toHaveBeenCalled();
    expect(request.roleKey).toBe('HOTEL_ADMIN');
  });

  it('falls back to reading the role through the active membership', async () => {
    const { guard, prisma } = createGuard({
      requiredRoles: ['HOTEL_ADMIN'],
    });
    const request: Partial<RolesRequest> = {
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
      select: {
        role: {
          select: {
            key: true,
            systemKey: true,
          },
        },
      },
    });
    expect(request.roleKey).toBe('HOTEL_ADMIN');
  });

  it('uses custom role keys when no system key exists', async () => {
    const { guard } = createGuard({
      requiredRoles: ['night-auditor'],
      membership: {
        role: {
          key: 'night-auditor',
          systemKey: null,
        },
      },
    });
    const request: Partial<RolesRequest> = {
      user: currentUser,
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.roleKey).toBe('night-auditor');
  });

  it('rejects users without an active membership role', async () => {
    const { guard } = createGuard({ membership: null });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow('Hotel access is not allowed.');
  });

  it('rejects users missing a required role', async () => {
    const { guard } = createGuard({
      requiredRoles: ['GENERAL_MANAGER'],
    });

    await expect(
      guard.canActivate(createContext({ user: currentUser, hotelContext })),
    ).rejects.toThrow(ForbiddenException);
  });
});
