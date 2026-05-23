import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PermissionsGuard],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
