import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RoomsModule } from '../rooms/rooms.module';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';
import { HousekeepingTasksRepository } from './repositories/housekeeping-tasks.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule, RoomsModule],
  controllers: [HousekeepingController],
  providers: [
    HousekeepingService,
    HousekeepingTasksRepository,
    PermissionsGuard,
  ],
  exports: [HousekeepingService, HousekeepingTasksRepository],
})
export class HousekeepingModule {}
