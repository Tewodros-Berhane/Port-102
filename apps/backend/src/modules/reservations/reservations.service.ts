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
            reservationNumber,
            guest: {
              connect: {
                id: createReservationDto.guestId,
              },
            },
            source: createReservationDto.source ?? ReservationSource.WALK_IN,
            checkInDate,
            checkOutDate,
            adults: createReservationDto.adults ?? 1,
            children: createReservationDto.children ?? 0,
            specialRequests: this.normalizeOptionalString(
              createReservationDto.specialRequests,
            ),
            internalNotes: this.normalizeOptionalString(
              createReservationDto.internalNotes,
            ),
            createdBy: {
              connect: {
                id: currentUser.sub,
              },
            },
            rooms: {
              create: createReservationDto.rooms.map((room) =>
                this.buildReservationRoomCreateData(room),
              ),
            },
          },
          client,
        ),
    );

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'reservations.created',
      entityType: 'Reservation',
      entityId: String(reservation.id),
      metadata: {
        reservationNumber: reservation.reservationNumber,
        guestId: reservation.guestId,
        checkInDate: reservation.checkInDate.toISOString(),
        checkOutDate: reservation.checkOutDate.toISOString(),
        roomCount: reservation.rooms.length,
      },
    });

    return this.serializeReservation(reservation);
  }

  private async ensureActiveGuest(guestId: number) {
    const guest = await this.guestsRepository.findGuestProfile(guestId);

    if (!guest) {
      throw new NotFoundException('Guest was not found.');
    }

    if (guest.status !== GuestStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot create reservation for inactive guest.',
      );
    }
  }

  private async ensureReservationRoomsAreAvailable(
    rooms: AddReservationRoomDto[],
    checkInDate: Date,
    checkOutDate: Date,
  ) {
    const requestedRoomIds = new Set<number>();
    const requestedByRoomType = new Map<number, number>();

    for (const room of rooms) {
      await this.ensureActiveRoomType(room.roomTypeId);

      requestedByRoomType.set(
        room.roomTypeId,
        (requestedByRoomType.get(room.roomTypeId) ?? 0) + 1,
