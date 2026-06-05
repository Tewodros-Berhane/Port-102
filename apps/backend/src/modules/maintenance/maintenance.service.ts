import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
  MaintenanceTicketStatus,
  Prisma,
  RoomMaintenanceStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import type { RoomRecord } from '../rooms/repositories/rooms.repository';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { AssignMaintenanceTicketDto } from './dto/assign-maintenance-ticket.dto';
import { ApproveMaintenanceTicketDto } from './dto/approve-maintenance-ticket.dto';
import { CancelMaintenanceTicketDto } from './dto/cancel-maintenance-ticket.dto';
import { ClearRoomMaintenanceDto } from './dto/clear-room-maintenance.dto';
import { CompleteMaintenanceTicketDto } from './dto/complete-maintenance-ticket.dto';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { GetMaintenanceTicketsQueryDto } from './dto/get-maintenance-tickets-query.dto';
import { MarkRoomOutOfOrderFromMaintenanceDto } from './dto/mark-room-out-of-order-from-maintenance.dto';
import { MarkRoomUnderMaintenanceDto } from './dto/mark-room-under-maintenance.dto';
import { RejectMaintenanceTicketDto } from './dto/reject-maintenance-ticket.dto';
import { StartMaintenanceTicketDto } from './dto/start-maintenance-ticket.dto';
import { UpdateMaintenanceTicketDto } from './dto/update-maintenance-ticket.dto';
import { AssetsRepository } from './repositories/assets.repository';
import {
  MaintenanceTicketRecord,
  MaintenanceTicketsRepository,
} from './repositories/maintenance-tickets.repository';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly maintenanceTicketsRepository: MaintenanceTicketsRepository,
    private readonly assetsRepository: AssetsRepository,
    private readonly roomsRepository: RoomsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createTicket(
    currentUser: CurrentUserPayload,
    createMaintenanceTicketDto: CreateMaintenanceTicketDto,
  ) {
    const room =
      createMaintenanceTicketDto.roomId === null ||
      createMaintenanceTicketDto.roomId === undefined
        ? null
        : await this.ensureActiveRoom(createMaintenanceTicketDto.roomId);
    const asset =
      createMaintenanceTicketDto.assetId === null ||
      createMaintenanceTicketDto.assetId === undefined
        ? null
        : await this.ensureActiveAsset(createMaintenanceTicketDto.assetId);
    const assignedUser =
      createMaintenanceTicketDto.assignedToUserId === null ||
      createMaintenanceTicketDto.assignedToUserId === undefined
        ? null
        : await this.ensureActiveUser(
            createMaintenanceTicketDto.assignedToUserId,
          );
    const ticketNumber = await this.generateTicketNumber();
    const ticket =
      await this.maintenanceTicketsRepository.createTicket({
        ticketNumber,
        roomId: room?.id ?? null,
        assetId: asset?.id ?? null,
        source:
          createMaintenanceTicketDto.source ?? MaintenanceTicketSource.MANUAL,
        sourceType: this.normalizeOptionalString(
          createMaintenanceTicketDto.sourceType,
        ),
        sourceId: createMaintenanceTicketDto.sourceId ?? null,
        issueType:
          createMaintenanceTicketDto.issueType ?? MaintenanceIssueType.OTHER,
        status: assignedUser
          ? MaintenanceTicketStatus.ASSIGNED
          : MaintenanceTicketStatus.OPEN,
        priority:
          createMaintenanceTicketDto.priority ?? MaintenancePriority.NORMAL,
        title: this.normalizeRequiredString(
          createMaintenanceTicketDto.title,
          'Ticket title is required.',
        ),
        description: this.normalizeOptionalString(
          createMaintenanceTicketDto.description,
        ),
        reportedByUserId: currentUser.sub,
        assignedToUserId: assignedUser?.id ?? null,
        assignedByUserId: assignedUser ? currentUser.sub : null,
        assignedAt: assignedUser ? new Date() : null,
      });

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.created',
      ticket,
      {
        ticketNumber: ticket.ticketNumber,
        roomId: ticket.roomId,
        assetId: ticket.assetId,
        source: ticket.source,
        sourceType: ticket.sourceType,
        sourceId: ticket.sourceId,
        issueType: ticket.issueType,
        priority: ticket.priority,
        status: ticket.status,
        assignedToUserId: ticket.assignedToUserId,
      },
    );

    return this.serializeTicket(ticket);
  }

  async listTickets(
    _currentUser: CurrentUserPayload,
    query: GetMaintenanceTicketsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, tickets] =
      await this.maintenanceTicketsRepository.listTickets({
        skip: (page - 1) * limit,
        take: limit,
        search: search ?? undefined,
        status: query.status,
        priority: query.priority,
        issueType: query.issueType,
        roomId: query.roomId,
        assetId: query.assetId,
        assignedToUserId: query.assignedToUserId,
        createdFrom: this.parseOptionalDate(query.createdFrom),
        createdTo: this.parseOptionalDate(query.createdTo),
      });

    return {
      items: tickets.map((ticket) => this.serializeTicket(ticket)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  listAssignedToMe(
    currentUser: CurrentUserPayload,
    query: GetMaintenanceTicketsQueryDto,
  ) {
    return this.listTickets(currentUser, {
      ...query,
      assignedToUserId: currentUser.sub,
    });
  }

  async getTicketById(_currentUser: CurrentUserPayload, ticketId: number) {
    const ticket = await this.maintenanceTicketsRepository.findTicket(ticketId);

    if (!ticket) {
      throw new NotFoundException('Maintenance ticket was not found.');
    }

    return this.serializeTicket(ticket);
  }

  async assignTicket(
    currentUser: CurrentUserPayload,
    ticketId: number,
    assignMaintenanceTicketDto: AssignMaintenanceTicketDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);
    const assignedUser = await this.ensureActiveUser(
      assignMaintenanceTicketDto.assignedToUserId,
    );

    if (
      ticket.status === MaintenanceTicketStatus.APPROVED ||
      ticket.status === MaintenanceTicketStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Approved or cancelled maintenance tickets cannot be assigned.',
      );
    }

    const updatedTicket = await this.maintenanceTicketsRepository.updateTicket(
      ticket.id,
      {
        assignedToUserId: assignedUser.id,
        assignedByUserId: currentUser.sub,
        assignedAt: new Date(),
        status:
          ticket.status === MaintenanceTicketStatus.IN_PROGRESS
            ? MaintenanceTicketStatus.IN_PROGRESS
            : MaintenanceTicketStatus.ASSIGNED,
      },
    );

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.assigned',
      updatedTicket,
      {
        previousAssignedToUserId: ticket.assignedToUserId,
        assignedToUserId: updatedTicket.assignedToUserId,
        assignedByUserId: updatedTicket.assignedByUserId,
        previousStatus: ticket.status,
        status: updatedTicket.status,
        notes: this.normalizeOptionalString(assignMaintenanceTicketDto.notes),
      },
    );

    return this.serializeTicket(updatedTicket);
  }

  async updateTicket(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    ticketId: number,
    updateMaintenanceTicketDto: UpdateMaintenanceTicketDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    this.ensureAssignedOnlyTicketAccess({
      currentUser,
      permissionKeys,
      ticket,
      fullPermission: 'maintenance.tickets.update',
      assignedPermission: 'maintenance.tickets.update.assigned',
    });

    if (
      ticket.status === MaintenanceTicketStatus.APPROVED ||
      ticket.status === MaintenanceTicketStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Approved or cancelled maintenance tickets cannot be updated.',
      );
    }

    const data: Prisma.MaintenanceTicketUncheckedUpdateInput = {};

    if (updateMaintenanceTicketDto.title !== undefined) {
      data.title = this.normalizeRequiredString(
        updateMaintenanceTicketDto.title,
        'Ticket title is required.',
      );
    }

    if (updateMaintenanceTicketDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateMaintenanceTicketDto.description,
      );
    }

    if (updateMaintenanceTicketDto.roomId !== undefined) {
      data.roomId =
        updateMaintenanceTicketDto.roomId === null
          ? null
          : (await this.ensureActiveRoom(updateMaintenanceTicketDto.roomId)).id;
    }

    if (updateMaintenanceTicketDto.assetId !== undefined) {
      data.assetId =
        updateMaintenanceTicketDto.assetId === null
          ? null
          : (await this.ensureActiveAsset(updateMaintenanceTicketDto.assetId))
              .id;
    }

    if (updateMaintenanceTicketDto.issueType !== undefined) {
      data.issueType = updateMaintenanceTicketDto.issueType;
    }

    if (updateMaintenanceTicketDto.priority !== undefined) {
      data.priority = updateMaintenanceTicketDto.priority;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No maintenance ticket changes provided.');
    }

    const updatedTicket = await this.maintenanceTicketsRepository.updateTicket(
      ticket.id,
      data,
    );

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.updated',
      updatedTicket,
      {
        ticketNumber: updatedTicket.ticketNumber,
        previous: {
          roomId: ticket.roomId,
          assetId: ticket.assetId,
          issueType: ticket.issueType,
          priority: ticket.priority,
          title: ticket.title,
          description: ticket.description,
        },
        current: {
          roomId: updatedTicket.roomId,
          assetId: updatedTicket.assetId,
          issueType: updatedTicket.issueType,
          priority: updatedTicket.priority,
          title: updatedTicket.title,
          description: updatedTicket.description,
        },
      },
    );

    return this.serializeTicket(updatedTicket);
  }

  async startTicket(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    ticketId: number,
    startMaintenanceTicketDto: StartMaintenanceTicketDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    this.ensureAssignedOnlyTicketAccess({
      currentUser,
      permissionKeys,
      ticket,
      fullPermission: 'maintenance.tickets.start',
      assignedPermission: 'maintenance.tickets.start.assigned',
    });
    this.ensureTicketCanStart(ticket);

    const startedAt = new Date();
    const notes = this.normalizeOptionalString(startMaintenanceTicketDto.notes);
    const result = await this.maintenanceTicketsRepository.runInTransaction(
      async (client) => {
        const startedTicket =
          await this.maintenanceTicketsRepository.updateTicket(
            ticket.id,
            {
              status: MaintenanceTicketStatus.IN_PROGRESS,
              startedAt,
            },
            client,
          );
        const shouldMarkRoomUnderMaintenance =
          startMaintenanceTicketDto.markRoomUnderMaintenance === true &&
          ticket.roomId !== null &&
          ticket.room?.maintenanceStatus === RoomMaintenanceStatus.AVAILABLE;

        if (shouldMarkRoomUnderMaintenance) {
          const roomId = ticket.roomId as number;

          await this.roomsRepository.updateRoom(
            roomId,
            {
              maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
            },
            client,
          );
          await this.roomsRepository.createStatusLogs(
            [
              {
                roomId,
                actorUserId: currentUser.sub,
                field: 'maintenanceStatus',
                oldValue: ticket.room?.maintenanceStatus ?? null,
                newValue: RoomMaintenanceStatus.UNDER_MAINTENANCE,
                reason: `Maintenance ticket ${ticket.ticketNumber} started.`,
              },
            ],
            client,
          );
        }

        return {
          ticket: startedTicket,
          roomMarkedUnderMaintenance: shouldMarkRoomUnderMaintenance,
        };
      },
    );

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.started',
      result.ticket,
      {
        ticketNumber: result.ticket.ticketNumber,
        previousStatus: ticket.status,
        status: result.ticket.status,
        assignedToUserId: result.ticket.assignedToUserId,
        notes,
        roomMarkedUnderMaintenance: result.roomMarkedUnderMaintenance,
      },
    );

    if (result.roomMarkedUnderMaintenance && ticket.roomId !== null) {
      await this.auditLogsService.record({
        actorUserId: currentUser.sub,
        action: 'maintenance.rooms.marked_under_maintenance',
        entityType: 'Room',
        entityId: String(ticket.roomId),
        metadata: {
          ticketId: result.ticket.id,
          ticketNumber: result.ticket.ticketNumber,
          previousMaintenanceStatus: ticket.room?.maintenanceStatus ?? null,
          maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
        },
      });
    }

    return this.serializeTicket(result.ticket);
  }

  async completeTicket(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    ticketId: number,
    completeMaintenanceTicketDto: CompleteMaintenanceTicketDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    this.ensureAssignedOnlyTicketAccess({
      currentUser,
      permissionKeys,
      ticket,
      fullPermission: 'maintenance.tickets.complete',
      assignedPermission: 'maintenance.tickets.complete.assigned',
    });
    this.ensureTicketCanComplete(ticket);

    const completionNotes = this.normalizeOptionalString(
      completeMaintenanceTicketDto.completionNotes,
    );
    const completedTicket =
      await this.maintenanceTicketsRepository.updateTicket(ticket.id, {
        status: MaintenanceTicketStatus.COMPLETED,
        completedAt: new Date(),
        completedByUserId: currentUser.sub,
        completionNotes,
      });

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.completed',
      completedTicket,
      {
        ticketNumber: completedTicket.ticketNumber,
        previousStatus: ticket.status,
        status: completedTicket.status,
        assignedToUserId: completedTicket.assignedToUserId,
        completedByUserId: completedTicket.completedByUserId,
        completionNotes,
      },
    );

    return this.serializeTicket(completedTicket);
  }

  async approveTicket(
    currentUser: CurrentUserPayload,
    ticketId: number,
    approveMaintenanceTicketDto: ApproveMaintenanceTicketDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    this.ensureTicketCanApprove(ticket);

    const approvalNotes = this.normalizeOptionalString(
      approveMaintenanceTicketDto.approvalNotes,
    );
    const result = await this.maintenanceTicketsRepository.runInTransaction(
      async (client) => {
        const approvedTicket =
          await this.maintenanceTicketsRepository.updateTicket(
            ticket.id,
            {
              status: MaintenanceTicketStatus.APPROVED,
              approvedAt: new Date(),
              approvedByUserId: currentUser.sub,
              approvalNotes,
            },
            client,
          );
        const shouldClearMaintenance =
          approveMaintenanceTicketDto.clearMaintenance === true &&
          ticket.roomId !== null &&
          (ticket.room?.maintenanceStatus ===
            RoomMaintenanceStatus.UNDER_MAINTENANCE ||
            ticket.room?.maintenanceStatus ===
              RoomMaintenanceStatus.OUT_OF_ORDER);

        if (shouldClearMaintenance) {
          const roomId = ticket.roomId as number;

          await this.roomsRepository.updateRoom(
            roomId,
            {
              maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
            },
            client,
          );
          await this.roomsRepository.createStatusLogs(
            [
              {
                roomId,
                actorUserId: currentUser.sub,
                field: 'maintenanceStatus',
                oldValue: ticket.room?.maintenanceStatus ?? null,
                newValue: RoomMaintenanceStatus.AVAILABLE,
                reason: `Maintenance ticket ${ticket.ticketNumber} approved.`,
              },
            ],
            client,
          );
        }

        return {
          ticket: approvedTicket,
          roomMaintenanceCleared: shouldClearMaintenance,
        };
      },
    );

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.approved',
      result.ticket,
      {
        ticketNumber: result.ticket.ticketNumber,
        previousStatus: ticket.status,
        status: result.ticket.status,
        approvedByUserId: result.ticket.approvedByUserId,
        approvalNotes,
        roomMaintenanceCleared: result.roomMaintenanceCleared,
      },
    );

    if (result.roomMaintenanceCleared && ticket.roomId !== null) {
      await this.auditLogsService.record({
        actorUserId: currentUser.sub,
        action: 'maintenance.rooms.maintenance_cleared',
        entityType: 'Room',
        entityId: String(ticket.roomId),
        metadata: {
          ticketId: result.ticket.id,
          ticketNumber: result.ticket.ticketNumber,
          previousMaintenanceStatus: ticket.room?.maintenanceStatus ?? null,
          maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
        },
      });
    }

    return this.serializeTicket(result.ticket);
  }

  async rejectTicket(
    currentUser: CurrentUserPayload,
    ticketId: number,
    rejectMaintenanceTicketDto: RejectMaintenanceTicketDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    this.ensureTicketCanReject(ticket);

    const rejectionReason = this.normalizeRequiredString(
      rejectMaintenanceTicketDto.rejectionReason,
      'Maintenance ticket rejection reason is required.',
    );
    const rejectedTicket = await this.maintenanceTicketsRepository.updateTicket(
      ticket.id,
      {
        status: MaintenanceTicketStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedByUserId: currentUser.sub,
        rejectionReason,
      },
    );

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.rejected',
      rejectedTicket,
      {
        ticketNumber: rejectedTicket.ticketNumber,
        previousStatus: ticket.status,
        status: rejectedTicket.status,
        rejectedByUserId: rejectedTicket.rejectedByUserId,
        rejectionReason,
        notes: this.normalizeOptionalString(rejectMaintenanceTicketDto.notes),
      },
    );

    return this.serializeTicket(rejectedTicket);
  }

  async cancelTicket(
    currentUser: CurrentUserPayload,
    ticketId: number,
    cancelMaintenanceTicketDto: CancelMaintenanceTicketDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    if (ticket.status === MaintenanceTicketStatus.CANCELLED) {
      throw new ConflictException('Maintenance ticket is already cancelled.');
    }

    if (ticket.status === MaintenanceTicketStatus.APPROVED) {
      throw new ConflictException('Approved maintenance tickets cannot be cancelled.');
    }

    const cancellationReason = this.normalizeRequiredString(
      cancelMaintenanceTicketDto.reason,
      'Maintenance ticket cancellation reason is required.',
    );
    const cancelledTicket =
      await this.maintenanceTicketsRepository.updateTicket(ticket.id, {
        status: MaintenanceTicketStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByUserId: currentUser.sub,
        cancellationReason,
      });

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.cancelled',
      cancelledTicket,
      {
        ticketNumber: cancelledTicket.ticketNumber,
        previousStatus: ticket.status,
        status: cancelledTicket.status,
        cancelledByUserId: cancelledTicket.cancelledByUserId,
        cancellationReason,
      },
    );

    return this.serializeTicket(cancelledTicket);
  }

  markRoomOutOfOrder(
    currentUser: CurrentUserPayload,
    roomId: number,
    markRoomOutOfOrderDto: MarkRoomOutOfOrderFromMaintenanceDto,
  ) {
    return this.setRoomMaintenanceStatus({
      currentUser,
      roomId,
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      reason: this.normalizeOptionalString(markRoomOutOfOrderDto.reason),
      auditAction: 'maintenance.rooms.marked_out_of_order',
    });
  }

  markRoomUnderMaintenance(
    currentUser: CurrentUserPayload,
    roomId: number,
    markRoomUnderMaintenanceDto: MarkRoomUnderMaintenanceDto,
  ) {
    return this.setRoomMaintenanceStatus({
      currentUser,
      roomId,
      maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      reason: this.normalizeOptionalString(markRoomUnderMaintenanceDto.reason),
      auditAction: 'maintenance.rooms.marked_under_maintenance',
    });
  }

  private async ensureTicket(ticketId: number) {
    const ticket = await this.maintenanceTicketsRepository.findTicket(ticketId);

    if (!ticket) {
      throw new NotFoundException('Maintenance ticket was not found.');
    }

    return ticket;
  }

  private ensureAssignedOnlyTicketAccess({
    currentUser,
    permissionKeys,
    ticket,
    fullPermission,
    assignedPermission,
  }: {
    currentUser: CurrentUserPayload;
    permissionKeys: string[];
    ticket: MaintenanceTicketRecord;
    fullPermission: string;
    assignedPermission: string;
  }) {
    if (permissionKeys.includes(fullPermission)) {
      return;
    }

    if (
      permissionKeys.includes(assignedPermission) &&
      ticket.assignedToUserId === currentUser.sub
    ) {
      return;
    }

    throw new ForbiddenException(
      'You can only work on maintenance tickets assigned to you.',
    );
  }

  private ensureTicketCanStart(ticket: MaintenanceTicketRecord) {
    if (
      ticket.status !== MaintenanceTicketStatus.OPEN &&
      ticket.status !== MaintenanceTicketStatus.ASSIGNED
    ) {
      throw new ConflictException(
        'Only open or assigned maintenance tickets can be started.',
      );
    }
  }

  private ensureTicketCanComplete(ticket: MaintenanceTicketRecord) {
    if (
      ticket.status !== MaintenanceTicketStatus.IN_PROGRESS &&
      ticket.status !== MaintenanceTicketStatus.ASSIGNED
    ) {
      throw new ConflictException(
        'Only assigned or in-progress maintenance tickets can be completed.',
      );
    }
  }

  private ensureTicketCanApprove(ticket: MaintenanceTicketRecord) {
    if (ticket.status !== MaintenanceTicketStatus.COMPLETED) {
      throw new ConflictException(
        'Only completed maintenance tickets can be approved.',
      );
    }
  }

  private ensureTicketCanReject(ticket: MaintenanceTicketRecord) {
    if (ticket.status !== MaintenanceTicketStatus.COMPLETED) {
      throw new ConflictException(
        'Only completed maintenance tickets can be rejected.',
      );
    }
  }

  private async ensureActiveRoom(roomId: number) {
    const room = await this.roomsRepository.findRoom(roomId);

    if (!room) {
      throw new NotFoundException('Room was not found.');
    }

    if (!room.isActive) {
      throw new BadRequestException('Room must be active.');
    }

    return room;
  }

  private async setRoomMaintenanceStatus({
    currentUser,
    roomId,
    maintenanceStatus,
    reason,
    auditAction,
  }: {
    currentUser: CurrentUserPayload;
    roomId: number;
    maintenanceStatus: RoomMaintenanceStatus;
    reason: string | null;
    auditAction: string;
  }) {
    const room = await this.ensureActiveRoom(roomId);

    if (room.maintenanceStatus === maintenanceStatus) {
      return this.serializeRoom(room);
    }

    const updatedRoom = await this.maintenanceTicketsRepository.runInTransaction(
      async (client) => {
        const changedRoom = await this.roomsRepository.updateRoom(
          room.id,
          {
            maintenanceStatus,
          },
          client,
        );

        await this.roomsRepository.createStatusLogs(
          [
            {
              roomId: room.id,
              actorUserId: currentUser.sub,
              field: 'maintenanceStatus',
              oldValue: room.maintenanceStatus,
              newValue: maintenanceStatus,
              reason,
            },
          ],
          client,
        );

        return changedRoom;
      },
    );

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: auditAction,
      entityType: 'Room',
      entityId: String(room.id),
      metadata: {
        roomNumber: room.roomNumber,
        previousMaintenanceStatus: room.maintenanceStatus,
        maintenanceStatus,
        reason,
      },
    });

    return this.serializeRoom(updatedRoom);
  }

  private async ensureActiveAsset(assetId: number) {
    const asset = await this.assetsRepository.findActiveAsset(assetId);

    if (!asset) {
      throw new NotFoundException('Active asset was not found.');
    }

    return asset;
  }

  private async ensureActiveUser(userId: number) {
    const user = await this.maintenanceTicketsRepository.findActiveUser(userId);

    if (!user) {
      throw new NotFoundException('Assigned user was not found.');
    }

    return user;
  }

  private async generateTicketNumber() {
    const today = new Date();
    const datePart = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const randomPart = Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, '0');
      const ticketNumber = `MNT-${datePart}-${randomPart}`;
      const existing =
        await this.maintenanceTicketsRepository.findByTicketNumber(
          ticketNumber,
        );

      if (!existing) {
        return ticketNumber;
      }
    }

    throw new BadRequestException('Unable to generate maintenance ticket.');
  }

  private recordTicketAudit(
    currentUser: CurrentUserPayload,
    action: string,
    ticket: MaintenanceTicketRecord,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'MaintenanceTicket',
      entityId: String(ticket.id),
      metadata,
    });
  }

  private serializeTicket(ticket: MaintenanceTicketRecord) {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      roomId: ticket.roomId,
      assetId: ticket.assetId,
      source: ticket.source,
      sourceType: ticket.sourceType,
      sourceId: ticket.sourceId,
      issueType: ticket.issueType,
      status: ticket.status,
      priority: ticket.priority,
      title: ticket.title,
      description: ticket.description,
      reportedByUserId: ticket.reportedByUserId,
      assignedToUserId: ticket.assignedToUserId,
      assignedByUserId: ticket.assignedByUserId,
      assignedAt: ticket.assignedAt,
      startedAt: ticket.startedAt,
      completedAt: ticket.completedAt,
      approvedAt: ticket.approvedAt,
      rejectedAt: ticket.rejectedAt,
      cancelledAt: ticket.cancelledAt,
      completedByUserId: ticket.completedByUserId,
      approvedByUserId: ticket.approvedByUserId,
      rejectedByUserId: ticket.rejectedByUserId,
      cancelledByUserId: ticket.cancelledByUserId,
      completionNotes: ticket.completionNotes,
      approvalNotes: ticket.approvalNotes,
      rejectionReason: ticket.rejectionReason,
      cancellationReason: ticket.cancellationReason,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      room: ticket.room,
      asset: ticket.asset,
      reportedBy: ticket.reportedBy,
      assignedTo: ticket.assignedTo,
      assignedBy: ticket.assignedBy,
      completedBy: ticket.completedBy,
      approvedBy: ticket.approvedBy,
      rejectedBy: ticket.rejectedBy,
      cancelledBy: ticket.cancelledBy,
    };
  }

  private serializeRoom(room: RoomRecord) {
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      displayName: room.displayName,
      floorId: room.floorId,
      roomTypeId: room.roomTypeId,
      occupancyStatus: room.occupancyStatus,
      cleaningStatus: room.cleaningStatus,
      maintenanceStatus: room.maintenanceStatus,
      notes: room.notes,
      isActive: room.isActive,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      floor: room.floor,
      roomType: room.roomType,
    };
  }

  private normalizeRequiredString(value: string, message: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private parseOptionalDate(value?: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date filter.');
    }

    return date;
  }
}
