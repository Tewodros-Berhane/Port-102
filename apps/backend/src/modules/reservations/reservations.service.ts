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
    }
  }

  private async ensureRoomTypeCapacity(
    demand: RoomTypeDemand[],
    checkInDate: Date,
    checkOutDate: Date,
  ) {
    for (const item of demand) {
      const [physicalRooms, reservedRooms] = await Promise.all([
        this.reservationAvailabilityRepository.countPhysicalRooms(
          item.roomTypeId,
        ),
        this.reservationAvailabilityRepository.countReservedRooms({
          roomTypeId: item.roomTypeId,
          checkInDate,
          checkOutDate,
        }),
      ]);

      const availableRooms = physicalRooms - reservedRooms;

      if (availableRooms < item.requestedCount) {
        throw new ConflictException(
          'Not enough rooms are available for the requested dates.',
        );
      }
    }
  }

  private buildReservationRoomCreateData(
    room: AddReservationRoomDto,
  ): ReservationRoomCreateData {
    return {
      roomType: {
        connect: {
          id: room.roomTypeId,
        },
      },
      ...(room.roomId === undefined || room.roomId === null
        ? {}
        : {
            room: {
              connect: {
                id: room.roomId,
              },
            },
          }),
      rate:
        room.rate === undefined || room.rate === null
          ? null
          : room.rate.toString(),
      notes: this.normalizeOptionalString(room.notes),
    };
  }

  private async generateReservationNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const reservationNumber = `RES-${datePart}-${sequence}`;
      const existingReservation =
        await this.reservationsRepository.findByReservationNumber(
          reservationNumber,
        );

      if (!existingReservation) {
        return reservationNumber;
      }
    }

    throw new ConflictException(
      'Could not generate a unique reservation number.',
    );
  }

  private serializeReservation(reservation: ReservationRecord) {
    return {
      id: reservation.id,
      reservationNumber: reservation.reservationNumber,
      guestId: reservation.guestId,
      status: reservation.status,
      source: reservation.source,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      adults: reservation.adults,
      children: reservation.children,
      specialRequests: reservation.specialRequests,
      internalNotes: reservation.internalNotes,
      cancellationReason: reservation.cancellationReason,
      cancelledAt: reservation.cancelledAt,
      noShowAt: reservation.noShowAt,
      createdByUserId: reservation.createdByUserId,
      cancelledByUserId: reservation.cancelledByUserId,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      guest: reservation.guest,
      createdBy: reservation.createdBy,
      cancelledBy: reservation.cancelledBy,
      rooms: reservation.rooms.map((room) => ({
        id: room.id,
        reservationId: room.reservationId,
        roomTypeId: room.roomTypeId,
        roomId: room.roomId,
        status: room.status,
        rate: this.serializeDecimal(room.rate),
        notes: room.notes,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        roomType: {
          ...room.roomType,
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