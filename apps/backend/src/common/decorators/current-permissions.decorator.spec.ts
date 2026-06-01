import { ExecutionContext } from '@nestjs/common';

import { getCurrentPermissions } from './current-permissions.decorator';

function createContext(permissionKeys?: string[]) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ permissionKeys }),
    }),
  } as ExecutionContext;
}

describe('CurrentPermissions decorator factory', () => {
  it('returns permission keys attached to the request', () => {
    expect(
      getCurrentPermissions(
        undefined,
        createContext(['housekeeping.tasks.start.assigned']),
