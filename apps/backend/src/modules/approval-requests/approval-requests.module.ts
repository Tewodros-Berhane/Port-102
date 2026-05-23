import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ApprovalRequestsController } from './approval-requests.controller';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalRequestsRepository } from './repositories/approval-requests.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [ApprovalRequestsController],
  providers: [
    ApprovalRequestsService,
    ApprovalRequestsRepository,
    PermissionsGuard,
  ],
  exports: [ApprovalRequestsService, ApprovalRequestsRepository],
})
export class ApprovalRequestsModule {}
