import { Module } from '@nestjs/common';

import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { RolesRepository } from './repositories/roles.repository';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [
    RolesService,
    RolesRepository,
    HotelAccessGuard,
    PermissionsGuard,
  ],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}
