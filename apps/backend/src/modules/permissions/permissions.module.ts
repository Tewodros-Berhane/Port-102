import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsRepository],
  exports: [PermissionsService, PermissionsRepository],
})
export class PermissionsModule {}
