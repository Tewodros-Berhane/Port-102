import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FolioStatus,
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
import {
  FolioRecord,
  FoliosRepository,
} from '../folios/repositories/folios.repository';
import { HousekeepingService } from '../housekeeping/housekeeping.service';
import type { HousekeepingTaskRecord } from '../housekeeping/repositories/housekeeping-tasks.repository';
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
import { AssignStayRoomDto } from './dto/assign-stay-room.dto';
import { CheckInReservationDto } from './dto/check-in-reservation.dto';
import { CheckOutStayDto } from './dto/check-out-stay.dto';
import { ExtendStayDto } from './dto/extend-stay.dto';
import { GetStaysQueryDto } from './dto/get-stays-query.dto';
import { MoveRoomDto } from './dto/move-room.dto';
import { UpdateStayRoomAssignmentDto } from './dto/update-stay-room-assignment.dto';
import {
  StayRoomAssignmentRecord,
  StayRoomAssignmentsRepository,
} from './repositories/stay-room-assignments.repository';
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
    private readonly foliosRepository: FoliosRepository,
    private readonly housekeepingService: HousekeepingService,
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

  async checkOut(
    currentUser: CurrentUserPayload,
    stayId: number,
    checkOutStayDto: CheckOutStayDto,
  ) {
    if (checkOutStayDto.forceCheckout) {
      throw new BadRequestException('Force checkout is not supported yet.');
    }

    const stay = await this.findRequiredStay(stayId);

    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictException('Only active stays can be checked out.');
    }

    const folio = await this.foliosRepository.findByStayId(stay.id);
    await this.ensureCheckoutFolioIsSettled(currentUser, stay, folio);

    const activeAssignments =
      await this.stayRoomAssignmentsRepository.listActiveAssignmentsForStay(
        stay.id,
      );

    if (activeAssignments.length === 0) {
      throw new ConflictException(
        'Stay has no active room assignments to check out.',
      );
    }

    const checkedOutAt = new Date();
    const notes = this.normalizeOptionalString(checkOutStayDto.notes);
    const shouldCloseFolio =
      checkOutStayDto.closeFolio === true &&
      folio?.status === FolioStatus.OPEN &&
      folio.balanceAmount.equals(0);
    const createdHousekeepingTasks: HousekeepingTaskRecord[] = [];
    const checkedOutStay = await this.staysRepository.runInTransaction(
      async (client) => {
        for (const assignment of activeAssignments) {
          await this.stayRoomAssignmentsRepository.updateAssignment(
            assignment.id,
            {
              status: StayRoomAssignmentStatus.RELEASED,
              releasedAt: checkedOutAt,
              releasedByUserId: currentUser.sub,
              reason: notes,
            },
            client,
          );

          if (assignment.reservationRoomId !== null) {
            await this.reservationRoomsRepository.updateReservationRoom(
              assignment.reservationRoomId,
              {
                status: ReservationRoomStatus.CHECKED_OUT,
              },
              client,
            );
          }

          await this.roomsRepository.updateRoom(
            assignment.roomId,
            {
              occupancyStatus: RoomOccupancyStatus.VACANT,
              cleaningStatus: RoomCleaningStatus.DIRTY,
            },
            client,
          );

          const housekeepingTask =
            await this.housekeepingService.createCheckoutCleaningTaskFromStay({
              stayId: stay.id,
              roomId: assignment.roomId,
              client,
            });

          if (housekeepingTask.created) {
            createdHousekeepingTasks.push(housekeepingTask.task);
          }
        }

        const roomStatusLogs = this.buildCheckoutRoomStatusLogs(
          activeAssignments,
          currentUser.sub,
        );

        if (roomStatusLogs.length > 0) {
          await this.roomsRepository.createStatusLogs(roomStatusLogs, client);
        }

        await this.reservationsRepository.updateReservation(
          stay.reservationId,
          {
            status: ReservationStatus.CHECKED_OUT,
          },
          client,
        );
        await this.staysRepository.updateStay(
          stay.id,
          {
            status: StayStatus.CHECKED_OUT,
            checkedOutAt,
            checkedOutByUserId: currentUser.sub,
            ...(checkOutStayDto.notes === undefined ? {} : { notes }),
          },
          client,
        );

        if (shouldCloseFolio && folio) {
          await this.foliosRepository.updateFolio(
            folio.id,
            {
              status: FolioStatus.CLOSED,
              closedAt: checkedOutAt,
              closedByUserId: currentUser.sub,
            },
            client,
          );
        }

        const updatedStay = await this.staysRepository.findStay(
          stay.id,
          client,
        );

        if (!updatedStay) {
          throw new NotFoundException('Stay was not found after checkout.');
        }

        return updatedStay;
      },
    );

    if (shouldCloseFolio && folio) {
      await this.auditLogsService.record({
        actorUserId: currentUser.sub,
        action: 'folios.closed',
        entityType: 'Folio',
        entityId: String(folio.id),
        metadata: {
          folioNumber: folio.folioNumber,
          stayId: stay.id,
          guestId: folio.guestId,
          closedAt: checkedOutAt.toISOString(),
          source: 'stay_checkout',
          notes,
        },
      });
    }

    for (const task of createdHousekeepingTasks) {
      await this.auditLogsService.record({
        actorUserId: currentUser.sub,
        action: 'housekeeping.tasks.auto_created',
        entityType: 'HousekeepingTask',
        entityId: String(task.id),
        metadata: {
          taskNumber: task.taskNumber,
          roomId: task.roomId,
          type: task.type,
          status: task.status,
          sourceType: task.sourceType,
          sourceId: task.sourceId,
          stayId: checkedOutStay.id,
          stayNumber: checkedOutStay.stayNumber,
        },
      });
    }

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'stays.checked_out',
      entityType: 'Stay',
      entityId: String(checkedOutStay.id),
      metadata: {
        stayNumber: checkedOutStay.stayNumber,
        reservationId: checkedOutStay.reservationId,
        guestId: checkedOutStay.guestId,
        checkedOutAt: checkedOutAt.toISOString(),
        folioId: folio?.id ?? null,
        folioClosed: shouldCloseFolio,
        releasedAssignments: activeAssignments.map((assignment) => ({
          assignmentId: assignment.id,
          reservationRoomId: assignment.reservationRoomId,
          roomId: assignment.roomId,
        })),
      },
    });

    return this.serializeStay(checkedOutStay);
  }

  async assignRoom(
    currentUser: CurrentUserPayload,
    stayId: number,
    assignStayRoomDto: AssignStayRoomDto,
  ) {
    const stay = await this.findRequiredStay(stayId);
    this.ensureStayIsActive(stay);

    const reason = this.normalizeOptionalString(assignStayRoomDto.reason);
    const reservationRoom =
      assignStayRoomDto.reservationRoomId === undefined ||
      assignStayRoomDto.reservationRoomId === null
        ? null
        : await this.findAssignableReservationRoom(
            stay,
            assignStayRoomDto.reservationRoomId,
          );
    const room = await this.ensureRoomCanBeAssignedToStay({
      roomId: assignStayRoomDto.roomId,
      stay,
      roomTypeId: reservationRoom?.roomTypeId,
    });
    const updatedStay = await this.staysRepository.runInTransaction(
      async (client) => {
        await this.stayRoomAssignmentsRepository.createAssignment(
          {
            stayId: stay.id,
            roomId: room.id,
            reservationRoomId: reservationRoom?.id ?? null,
            assignedByUserId: currentUser.sub,
            reason,
          },
          client,
        );

        if (reservationRoom) {
          await this.reservationRoomsRepository.updateReservationRoom(
            reservationRoom.id,
            {
              status: ReservationRoomStatus.CHECKED_IN,
              roomId: room.id,
            },
            client,
          );
        }

        await this.roomsRepository.updateRoom(
          room.id,
          {
            occupancyStatus: RoomOccupancyStatus.OCCUPIED,
          },
          client,
        );
        await this.roomsRepository.createStatusLogs(
          [
            {
              roomId: room.id,
              actorUserId: currentUser.sub,
              field: 'occupancyStatus',
              oldValue: room.occupancyStatus,
              newValue: RoomOccupancyStatus.OCCUPIED,
              reason: 'Stay room assignment',
            },
          ],
          client,
        );

        const refreshedStay = await this.staysRepository.findStay(
          stay.id,
          client,
        );

        if (!refreshedStay) {
          throw new NotFoundException(
            'Stay was not found after room assignment.',
          );
        }

        return refreshedStay;
      },
    );

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'stays.room_assigned',
      entityType: 'Stay',
      entityId: String(updatedStay.id),
      metadata: {
        stayNumber: updatedStay.stayNumber,
        roomId: room.id,
        reservationRoomId: reservationRoom?.id ?? null,
        reason,
      },
    });

    return this.serializeStay(updatedStay);
  }

  async updateRoomAssignment(
    currentUser: CurrentUserPayload,
    stayId: number,
    assignmentId: number,
    updateStayRoomAssignmentDto: UpdateStayRoomAssignmentDto,
  ) {
    const stay = await this.findRequiredStay(stayId);
    this.ensureStayIsActive(stay);
    const assignment = await this.findRequiredAssignmentForStay(
      stay.id,
      assignmentId,
    );
    this.ensureAssignmentIsActive(assignment);

    if (
      updateStayRoomAssignmentDto.roomId !== undefined &&
      updateStayRoomAssignmentDto.roomId !== null &&
      updateStayRoomAssignmentDto.roomId !== assignment.roomId
    ) {
      return this.moveRoom(currentUser, stay.id, {
        fromAssignmentId: assignment.id,
        toRoomId: updateStayRoomAssignmentDto.roomId,
        reason: updateStayRoomAssignmentDto.reason,
      });
    }

    if (updateStayRoomAssignmentDto.reason === undefined) {
      return this.serializeStay(stay);
    }

    const reason = this.normalizeOptionalString(
      updateStayRoomAssignmentDto.reason,
    );
    const updatedStay = await this.staysRepository.runInTransaction(
      async (client) => {
        await this.stayRoomAssignmentsRepository.updateAssignment(
          assignment.id,
          {
            reason,
          },
          client,
        );

        const refreshedStay = await this.staysRepository.findStay(
          stay.id,
          client,
        );

        if (!refreshedStay) {
          throw new NotFoundException(
            'Stay was not found after room assignment update.',
          );
        }

        return refreshedStay;
      },
    );

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'stays.room_assignment_updated',
      entityType: 'StayRoomAssignment',
      entityId: String(assignment.id),
      metadata: {
        stayId: stay.id,
        roomId: assignment.roomId,
        reservationRoomId: assignment.reservationRoomId,
        reason,
      },
    });

    return this.serializeStay(updatedStay);
  }

  async moveRoom(
    currentUser: CurrentUserPayload,
    stayId: number,
    moveRoomDto: MoveRoomDto,
  ) {
    const stay = await this.findRequiredStay(stayId);
    this.ensureStayIsActive(stay);
    const assignment = await this.findRequiredAssignmentForStay(
      stay.id,
      moveRoomDto.fromAssignmentId,
    );
    this.ensureAssignmentIsActive(assignment);

    if (assignment.roomId === moveRoomDto.toRoomId) {
      throw new BadRequestException('Destination room must be different.');
    }

    const reason = this.normalizeOptionalString(moveRoomDto.reason);
    const requiredRoomTypeId =
      assignment.reservationRoom?.roomTypeId ?? assignment.room.roomTypeId;
    const destinationRoom = await this.ensureRoomCanBeAssignedToStay({
      roomId: moveRoomDto.toRoomId,
      stay,
      roomTypeId: requiredRoomTypeId,
    });
    const movedStay = await this.staysRepository.runInTransaction(
      async (client) => {
        await this.stayRoomAssignmentsRepository.updateAssignment(
          assignment.id,
          {
            status: StayRoomAssignmentStatus.RELEASED,
            releasedAt: new Date(),
            releasedByUserId: currentUser.sub,
            reason,
          },
          client,
        );
        await this.stayRoomAssignmentsRepository.createAssignment(
          {
            stayId: stay.id,
            roomId: destinationRoom.id,
            reservationRoomId: assignment.reservationRoomId,
            assignedByUserId: currentUser.sub,
            reason,
          },
          client,
        );

        if (assignment.reservationRoomId !== null) {
          await this.reservationRoomsRepository.updateReservationRoom(
            assignment.reservationRoomId,
            {
              status: ReservationRoomStatus.CHECKED_IN,
              roomId: destinationRoom.id,
            },
            client,
          );
        }

        await this.roomsRepository.updateRoom(
          assignment.roomId,
          {
            occupancyStatus: RoomOccupancyStatus.VACANT,
            cleaningStatus: RoomCleaningStatus.DIRTY,
          },
          client,
        );
        await this.roomsRepository.updateRoom(
          destinationRoom.id,
          {
            occupancyStatus: RoomOccupancyStatus.OCCUPIED,
          },
          client,
        );
        await this.roomsRepository.createStatusLogs(
          [
            ...this.buildCheckoutRoomStatusLogs(
              [assignment],
              currentUser.sub,
            ).map((log) => ({
              ...log,
              reason: 'Stay room move',
            })),
            {
              roomId: destinationRoom.id,
              actorUserId: currentUser.sub,
              field: 'occupancyStatus',
              oldValue: destinationRoom.occupancyStatus,
              newValue: RoomOccupancyStatus.OCCUPIED,
              reason: 'Stay room move',
            },
          ],
          client,
        );

        const refreshedStay = await this.staysRepository.findStay(
          stay.id,
          client,
        );

        if (!refreshedStay) {
          throw new NotFoundException('Stay was not found after room move.');
        }

        return refreshedStay;
      },
    );

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'stays.room_moved',
      entityType: 'Stay',
      entityId: String(movedStay.id),
      metadata: {
        stayNumber: movedStay.stayNumber,
        fromAssignmentId: assignment.id,
        fromRoomId: assignment.roomId,
        toRoomId: destinationRoom.id,
        reservationRoomId: assignment.reservationRoomId,
        reason,
      },
    });

    return this.serializeStay(movedStay);
  }

  async extendStay(
    currentUser: CurrentUserPayload,
    stayId: number,
    extendStayDto: ExtendStayDto,
  ) {
    const stay = await this.findRequiredStay(stayId);
    this.ensureStayIsActive(stay);

    const newExpectedCheckOutDate = this.parseDate(
      extendStayDto.newExpectedCheckOutDate,
    );

    if (newExpectedCheckOutDate <= stay.expectedCheckOutDate) {
      throw new BadRequestException(
        'New expected checkout date must be after the current expected checkout date.',
      );
    }

    const activeAssignments =
      await this.stayRoomAssignmentsRepository.listActiveAssignmentsForStay(
        stay.id,
      );

    if (activeAssignments.length === 0) {
      throw new ConflictException(
        'Stay has no active room assignments to extend.',
      );
    }

    await this.ensureActiveRoomsAvailableForExtension({
      stay,
      activeAssignments,
      newExpectedCheckOutDate,
    });

    const reason = this.normalizeOptionalString(extendStayDto.reason);
    const previousExpectedCheckOutDate = stay.expectedCheckOutDate;
    const extendedStay = await this.staysRepository.runInTransaction(
      async (client) => {
        await this.reservationsRepository.updateReservation(
          stay.reservationId,
          {
            checkOutDate: newExpectedCheckOutDate,
          },
          client,
        );
        await this.staysRepository.updateStay(
          stay.id,
          {
            expectedCheckOutDate: newExpectedCheckOutDate,
          },
          client,
        );

        const refreshedStay = await this.staysRepository.findStay(
          stay.id,
          client,
        );

        if (!refreshedStay) {
          throw new NotFoundException(
            'Stay was not found after stay extension.',
          );
        }

        return refreshedStay;
      },
    );

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'stays.extended',
      entityType: 'Stay',
      entityId: String(extendedStay.id),
      metadata: {
        stayNumber: extendedStay.stayNumber,
        reservationId: extendedStay.reservationId,
        guestId: extendedStay.guestId,
        previousExpectedCheckOutDate:
          previousExpectedCheckOutDate.toISOString(),
        newExpectedCheckOutDate: newExpectedCheckOutDate.toISOString(),
        activeRoomIds: activeAssignments.map((assignment) => assignment.roomId),
        reason,
      },
    });

    return this.serializeStay(extendedStay);
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

  private async findRequiredAssignmentForStay(
    stayId: number,
    assignmentId: number,
  ) {
    const assignment =
      await this.stayRoomAssignmentsRepository.findAssignment(assignmentId);

    if (!assignment || assignment.stayId !== stayId) {
      throw new NotFoundException('Stay room assignment was not found.');
    }

    return assignment;
  }

  private async findAssignableReservationRoom(
    stay: StayRecord,
    reservationRoomId: number,
  ) {
    const reservationRoom =
      await this.reservationRoomsRepository.findReservationRoom(
        reservationRoomId,
      );

    if (
      !reservationRoom ||
      reservationRoom.reservationId !== stay.reservationId
    ) {
      throw new NotFoundException('Reservation room was not found.');
    }

    if (
      reservationRoom.status === ReservationRoomStatus.CANCELLED ||
      reservationRoom.status === ReservationRoomStatus.CHECKED_OUT
    ) {
      throw new ConflictException(
        'Reservation room cannot be assigned in its current status.',
      );
    }

    const alreadyAssigned = stay.roomAssignments.some(
      (assignment) =>
        assignment.reservationRoomId === reservationRoom.id &&
        assignment.status === StayRoomAssignmentStatus.ACTIVE,
    );

    if (alreadyAssigned) {
      throw new ConflictException(
        'Reservation room already has an active stay assignment.',
      );
    }

    return reservationRoom;
  }

  private ensureStayIsActive(stay: StayRecord) {
    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictException('Only active stays can be updated.');
    }
  }

  private ensureAssignmentIsActive(assignment: StayRoomAssignmentRecord) {
    if (assignment.status !== StayRoomAssignmentStatus.ACTIVE) {
      throw new ConflictException(
        'Released room assignments cannot be updated.',
      );
    }
  }

  private async ensureCheckoutFolioIsSettled(
    currentUser: CurrentUserPayload,
    stay: StayRecord,
    folio: FolioRecord | null,
  ) {
    if (!folio || folio.status !== FolioStatus.OPEN) {
      return;
    }

    if (!folio.balanceAmount.equals(0)) {
      await this.auditLogsService.record({
        actorUserId: currentUser.sub,
        action: 'stays.checkout_blocked_unsettled_folio',
        entityType: 'Stay',
        entityId: String(stay.id),
        metadata: {
          stayNumber: stay.stayNumber,
          folioId: folio.id,
          folioNumber: folio.folioNumber,
          balanceAmount: folio.balanceAmount.toString(),
        },
      });

      throw new ConflictException(
        'Stay cannot be checked out while the open folio has a non-zero balance.',
      );
    }
  }

  private async ensureRoomCanBeAssignedToStay({
    roomId,
    stay,
    roomTypeId,
  }: {
    roomId: number;
    stay: StayRecord;
    roomTypeId?: number;
  }) {
    const room = await this.roomsRepository.findRoom(roomId);

    if (!room) {
      throw new NotFoundException('Room was not found.');
    }

    if (!room.isActive) {
      throw new BadRequestException('Cannot assign an inactive room.');
    }

    if (roomTypeId !== undefined && room.roomTypeId !== roomTypeId) {
      throw new BadRequestException(
        'Selected room does not match the required room type.',
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
          checkInDate: stay.reservation.checkInDate,
          checkOutDate: stay.expectedCheckOutDate,
          excludeReservationId: stay.reservationId,
        },
      );

    if (overlappingReservations > 0) {
      throw new ConflictException(
        'Selected room is already reserved for the stay dates.',
      );
    }

    return room;
  }

  private async ensureActiveRoomsAvailableForExtension({
    stay,
    activeAssignments,
    newExpectedCheckOutDate,
  }: {
    stay: StayRecord;
    activeAssignments: StayRoomAssignmentRecord[];
    newExpectedCheckOutDate: Date;
  }) {
    for (const assignment of activeAssignments) {
      const overlappingReservations =
        await this.reservationAvailabilityRepository.countOverlappingRoomReservations(
          {
            roomId: assignment.roomId,
            checkInDate: stay.expectedCheckOutDate,
            checkOutDate: newExpectedCheckOutDate,
            excludeReservationId: stay.reservationId,
            excludeReservationRoomId: assignment.reservationRoomId ?? undefined,
          },
        );

      if (overlappingReservations > 0) {
        throw new ConflictException(
          'An assigned room is already reserved during the extension period.',
        );
      }
    }
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

  private buildCheckoutRoomStatusLogs(
    assignments: StayRoomAssignmentRecord[],
    actorUserId: number,
  ) {
    return assignments.flatMap((assignment) => {
      const logs: {
        roomId: number;
        actorUserId: number;
        field: string;
        oldValue?: string | null;
        newValue?: string | null;
        reason?: string | null;
      }[] = [];

      if (assignment.room.occupancyStatus !== RoomOccupancyStatus.VACANT) {
        logs.push({
          roomId: assignment.roomId,
          actorUserId,
          field: 'occupancyStatus',
          oldValue: assignment.room.occupancyStatus,
          newValue: RoomOccupancyStatus.VACANT,
          reason: 'Stay checkout',
        });
      }

      if (assignment.room.cleaningStatus !== RoomCleaningStatus.DIRTY) {
        logs.push({
          roomId: assignment.roomId,
          actorUserId,
          field: 'cleaningStatus',
          oldValue: assignment.room.cleaningStatus,
          newValue: RoomCleaningStatus.DIRTY,
          reason: 'Stay checkout',
        });
      }

      return logs;
    });
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
