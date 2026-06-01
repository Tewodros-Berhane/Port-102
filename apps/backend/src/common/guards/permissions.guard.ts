import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ANY_REQUIRED_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_ROUTE_KEY } from '../decorators/public.decorator';

export type PermissionsRequest = Request & {
  user?: CurrentUserPayload;
  permissionKeys?: string[];
};

type RolePermissions = {
  role: {
    permissions: {
      permission: {
        key: string;
      };
    }[];
  };
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (this.isPublicRoute(context)) {
      return true;
    }

    const requiredPermissions = this.getRequiredPermissions(context);
    const anyRequiredPermissions = this.getAnyRequiredPermissions(context);

    if (
      requiredPermissions.length === 0 &&
      anyRequiredPermissions.length === 0
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PermissionsRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const permissionKeys = await this.getPermissionKeys(user);
    const grantedPermissions = new Set(permissionKeys);
    const missingPermission = requiredPermissions.find(
      (permission) => !grantedPermissions.has(permission),
    );

    if (missingPermission) {
      throw new ForbiddenException('Missing required permission.');
    }

    const hasAnyRequiredPermission =
      anyRequiredPermissions.length === 0 ||
      anyRequiredPermissions.some((permission) =>
        grantedPermissions.has(permission),
      );

    if (!hasAnyRequiredPermission) {
      throw new ForbiddenException('Missing required permission.');
    }

    request.permissionKeys = permissionKeys;

    return true;
  }

  private getRequiredPermissions(context: ExecutionContext) {
    return (
      this.reflector.getAllAndMerge<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getClass(),
        context.getHandler(),
      ]) ?? []
    );
  }

  private getAnyRequiredPermissions(context: ExecutionContext) {
    return (
      this.reflector.getAllAndMerge<string[]>(ANY_REQUIRED_PERMISSIONS_KEY, [
        context.getClass(),
        context.getHandler(),
      ]) ?? []
    );
  }

  private async getPermissionKeys(user: CurrentUserPayload) {
    const rolePermissions = await this.findPermissionsByRoleId(user.roleId);

    if (!rolePermissions) {
      throw new ForbiddenException('Role access is not allowed.');
    }

    return rolePermissions.role.permissions.map(
      ({ permission }) => permission.key,
    );
  }

  private async findPermissionsByRoleId(
    roleId: number,
  ): Promise<RolePermissions | null> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        isActive: true,
      },
      include: {
        permissions: {
          where: {
            permission: {
              isActive: true,
            },
          },
          include: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });

    return role ? { role } : null;
  }

  private isPublicRoute(context: ExecutionContext) {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}
