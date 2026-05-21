import { Module } from '@nestjs/common';

import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    HotelAccessGuard,
    PermissionsGuard,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
