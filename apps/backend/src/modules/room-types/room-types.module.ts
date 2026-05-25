import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoomAmenitiesController } from './room-amenities.controller';
import { RoomAmenitiesService } from './room-amenities.service';
import { RoomAmenitiesRepository } from './repositories/room-amenities.repository';

@Module({
  imports: [PrismaModule],
  controllers: [RoomAmenitiesController],
  providers: [RoomAmenitiesService, RoomAmenitiesRepository, PermissionsGuard],
  exports: [RoomAmenitiesService, RoomAmenitiesRepository],
})
export class RoomTypesModule {}
