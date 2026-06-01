import { ExecutionContext } from '@nestjs/common';

import { getCurrentPermissions } from './current-permissions.decorator';

function createContext(permissionKeys?: string[]) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ permissionKeys }),
    }),
