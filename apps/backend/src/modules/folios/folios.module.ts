import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ApprovalRequestsModule } from '../approval-requests/approval-requests.module';
import { FoliosController } from './folios.controller';
import { FoliosService } from './folios.service';
import { FolioLineItemsRepository } from './repositories/folio-line-items.repository';
import { FoliosRepository } from './repositories/folios.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule, ApprovalRequestsModule],
  controllers: [FoliosController],
  providers: [
    FoliosService,
    FoliosRepository,
    FolioLineItemsRepository,
    PermissionsGuard,
  ],
  exports: [FoliosService, FoliosRepository, FolioLineItemsRepository],
})
export class FoliosModule {}
