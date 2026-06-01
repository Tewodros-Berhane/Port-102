import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const ANY_REQUIRED_PERMISSIONS_KEY = 'anyRequiredPermissions';

export const Permissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const AnyPermissions = (...permissions: string[]) =>
  SetMetadata(ANY_REQUIRED_PERMISSIONS_KEY, permissions);
