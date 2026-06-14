import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryItemsRepository } from './repositories/inventory-items.repository';
import { InventoryLocationsRepository } from './repositories/inventory-locations.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryLocationsRepository,
    InventoryItemsRepository,
    PermissionsGuard,
  ],
  exports: [
    InventoryService,
    InventoryLocationsRepository,
    InventoryItemsRepository,
  ],
})
export class InventoryModule {}
