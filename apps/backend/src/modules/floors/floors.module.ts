import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';
import { FloorsRepository } from './repositories/floors.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [FloorsController],
  providers: [FloorsService, FloorsRepository, PermissionsGuard],
  exports: [FloorsService, FloorsRepository],
})
export class FloorsModule {}
