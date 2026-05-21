import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';
import { PrismaService } from '../../prisma/prisma.service';
import { HotelAccessGuard, HotelAccessRequest } from './hotel-access.guard';

const currentUser: CurrentUserPayload = {
  sub: 1,
  email: 'admin@port102.test',
  hotelId: 10,
  membershipId: 20,
  roleKey: 'HOTEL_ADMIN',
  tokenVersion: 0,
};

const activeMembership = {
  id: 20,
  userId: 1,
  hotelId: 10,
  roleId: 30,
  departmentId: 40,
  status: 'ACTIVE',
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
    key: 'hotel-admin',
    systemKey: 'HOTEL_ADMIN',
    name: 'Hotel Admin',
    isSystem: true,
    isActive: true,
  },
  department: {
    id: 40,
    key: 'front-office',
    name: 'Front Office',
  },
};

function createContext(request: Partial<HotelAccessRequest> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => createContext,
    getClass: () => HotelAccessGuard,
  } as ExecutionContext;
}

function createGuard({
  membership = activeMembership,
  isPublic = false,
}: {
  membership?: typeof activeMembership | null;
  isPublic?: boolean;
} = {}) {
  const prisma = {
    hotelUser: {
      findFirst: jest.fn().mockResolvedValue(membership),
    },
  } as unknown as PrismaService;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;

  return {
    guard: new HotelAccessGuard(prisma, reflector),
    prisma,
    reflector,
  };
}

describe('HotelAccessGuard', () => {
  it('allows an active membership for an active hotel and attaches context', async () => {
    const { guard, prisma } = createGuard();
    const request: Partial<HotelAccessRequest> = { user: currentUser };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(prisma.hotelUser.findFirst).toHaveBeenCalledWith({
      where: {
        id: currentUser.membershipId,
        userId: currentUser.sub,
        hotelId: currentUser.hotelId,
      },
      include: {
        hotel: true,
        role: true,
        department: true,
      },
    });
    expect(request.hotelContext).toEqual({
      membership: {
        id: 20,
        userId: 1,
        hotelId: 10,
        roleId: 30,
        departmentId: 40,
        status: 'ACTIVE',
      },
      hotel: activeMembership.hotel,
      role: {
        id: 30,
        key: 'HOTEL_ADMIN',
        name: 'Hotel Admin',
        isSystem: true,
        isActive: true,
      },
      department: activeMembership.department,
    });
  });

  it('skips public routes', async () => {
    const { guard, prisma } = createGuard({ isPublic: true });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(prisma.hotelUser.findFirst).not.toHaveBeenCalled();
  });

  it('rejects requests without an authenticated user payload', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects missing hotel membership', async () => {
    const { guard } = createGuard({ membership: null });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects inactive hotel membership', async () => {
    const { guard } = createGuard({
      membership: {
        ...activeMembership,
        status: 'INACTIVE',
      },
    });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow('Hotel membership is inactive.');
  });

  it('rejects inactive hotels', async () => {
    const { guard } = createGuard({
      membership: {
        ...activeMembership,
        hotel: {
          ...activeMembership.hotel,
          status: 'INACTIVE',
        },
      },
    });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow('Hotel is inactive.');
  });

  it('rejects inactive roles', async () => {
    const { guard } = createGuard({
      membership: {
        ...activeMembership,
        role: {
          ...activeMembership.role,
          isActive: false,
        },
      },
    });

    await expect(
      guard.canActivate(createContext({ user: currentUser })),
    ).rejects.toThrow('Hotel role is inactive.');
  });
});
