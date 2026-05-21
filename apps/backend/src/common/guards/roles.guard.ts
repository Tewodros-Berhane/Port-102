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
import { IS_PUBLIC_ROUTE_KEY } from '../decorators/public.decorator';
import { REQUIRED_ROLES_KEY } from '../decorators/roles.decorator';
import type { HotelAccessRequest } from './hotel-access.guard';

export type RolesRequest = HotelAccessRequest & {
  roleKey?: string;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (this.isPublicRoute(context)) {
      return true;
    }

    const requiredRoles = this.getRequiredRoles(context);

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RolesRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const roleKey =
      request.hotelContext?.role.key ??
      (await this.findRoleKeyByMembership(user));

    if (!roleKey) {
      throw new ForbiddenException('Hotel access is not allowed.');
    }

    if (!requiredRoles.includes(roleKey)) {
      throw new ForbiddenException('Required role is missing.');
    }

    request.roleKey = roleKey;

    return true;
  }

  private getRequiredRoles(context: ExecutionContext) {
    return (
      this.reflector.getAllAndMerge<string[]>(REQUIRED_ROLES_KEY, [
        context.getClass(),
        context.getHandler(),
      ]) ?? []
    );
  }

  private async findRoleKeyByMembership(user: CurrentUserPayload) {
    const membership = await this.prisma.hotelUser.findFirst({
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
      select: {
        role: {
          select: {
            key: true,
            systemKey: true,
          },
        },
      },
    });

    return membership
      ? (membership.role.systemKey ?? membership.role.key)
      : null;
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
