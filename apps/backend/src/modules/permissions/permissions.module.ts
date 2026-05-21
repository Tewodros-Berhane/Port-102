import { Module } from '@nestjs/common';

import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PermissionsRepository,
    HotelAccessGuard,
    PermissionsGuard,
  ],
  exports: [PermissionsService, PermissionsRepository],
})
export class PermissionsModule {}
