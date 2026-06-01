import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { PermissionsRequest } from '../guards/permissions.guard';

export const getCurrentPermissions = (
