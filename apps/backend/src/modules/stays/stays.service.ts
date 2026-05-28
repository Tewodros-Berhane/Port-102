import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  GuestStatus,
  ReservationRoomStatus,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ReservationAvailabilityRepository } from '../reservations/repositories/reservation-availability.repository';
import {
  ReservationRoomRecord,
  ReservationRoomsRepository,
} from '../reservations/repositories/reservation-rooms.repository';
import {
  ReservationRecord,
  ReservationsRepository,
} from '../reservations/repositories/reservations.repository';
import {
  RoomRecord,
  RoomsRepository,
} from '../rooms/repositories/rooms.repository';
import { CheckInReservationDto } from './dto/check-in-reservation.dto';
import { GetStaysQueryDto } from './dto/get-stays-query.dto';
import { StayRoomAssignmentsRepository } from './repositories/stay-room-assignments.repository';
import { StayRecord, StaysRepository } from './repositories/stays.repository';

type CheckInRoomAssignment = {
  reservationRoomId: number;
  roomId: number;
  reason: string | null;
  room: RoomRecord;
};

@Injectable()
export class StaysService {
  constructor(
    private readonly staysRepository: StaysRepository,
    private readonly stayRoomAssignmentsRepository: StayRoomAssignmentsRepository,
    private readonly reservationsRepository: ReservationsRepository,
    private readonly reservationRoomsRepository: ReservationRoomsRepository,
    private readonly reservationAvailabilityRepository: ReservationAvailabilityRepository,
    private readonly roomsRepository: RoomsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async list(_currentUser: CurrentUserPayload, query: GetStaysQueryDto) {
    return this.listStays(query, query.status);
  }

  async getById(_currentUser: CurrentUserPayload, stayId: number) {
    const stay = await this.findRequiredStay(stayId);

    return this.serializeStay(stay);
  }

  async listActive(_currentUser: CurrentUserPayload, query: GetStaysQueryDto) {
    return this.listStays(query, StayStatus.ACTIVE);
  }

  async listInHouseGuests(
    _currentUser: CurrentUserPayload,
    query: GetStaysQueryDto,
  ) {
    const result = await this.listStays(query, StayStatus.ACTIVE);

    return {
      ...result,
      items: result.items.map((stay) => this.serializeInHouseGuest(stay)),
    };
  }

  async checkInReservation(
    currentUser: CurrentUserPayload,
    reservationId: number,
    checkInReservationDto: CheckInReservationDto,
  ) {
    const reservation = await this.findRequiredReservation(reservationId);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException(
        'Only confirmed reservations can be checked in.',
      );
    }

    if (reservation.guest.status !== GuestStatus.ACTIVE) {
      throw new BadRequestException('Cannot check in an inactive guest.');
    }

    this.ensureValidReservationDates(reservation);

    const existingStay = await this.staysRepository.findStayByReservationId(
      reservation.id,
    );

    if (existingStay) {
      throw new ConflictException('Reservation already has an active stay.');
    }

    const assignments = await this.resolveCheckInRoomAssignments(
      reservation,
      checkInReservationDto,
    );
    const stayNumber = await this.generateStayNumber();
    const notes = this.normalizeOptionalString(checkInReservationDto.notes);
    const stay = await this.staysRepository.runInTransaction(async (client) => {
      const createdStay = await this.staysRepository.createStay(
        {
          stayNumber,
          reservationId: reservation.id,
          guestId: reservation.guestId,
          expectedCheckOutDate: reservation.checkOutDate,
          checkedInByUserId: currentUser.sub,
          notes,
        },
        client,
      );

      for (const assignment of assignments) {
        await this.stayRoomAssignmentsRepository.createAssignment(
          {
            stayId: createdStay.id,
            roomId: assignment.roomId,
            reservationRoomId: assignment.reservationRoomId,
            assignedByUserId: currentUser.sub,
            reason: assignment.reason,
          },
          client,
        );
        await this.reservationRoomsRepository.updateReservationRoom(
          assignment.reservationRoomId,
          {
            status: ReservationRoomStatus.CHECKED_IN,
            roomId: assignment.roomId,
          },
          client,
        );
        await this.roomsRepository.updateRoom(
          assignment.roomId,
          {
            occupancyStatus: RoomOccupancyStatus.OCCUPIED,
          },
          client,
        );
      }

      await this.roomsRepository.createStatusLogs(
        assignments.map((assignment) => ({
          roomId: assignment.roomId,
          actorUserId: currentUser.sub,
          field: 'occupancyStatus',
          oldValue: assignment.room.occupancyStatus,
          newValue: RoomOccupancyStatus.OCCUPIED,
          reason: 'Reservation check-in',
        })),
        client,
      );
      await this.reservationsRepository.updateReservation(
        reservation.id,
        {
          status: ReservationStatus.CHECKED_IN,
        },
        client,
      );

      const checkedInStay = await this.staysRepository.findStay(
        createdStay.id,
        client,
      );

      if (!checkedInStay) {
        throw new NotFoundException('Stay was not found after check-in.');
      }

      return checkedInStay;
    });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'stays.checked_in',
      entityType: 'Stay',
      entityId: String(stay.id),
      metadata: {
        stayNumber: stay.stayNumber,
        reservationId: reservation.id,
        reservationNumber: reservation.reservationNumber,
        guestId: reservation.guestId,
        roomAssignments: assignments.map((assignment) => ({
          reservationRoomId: assignment.reservationRoomId,
          roomId: assignment.roomId,
        })),
      },
    });

    return this.serializeStay(stay);
  }

  private async listStays(
    query: GetStaysQueryDto,
    statusOverride?: StayStatus,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, stays] = await this.staysRepository.listStays({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      status: statusOverride,
      guestId: query.guestId,
      checkedInFrom: this.parseOptionalDate(query.checkedInFrom),
      checkedInTo: this.parseOptionalDate(query.checkedInTo),
      expectedCheckOutFrom: this.parseOptionalDate(query.expectedCheckOutFrom),
      expectedCheckOutTo: this.parseOptionalDate(query.expectedCheckOutTo),
    });

    return {
      items: stays.map((stay) => this.serializeStay(stay)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

  private async findRequiredStay(stayId: number) {
    const stay = await this.staysRepository.findStay(stayId);

    if (!stay) {
      throw new NotFoundException('Stay was not found.');
    }

    return stay;
  }

  private async resolveCheckInRoomAssignments(
    reservation: ReservationRecord,
    checkInReservationDto: CheckInReservationDto,
  ): Promise<CheckInRoomAssignment[]> {
    const activeReservationRooms = reservation.rooms.filter(
      (room) => room.status !== ReservationRoomStatus.CANCELLED,
    );

    if (activeReservationRooms.length === 0) {
      throw new ConflictException(
        'Reservation has no active room lines to check in.',
      );
    }

    const keyedOverrides = new Map<number, number>();
    const unkeyedOverrides: number[] = [];
    const providedRoomIds = new Set<number>();

    for (const assignment of checkInReservationDto.roomAssignments ?? []) {
      if (providedRoomIds.has(assignment.roomId)) {
        throw new ConflictException(
          'The same room cannot be assigned more than once.',
        );
      }

      providedRoomIds.add(assignment.roomId);

      if (
        assignment.reservationRoomId === undefined ||
        assignment.reservationRoomId === null
      ) {
        unkeyedOverrides.push(assignment.roomId);
        continue;
      }

      if (keyedOverrides.has(assignment.reservationRoomId)) {
        throw new BadRequestException(
          'Duplicate reservation room assignment override was provided.',
        );
      }

      keyedOverrides.set(assignment.reservationRoomId, assignment.roomId);
    }

    const selectedRoomIds = new Set<number>();
    const assignments: CheckInRoomAssignment[] = [];

    for (const reservationRoom of activeReservationRooms) {
      const keyedOverride = keyedOverrides.get(reservationRoom.id);
      const unkeyedOverride =
        keyedOverride === undefined ? unkeyedOverrides.shift() : undefined;
      const roomId = keyedOverride ?? unkeyedOverride ?? reservationRoom.roomId;

      keyedOverrides.delete(reservationRoom.id);

      if (roomId === undefined || roomId === null) {
        throw new BadRequestException(
          'A physical room assignment is required for every active reservation room.',
        );
      }

      if (selectedRoomIds.has(roomId)) {
        throw new ConflictException(
          'The same room cannot be assigned more than once.',
        );
      }

      selectedRoomIds.add(roomId);

      const room = await this.ensureRoomCanBeCheckedIn(
        roomId,
        reservationRoom,
        reservation,
      );

      assignments.push({
        reservationRoomId: reservationRoom.id,
        roomId,
        reason: this.normalizeOptionalString(checkInReservationDto.notes),
        room,
      });
    }

    if (keyedOverrides.size > 0) {
      throw new BadRequestException(
        'Check-in room assignment references a reservation room that is not active on this reservation.',
      );
    }

    if (unkeyedOverrides.length > 0) {
      throw new BadRequestException('Too many room assignments were provided.');
    }

    return assignments;
  }

  private async ensureRoomCanBeCheckedIn(
    roomId: number,
    reservationRoom: ReservationRoomRecord,
    reservation: ReservationRecord,
  ) {
    const room = await this.roomsRepository.findRoom(roomId);

    if (!room) {
      throw new NotFoundException('Room was not found.');
    }

    if (!room.isActive) {
      throw new BadRequestException('Cannot check in to an inactive room.');
    }

    if (room.roomTypeId !== reservationRoom.roomTypeId) {
      throw new BadRequestException(
        'Selected room does not belong to the reserved room type.',
      );
    }

    if (room.occupancyStatus !== RoomOccupancyStatus.VACANT) {
      throw new ConflictException('Selected room is not vacant.');
    }

    if (room.maintenanceStatus !== RoomMaintenanceStatus.AVAILABLE) {
      throw new ConflictException('Selected room is not available for use.');
    }

    if (
      room.cleaningStatus !== RoomCleaningStatus.CLEAN &&
      room.cleaningStatus !== RoomCleaningStatus.INSPECTED
    ) {
      throw new ConflictException('Selected room is not clean or inspected.');
    }

    const overlappingReservations =
      await this.reservationAvailabilityRepository.countOverlappingRoomReservations(
        {
          roomId: room.id,
          checkInDate: reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          excludeReservationId: reservation.id,
        },
      );

    if (overlappingReservations > 0) {
      throw new ConflictException(
        'Selected room is already reserved for the stay dates.',
      );
    }

    return room;
  }

  private ensureValidReservationDates(reservation: ReservationRecord) {
    if (reservation.checkOutDate <= reservation.checkInDate) {
      throw new BadRequestException(
        'Reservation check-out date must be after check-in date.',
      );
    }
  }

  private async generateStayNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const stayNumber = `STAY-${datePart}-${sequence}`;
      const existingStay =
        await this.staysRepository.findStayByStayNumber(stayNumber);

      if (!existingStay) {
        return stayNumber;
      }
    }

    throw new ConflictException('Could not generate a unique stay number.');
  }

  private serializeStay(stay: StayRecord) {
    return {
      id: stay.id,
      stayNumber: stay.stayNumber,
      reservationId: stay.reservationId,
      guestId: stay.guestId,
      status: stay.status,
      checkedInAt: stay.checkedInAt,
      expectedCheckOutDate: stay.expectedCheckOutDate,
      checkedOutAt: stay.checkedOutAt,
      checkedInByUserId: stay.checkedInByUserId,
      checkedOutByUserId: stay.checkedOutByUserId,
      notes: stay.notes,
      createdAt: stay.createdAt,
      updatedAt: stay.updatedAt,
      reservation: stay.reservation,
      guest: stay.guest,
      checkedInBy: stay.checkedInBy,
      checkedOutBy: stay.checkedOutBy,
      roomAssignments: stay.roomAssignments.map((assignment) => ({
        id: assignment.id,
        stayId: assignment.stayId,
        roomId: assignment.roomId,
        reservationRoomId: assignment.reservationRoomId,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        releasedAt: assignment.releasedAt,
        assignedByUserId: assignment.assignedByUserId,
        releasedByUserId: assignment.releasedByUserId,
        reason: assignment.reason,
        room: assignment.room,
        reservationRoom: assignment.reservationRoom,
      })),
    };
  }

  private serializeInHouseGuest(
    stay: ReturnType<StaysService['serializeStay']>,
  ) {
    return {
      guest: stay.guest,
      stay: {
        id: stay.id,
        stayNumber: stay.stayNumber,
        status: stay.status,
        checkedInAt: stay.checkedInAt,
        expectedCheckOutDate: stay.expectedCheckOutDate,
      },
      reservation: stay.reservation,
      currentRooms: stay.roomAssignments
        .filter(
          (assignment) => assignment.status === StayRoomAssignmentStatus.ACTIVE,
        )
        .map((assignment) => ({
          assignmentId: assignment.id,
          roomId: assignment.roomId,
          reservationRoomId: assignment.reservationRoomId,
          assignedAt: assignment.assignedAt,
          room: assignment.room,
        })),
    };
  }

  private parseDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid stay date.');
    }

    return date;
  }

  private parseOptionalDate(value?: string) {
    return value === undefined ? undefined : this.parseDate(value);
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }
}
