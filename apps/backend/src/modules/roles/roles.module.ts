import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { RolesRepository } from './repositories/roles.repository';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}
