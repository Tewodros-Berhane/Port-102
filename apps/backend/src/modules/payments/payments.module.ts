import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FoliosModule } from '../folios/folios.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repositories/payments.repository';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PermissionsGuard],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
