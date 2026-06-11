import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { MenuItemsRepository } from './repositories/menu-items.repository';
import { OutletsRepository } from './repositories/outlets.repository';
import { PosOrderItemsRepository } from './repositories/pos-order-items.repository';
import { PosOrderPaymentsRepository } from './repositories/pos-order-payments.repository';
import { PosOrdersRepository } from './repositories/pos-orders.repository';
import { PosRoomChargesRepository } from './repositories/pos-room-charges.repository';
import { RestaurantReportsRepository } from './repositories/restaurant-reports.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [RestaurantController],
  providers: [
    RestaurantService,
    OutletsRepository,
    MenuItemsRepository,
    PosOrdersRepository,
    PosOrderItemsRepository,
    PosOrderPaymentsRepository,
    PosRoomChargesRepository,
    RestaurantReportsRepository,
    PermissionsGuard,
  ],
  exports: [RestaurantService, OutletsRepository],
})
export class RestaurantModule {}
