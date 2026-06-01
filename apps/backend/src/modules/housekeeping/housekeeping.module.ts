import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RoomsModule } from '../rooms/rooms.module';
import { HousekeepingController } from './housekeeping.controller';
