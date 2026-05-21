import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';

type RequestWithCurrentUser = {
  user?: CurrentUserPayload;
};

export const getCurrentUser = (
  property: keyof CurrentUserPayload | undefined,
  context: ExecutionContext,
) => {
  const request = context.switchToHttp().getRequest<RequestWithCurrentUser>();

  if (!property) {
    return request.user;
  }

  return request.user?.[property];
};

export const CurrentUser = createParamDecorator(getCurrentUser);
