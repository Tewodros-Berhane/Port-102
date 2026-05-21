import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_ROUTE_KEY } from '../decorators/public.decorator';
import type { HotelAccessRequest } from './hotel-access.guard';

export type PermissionsRequest = HotelAccessRequest & {
  permissionKeys?: string[];
};

type MembershipPermissions = {
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

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PermissionsRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const permissionKeys = await this.getPermissionKeys(request, user);
    const grantedPermissions = new Set(permissionKeys);
    const missingPermission = requiredPermissions.find(
      (permission) => !grantedPermissions.has(permission),
    );

    if (missingPermission) {
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

  private async getPermissionKeys(
    request: PermissionsRequest,
    user: CurrentUserPayload,
  ) {
    const membership = request.hotelContext
      ? await this.findPermissionsByRoleId(
          request.hotelContext.membership.roleId,
        )
      : await this.findPermissionsByMembership(user);

    if (!membership) {
      throw new ForbiddenException('Hotel access is not allowed.');
    }

    return membership.role.permissions.map(({ permission }) => permission.key);
  }

  private async findPermissionsByRoleId(
    roleId: number,
  ): Promise<MembershipPermissions | null> {
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

  private async findPermissionsByMembership(
    user: CurrentUserPayload,
  ): Promise<MembershipPermissions | null> {
    return this.prisma.hotelUser.findFirst({
      where: {
        id: user.membershipId,
        userId: user.sub,
        hotelId: user.hotelId,
        status: 'ACTIVE',
        hotel: {
          status: 'ACTIVE',
        },
        role: {
          isActive: true,
        },
      },
      include: {
        role: {
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
        },
      },
    });
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
