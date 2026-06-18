import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { GoodsReceivedRepository } from './repositories/goods-received.repository';
import { ProcurementReportsRepository } from './repositories/procurement-reports.repository';
import { PurchaseOrdersRepository } from './repositories/purchase-orders.repository';
import { PurchaseRequestsRepository } from './repositories/purchase-requests.repository';
import { SuppliersRepository } from './repositories/suppliers.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [ProcurementController],
  providers: [
    ProcurementService,
    SuppliersRepository,
    PurchaseRequestsRepository,
    PurchaseOrdersRepository,
    GoodsReceivedRepository,
    ProcurementReportsRepository,
    PermissionsGuard,
  ],
  exports: [
    ProcurementService,
    SuppliersRepository,
    PurchaseRequestsRepository,
    PurchaseOrdersRepository,
    GoodsReceivedRepository,
    ProcurementReportsRepository,
  ],
})
export class ProcurementModule {}
