import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './repositories/roles.repository';

type RoleWithPermissions = {
  id: number;
  key: string;
  systemKey: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: {
    permission: {
      id: number;
      key: string;
      name: string;
      category: string;
      description: string | null;
      isActive: boolean;
    };
  }[];
};

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async list(_currentUser: CurrentUserPayload) {
    const roles = await this.rolesRepository.listRoles();

    return {
      items: roles.map((role) => this.serializeRole(role)),
    };
  }

  async getById(_currentUser: CurrentUserPayload, roleId: number) {
    const role = await this.findRoleOrThrow(roleId);

    return this.serializeRole(role);
  }

  async create(_currentUser: CurrentUserPayload, createRoleDto: CreateRoleDto) {
    const key = this.normalizeRoleKey(createRoleDto.key);
    const existingRole = await this.rolesRepository.findRoleByKey(key);

    if (existingRole) {
      throw new ConflictException('Role key already exists.');
    }

    const permissions = await this.findRequiredPermissions(
      createRoleDto.permissionKeys ?? [],
    );
    const role = await this.rolesRepository.createCustomRole({
      key,
      name: createRoleDto.name.trim(),
      description: this.normalizeOptionalString(createRoleDto.description),
      permissionIds: permissions.map((permission) => permission.id),
    });

    return this.serializeRole(role);
  }

  async update(
    currentUser: CurrentUserPayload,
    roleId: number,
    updateRoleDto: UpdateRoleDto,
  ) {
    const role = await this.findRoleOrThrow(roleId);
    const data: {
      key?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (updateRoleDto.key !== undefined) {
      const key = this.normalizeRoleKey(updateRoleDto.key);

      if (role.isSystem && key !== (role.systemKey ?? role.key)) {
        throw new ForbiddenException('System role keys cannot be changed.');
      }

      if (!role.isSystem) {
        const existingRole = await this.rolesRepository.findRoleByKey(key);

        if (existingRole && existingRole.id !== role.id) {
          throw new ConflictException('Role key already exists.');
        }

        data.key = key;
      }
    }

    if (updateRoleDto.name !== undefined) {
      data.name = updateRoleDto.name.trim();
    }

    if (updateRoleDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateRoleDto.description,
      );
    }

    if (updateRoleDto.isActive !== undefined) {
      data.isActive = updateRoleDto.isActive;
    }

    const updatedRole =
      Object.keys(data).length > 0
        ? await this.rolesRepository.updateRole(role.id, data)
        : role;

    if (updateRoleDto.permissionKeys === undefined) {
      return this.serializeRole(updatedRole);
    }

    return this.assignPermissions(currentUser, roleId, {
      permissionKeys: updateRoleDto.permissionKeys,
    });
  }

  async remove(_currentUser: CurrentUserPayload, roleId: number) {
    const role = await this.findRoleOrThrow(roleId);

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted.');
    }

    await this.rolesRepository.deleteRole(role.id);

    return { deleted: true };
  }

  async assignPermissions(
    currentUser: CurrentUserPayload,
    roleId: number,
    assignRolePermissionsDto: AssignRolePermissionsDto,
  ) {
    const role = await this.findRoleOrThrow(roleId);
    const permissions = await this.findRequiredPermissions(
      assignRolePermissionsDto.permissionKeys,
    );
    const updatedRole = await this.rolesRepository.replaceRolePermissions(
      role.id,
      permissions.map((permission) => permission.id),
    );
    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'roles.permissions_changed',
      entityType: 'Role',
      entityId: String(role.id),
      metadata: {
        roleId: role.id,
        permissionKeys: permissions.map((permission) => permission.key),
      },
    });

    return this.serializeRole(updatedRole);
  }

  private async findRoleOrThrow(roleId: number) {
    const role = await this.rolesRepository.findRole(roleId);

    if (!role) {
      throw new NotFoundException('Role was not found.');
    }

    return role;
  }

  private async findRequiredPermissions(permissionKeys: string[]) {
    const normalizedKeys = this.normalizePermissionKeys(permissionKeys);
    const permissions =
      await this.rolesRepository.findActivePermissionsByKeys(normalizedKeys);

    if (permissions.length !== normalizedKeys.length) {
      throw new BadRequestException(
        'One or more permissions do not exist in the active catalog.',
      );
    }

    return permissions;
  }

  private serializeRole(role: RoleWithPermissions) {
    return {
      id: role.id,
      key: role.systemKey ?? role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions
        .map(({ permission }) => ({
          id: permission.id,
          key: permission.key,
          name: permission.name,
          category: permission.category,
          description: permission.description,
        }))
        .toSorted((first, second) => first.key.localeCompare(second.key)),
    };
  }

  private normalizeRoleKey(key: string) {
    return key.trim().toUpperCase();
  }

  private normalizePermissionKeys(permissionKeys: string[]) {
    return [...new Set(permissionKeys.map((key) => key.trim()))].filter(
      Boolean,
    );
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }
}
