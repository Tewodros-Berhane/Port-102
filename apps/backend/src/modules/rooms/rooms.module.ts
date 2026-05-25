import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FloorsModule } from '../floors/floors.module';
import { RoomTypesModule } from '../room-types/room-types.module';
import { RoomsRepository } from './repositories/rooms.repository';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, FloorsModule, RoomTypesModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository, PermissionsGuard],
  exports: [RoomsService, RoomsRepository],
})
export class RoomsModule {}
