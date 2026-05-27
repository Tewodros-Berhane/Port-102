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
          client,
        );

        return this.reservationsRepository.updateReservation(
          reservation.id,
          {
            status: ReservationStatus.CANCELLED,
            cancellationReason,
            cancelledAt,
            cancelledByUserId: currentUser.sub,
          },
          client,
        );
      });

    await this.recordReservationAudit(
      currentUser,
      'reservations.cancelled',
      updatedReservation,
      {
        previousStatus: reservation.status,
        cancellationReason,
        cancelledAt: cancelledAt.toISOString(),
      },
    );

    return this.serializeReservation(updatedReservation);
  }

  async markNoShow(
    currentUser: CurrentUserPayload,
    reservationId: number,
    markNoShowDto: MarkNoShowDto,
  ) {
    const reservation = await this.findRequiredReservation(reservationId);

    if (reservation.status === ReservationStatus.NO_SHOW) {
      return this.serializeReservation(reservation);
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException(
        'Only confirmed reservations can be marked no-show.',
      );
    }

    const reason = this.normalizeOptionalString(markNoShowDto.reason);
    const noShowAt = new Date();
    const updatedReservation =
      await this.reservationsRepository.runInTransaction(async (client) => {
        await this.reservationRoomsRepository.updateRoomsForReservation(
          reservation.id,
          {
            status: ReservationRoomStatus.CANCELLED,
          },
          client,
        );

        return this.reservationsRepository.updateReservation(
          reservation.id,
          {
            status: ReservationStatus.NO_SHOW,
            noShowAt,
          },
          client,
        );
      });

    await this.recordReservationAudit(
      currentUser,
      'reservations.no_show_marked',
      updatedReservation,
      {
        previousStatus: reservation.status,
        status: updatedReservation.status,
        noShowAt: noShowAt.toISOString(),
        reason,
      },
    );

    return this.serializeReservation(updatedReservation);
  }

  async addRoom(
    currentUser: CurrentUserPayload,
    reservationId: number,
    addReservationRoomDto: AddReservationRoomDto,
  ) {
    const reservation = await this.findRequiredReservation(reservationId);

    this.ensureReservationCanBeModified(reservation);

    await this.ensureReservationRoomsAreAvailable(
      [
        ...this.activeReservationRoomsToAvailabilityInput(reservation),
        addReservationRoomDto,
      ],
      reservation.checkInDate,
      reservation.checkOutDate,
      {
        excludeReservationId: reservation.id,
      },
    );

    const reservationRoom =
      await this.reservationRoomsRepository.createReservationRoom({
        reservationId: reservation.id,
        roomTypeId: addReservationRoomDto.roomTypeId,
        roomId: addReservationRoomDto.roomId ?? null,
        rate:
          addReservationRoomDto.rate === undefined ||
          addReservationRoomDto.rate === null
            ? null
            : addReservationRoomDto.rate.toString(),
        notes: this.normalizeOptionalString(addReservationRoomDto.notes),
      });
    const updatedReservation = await this.findRequiredReservation(
      reservation.id,
    );

    await this.recordReservationAudit(
      currentUser,
      'reservations.room_added',
      updatedReservation,
      {
        reservationRoomId: reservationRoom.id,
        roomTypeId: reservationRoom.roomTypeId,
        roomId: reservationRoom.roomId,
      },
    );

    return this.serializeReservation(updatedReservation);
  }

  async updateRoom(
    currentUser: CurrentUserPayload,
    reservationId: number,
    reservationRoomId: number,
    updateReservationRoomDto: UpdateReservationRoomDto,
  ) {
    const reservation = await this.findRequiredReservation(reservationId);
    const reservationRoom = await this.findRequiredReservationRoom(
      reservation.id,
      reservationRoomId,
    );

    this.ensureReservationCanBeModified(reservation);

    if (reservationRoom.status === ReservationRoomStatus.CANCELLED) {
      throw new ConflictException(
        'Cancelled reservation rooms cannot be updated.',
      );
    }

    const data = this.buildReservationRoomUpdateData(updateReservationRoomDto);

    if (Object.keys(data).length === 0) {
      return this.serializeReservation(reservation);
    }

    await this.ensureReservationRoomsAreAvailable(
      this.activeReservationRoomsToAvailabilityInput(
        reservation,
        this.mergeReservationRoomUpdate(
          reservationRoom,
          updateReservationRoomDto,
        ),
      ),
      reservation.checkInDate,
      reservation.checkOutDate,
      {
        excludeReservationId: reservation.id,
      },
    );

    const updatedReservationRoom =
      await this.reservationRoomsRepository.updateReservationRoom(
        reservationRoom.id,
        data,
      );
    const updatedReservation = await this.findRequiredReservation(
      reservation.id,
    );

    await this.recordReservationAudit(
      currentUser,
      'reservations.room_updated',
      updatedReservation,
      {
        reservationRoomId: updatedReservationRoom.id,
        previous: this.reservationRoomAuditSnapshot(reservationRoom),
        changes: this.serializeReservationRoomUpdateAuditData(data),
      },
    );

    return this.serializeReservation(updatedReservation);
  }

  async removeRoom(
    currentUser: CurrentUserPayload,
    reservationId: number,
    reservationRoomId: number,
  ) {
    const reservation = await this.findRequiredReservation(reservationId);
    const reservationRoom = await this.findRequiredReservationRoom(
      reservation.id,
      reservationRoomId,
    );

    this.ensureReservationCanBeModified(reservation);

    if (reservationRoom.status !== ReservationRoomStatus.CANCELLED) {
      const activeRoomCount =
        await this.reservationRoomsRepository.countActiveRooms(reservation.id);

      if (activeRoomCount <= 1) {
        throw new ConflictException(
          'Cannot remove the last active room from a reservation.',
        );
      }
    }

    const removedReservationRoom =
      await this.reservationRoomsRepository.removeReservationRoom(
        reservationRoom.id,
      );
    const updatedReservation = await this.findRequiredReservation(
      reservation.id,
    );

    await this.recordReservationAudit(
      currentUser,
      'reservations.room_removed',
      updatedReservation,
      {
        reservationRoomId: removedReservationRoom.id,
        previous: this.reservationRoomAuditSnapshot(reservationRoom),
      },
    );

    return this.serializeReservation(updatedReservation);
  }

  async searchAvailability(
    _currentUser: CurrentUserPayload,
    query: AvailabilitySearchQueryDto,
  ) {
    const checkInDate = this.parseDate(query.checkInDate);
    const checkOutDate = this.parseDate(query.checkOutDate);
    const adults = query.adults ?? 1;
    const children = query.children ?? 0;
    const requestedOccupancy = adults + children;

    this.ensureValidDateRange(checkInDate, checkOutDate);

    const roomTypes =
      await this.reservationAvailabilityRepository.listRoomTypesForAvailability(
        {
          roomTypeId: query.roomTypeId,
          minOccupancy:
            query.roomTypeId === undefined ? requestedOccupancy : undefined,
        },
      );

    this.ensureAvailabilityRoomTypesFound(roomTypes, query.roomTypeId);

    const summaries = await this.buildAvailabilitySummaries({
      roomTypes,
      checkInDate,
      checkOutDate,
      requestedOccupancy,
    });

    return {
      checkInDate,
      checkOutDate,
      nights: this.calculateNights(checkInDate, checkOutDate),
      adults,
      children,
      roomTypeId: query.roomTypeId ?? null,
      roomTypes: summaries
        .filter((summary) => summary.availableRooms > 0)
        .map((summary) => this.serializeAvailabilitySummary(summary)),
    };
  }

  async getAvailabilityByRoomType(
    _currentUser: CurrentUserPayload,
    query: AvailabilitySearchQueryDto,
  ) {
    const checkInDate = this.parseDate(query.checkInDate);
    const checkOutDate = this.parseDate(query.checkOutDate);
    const adults = query.adults ?? 1;
    const children = query.children ?? 0;
    const requestedOccupancy = adults + children;

    this.ensureValidDateRange(checkInDate, checkOutDate);

    const roomTypes =
      await this.reservationAvailabilityRepository.listRoomTypesForAvailability(
        {
          roomTypeId: query.roomTypeId,
        },
      );

    this.ensureAvailabilityRoomTypesFound(roomTypes, query.roomTypeId);

    const summaries = await this.buildAvailabilitySummaries({
      roomTypes,
      checkInDate,
      checkOutDate,
      requestedOccupancy,
    });

    return {
      checkInDate,
      checkOutDate,
      nights: this.calculateNights(checkInDate, checkOutDate),
      adults,
      children,
      roomTypeId: query.roomTypeId ?? null,
      roomTypes: summaries.map((summary) =>
        this.serializeAvailabilitySummary(summary),
      ),
    };
  }

  async listAvailableRooms(
    _currentUser: CurrentUserPayload,
    query: AvailabilitySearchQueryDto,
  ) {
    const checkInDate = this.parseDate(query.checkInDate);
    const checkOutDate = this.parseDate(query.checkOutDate);

    this.ensureValidDateRange(checkInDate, checkOutDate);

    if (query.roomTypeId !== undefined) {
      await this.ensureActiveRoomType(query.roomTypeId);
    }

    const rooms =
      await this.reservationAvailabilityRepository.listAvailableRooms({
        roomTypeId: query.roomTypeId,
        checkInDate,
        checkOutDate,
      });

    return {
      checkInDate,
      checkOutDate,
      nights: this.calculateNights(checkInDate, checkOutDate),
      roomTypeId: query.roomTypeId ?? null,
      rooms: rooms.map((room) => this.serializeAvailabilityRoom(room)),
    };
  }

  async getBookingCalendar(
    _currentUser: CurrentUserPayload,
    query: BookingCalendarQueryDto,
  ) {
    const startDate = this.parseDate(query.startDate);
    const endDate = this.parseDate(query.endDate);

    this.ensureValidDateRange(startDate, endDate);

    const reservations =
      await this.reservationsRepository.listCalendarReservations({
        startDate,
        endDate,
        roomId: query.roomId,
        roomTypeId: query.roomTypeId,
        status: query.status,
      });

    return {
      startDate,
      endDate,
      roomId: query.roomId ?? null,
      roomTypeId: query.roomTypeId ?? null,
      status: query.status ?? null,
      items: reservations.map((reservation) =>
        this.serializeCalendarReservation(reservation),
      ),
    };
  }

  private async findRequiredReservation(reservationId: number) {
    const reservation =
      await this.reservationsRepository.findReservation(reservationId);

    if (!reservation) {
      throw new NotFoundException('Reservation was not found.');
    }

    return reservation;
  }

  private async findRequiredReservationRoom(
    reservationId: number,
    reservationRoomId: number,
  ) {
    const reservationRoom =
      await this.reservationRoomsRepository.findReservationRoom(
        reservationRoomId,
      );

    if (!reservationRoom || reservationRoom.reservationId !== reservationId) {
      throw new NotFoundException('Reservation room was not found.');
    }

    return reservationRoom;
  }

  private ensureReservationCanBeModified(reservation: ReservationRecord) {
    const nonModifiableStatuses: ReservationStatus[] = [
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
      ReservationStatus.CHECKED_IN,
      ReservationStatus.CHECKED_OUT,
    ];

    if (nonModifiableStatuses.includes(reservation.status)) {
      throw new ConflictException(
        'Reservation cannot be modified in its current status.',
      );
    }
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
    rooms: ReservationRoomAvailabilityInput[],
    checkInDate: Date,
    checkOutDate: Date,
    options: ReservationAvailabilityOptions = {},
  ) {
    const requestedRoomIds = new Set<number>();
    const requestedByRoomType = new Map<number, number>();

    for (const room of rooms) {
      await this.ensureActiveRoomType(room.roomTypeId);

      requestedByRoomType.set(
        room.roomTypeId,
        (requestedByRoomType.get(room.roomTypeId) ?? 0) + 1,
      );

      if (room.roomId !== undefined && room.roomId !== null) {
        if (requestedRoomIds.has(room.roomId)) {
          throw new ConflictException(
            'The same room cannot be assigned more than once.',
          );
        }

        requestedRoomIds.add(room.roomId);
        await this.ensureSpecificRoomIsAvailable(
          room,
          checkInDate,
          checkOutDate,
          options,
        );
      }
    }

    await this.ensureRoomTypeCapacity(
      [...requestedByRoomType.entries()].map(
        ([roomTypeId, requestedCount]) => ({
          roomTypeId,
          requestedCount,
        }),
      ),
      checkInDate,
      checkOutDate,
      options,
    );
  }

  private async ensureActiveRoomType(roomTypeId: number) {
    const roomType = await this.roomTypesRepository.findRoomType(roomTypeId);

    if (!roomType) {
      throw new NotFoundException('Room type was not found.');
    }

    if (!roomType.isActive) {
      throw new BadRequestException('Cannot reserve an inactive room type.');
    }
  }

  private async ensureSpecificRoomIsAvailable(
    requestedRoom: ReservationRoomAvailabilityInput,
    checkInDate: Date,
    checkOutDate: Date,
    options: ReservationAvailabilityOptions = {},
  ) {
    const room = await this.roomsRepository.findRoom(
      Number(requestedRoom.roomId),
    );

    if (!room) {
      throw new NotFoundException('Room was not found.');
    }

    if (!room.isActive) {
      throw new BadRequestException('Cannot reserve an inactive room.');
    }

    if (room.roomTypeId !== requestedRoom.roomTypeId) {
      throw new BadRequestException(
        'Selected room does not belong to the requested room type.',
      );
    }

    if (room.maintenanceStatus !== RoomMaintenanceStatus.AVAILABLE) {
      throw new ConflictException('Selected room is not available for sale.');
    }

    const overlappingReservations =
      await this.reservationAvailabilityRepository.countOverlappingRoomReservations(
        {
          roomId: room.id,
          checkInDate,
          checkOutDate,
          excludeReservationId: options.excludeReservationId,
        },
      );

    if (overlappingReservations > 0) {
      throw new ConflictException(
        'Selected room is already reserved for the requested dates.',
      );
    }
  }

  private async ensureRoomTypeCapacity(
    demand: RoomTypeDemand[],
    checkInDate: Date,
    checkOutDate: Date,
    options: ReservationAvailabilityOptions = {},
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
          excludeReservationId: options.excludeReservationId,
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

  private ensureAvailabilityRoomTypesFound(
    roomTypes: AvailabilityRoomTypeRecord[],
    roomTypeId?: number,
  ) {
    if (roomTypeId !== undefined && roomTypes.length === 0) {
      throw new NotFoundException('Room type was not found.');
    }
  }

  private async buildAvailabilitySummaries({
    roomTypes,
    checkInDate,
    checkOutDate,
    requestedOccupancy,
  }: {
    roomTypes: AvailabilityRoomTypeRecord[];
    checkInDate: Date;
    checkOutDate: Date;
    requestedOccupancy: number;
  }): Promise<AvailabilitySummary[]> {
    return Promise.all(
      roomTypes.map(async (roomType) => {
        const [totalRooms, reservedRooms] = await Promise.all([
          this.reservationAvailabilityRepository.countPhysicalRooms(
            roomType.id,
          ),
          this.reservationAvailabilityRepository.countReservedRooms({
            roomTypeId: roomType.id,
            checkInDate,
            checkOutDate,
          }),
        ]);
        const fitsRequestedOccupancy =
          roomType.maxOccupancy >= requestedOccupancy;
        const rawAvailableRooms = Math.max(totalRooms - reservedRooms, 0);

        return {
          roomType,
          totalRooms,
          reservedRooms,
          availableRooms: fitsRequestedOccupancy ? rawAvailableRooms : 0,
          requestedOccupancy,
          fitsRequestedOccupancy,
        };
      }),
    );
  }

  private activeReservationRoomsToAvailabilityInput(
    reservation: ReservationRecord,
    replacementRoom?: ReservationRoomAvailabilityInput & { id: number },
  ): ReservationRoomAvailabilityInput[] {
    return reservation.rooms
      .filter((room) => room.status !== ReservationRoomStatus.CANCELLED)
      .map((room) => {
        if (replacementRoom && room.id === replacementRoom.id) {
          return {
            roomTypeId: replacementRoom.roomTypeId,
            roomId: replacementRoom.roomId ?? null,
          };
        }

        return {
          roomTypeId: room.roomTypeId,
          roomId: room.roomId,
        };
      });
  }

  private mergeReservationRoomUpdate(
    reservationRoom: ReservationRoomRecord,
    updateReservationRoomDto: UpdateReservationRoomDto,
  ): ReservationRoomAvailabilityInput & { id: number } {
    return {
      id: reservationRoom.id,
      roomTypeId:
        updateReservationRoomDto.roomTypeId ?? reservationRoom.roomTypeId,
      roomId:
        updateReservationRoomDto.roomId === undefined
          ? reservationRoom.roomId
          : updateReservationRoomDto.roomId,
    };
  }

  private buildReservationRoomUpdateData(
    updateReservationRoomDto: UpdateReservationRoomDto,
  ): Prisma.ReservationRoomUncheckedUpdateInput {
    const data: Prisma.ReservationRoomUncheckedUpdateInput = {};

    if (updateReservationRoomDto.roomTypeId !== undefined) {
      data.roomTypeId = updateReservationRoomDto.roomTypeId;
    }

    if (updateReservationRoomDto.roomId !== undefined) {
      data.roomId = updateReservationRoomDto.roomId;
    }

    if (updateReservationRoomDto.rate !== undefined) {
      data.rate =
        updateReservationRoomDto.rate === null