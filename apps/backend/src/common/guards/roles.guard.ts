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
import { IS_PUBLIC_ROUTE_KEY } from '../decorators/public.decorator';
import { REQUIRED_ROLES_KEY } from '../decorators/roles.decorator';

export type RolesRequest = Request & {
  user?: CurrentUserPayload;
  roleKey?: string;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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

    if (!requiredRoles.includes(user.roleKey)) {
      throw new ForbiddenException('Required role is missing.');
    }

    request.roleKey = user.roleKey;

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

  private isPublicRoute(context: ExecutionContext) {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}
