import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { RoomsModule } from '../rooms/rooms.module';
import { StayRoomAssignmentsRepository } from './repositories/stay-room-assignments.repository';
import { StaysRepository } from './repositories/stays.repository';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';
import { ReservationCheckInsController } from './reservation-check-ins.controller';

@Module({
  imports: [PrismaModule, AuditLogsModule, ReservationsModule, RoomsModule],
  controllers: [StaysController, ReservationCheckInsController],
  providers: [
    StaysService,
    StaysRepository,
    StayRoomAssignmentsRepository,
    PermissionsGuard,
  ],
  exports: [StaysService, StaysRepository, StayRoomAssignmentsRepository],
})
export class StaysModule {}
