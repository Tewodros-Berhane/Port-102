import { GUARDS_METADATA } from '@nestjs/common/constants';

import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuditLogsController } from '../../modules/audit-logs/audit-logs.controller';
import { GuestsController } from '../../modules/guests/guests.controller';

type RouteExpectation = {
  controller: object;
  handlerName: string;
  permissions: string[];
};

const protectedControllers = [
  {
    controller: GuestsController,
    name: 'GuestsController',
  },
  {
    controller: AuditLogsController,
    name: 'AuditLogsController',
  },
] as const;

const protectedRoutes: RouteExpectation[] = [
  {
    controller: GuestsController.prototype,
    handlerName: 'create',
    permissions: ['guests.create'],
  },
  {
    controller: GuestsController.prototype,
    handlerName: 'list',
    permissions: ['guests.read'],
  },
  {
    controller: GuestsController.prototype,
    handlerName: 'getById',
    permissions: ['guests.read'],
  },
  {
    controller: GuestsController.prototype,
    handlerName: 'update',
    permissions: ['guests.update', 'guests.preferences.update'],
  },
  {
    controller: AuditLogsController.prototype,
    handlerName: 'list',
    permissions: ['audit_logs.read'],
  },
  {
    controller: AuditLogsController.prototype,
    handlerName: 'getById',
    permissions: ['audit_logs.read'],
  },
];

describe('operational route protection', () => {
  it.each(protectedControllers)(
    'protects $name with auth and permission guards',
    ({ controller }) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];

      expect(guards).toEqual([JwtAuthGuard, PermissionsGuard]);
    },
  );

  it.each(protectedRoutes)(
    'requires permissions for $handlerName',
    ({ controller, handlerName, permissions }) => {
      const handler = (controller as Record<string, unknown>)[handlerName];
      const requiredPermissions =
        Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler) ?? [];

      expect(requiredPermissions).toEqual(permissions);
    },
  );
});
