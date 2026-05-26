import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  GuestStatus,
  Prisma,
  ReservationSource,
  RoomMaintenanceStatus,
} from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GuestsRepository } from '../guests/repositories/guests.repository';
import { RoomTypesRepository } from '../room-types/repositories/room-types.repository';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { AddReservationRoomDto } from './dto/add-reservation-room.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationAvailabilityRepository } from './repositories/reservation-availability.repository';
import {
  ReservationRecord,
  ReservationsRepository,
} from './repositories/reservations.repository';

type ReservationRoomCreateData = {
  roomType: {
    connect: {
      id: number;
    };
  };
  room?: {
    connect: {
      id: number;
    };
  };
  rate?: string | null;
  notes?: string | null;
};

type RoomTypeDemand = {
  roomTypeId: number;
  requestedCount: number;
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly reservationAvailabilityRepository: ReservationAvailabilityRepository,
    private readonly guestsRepository: GuestsRepository,
    private readonly roomTypesRepository: RoomTypesRepository,
    private readonly roomsRepository: RoomsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    currentUser: CurrentUserPayload,
    createReservationDto: CreateReservationDto,
  ) {
    const checkInDate = this.parseDate(createReservationDto.checkInDate);
    const checkOutDate = this.parseDate(createReservationDto.checkOutDate);

    this.ensureValidDateRange(checkInDate, checkOutDate);
    await this.ensureActiveGuest(createReservationDto.guestId);
    await this.ensureReservationRoomsAreAvailable(
      createReservationDto.rooms,
      checkInDate,
      checkOutDate,
    );

    const reservationNumber = await this.generateReservationNumber();
    const reservation = await this.reservationsRepository.runInTransaction(
      (client) =>
        this.reservationsRepository.createReservation(
          {
