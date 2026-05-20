import { createHash, randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { SignOptions } from 'jsonwebtoken';

import { UsersRepository } from '../users/repositories/users.repository';
import { AuthTokensRepository } from './repositories/auth-tokens.repository';
import type { CurrentUserPayload } from './types/current-user-payload.type';
import {
  LocalAuthenticatedMembership,
  LocalAuthenticatedUser,
} from './types/local-authenticated-user.type';
import { LoginResponse } from './types/login-response.type';
import type { TokenPair } from './types/token-pair.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authTokensRepository: AuthTokensRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateLocalCredentials(
    email: string,
    password: string,
  ): Promise<LocalAuthenticatedUser> {
    const user = await this.usersRepository.findByEmailForLogin(
      this.normalizeEmail(email),
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active.');
    }

    const activeMemberships = user.hotelUsers
      .filter(
        (membership) =>
          membership.status === 'ACTIVE' &&
          membership.hotel.status === 'ACTIVE' &&
          membership.role.isActive,
      )
      .map<LocalAuthenticatedMembership>((membership) => ({
        id: membership.id,
        hotel: {
          id: membership.hotel.id,
          name: membership.hotel.name,
          code: membership.hotel.code,
        },
        role: {
          id: membership.role.id,
          key: membership.role.systemKey ?? membership.role.key,
          name: membership.role.name,
        },
        department: membership.department
          ? {
              id: membership.department.id,
              key: membership.department.key,
              name: membership.department.name,
            }
          : null,
      }));

    if (activeMemberships.length === 0) {
      throw new UnauthorizedException('User has no active hotel membership.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tokenVersion: user.tokenVersion,
      memberships: activeMemberships,
    };
  }

  async buildLoginResponse(
    user: LocalAuthenticatedUser,
  ): Promise<LoginResponse> {
    const singleMembership =
      user.memberships.length === 1 ? user.memberships[0] : null;
    const tokens = singleMembership
      ? await this.createTokenPair(user, singleMembership)
      : null;

    return {
      status: 'authenticated',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      requiresHotelSelection: user.memberships.length > 1,
      activeHotel: singleMembership?.hotel ?? null,
      membership: singleMembership,
      hotelChoices: user.memberships,
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const persistedToken =
      await this.authTokensRepository.findActiveRefreshTokenByHash(tokenHash);

    if (!persistedToken || persistedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (
      persistedToken.user.status !== 'ACTIVE' ||
      !persistedToken.hotelUser ||
      persistedToken.hotelUser.status !== 'ACTIVE' ||
      persistedToken.hotelUser.hotel.status !== 'ACTIVE' ||
      !persistedToken.hotelUser.role.isActive
    ) {
      throw new UnauthorizedException('Refresh token is no longer valid.');
    }

    const membership = this.mapMembership(persistedToken.hotelUser);
    const user: LocalAuthenticatedUser = {
      id: persistedToken.user.id,
      email: persistedToken.user.email,
      fullName: persistedToken.user.fullName,
      tokenVersion: persistedToken.user.tokenVersion,
      memberships: [membership],
    };

    await this.authTokensRepository.revokeRefreshTokenByHash(tokenHash);

    return this.createTokenPair(user, membership);
  }

  async logout(refreshToken: string) {
    await this.authTokensRepository.revokeRefreshTokenByHash(
      this.hashRefreshToken(refreshToken),
    );

    return { loggedOut: true };
  }

  async logoutAll(payload: CurrentUserPayload) {
    await this.authTokensRepository.revokeActiveRefreshTokensForUser(
      payload.sub,
    );
    await this.authTokensRepository.incrementUserTokenVersion(payload.sub);

    return { loggedOut: true };
  }

  async validateJwtPayload(
    payload: CurrentUserPayload,
  ): Promise<CurrentUserPayload> {
    const membership = await this.authTokensRepository.findJwtMembership(
      payload.sub,
      payload.membershipId,
    );

    if (
      !membership ||
      membership.hotelId !== payload.hotelId ||
      membership.status !== 'ACTIVE' ||
      membership.hotel.status !== 'ACTIVE' ||
      !membership.role.isActive ||
      membership.user.status !== 'ACTIVE' ||
      membership.user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const roleKey = membership.role.systemKey ?? membership.role.key;

    if (roleKey !== payload.roleKey) {
      throw new UnauthorizedException('Invalid access token.');
    }

    return payload;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async createTokenPair(
    user: LocalAuthenticatedUser,
    membership: LocalAuthenticatedMembership,
  ): Promise<TokenPair> {
    const payload: CurrentUserPayload = {
      sub: user.id,
      email: user.email,
      hotelId: membership.hotel.id,
      membershipId: membership.id,
      roleKey: membership.role.key,
      tokenVersion: user.tokenVersion,
    };
    const refreshToken = this.generateRefreshToken();

    await this.authTokensRepository.createRefreshToken({
      userId: user.id,
      hotelUserId: membership.id,
      tokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs()),
    });

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        expiresIn: this.accessTokenExpiresIn(),
      }),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.getOrThrow<string>('jwt.accessExpiresIn'),
    };
  }

  private mapMembership(membership: {
    id: number;
    hotel: {
      id: number;
      name: string;
      code: string;
    };
    role: {
      id: number;
      key: string;
      systemKey: string | null;
      name: string;
    };
    department: {
      id: number;
      key: string;
      name: string;
    } | null;
  }): LocalAuthenticatedMembership {
    return {
      id: membership.id,
      hotel: {
        id: membership.hotel.id,
        name: membership.hotel.name,
        code: membership.hotel.code,
      },
      role: {
        id: membership.role.id,
        key: membership.role.systemKey ?? membership.role.key,
        name: membership.role.name,
      },
      department: membership.department
        ? {
            id: membership.department.id,
            key: membership.department.key,
            name: membership.department.name,
          }
        : null,
    };
  }

  private generateRefreshToken() {
    return randomBytes(64).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private refreshTokenTtlMs() {
    return this.parseDurationToMs(
      this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
    );
  }

  private accessTokenExpiresIn(): SignOptions['expiresIn'] {
    return this.configService.getOrThrow<string>(
      'jwt.accessExpiresIn',
    ) as SignOptions['expiresIn'];
  }

  private parseDurationToMs(duration: string) {
    const match = duration.trim().match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error(
        'JWT_REFRESH_EXPIRES_IN must use s, m, h, or d duration format.',
      );
    }

    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit as keyof typeof multipliers];
  }
}
