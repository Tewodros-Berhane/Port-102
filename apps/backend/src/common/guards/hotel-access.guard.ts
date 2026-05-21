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
import { IS_PUBLIC_ROUTE_KEY } from '../decorators/public.decorator';

export type CurrentHotelContext = {
  membership: {
    id: number;
    userId: number;
    hotelId: number;
    roleId: number;
    departmentId: number | null;
    status: string;
  };
  hotel: {
    id: number;
    name: string;
    code: string;
    status: string;
    timezone: string;
    defaultCurrency: string;
  };
  role: {
    id: number;
    key: string;
    name: string;
    isSystem: boolean;
    isActive: boolean;
  };
  department: {
    id: number;
    key: string;
    name: string;
  } | null;
};

export type HotelAccessRequest = Request & {
  user?: CurrentUserPayload;
  hotelContext?: CurrentHotelContext;
};

@Injectable()
export class HotelAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (this.isPublicRoute(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<HotelAccessRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const membership = await this.prisma.hotelUser.findFirst({
      where: {
        id: user.membershipId,
        userId: user.sub,
        hotelId: user.hotelId,
      },
      include: {
        hotel: true,
        role: true,
        department: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Hotel access is not allowed.');
    }

    if (membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Hotel membership is inactive.');
    }

    if (membership.hotel.status !== 'ACTIVE') {
      throw new ForbiddenException('Hotel is inactive.');
    }

    if (!membership.role.isActive) {
      throw new ForbiddenException('Hotel role is inactive.');
    }

    request.hotelContext = {
      membership: {
        id: membership.id,
        userId: membership.userId,
        hotelId: membership.hotelId,
        roleId: membership.roleId,
        departmentId: membership.departmentId,
        status: membership.status,
      },
      hotel: {
        id: membership.hotel.id,
        name: membership.hotel.name,
        code: membership.hotel.code,
        status: membership.hotel.status,
        timezone: membership.hotel.timezone,
        defaultCurrency: membership.hotel.defaultCurrency,
      },
      role: {
        id: membership.role.id,
        key: membership.role.systemKey ?? membership.role.key,
        name: membership.role.name,
        isSystem: membership.role.isSystem,
        isActive: membership.role.isActive,
      },
      department: membership.department
        ? {
            id: membership.department.id,
            key: membership.department.key,
            name: membership.department.name,
          }
        : null,
    };

    return true;
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
