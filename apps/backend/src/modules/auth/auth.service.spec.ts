import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsersRepository } from '../users/repositories/users.repository';
import { AuthService } from './auth.service';
import { AuthTokensRepository } from './repositories/auth-tokens.repository';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findByEmailForLogin: jest.Mock;
    findActiveUserProfile: jest.Mock;
    findByIdForPasswordChange: jest.Mock;
    findByEmailForPasswordReset: jest.Mock;
    updatePassword: jest.Mock;
  };
  let authTokensRepository: {
    createRefreshToken: jest.Mock;
    findActiveRefreshTokenByHash: jest.Mock;
    revokeRefreshTokenByHash: jest.Mock;
    revokeActiveRefreshTokensForUser: jest.Mock;
    incrementUserTokenVersion: jest.Mock;
    findJwtUser: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let configService: {
    getOrThrow: jest.Mock;
    get: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };
  let passwordHash: string;

  const role = {
    id: 2,
    key: 'hotel_admin',
    systemKey: 'HOTEL_ADMIN',
    name: 'Hotel Admin',
    isActive: true,
    permissions: [
      {
        permission: {
          key: 'users.read',
        },
      },
      {
        permission: {
          key: 'roles.read',
        },
      },
    ],
  };

  const department = {
    id: 3,
    key: 'ADMINISTRATION',
    name: 'Administration',
  };

  function createUser(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Hotel Admin',
      passwordHash,
      status: 'ACTIVE',
      tokenVersion: 0,
      roleId: role.id,
      departmentId: department.id,
      role,
      department,
      ...overrides,
    };
  }

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    passwordHash = await hash('CorrectPassword123!', 4);
    usersRepository = {
      findByEmailForLogin: jest.fn(),
      findActiveUserProfile: jest.fn(),
      findByIdForPasswordChange: jest.fn(),
      findByEmailForPasswordReset: jest.fn(),
      updatePassword: jest.fn(),
    };
    authTokensRepository = {
      createRefreshToken: jest.fn(),
      findActiveRefreshTokenByHash: jest.fn(),
      revokeRefreshTokenByHash: jest.fn(),
      revokeActiveRefreshTokensForUser: jest.fn(),
      incrementUserTokenVersion: jest.fn(),
      findJwtUser: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };
    configService = {
      get: jest.fn().mockReturnValue(4),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshExpiresIn': '30d',
        };

        return values[key] ?? 'secret';
      }),
    };
    auditLogsService = {
      record: jest.fn(),
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
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('accepts valid credentials for an active user with a direct role', async () => {
    usersRepository.findByEmailForLogin.mockResolvedValue(createUser());

    const result = await service.validateLocalCredentials(
      ' Admin@Demo-Hotel.com ',
      'CorrectPassword123!',
    );

    expect(result).toMatchObject({
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Hotel Admin',
      status: 'ACTIVE',
      role: {
        id: 2,
        key: 'HOTEL_ADMIN',
        name: 'Hotel Admin',
      },
      department,
      permissions: ['users.read', 'roles.read'],
    });
    expect(usersRepository.findByEmailForLogin).toHaveBeenCalledWith(
      'admin@demo-hotel.com',
    );
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'auth.login_success',
      entityType: 'User',
      entityId: '1',
      metadata: {
        email: 'admin@demo-hotel.com',
        roleKey: 'HOTEL_ADMIN',
      },
    });
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
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login_failure',
        actorUserId: 1,
        metadata: expect.objectContaining({
          reason: 'inactive_user',
        }),
      }),
    );
  });

  it('builds a login response and stores a user-only refresh token', async () => {
    usersRepository.findByEmailForLogin.mockResolvedValue(createUser());
    const authenticatedUser = await service.validateLocalCredentials(
      'admin@demo-hotel.com',
      'CorrectPassword123!',
    );

    const response = await service.buildLoginResponse(authenticatedUser);

    expect(response).toMatchObject({
      status: 'authenticated',
      user: {
        id: 1,
        email: 'admin@demo-hotel.com',
        fullName: 'Hotel Admin',
        status: 'ACTIVE',
      },
      role: {
        id: 2,
        key: 'HOTEL_ADMIN',
        name: 'Hotel Admin',
      },
      department,
      permissions: ['users.read', 'roles.read'],
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
        roleKey: 'HOTEL_ADMIN',
        roleId: 2,
        departmentId: 3,
        tokenVersion: 0,
      },
      {
        expiresIn: '15m',
      },
    );
    expect(authTokensRepository.createRefreshToken).toHaveBeenCalledWith({
      userId: 1,
      tokenHash: expect.any(String),
      expiresAt: expect.any(Date),
    });
  });

  it('returns the current user role, department, and permissions without hotel fields', async () => {
    usersRepository.findActiveUserProfile.mockResolvedValue(createUser());

    await expect(service.getMe(currentUser)).resolves.toEqual({
      id: 1,
      fullName: 'Hotel Admin',
      email: 'admin@demo-hotel.com',
      status: 'ACTIVE',
      role: {
        id: 2,
        key: 'HOTEL_ADMIN',
        name: 'Hotel Admin',
      },
      department,
      permissions: ['users.read', 'roles.read'],
    });
  });

  it('rotates refresh tokens for active users with active direct roles', async () => {
    authTokensRepository.findActiveRefreshTokenByHash.mockResolvedValue({
      id: 1,
      userId: 1,
      tokenHash: 'hash',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
      user: createUser(),
    });

    const tokens = await service.refresh('refresh-token');

    expect(tokens.accessToken).toBe('access-token');
    expect(authTokensRepository.revokeRefreshTokenByHash).toHaveBeenCalledWith(
      expect.any(String),
    );
    expect(authTokensRepository.createRefreshToken).toHaveBeenCalledWith({
      userId: 1,
      tokenHash: expect.any(String),
      expiresAt: expect.any(Date),
    });
  });

  it('revokes all refresh tokens and increments token version on logout-all', async () => {
    await expect(service.logoutAll(currentUser)).resolves.toEqual({
      loggedOut: true,
    });

    expect(
      authTokensRepository.revokeActiveRefreshTokensForUser,
    ).toHaveBeenCalledWith(1);
    expect(authTokensRepository.incrementUserTokenVersion).toHaveBeenCalledWith(
      1,
    );
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'auth.logout',
      entityType: 'User',
      entityId: '1',
      metadata: {
        scope: 'all_sessions',
      },
    });
  });

  it('changes the current user password and revokes old sessions', async () => {
    usersRepository.findByIdForPasswordChange.mockResolvedValue({
      id: 1,
      email: 'admin@demo-hotel.com',
      passwordHash,
      status: 'ACTIVE',
    });

    await expect(
      service.changePassword(currentUser, {
        currentPassword: 'CorrectPassword123!',
        newPassword: 'NewPassword123!',
      }),
    ).resolves.toEqual({ passwordChanged: true });

    expect(usersRepository.updatePassword).toHaveBeenCalledWith(
      1,
      expect.any(String),
    );
    expect(
      authTokensRepository.revokeActiveRefreshTokensForUser,
    ).toHaveBeenCalledWith(1);
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'auth.password_change',
      entityType: 'User',
      entityId: '1',
    });
  });

  it('validates JWT payloads against the current direct user role', async () => {
    authTokensRepository.findJwtUser.mockResolvedValue(createUser());

    await expect(service.validateJwtPayload(currentUser)).resolves.toBe(
      currentUser,
    );

    expect(authTokensRepository.findJwtUser).toHaveBeenCalledWith(1);
  });
});
