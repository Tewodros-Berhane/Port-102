import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './repositories/roles.repository';

type RoleWithPermissions = {
  id: number;
  hotelId: number | null;
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
  constructor(private readonly rolesRepository: RolesRepository) {}

  async list(currentUser: CurrentUserPayload) {
    const roles = await this.rolesRepository.listVisibleRoles(
      currentUser.hotelId,
    );

    return {
      items: roles.map((role) => this.serializeRole(role)),
    };
  }

  async getById(currentUser: CurrentUserPayload, roleId: number) {
    const role = await this.findVisibleRoleOrThrow(currentUser.hotelId, roleId);

    return this.serializeRole(role);
  }

  async create(currentUser: CurrentUserPayload, createRoleDto: CreateRoleDto) {
    const key = this.normalizeRoleKey(createRoleDto.key);
    const existingRole = await this.rolesRepository.findHotelRoleByKey(
      currentUser.hotelId,
      key,
    );

    if (existingRole) {
      throw new ConflictException('Role key already exists in this hotel.');
    }

    const permissions = await this.findRequiredPermissions(
      createRoleDto.permissionKeys ?? [],
    );
    const role = await this.rolesRepository.createCustomRole({
      hotelId: currentUser.hotelId,
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
    const role = await this.findVisibleRoleOrThrow(currentUser.hotelId, roleId);
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
        const existingRole = await this.rolesRepository.findHotelRoleByKey(
          currentUser.hotelId,
          key,
        );

        if (existingRole && existingRole.id !== role.id) {
          throw new ConflictException('Role key already exists in this hotel.');
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

  async remove(currentUser: CurrentUserPayload, roleId: number) {
    const role = await this.findVisibleRoleOrThrow(currentUser.hotelId, roleId);

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
    const role = await this.findVisibleRoleOrThrow(currentUser.hotelId, roleId);
    const permissions = await this.findRequiredPermissions(
      assignRolePermissionsDto.permissionKeys,
    );
    const updatedRole = await this.rolesRepository.replaceRolePermissions(
      role.id,
      permissions.map((permission) => permission.id),
    );

    return this.serializeRole(updatedRole);
  }

  private async findVisibleRoleOrThrow(hotelId: number, roleId: number) {
    const role = await this.rolesRepository.findVisibleRole(hotelId, roleId);

    if (!role) {
      throw new NotFoundException('Role was not found in this hotel.');
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
      hotelId: role.hotelId,
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
