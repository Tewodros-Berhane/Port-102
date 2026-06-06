import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { HousekeepingModule } from '../housekeeping/housekeeping.module';
import { RoomsModule } from '../rooms/rooms.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AssetsRepository } from './repositories/assets.repository';
import { MaintenanceTicketNotesRepository } from './repositories/maintenance-ticket-notes.repository';
import { MaintenanceTicketPhotosRepository } from './repositories/maintenance-ticket-photos.repository';
import { MaintenanceTicketsRepository } from './repositories/maintenance-tickets.repository';
import { PreventiveMaintenancePlansRepository } from './repositories/preventive-maintenance-plans.repository';

@Module({
  imports: [PrismaModule, AuditLogsModule, RoomsModule, HousekeepingModule],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceService,
    MaintenanceTicketsRepository,
    MaintenanceTicketNotesRepository,
    MaintenanceTicketPhotosRepository,
    AssetsRepository,
    PreventiveMaintenancePlansRepository,
    PermissionsGuard,
  ],
  exports: [MaintenanceService, MaintenanceTicketsRepository, AssetsRepository],
})
export class MaintenanceModule {}
