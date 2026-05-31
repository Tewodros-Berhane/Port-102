import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FoliosModule } from '../folios/folios.module';
import { PaymentsRepository } from '../payments/repositories/payments.repository';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './repositories/invoices.repository';
import { ReceiptsRepository } from './repositories/receipts.repository';
import { ReceiptsController } from './receipts/receipts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicesRepository,
    ReceiptsRepository,
    PermissionsGuard,
  ],
  exports: [InvoicesService, InvoicesRepository, ReceiptsRepository],
})
export class InvoicesModule {}
