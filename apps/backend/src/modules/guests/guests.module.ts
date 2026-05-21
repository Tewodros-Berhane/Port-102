import { Module } from '@nestjs/common';

import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { GuestsRepository } from './repositories/guests.repository';

@Module({
  imports: [PrismaModule],
  controllers: [GuestsController],
  providers: [
    GuestsService,
    GuestsRepository,
    HotelAccessGuard,
    PermissionsGuard,
  ],
  exports: [GuestsService, GuestsRepository],
})
export class GuestsModule {}
