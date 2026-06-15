import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryItemsRepository } from './repositories/inventory-items.repository';
import { InventoryLocationsRepository } from './repositories/inventory-locations.repository';
import { StockBalancesRepository } from './repositories/stock-balances.repository';
import { StockIssuesRepository } from './repositories/stock-issues.repository';
import { StockMovementsRepository } from './repositories/stock-movements.repository';
import { StockReceiptsRepository } from './repositories/stock-receipts.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryLocationsRepository,
    InventoryItemsRepository,
    StockBalancesRepository,
    StockIssuesRepository,
    StockMovementsRepository,
    StockReceiptsRepository,
    PermissionsGuard,
  ],
  exports: [
    InventoryService,
    InventoryLocationsRepository,
    InventoryItemsRepository,
    StockBalancesRepository,
    StockIssuesRepository,
    StockMovementsRepository,
    StockReceiptsRepository,
  ],
})
export class InventoryModule {}
