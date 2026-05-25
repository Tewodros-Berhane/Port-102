import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RoomAmenitiesController } from './room-amenities.controller';
import { RoomAmenitiesService } from './room-amenities.service';
import { RoomAmenitiesRepository } from './repositories/room-amenities.repository';
import { RoomTypesRepository } from './repositories/room-types.repository';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [RoomTypesController, RoomAmenitiesController],
  providers: [
    RoomTypesService,
    RoomTypesRepository,
    RoomAmenitiesService,
    RoomAmenitiesRepository,
    PermissionsGuard,
  ],
  exports: [
    RoomTypesService,
    RoomTypesRepository,
    RoomAmenitiesService,
    RoomAmenitiesRepository,
  ],
})
export class RoomTypesModule {}
