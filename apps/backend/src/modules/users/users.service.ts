import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';

import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async create(currentUser: CurrentUserPayload, createUserDto: CreateUserDto) {
    const email = this.normalizeEmail(createUserDto.email);

    await this.ensureAssignableRole(currentUser.hotelId, createUserDto.roleId);
    await this.ensureAssignableDepartment(
      currentUser.hotelId,
      createUserDto.departmentId,
    );

    const existingUser =
      await this.usersRepository.findByEmailForManagement(email);

    if (
      existingUser?.hotelUsers.some(
        (membership) => membership.hotelId === currentUser.hotelId,
      )
    ) {
      throw new ConflictException('User already belongs to this hotel.');
    }

    if (existingUser && existingUser.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is not active.');
    }

    const user =
      existingUser ??
      (await this.usersRepository.createUser({
        email,
        passwordHash: await this.hashPassword(createUserDto.password),
        fullName: createUserDto.fullName.trim(),
        phone: this.normalizeOptionalString(createUserDto.phone),
      }));

    await this.usersRepository.createHotelMembership({
      userId: user.id,
      hotelId: currentUser.hotelId,
      roleId: createUserDto.roleId,
      departmentId: createUserDto.departmentId ?? null,
    });

    return this.getById(currentUser, user.id);
  }

  async list(currentUser: CurrentUserPayload, query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, memberships] = await this.usersRepository.listHotelUsers({
      hotelId: currentUser.hotelId,
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: search ?? undefined,
    });

    return {
      items: memberships.map((membership) =>
        this.serializeHotelUser(membership),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(currentUser: CurrentUserPayload, userId: number) {
    const membership = await this.findRequiredHotelUser(
      currentUser.hotelId,
      userId,
    );

    return this.serializeHotelUser(membership);
  }

  async update(
    currentUser: CurrentUserPayload,
    userId: number,
    updateUserDto: UpdateUserDto,
  ) {
    await this.findRequiredHotelUser(currentUser.hotelId, userId);
    await this.ensureAssignableDepartment(
      currentUser.hotelId,
      updateUserDto.departmentId,
    );

    const userData: {
      email?: string;
      fullName?: string;
      phone?: string | null;
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

    if (Object.keys(userData).length > 0) {
      await this.usersRepository.updateUserProfile(userId, userData);
    }

    if (updateUserDto.departmentId !== undefined) {
      await this.updateMembershipOrThrow(currentUser.hotelId, userId, {
        departmentId: updateUserDto.departmentId ?? null,
      });
    }

    return this.getById(currentUser, userId);
  }

  async deactivate(currentUser: CurrentUserPayload, userId: number) {
    await this.findRequiredHotelUser(currentUser.hotelId, userId);
    await this.updateMembershipOrThrow(currentUser.hotelId, userId, {
      status: 'INACTIVE',
    });

    return this.getById(currentUser, userId);
  }

  async activate(currentUser: CurrentUserPayload, userId: number) {
    await this.findRequiredHotelUser(currentUser.hotelId, userId);
    await this.updateMembershipOrThrow(currentUser.hotelId, userId, {
      status: 'ACTIVE',
    });

    return this.getById(currentUser, userId);
  }

  async resetPassword(
    currentUser: CurrentUserPayload,
    userId: number,
    resetPasswordDto: ResetPasswordDto,
  ) {
    await this.findRequiredHotelUser(currentUser.hotelId, userId);
    await this.usersRepository.updatePassword(
      userId,
      await this.hashPassword(resetPasswordDto.newPassword),
    );
    await this.usersRepository.revokeActiveRefreshTokensForUser(userId);

    return { passwordReset: true };
  }

  async assignRole(
    currentUser: CurrentUserPayload,
    userId: number,
    assignRoleDto: AssignRoleDto,
  ) {
    await this.findRequiredHotelUser(currentUser.hotelId, userId);
    await this.ensureAssignableRole(currentUser.hotelId, assignRoleDto.roleId);
    await this.ensureAssignableDepartment(
      currentUser.hotelId,
      assignRoleDto.departmentId,
    );
    await this.updateMembershipOrThrow(currentUser.hotelId, userId, {
      roleId: assignRoleDto.roleId,
      departmentId: assignRoleDto.departmentId ?? null,
    });

    return this.getById(currentUser, userId);
  }

  private async findRequiredHotelUser(hotelId: number, userId: number) {
    const membership = await this.usersRepository.findHotelUserProfile(
      hotelId,
      userId,
    );

    if (!membership) {
      throw new NotFoundException('User was not found in this hotel.');
    }

    return membership;
  }

  private async ensureAssignableRole(hotelId: number, roleId: number) {
    const role = await this.usersRepository.findAssignableRole(hotelId, roleId);

    if (!role) {
      throw new ForbiddenException('Role is not assignable to this hotel.');
    }

    return role;
  }

  private async ensureAssignableDepartment(
    hotelId: number,
    departmentId?: number | null,
  ) {
    if (departmentId === undefined || departmentId === null) {
      return null;
    }

    const department = await this.usersRepository.findActiveDepartment(
      hotelId,
      departmentId,
    );

    if (!department) {
      throw new ForbiddenException(
        'Department is not assignable to this hotel.',
      );
    }

    return department;
  }

  private async updateMembershipOrThrow(
    hotelId: number,
    userId: number,
    data: {
      roleId?: number;
      departmentId?: number | null;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const result = await this.usersRepository.updateHotelMembership(
      hotelId,
      userId,
      data,
    );

    if (result.count === 0) {
      throw new NotFoundException('User was not found in this hotel.');
    }
  }

  private serializeHotelUser(membership: {
    id: number;
    status: string;
    joinedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: number;
      email: string;
      fullName: string;
      phone: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
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
  }) {
    return {
      id: membership.user.id,
      email: membership.user.email,
      fullName: membership.user.fullName,
      phone: membership.user.phone,
      status: membership.user.status,
      createdAt: membership.user.createdAt,
      updatedAt: membership.user.updatedAt,
      membership: {
        id: membership.id,
        status: membership.status,
        joinedAt: membership.joinedAt,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
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
      },
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
