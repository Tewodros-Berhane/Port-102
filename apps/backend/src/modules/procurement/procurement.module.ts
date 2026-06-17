import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { SuppliersRepository } from './repositories/suppliers.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [ProcurementController],
  providers: [ProcurementService, SuppliersRepository, PermissionsGuard],
  exports: [ProcurementService, SuppliersRepository],
})
export class ProcurementModule {}
