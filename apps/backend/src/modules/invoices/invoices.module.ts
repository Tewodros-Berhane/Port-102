import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './repositories/invoices.repository';
import { ReceiptsRepository } from './repositories/receipts.repository';

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
