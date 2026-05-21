import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';

import { UsersRepository } from '../users/repositories/users.repository';
import { AuthService } from './auth.service';
import { AuthTokensRepository } from './repositories/auth-tokens.repository';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findByEmailForLogin: jest.Mock;
    findByIdForHotelSelection: jest.Mock;
    findActiveMembershipProfile: jest.Mock;
    findActiveMembershipsForUser: jest.Mock;
  };
  let authTokensRepository: {
    createRefreshToken: jest.Mock;
    findActiveRefreshTokenByHash: jest.Mock;
    revokeRefreshTokenByHash: jest.Mock;
    revokeActiveRefreshTokensForUser: jest.Mock;
    incrementUserTokenVersion: jest.Mock;
    findJwtMembership: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let configService: {
    getOrThrow: jest.Mock;
  };
  let passwordHash: string;

  const activeMembership = {
    id: 10,
    status: 'ACTIVE',
    hotel: {
      id: 1,
      name: 'Demo Hotel',
      code: 'DEMO',
      status: 'ACTIVE',
    },
    role: {
      id: 2,
      key: 'HOTEL_ADMIN',
      systemKey: 'HOTEL_ADMIN',
      name: 'Hotel Admin',
      isActive: true,
    },
    department: {
      id: 3,
      key: 'ADMINISTRATION',
      name: 'Administration',
    },
  };

  function createUser(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Hotel Admin',
      passwordHash,
      status: 'ACTIVE',
      tokenVersion: 0,
      hotelUsers: [activeMembership],
      ...overrides,
    };
  }

  beforeEach(async () => {
    passwordHash = await hash('CorrectPassword123!', 4);
    usersRepository = {
      findByEmailForLogin: jest.fn(),
      findByIdForHotelSelection: jest.fn(),
      findActiveMembershipProfile: jest.fn(),
      findActiveMembershipsForUser: jest.fn(),
    };
    authTokensRepository = {
      createRefreshToken: jest.fn(),
      findActiveRefreshTokenByHash: jest.fn(),
      revokeRefreshTokenByHash: jest.fn(),
      revokeActiveRefreshTokensForUser: jest.fn(),
      incrementUserTokenVersion: jest.fn(),
      findJwtMembership: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
      verifyAsync: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshExpiresIn': '30d',
          'jwt.hotelSelectionExpiresIn': '10m',
        };

        return values[key] ?? 'secret';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: AuthTokensRepository,
          useValue: authTokensRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('accepts valid credentials for a single active hotel membership', async () => {
    usersRepository.findByEmailForLogin.mockResolvedValue(createUser());

    const user = await service.validateLocalCredentials(
      ' ADMIN@DEMO-HOTEL.COM ',
      'CorrectPassword123!',
    );
    const response = await service.buildLoginResponse(user);

    expect(usersRepository.findByEmailForLogin).toHaveBeenCalledWith(
      'admin@demo-hotel.com',
    );
    expect(user).not.toHaveProperty('passwordHash');
    expect(response).toMatchObject({
      status: 'authenticated',
      requiresHotelSelection: false,
      activeHotel: {
        id: 1,
        name: 'Demo Hotel',
        code: 'DEMO',
      },
      membership: {
        id: 10,
        role: {
          key: 'HOTEL_ADMIN',
        },
      },
      tokens: {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: '15m',
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 1,
        email: 'admin@demo-hotel.com',
        hotelId: 1,
        membershipId: 10,
        roleKey: 'HOTEL_ADMIN',
        tokenVersion: 0,
      },
      { expiresIn: '15m' },
    );
    expect(authTokensRepository.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        hotelUserId: 10,
        tokenHash: expect.not.stringContaining(
          response.tokens?.refreshToken ?? '',
        ),
      }),
    );
  });

  it('rejects invalid credentials', async () => {
    usersRepository.findByEmailForLogin.mockResolvedValue(createUser());

    await expect(
      service.validateLocalCredentials(
        'admin@demo-hotel.com',
        'WrongPassword123!',
      ),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('rejects inactive users', async () => {
    usersRepository.findByEmailForLogin.mockResolvedValue(
      createUser({ status: 'INACTIVE' }),
    );

    await expect(
      service.validateLocalCredentials(
        'admin@demo-hotel.com',
        'CorrectPassword123!',
      ),
    ).rejects.toThrow('User account is not active.');
  });

  it('rejects users without an active hotel membership', async () => {
    usersRepository.findByEmailForLogin.mockResolvedValue(
      createUser({
        hotelUsers: [
          {
            ...activeMembership,
            status: 'INACTIVE',
          },
        ],
      }),
    );

    await expect(
      service.validateLocalCredentials(
        'admin@demo-hotel.com',
        'CorrectPassword123!',
      ),
    ).rejects.toThrow('User has no active hotel membership.');
  });

  it('returns hotel choices for a multi-hotel user', async () => {
    usersRepository.findByEmailForLogin.mockResolvedValue(
      createUser({
        hotelUsers: [
          activeMembership,
          {
            ...activeMembership,
            id: 11,
            hotel: {
              id: 2,
              name: 'Second Hotel',
              code: 'SECOND',
              status: 'ACTIVE',
            },
          },
        ],
      }),
    );

    const user = await service.validateLocalCredentials(
      'admin@demo-hotel.com',
      'CorrectPassword123!',
    );
    const response = await service.buildLoginResponse(user);

    expect(response).toMatchObject({
      requiresHotelSelection: true,
      activeHotel: null,
      membership: null,
      hotelSelectionToken: 'access-token',
      tokens: null,
    });
    expect(response.hotelChoices).toHaveLength(2);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 1,
        email: 'admin@demo-hotel.com',
        tokenVersion: 0,
        purpose: 'hotel-selection',
      },
      { expiresIn: '10m' },
    );
  });

  it('returns the current user hotel context and permissions', async () => {
    usersRepository.findActiveMembershipProfile.mockResolvedValue({
      ...activeMembership,
      userId: 1,
      hotelId: 1,
      user: {
        id: 1,
        email: 'admin@demo-hotel.com',
        fullName: 'Hotel Admin',
      },
      role: {
        ...activeMembership.role,
        permissions: [
          {
            permission: {
              key: 'users.read',
            },
          },
          {
            permission: {
              key: 'reports.occupancy.read',
            },
          },
        ],
      },
    });

    await expect(
      service.getMe({
        sub: 1,
        email: 'admin@demo-hotel.com',
        hotelId: 1,
        membershipId: 10,
        roleKey: 'HOTEL_ADMIN',
        tokenVersion: 0,
      }),
    ).resolves.toEqual({
      id: 1,
      name: 'Hotel Admin',
      email: 'admin@demo-hotel.com',
      activeHotel: {
        id: 1,
        name: 'Demo Hotel',
        code: 'DEMO',
      },
      membership: {
        id: 10,
        role: {
          id: 2,
          key: 'HOTEL_ADMIN',
          name: 'Hotel Admin',
        },
        department: {
          id: 3,
          key: 'ADMINISTRATION',
          name: 'Administration',
        },
      },
      permissions: ['users.read', 'reports.occupancy.read'],
    });
    expect(usersRepository.findActiveMembershipProfile).toHaveBeenCalledWith(
      1,
      10,
    );
  });

  it('lists active hotels available to the current user', async () => {
    usersRepository.findActiveMembershipsForUser.mockResolvedValue([
      activeMembership,
      {
        ...activeMembership,
        id: 11,
        hotel: {
          id: 2,
          name: 'Second Hotel',
          code: 'SECOND',
          status: 'ACTIVE',
        },
      },
    ]);

    await expect(
      service.getMyHotels({
        sub: 1,
        email: 'admin@demo-hotel.com',
        hotelId: 1,
        membershipId: 10,
        roleKey: 'HOTEL_ADMIN',
        tokenVersion: 0,
      }),
    ).resolves.toEqual([
      {
        id: 10,
        hotel: {
          id: 1,
          name: 'Demo Hotel',
          code: 'DEMO',
        },
        role: {
          id: 2,
          key: 'HOTEL_ADMIN',
          name: 'Hotel Admin',
        },
        department: {
          id: 3,
          key: 'ADMINISTRATION',
          name: 'Administration',
        },
      },
      {
        id: 11,
        hotel: {
          id: 2,
          name: 'Second Hotel',
          code: 'SECOND',
        },
        role: {
          id: 2,
          key: 'HOTEL_ADMIN',
          name: 'Hotel Admin',
        },
        department: {
          id: 3,
          key: 'ADMINISTRATION',
          name: 'Administration',
        },
      },
    ]);
  });

  it('selects an active hotel and issues tokens', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'admin@demo-hotel.com',
      tokenVersion: 0,
      purpose: 'hotel-selection',
    });
    usersRepository.findByIdForHotelSelection.mockResolvedValue(
      createUser({
        hotelUsers: [
          activeMembership,
          {
            ...activeMembership,
            id: 11,
            hotel: {
              id: 2,
              name: 'Second Hotel',
              code: 'SECOND',
              status: 'ACTIVE',
            },
          },
        ],
      }),
    );

    const response = await service.selectHotel('selection-token', 2);

    expect(response).toMatchObject({
      requiresHotelSelection: false,
      activeHotel: {
        id: 2,
        name: 'Second Hotel',
        code: 'SECOND',
      },
      membership: {
        id: 11,
      },
      hotelSelectionToken: null,
      tokens: {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: '15m',
      },
    });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('selection-token');
    expect(jwtService.signAsync).toHaveBeenLastCalledWith(
      {
        sub: 1,
        email: 'admin@demo-hotel.com',
        hotelId: 2,
        membershipId: 11,
        roleKey: 'HOTEL_ADMIN',
        tokenVersion: 0,
      },
      { expiresIn: '15m' },
    );
  });

  it('rejects invalid hotel selection tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

    await expect(service.selectHotel('expired-token', 1)).rejects.toThrow(
      'Invalid hotel selection token.',
    );
  });

  it('rotates refresh tokens', async () => {
    authTokensRepository.findActiveRefreshTokenByHash.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 1,
        email: 'admin@demo-hotel.com',
        fullName: 'Hotel Admin',
        status: 'ACTIVE',
        tokenVersion: 0,
      },
      hotelUser: activeMembership,
    });

    const tokens = await service.refresh('refresh-token');

    expect(tokens).toMatchObject({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: '15m',
    });
    expect(authTokensRepository.revokeRefreshTokenByHash).toHaveBeenCalled();
    expect(authTokensRepository.createRefreshToken).toHaveBeenCalled();
  });

  it('rejects expired refresh tokens', async () => {
    authTokensRepository.findActiveRefreshTokenByHash.mockResolvedValue({
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(service.refresh('expired-token')).rejects.toThrow(
      'Invalid refresh token.',
    );
  });

  it('revokes all refresh tokens and increments token version on logout-all', async () => {
    await expect(
      service.logoutAll({
        sub: 1,
        email: 'admin@demo-hotel.com',
        hotelId: 1,
        membershipId: 10,
        roleKey: 'HOTEL_ADMIN',
        tokenVersion: 0,
      }),
    ).resolves.toEqual({ loggedOut: true });

    expect(
      authTokensRepository.revokeActiveRefreshTokensForUser,
    ).toHaveBeenCalledWith(1);
    expect(authTokensRepository.incrementUserTokenVersion).toHaveBeenCalledWith(
      1,
    );
  });
});
