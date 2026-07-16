import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { DepartmentsRepository } from './repositories/departments.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, DepartmentsRepository, PermissionsGuard],
  exports: [DepartmentsService, DepartmentsRepository],
})
export class DepartmentsModule {}
