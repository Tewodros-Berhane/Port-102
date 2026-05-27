import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  GuestStatus,
  Prisma,
  ReservationRoomStatus,
  ReservationSource,
  ReservationStatus,
  RoomMaintenanceStatus,
} from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GuestsRepository } from '../guests/repositories/guests.repository';
import { RoomTypesRepository } from '../room-types/repositories/room-types.repository';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { AddReservationRoomDto } from './dto/add-reservation-room.dto';
import { AvailabilitySearchQueryDto } from './dto/availability-search-query.dto';
import { BookingCalendarQueryDto } from './dto/booking-calendar-query.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GetReservationsQueryDto } from './dto/get-reservations-query.dto';
import { MarkNoShowDto } from './dto/mark-no-show.dto';
import { UpdateReservationRoomDto } from './dto/update-reservation-room.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationAvailabilityRepository } from './repositories/reservation-availability.repository';
import type {
  AvailabilityRoomRecord,
  AvailabilityRoomTypeRecord,
} from './repositories/reservation-availability.repository';
import {
  ReservationRoomRecord,
  ReservationRoomsRepository,
} from './repositories/reservation-rooms.repository';
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

type ReservationAvailabilityOptions = {
  excludeReservationId?: number;
};

type ReservationRoomAvailabilityInput = {
  roomTypeId: number;
  roomId?: number | null;
};

type AvailabilitySummary = {
  roomType: AvailabilityRoomTypeRecord;
  totalRooms: number;
  reservedRooms: number;
  availableRooms: number;
  requestedOccupancy: number;
  fitsRequestedOccupancy: boolean;
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly reservationRoomsRepository: ReservationRoomsRepository,
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

  async list(_currentUser: CurrentUserPayload, query: GetReservationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, reservations] =
      await this.reservationsRepository.listReservations({
        skip: (page - 1) * limit,
        take: limit,
        search: search ?? undefined,
        status: query.status,
        source: query.source,
        guestId: query.guestId,
        checkInFrom: this.parseOptionalDate(query.checkInFrom),
        checkInTo: this.parseOptionalDate(query.checkInTo),
        checkOutFrom: this.parseOptionalDate(query.checkOutFrom),
        checkOutTo: this.parseOptionalDate(query.checkOutTo),
      });

    return {
      items: reservations.map((reservation) =>
        this.serializeReservation(reservation),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, reservationId: number) {
    const reservation = await this.findRequiredReservation(reservationId);

    return this.serializeReservation(reservation);
  }

  async update(
    currentUser: CurrentUserPayload,
    reservationId: number,
    updateReservationDto: UpdateReservationDto,
  ) {
    const reservation = await this.findRequiredReservation(reservationId);

    this.ensureReservationCanBeModified(reservation);

    const checkInDate =
      updateReservationDto.checkInDate === undefined
        ? reservation.checkInDate
        : this.parseDate(updateReservationDto.checkInDate);
    const checkOutDate =
      updateReservationDto.checkOutDate === undefined
        ? reservation.checkOutDate
        : this.parseDate(updateReservationDto.checkOutDate);
    const datesChanged =
      checkInDate.getTime() !== reservation.checkInDate.getTime() ||
      checkOutDate.getTime() !== reservation.checkOutDate.getTime();
    const data: Prisma.ReservationUncheckedUpdateInput = {};

    if (updateReservationDto.guestId !== undefined) {
      await this.ensureActiveGuest(updateReservationDto.guestId);
      data.guestId = updateReservationDto.guestId;
    }

    if (datesChanged) {
      this.ensureValidDateRange(checkInDate, checkOutDate);
      await this.ensureReservationRoomsAreAvailable(
        this.activeReservationRoomsToAvailabilityInput(reservation),
        checkInDate,
        checkOutDate,
        {
          excludeReservationId: reservation.id,
        },
      );
      data.checkInDate = checkInDate;
      data.checkOutDate = checkOutDate;
    }

    if (updateReservationDto.adults !== undefined) {
      data.adults = updateReservationDto.adults;
    }

    if (updateReservationDto.children !== undefined) {
      data.children = updateReservationDto.children;
    }

    if (updateReservationDto.source !== undefined) {
      data.source = updateReservationDto.source;
    }

    if (updateReservationDto.specialRequests !== undefined) {
      data.specialRequests = this.normalizeOptionalString(
        updateReservationDto.specialRequests,
      );
    }

    if (updateReservationDto.internalNotes !== undefined) {
      data.internalNotes = this.normalizeOptionalString(
        updateReservationDto.internalNotes,
      );
    }

    if (Object.keys(data).length === 0) {
      return this.serializeReservation(reservation);
    }

    const updatedReservation =
      await this.reservationsRepository.updateReservation(reservation.id, data);

    await this.recordReservationAudit(
      currentUser,
      'reservations.updated',
      updatedReservation,
      {
        previous: this.reservationAuditSnapshot(reservation),
        changes: this.serializeReservationUpdateAuditData(data),
      },
    );

    return this.serializeReservation(updatedReservation);
  }

  async confirm(currentUser: CurrentUserPayload, reservationId: number) {
    const reservation = await this.findRequiredReservation(reservationId);

    if (reservation.status === ReservationStatus.CONFIRMED) {
      return this.serializeReservation(reservation);
    }

    if (reservation.status !== ReservationStatus.DRAFT) {
      throw new ConflictException('Only draft reservations can be confirmed.');
    }

    const updatedReservation =
      await this.reservationsRepository.updateReservation(reservation.id, {
        status: ReservationStatus.CONFIRMED,
      });

    await this.recordReservationAudit(
      currentUser,
      'reservations.confirmed',
      updatedReservation,
      {
        previousStatus: reservation.status,
        status: updatedReservation.status,
      },
    );

    return this.serializeReservation(updatedReservation);
  }

  async cancel(
    currentUser: CurrentUserPayload,
    reservationId: number,
    cancelReservationDto: CancelReservationDto,
  ) {
    const reservation = await this.findRequiredReservation(reservationId);
    const cancellationReason = this.normalizeRequiredString(
      cancelReservationDto.cancellationReason,
      'Cancellation reason is required.',
    );

    if (reservation.status === ReservationStatus.CANCELLED) {
      return this.serializeReservation(reservation);
    }

    const nonCancellableStatuses: ReservationStatus[] = [
      ReservationStatus.CHECKED_IN,
      ReservationStatus.CHECKED_OUT,
      ReservationStatus.NO_SHOW,
    ];

    if (nonCancellableStatuses.includes(reservation.status)) {
      throw new ConflictException(
        'Reservation cannot be cancelled in its current status.',
      );
    }

    const cancelledAt = new Date();
    const updatedReservation =
      await this.reservationsRepository.runInTransaction(async (client) => {
        await this.reservationRoomsRepository.updateRoomsForReservation(
          reservation.id,
          {
            status: ReservationRoomStatus.CANCELLED,
          },
          baseRate: this.serializeDecimal(room.roomType.baseRate),
        },
        room: room.room,
      })),
    };
  }

  private parseDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid reservation date.');
    }

    return date;
  }

  private ensureValidDateRange(checkInDate: Date, checkOutDate: Date) {
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date.',
      );
    }
  }

  private serializeDecimal(value: Prisma.Decimal | null) {
    return value?.toString() ?? null;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }
}