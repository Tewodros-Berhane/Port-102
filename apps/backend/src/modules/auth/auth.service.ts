import { createHash, randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import type { SignOptions } from 'jsonwebtoken';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsersRepository } from '../users/repositories/users.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokensRepository } from './repositories/auth-tokens.repository';
import type { AuthMeResponse } from './types/auth-me-response.type';
import type { CurrentUserPayload } from './types/current-user-payload.type';
import type { LocalAuthenticatedUser } from './types/local-authenticated-user.type';
import { LoginResponse } from './types/login-response.type';
import type { TokenPair } from './types/token-pair.type';

type LoginUserSource = NonNullable<
  Awaited<ReturnType<UsersRepository['findByEmailForLogin']>>
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authTokensRepository: AuthTokensRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async validateLocalCredentials(
    email: string,
    password: string,
  ): Promise<LocalAuthenticatedUser> {
    const normalizedEmail = this.normalizeEmail(email);
    const user =
      await this.usersRepository.findByEmailForLogin(normalizedEmail);

    if (!user) {
      await this.recordLoginFailure(normalizedEmail, null, 'unknown_user');
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      await this.recordLoginFailure(normalizedEmail, user, 'invalid_password');
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      await this.recordLoginFailure(normalizedEmail, user, 'inactive_user');
      throw new UnauthorizedException('User account is not active.');
    }

    if (!user.role.isActive) {
      await this.recordLoginFailure(normalizedEmail, user, 'inactive_role');
      throw new UnauthorizedException('User role is not active.');
    }

    await this.recordLoginSuccess(user);

    return this.mapAuthenticatedUser(user);
  }

  async buildLoginResponse(
    user: LocalAuthenticatedUser,
  ): Promise<LoginResponse> {
    return {
      status: 'authenticated',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
      },
      role: user.role,
      department: user.department,
      permissions: user.permissions,
      tokens: await this.createTokenPair(user),
    };
  }

  async getMe(payload: CurrentUserPayload): Promise<AuthMeResponse> {
    const user = await this.usersRepository.findActiveUserProfile(payload.sub);

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Invalid access token.');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      role: {
        id: user.role.id,
        key: user.role.systemKey ?? user.role.key,
        name: user.role.name,
      },
      department: user.department
        ? {
            id: user.department.id,
            key: user.department.key,
            name: user.department.name,
          }
        : null,
      permissions: user.role.permissions.map(
        ({ permission }) => permission.key,
      ),
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
      !persistedToken.user.role.isActive
    ) {
      throw new UnauthorizedException('Refresh token is no longer valid.');
    }

    await this.authTokensRepository.revokeRefreshTokenByHash(tokenHash);

    return this.createTokenPair(this.mapAuthenticatedUser(persistedToken.user));
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const persistedToken =
      await this.authTokensRepository.findActiveRefreshTokenByHash(tokenHash);

    await this.authTokensRepository.revokeRefreshTokenByHash(tokenHash);

    if (persistedToken) {
      await this.auditLogsService.record({
        actorUserId: persistedToken.userId,
        action: 'auth.logout',
        entityType: 'User',
        entityId: String(persistedToken.userId),
      });
    }

    return { loggedOut: true };
  }

  async logoutAll(payload: CurrentUserPayload) {
    await this.authTokensRepository.revokeActiveRefreshTokensForUser(
      payload.sub,
    );
    await this.authTokensRepository.incrementUserTokenVersion(payload.sub);
    await this.auditLogsService.record({
      actorUserId: payload.sub,
      action: 'auth.logout',
      entityType: 'User',
      entityId: String(payload.sub),
      metadata: {
        scope: 'all_sessions',
      },
    });

    return { loggedOut: true };
  }

  async changePassword(
    payload: CurrentUserPayload,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.usersRepository.findByIdForPasswordChange(
      payload.sub,
    );

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid access token.');
    }

    const currentPasswordMatches = await compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    await this.usersRepository.updatePassword(
      payload.sub,
      await this.hashPassword(changePasswordDto.newPassword),
    );
    await this.authTokensRepository.revokeActiveRefreshTokensForUser(
      payload.sub,
    );
    await this.auditLogsService.record({
      actorUserId: payload.sub,
      action: 'auth.password_change',
      entityType: 'User',
      entityId: String(payload.sub),
    });

    return { passwordChanged: true };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = this.normalizeEmail(forgotPasswordDto.email);
    const user = await this.usersRepository.findByEmailForPasswordReset(email);

    if (user?.status === 'ACTIVE') {
      await this.auditLogsService.record({
        actorUserId: user.id,
        action: 'auth.password_reset_requested',
        entityType: 'User',
        entityId: String(user.id),
        metadata: {
          email,
        },
      });
    }

    return { resetRequested: true };
  }

  resetPassword(_resetPasswordDto: ResetPasswordDto) {
    return {
      passwordReset: false,
      resetTokenRequired: true,
    };
  }

  async validateJwtPayload(
    payload: CurrentUserPayload,
  ): Promise<CurrentUserPayload> {
    const user = await this.authTokensRepository.findJwtUser(payload.sub);

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !user.role.isActive ||
      user.tokenVersion !== payload.tokenVersion ||
      user.roleId !== payload.roleId ||
      user.departmentId !== (payload.departmentId ?? null)
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const roleKey = user.role.systemKey ?? user.role.key;

    if (roleKey !== payload.roleKey) {
      throw new UnauthorizedException('Invalid access token.');
    }

    return payload;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private recordLoginSuccess(user: LoginUserSource) {
    return this.auditLogsService.record({
      actorUserId: user.id,
      action: 'auth.login_success',
      entityType: 'User',
      entityId: String(user.id),
      metadata: {
        email: user.email,
        roleKey: user.role.systemKey ?? user.role.key,
      },
    });
  }

  private recordLoginFailure(
    email: string,
    user: LoginUserSource | null,
    reason: string,
  ) {
    return this.auditLogsService.record({
      actorUserId: user?.id ?? null,
      action: 'auth.login_failure',
      entityType: user ? 'User' : null,
      entityId: user ? String(user.id) : null,
      metadata: {
        email,
        reason,
      },
    });
  }

  private async createTokenPair(
    user: LocalAuthenticatedUser,
  ): Promise<TokenPair> {
    const payload: CurrentUserPayload = {
      sub: user.id,
      email: user.email,
      roleKey: user.role.key,
      roleId: user.role.id,
      departmentId: user.department?.id ?? null,
      tokenVersion: user.tokenVersion,
    };
    const refreshToken = this.generateRefreshToken();

    await this.authTokensRepository.createRefreshToken({
      userId: user.id,
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

  private mapAuthenticatedUser(user: LoginUserSource): LocalAuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      tokenVersion: user.tokenVersion,
      role: {
        id: user.role.id,
        key: user.role.systemKey ?? user.role.key,
        name: user.role.name,
      },
      department: user.department
        ? {
            id: user.department.id,
            key: user.department.key,
            name: user.department.name,
          }
        : null,
      permissions: user.role.permissions.map(
        ({ permission }) => permission.key,
      ),
    };
  }

  private generateRefreshToken() {
    return randomBytes(64).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private hashPassword(password: string) {
    const saltRounds =
      this.configService.get<number>('security.bcryptSaltRounds') ?? 12;

    return hash(password, saltRounds);
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
