import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RolesRepository } from './repositories/roles.repository';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository, PermissionsGuard],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}
