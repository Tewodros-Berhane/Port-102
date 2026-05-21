import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CurrentUserPayload } from '../../modules/auth/types/current-user-payload.type';

type RequestWithCurrentUser = {
  user?: Pick<CurrentUserPayload, 'hotelId'>;
};

export const getCurrentHotel = (_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<RequestWithCurrentUser>();

  return request.user?.hotelId;
};

export const CurrentHotel = createParamDecorator(getCurrentHotel);
