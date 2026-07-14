import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PropertySettingsController } from './property-settings.controller';
import { PropertySettingsService } from './property-settings.service';
import { PropertySettingsRepository } from './repositories/property-settings.repository';
@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [PropertySettingsController],
  providers: [
    PropertySettingsService,
    PropertySettingsRepository,
    PermissionsGuard,
  ],
  exports: [PropertySettingsService],
})
export class PropertySettingsModule {}
