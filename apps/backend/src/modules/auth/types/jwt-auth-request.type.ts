import type { Request } from 'express';

import type { CurrentUserPayload } from './current-user-payload.type';

export type JwtAuthRequest = Request & {
  user: CurrentUserPayload;
};
