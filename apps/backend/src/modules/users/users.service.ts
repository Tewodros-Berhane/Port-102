import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './repositories/users.repository';

type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(currentUser: CurrentUserPayload, createUserDto: CreateUserDto) {
    const email = this.normalizeEmail(createUserDto.email);

    await this.ensureAssignableRole(createUserDto.roleId);
    await this.ensureAssignableDepartment(createUserDto.departmentId);

    const existingUser =
      await this.usersRepository.findByEmailForManagement(email);

    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    const user = await this.usersRepository.createUser({
      email,
      passwordHash: await this.hashPassword(createUserDto.password),
      fullName: createUserDto.fullName.trim(),
      phone: this.normalizeOptionalString(createUserDto.phone),
      roleId: createUserDto.roleId,
      departmentId: createUserDto.departmentId ?? null,
    });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'users.created',
      entityType: 'User',
      entityId: String(user.id),
      metadata: {
        targetUserId: user.id,
        roleId: createUserDto.roleId,
        departmentId: createUserDto.departmentId ?? null,
      },
    });

    return this.getById(currentUser, user.id);
  }

  async list(_currentUser: CurrentUserPayload, query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, users] = await this.usersRepository.listUsers({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: search ?? undefined,
    });

    return {
      items: users.map((user) => this.serializeUser(user)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, userId: number) {
    const user = await this.findRequiredUser(userId);

    return this.serializeUser(user);
  }

  async update(
    currentUser: CurrentUserPayload,
    userId: number,
    updateUserDto: UpdateUserDto,
  ) {
    await this.findRequiredUser(userId);
    await this.ensureAssignableDepartment(updateUserDto.departmentId);

    const userData: {
      email?: string;
      fullName?: string;
      phone?: string | null;
      departmentId?: number | null;
    } = {};

    if (updateUserDto.email !== undefined) {
      const email = this.normalizeEmail(updateUserDto.email);
      const existingUser =
        await this.usersRepository.findByEmailForManagement(email);

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email is already in use.');
      }

      userData.email = email;
    }

    if (updateUserDto.fullName !== undefined) {
      userData.fullName = updateUserDto.fullName.trim();
    }

    if (updateUserDto.phone !== undefined) {
      userData.phone = this.normalizeOptionalString(updateUserDto.phone);
    }

    if (updateUserDto.departmentId !== undefined) {
      userData.departmentId = updateUserDto.departmentId ?? null;
    }

    if (Object.keys(userData).length > 0) {
      await this.usersRepository.updateUserProfile(userId, userData);
    }

    return this.getById(currentUser, userId);
  }

  async deactivate(currentUser: CurrentUserPayload, userId: number) {
    await this.findRequiredUser(userId);
    await this.usersRepository.updateUserProfile(userId, {
      status: 'INACTIVE',
    });
    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'users.deactivated',
      entityType: 'User',
      entityId: String(userId),
      metadata: {
        targetUserId: userId,
      },
    });

    return this.getById(currentUser, userId);
  }

  async activate(currentUser: CurrentUserPayload, userId: number) {
    await this.findRequiredUser(userId);
    await this.usersRepository.updateUserProfile(userId, {
      status: 'ACTIVE',
    });
    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'users.activated',
      entityType: 'User',
      entityId: String(userId),
      metadata: {
        targetUserId: userId,
      },
    });

    return this.getById(currentUser, userId);
  }

  async resetPassword(
    currentUser: CurrentUserPayload,
    userId: number,
    resetPasswordDto: ResetPasswordDto,
  ) {
    await this.findRequiredUser(userId);
    await this.usersRepository.updatePassword(
      userId,
      await this.hashPassword(resetPasswordDto.newPassword),
    );
    await this.usersRepository.revokeActiveRefreshTokensForUser(userId);
    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'auth.password_reset',
      entityType: 'User',
      entityId: String(userId),
      metadata: {
        targetUserId: userId,
        scope: 'admin_reset',
      },
    });

    return { passwordReset: true };
  }

  async assignRole(
    currentUser: CurrentUserPayload,
    userId: number,
    assignRoleDto: AssignRoleDto,
  ) {
    await this.findRequiredUser(userId);
    await this.ensureAssignableRole(assignRoleDto.roleId);
    await this.ensureAssignableDepartment(assignRoleDto.departmentId);
    await this.usersRepository.updateUserProfile(userId, {
      roleId: assignRoleDto.roleId,
      departmentId: assignRoleDto.departmentId ?? null,
    });
    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'users.role_assigned',
      entityType: 'User',
      entityId: String(userId),
      metadata: {
        targetUserId: userId,
        roleId: assignRoleDto.roleId,
        departmentId: assignRoleDto.departmentId ?? null,
      },
    });

    return this.getById(currentUser, userId);
  }

  private async findRequiredUser(userId: number) {
    const user = await this.usersRepository.findUserProfile(userId);

    if (!user) {
      throw new NotFoundException('User was not found.');
    }

    return user;
  }

  private async ensureAssignableRole(roleId: number) {
    const role = await this.usersRepository.findAssignableRole(roleId);

    if (!role) {
      throw new ForbiddenException('Role is not assignable.');
    }

    return role;
  }

  private async ensureAssignableDepartment(departmentId?: number | null) {
    if (departmentId === undefined || departmentId === null) {
      return null;
    }

    const department =
      await this.usersRepository.findActiveDepartment(departmentId);

    if (!department) {
      throw new ForbiddenException('Department is not assignable.');
    }

    return department;
  }

  private serializeUser(user: UserProfile) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private hashPassword(password: string) {
    const saltRounds =
      this.configService.get<number>('security.bcryptSaltRounds') ?? 12;

    return hash(password, saltRounds);
  }
}
