import { Module } from '@nestjs/common';

import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GuestsModule } from '../guests/guests.module';
import { RoomTypesModule } from '../room-types/room-types.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ReservationAvailabilityRepository } from './repositories/reservation-availability.repository';
import { ReservationRoomsRepository } from './repositories/reservation-rooms.repository';
import { ReservationsRepository } from './repositories/reservations.repository';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    GuestsModule,
    RoomTypesModule,
    RoomsModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    ReservationRoomsRepository,
    ReservationAvailabilityRepository,
    PermissionsGuard,
  ],
  exports: [
    ReservationsService,
    ReservationsRepository,
    ReservationRoomsRepository,
    ReservationAvailabilityRepository,
  ],
})
export class ReservationsModule {}
