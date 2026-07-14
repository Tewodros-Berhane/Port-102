import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FinancialReportRepository } from './repositories/financial-report.repository';
import { OperationsReportRepository } from './repositories/operations-report.repository';
import { RoomReportRepository } from './repositories/room-report.repository';
import { SupplyChainReportRepository } from './repositories/supply-chain-report.repository';
import { PropertySettingsModule } from '../property-settings/property-settings.module';

@Module({
  imports: [PrismaModule, PropertySettingsModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    RoomReportRepository,
    FinancialReportRepository,
    OperationsReportRepository,
    SupplyChainReportRepository,
    PermissionsGuard,
  ],
})
export class ReportsModule {}
