import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import {
  AssetStatus,
  HousekeepingIssueStatus,
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
  MaintenanceTicketStatus,
  PreventiveMaintenanceStatus,
  Prisma,
  NotificationType,
  RoomMaintenanceStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { HousekeepingIssuesRepository } from '../housekeeping/repositories/housekeeping-issues.repository';
import type { RoomRecord } from '../rooms/repositories/rooms.repository';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { AssignMaintenanceTicketDto } from './dto/assign-maintenance-ticket.dto';
import { ApproveMaintenanceTicketDto } from './dto/approve-maintenance-ticket.dto';
import { CancelMaintenanceTicketDto } from './dto/cancel-maintenance-ticket.dto';
import { ClearRoomMaintenanceDto } from './dto/clear-room-maintenance.dto';
import { CompleteMaintenanceTicketDto } from './dto/complete-maintenance-ticket.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { CreateMaintenanceTicketNoteDto } from './dto/create-maintenance-ticket-note.dto';
import { CreatePreventiveMaintenancePlanDto } from './dto/create-preventive-maintenance-plan.dto';
import { CreateTicketFromHousekeepingIssueDto } from './dto/create-ticket-from-housekeeping-issue.dto';
import { CreateTicketFromPreventivePlanDto } from './dto/create-ticket-from-preventive-plan.dto';
import { GetAssetsQueryDto } from './dto/get-assets-query.dto';
import { GetMaintenanceTicketsQueryDto } from './dto/get-maintenance-tickets-query.dto';
import { GetPreventiveMaintenancePlansQueryDto } from './dto/get-preventive-maintenance-plans-query.dto';
import { MarkRoomOutOfOrderFromMaintenanceDto } from './dto/mark-room-out-of-order-from-maintenance.dto';
import { MarkRoomUnderMaintenanceDto } from './dto/mark-room-under-maintenance.dto';
import { RejectMaintenanceTicketDto } from './dto/reject-maintenance-ticket.dto';
import { StartMaintenanceTicketDto } from './dto/start-maintenance-ticket.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateMaintenanceTicketDto } from './dto/update-maintenance-ticket.dto';
import { UpdatePreventiveMaintenancePlanDto } from './dto/update-preventive-maintenance-plan.dto';
import { UploadMaintenanceTicketPhotoDto } from './dto/upload-maintenance-ticket-photo.dto';
import {
  AssetRecord,
  AssetsRepository,
} from './repositories/assets.repository';
import {
  MaintenanceTicketNoteRecord,
  MaintenanceTicketNotesRepository,
} from './repositories/maintenance-ticket-notes.repository';
import {
  MaintenanceTicketPhotoRecord,
  MaintenanceTicketPhotosRepository,
} from './repositories/maintenance-ticket-photos.repository';
import {
  MaintenanceTicketRecord,
  MaintenanceTicketsRepository,
} from './repositories/maintenance-tickets.repository';
import {
  PreventiveMaintenancePlanRecord,
  PreventiveMaintenancePlansRepository,
} from './repositories/preventive-maintenance-plans.repository';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly maintenanceTicketsRepository: MaintenanceTicketsRepository,
    private readonly maintenanceTicketNotesRepository: MaintenanceTicketNotesRepository,
    private readonly maintenanceTicketPhotosRepository: MaintenanceTicketPhotosRepository,
    private readonly assetsRepository: AssetsRepository,
    private readonly preventiveMaintenancePlansRepository: PreventiveMaintenancePlansRepository,
    private readonly housekeepingIssuesRepository: HousekeepingIssuesRepository,
    private readonly roomsRepository: RoomsRepository,
    private readonly auditLogsService: AuditLogsService,
    @Optional() private readonly notificationsService?: NotificationsService,
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
    const ticket = await this.maintenanceTicketsRepository.createTicket({
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

    if (ticket.assignedToUserId)
      await this.notificationsService?.safelyCreate(() =>
        this.notificationsService!.createForUser({
          userId: ticket.assignedToUserId!,
          type: NotificationType.TASK,
          title: 'Maintenance ticket assigned',
          message: `Ticket ${ticket.ticketNumber} was assigned to you.`,
          entityType: 'MaintenanceTicket',
          entityId: String(ticket.id),
          actionUrl: `/maintenance/tickets/${ticket.id}`,
        }),
      );
    if (ticket.priority === MaintenancePriority.URGENT)
      await this.notificationsService?.safelyCreate(() =>
        this.notificationsService!.createForRole('MAINTENANCE_SUPERVISOR', {
          type: NotificationType.OPERATIONAL_ALERT,
          title: 'Urgent maintenance ticket',
          message: `${ticket.ticketNumber}: ${ticket.title}`,
          entityType: 'MaintenanceTicket',
          entityId: String(ticket.id),
          actionUrl: `/maintenance/tickets/${ticket.id}`,
        }),
      );

    return this.serializeTicket(ticket);
  }

  async getDashboard(_currentUser: CurrentUserPayload) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [
      openTickets,
      assignedTickets,
      inProgressTickets,
      completedPendingApproval,
      approvedToday,
      rejectedToday,
      urgentTickets,
      outOfOrderRooms,
      underMaintenanceRooms,
      assetsUnderMaintenance,
      overduePreventivePlans,
    ] = await Promise.all([
      this.maintenanceTicketsRepository.countTickets({
        status: MaintenanceTicketStatus.OPEN,
      }),
      this.maintenanceTicketsRepository.countTickets({
        status: MaintenanceTicketStatus.ASSIGNED,
      }),
      this.maintenanceTicketsRepository.countTickets({
        status: MaintenanceTicketStatus.IN_PROGRESS,
      }),
      this.maintenanceTicketsRepository.countTickets({
        status: MaintenanceTicketStatus.COMPLETED,
      }),
      this.maintenanceTicketsRepository.countTickets({
        status: MaintenanceTicketStatus.APPROVED,
        approvedAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      }),
      this.maintenanceTicketsRepository.countTickets({
        status: MaintenanceTicketStatus.REJECTED,
        rejectedAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      }),
      this.maintenanceTicketsRepository.countTickets({
        priority: MaintenancePriority.URGENT,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      }),
      this.roomsRepository.countRooms({
        isActive: true,
        maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      }),
      this.assetsRepository.countAssets({
        status: AssetStatus.UNDER_MAINTENANCE,
      }),
      this.preventiveMaintenancePlansRepository.countPlans({
        status: PreventiveMaintenanceStatus.ACTIVE,
        nextDueDate: {
          lt: now,
        },
      }),
    ]);

    return {
      openTickets,
      assignedTickets,
      inProgressTickets,
      completedPendingApproval,
      approvedToday,
      rejectedToday,
      urgentTickets,
      outOfOrderRooms,
      underMaintenanceRooms,
      assetsUnderMaintenance,
      overduePreventivePlans,
    };
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

    await this.notificationsService?.safelyCreate(() =>
      this.notificationsService!.createForUser({
        userId: assignedUser.id,
        type: NotificationType.TASK,
        title: 'Maintenance ticket assigned',
        message: `Ticket ${updatedTicket.ticketNumber} was assigned to you.`,
        entityType: 'MaintenanceTicket',
        entityId: String(updatedTicket.id),
        actionUrl: `/maintenance/tickets/${updatedTicket.id}`,
      }),
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
      throw new ConflictException(
        'Approved maintenance tickets cannot be cancelled.',
      );
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

  async addTicketNote(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    ticketId: number,
    createMaintenanceTicketNoteDto: CreateMaintenanceTicketNoteDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    this.ensureAssignedOnlyTicketAccess({
      currentUser,
      permissionKeys,
      ticket,
      fullPermission: 'maintenance.tickets.update',
      assignedPermission: 'maintenance.tickets.update.assigned',
    });

    const noteText = this.normalizeRequiredString(
      createMaintenanceTicketNoteDto.note,
      'Maintenance ticket note is required.',
    );
    const note = await this.maintenanceTicketNotesRepository.createNote({
      ticketId: ticket.id,
      authorUserId: currentUser.sub,
      note: noteText,
    });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'maintenance.tickets.note_added',
      entityType: 'MaintenanceTicketNote',
      entityId: String(note.id),
      metadata: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        authorUserId: note.authorUserId,
      },
    });

    return this.serializeTicketNote(note);
  }

  async addTicketPhoto(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    ticketId: number,
    uploadMaintenanceTicketPhotoDto: UploadMaintenanceTicketPhotoDto,
  ) {
    const ticket = await this.ensureTicket(ticketId);

    this.ensureAssignedOnlyTicketAccess({
      currentUser,
      permissionKeys,
      ticket,
      fullPermission: 'maintenance.tickets.update',
      assignedPermission: 'maintenance.tickets.update.assigned',
    });

    const photo = await this.maintenanceTicketPhotosRepository.createPhoto({
      ticketId: ticket.id,
      uploadedByUserId: currentUser.sub,
      url: uploadMaintenanceTicketPhotoDto.url.trim(),
      description: this.normalizeOptionalString(
        uploadMaintenanceTicketPhotoDto.description,
      ),
    });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'maintenance.tickets.photo_added',
      entityType: 'MaintenanceTicketPhoto',
      entityId: String(photo.id),
      metadata: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        uploadedByUserId: photo.uploadedByUserId,
        url: photo.url,
      },
    });

    return this.serializeTicketPhoto(photo);
  }

  async createTicketFromHousekeepingIssue(
    currentUser: CurrentUserPayload,
    issueId: number,
    createTicketDto: CreateTicketFromHousekeepingIssueDto,
  ) {
    const issue = await this.housekeepingIssuesRepository.findIssue(issueId);

    if (!issue) {
      throw new NotFoundException('Housekeeping issue was not found.');
    }

    if (issue.status !== HousekeepingIssueStatus.OPEN) {
      throw new ConflictException(
        'Only open housekeeping issues can create maintenance tickets.',
      );
    }

    await this.ensureActiveRoom(issue.roomId);

    const existingTicket =
      await this.maintenanceTicketsRepository.findActiveTicketBySource({
        sourceType: 'HOUSEKEEPING_ISSUE',
        sourceId: issue.id,
      });

    if (existingTicket) {
      throw new ConflictException(
        'An active maintenance ticket already exists for this housekeeping issue.',
      );
    }

    const assignedUser =
      createTicketDto.assignedToUserId === undefined
        ? null
        : await this.ensureActiveUser(createTicketDto.assignedToUserId);
    const ticketNumber = await this.generateTicketNumber();
    const ticket = await this.maintenanceTicketsRepository.createTicket({
      ticketNumber,
      roomId: issue.roomId,
      source: MaintenanceTicketSource.HOUSEKEEPING,
      sourceType: 'HOUSEKEEPING_ISSUE',
      sourceId: issue.id,
      issueType: createTicketDto.issueType ?? MaintenanceIssueType.OTHER,
      status: assignedUser
        ? MaintenanceTicketStatus.ASSIGNED
        : MaintenanceTicketStatus.OPEN,
      priority: createTicketDto.priority ?? MaintenancePriority.NORMAL,
      title: issue.title,
      description: issue.description,
      reportedByUserId: currentUser.sub,
      assignedToUserId: assignedUser?.id ?? null,
      assignedByUserId: assignedUser ? currentUser.sub : null,
      assignedAt: assignedUser ? new Date() : null,
    });

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.created_from_housekeeping_issue',
      ticket,
      {
        ticketNumber: ticket.ticketNumber,
        housekeepingIssueId: issue.id,
        housekeepingIssueNumber: issue.issueNumber,
        roomId: ticket.roomId,
        status: ticket.status,
        assignedToUserId: ticket.assignedToUserId,
      },
    );

    return this.serializeTicket(ticket);
  }

  async createAsset(
    currentUser: CurrentUserPayload,
    createAssetDto: CreateAssetDto,
  ) {
    const assetNumber = this.normalizeRequiredString(
      createAssetDto.assetNumber,
      'Asset number is required.',
    );
    const existingAsset =
      await this.assetsRepository.findByAssetNumber(assetNumber);

    if (existingAsset) {
      throw new ConflictException('Asset number already exists.');
    }

    const room =
      createAssetDto.roomId === null || createAssetDto.roomId === undefined
        ? null
        : await this.ensureActiveRoom(createAssetDto.roomId);
    const asset = await this.assetsRepository.createAsset({
      assetNumber,
      name: this.normalizeRequiredString(
        createAssetDto.name,
        'Asset name is required.',
      ),
      category: this.normalizeOptionalString(createAssetDto.category),
      location: this.normalizeOptionalString(createAssetDto.location),
      roomId: room?.id ?? null,
      status: createAssetDto.status ?? AssetStatus.ACTIVE,
      description: this.normalizeOptionalString(createAssetDto.description),
      purchaseDate: this.parseNullableDate(
        createAssetDto.purchaseDate,
        'purchase date',
      ),
      warrantyUntil: this.parseNullableDate(
        createAssetDto.warrantyUntil,
        'warranty date',
      ),
    });

    await this.recordAssetAudit(
      currentUser,
      'maintenance.assets.created',
      asset,
      {
        assetNumber: asset.assetNumber,
        roomId: asset.roomId,
        status: asset.status,
      },
    );

    return this.serializeAsset(asset);
  }

  async listAssets(_currentUser: CurrentUserPayload, query: GetAssetsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, assets] = await this.assetsRepository.listAssets({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      status: query.status,
      category: this.normalizeOptionalString(query.category) ?? undefined,
      roomId: query.roomId,
    });

    return {
      items: assets.map((asset) => this.serializeAsset(asset)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAssetById(_currentUser: CurrentUserPayload, assetId: number) {
    return this.serializeAsset(await this.ensureAsset(assetId));
  }

  async updateAsset(
    currentUser: CurrentUserPayload,
    assetId: number,
    updateAssetDto: UpdateAssetDto,
  ) {
    const asset = await this.ensureAsset(assetId);
    const data: Prisma.AssetUncheckedUpdateInput = {};

    if (updateAssetDto.assetNumber !== undefined) {
      const assetNumber = this.normalizeRequiredString(
        updateAssetDto.assetNumber,
        'Asset number is required.',
      );

      if (assetNumber !== asset.assetNumber) {
        const duplicate = await this.assetsRepository.findByAssetNumber(
          assetNumber,
          asset.id,
        );

        if (duplicate) {
          throw new ConflictException('Asset number already exists.');
        }
      }

      data.assetNumber = assetNumber;
    }

    if (updateAssetDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateAssetDto.name,
        'Asset name is required.',
      );
    }

    if (updateAssetDto.category !== undefined) {
      data.category = this.normalizeOptionalString(updateAssetDto.category);
    }

    if (updateAssetDto.location !== undefined) {
      data.location = this.normalizeOptionalString(updateAssetDto.location);
    }

    if (updateAssetDto.roomId !== undefined) {
      data.roomId =
        updateAssetDto.roomId === null
          ? null
          : (await this.ensureActiveRoom(updateAssetDto.roomId)).id;
    }

    if (updateAssetDto.status !== undefined) {
      if (
        updateAssetDto.status === AssetStatus.INACTIVE ||
        updateAssetDto.status === AssetStatus.RETIRED
      ) {
        await this.ensureAssetHasNoActiveTickets(asset.id);
      }

      data.status = updateAssetDto.status;
    }

    if (updateAssetDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateAssetDto.description,
      );
    }

    if (updateAssetDto.purchaseDate !== undefined) {
      data.purchaseDate = this.parseNullableDate(
        updateAssetDto.purchaseDate,
        'purchase date',
      );
    }

    if (updateAssetDto.warrantyUntil !== undefined) {
      data.warrantyUntil = this.parseNullableDate(
        updateAssetDto.warrantyUntil,
        'warranty date',
      );
    }

    if (Object.keys(data).length === 0) {
      return this.serializeAsset(asset);
    }

    const updatedAsset = await this.assetsRepository.updateAsset(
      asset.id,
      data,
    );

    await this.recordAssetAudit(
      currentUser,
      'maintenance.assets.updated',
      updatedAsset,
      {
        previous: this.assetAuditSnapshot(asset),
        current: this.assetAuditSnapshot(updatedAsset),
      },
    );

    return this.serializeAsset(updatedAsset);
  }

  async deactivateAsset(currentUser: CurrentUserPayload, assetId: number) {
    const asset = await this.ensureAsset(assetId);

    if (
      asset.status === AssetStatus.INACTIVE ||
      asset.status === AssetStatus.RETIRED
    ) {
      return this.serializeAsset(asset);
    }

    await this.ensureAssetHasNoActiveTickets(asset.id);

    const updatedAsset = await this.assetsRepository.updateAsset(asset.id, {
      status: AssetStatus.INACTIVE,
    });

    await this.recordAssetAudit(
      currentUser,
      'maintenance.assets.deactivated',
      updatedAsset,
      {
        previousStatus: asset.status,
        status: updatedAsset.status,
      },
    );

    return this.serializeAsset(updatedAsset);
  }

  async createPreventivePlan(
    currentUser: CurrentUserPayload,
    createPlanDto: CreatePreventiveMaintenancePlanDto,
  ) {
    if (
      (createPlanDto.assetId === undefined || createPlanDto.assetId === null) &&
      (createPlanDto.roomId === undefined || createPlanDto.roomId === null)
    ) {
      throw new BadRequestException(
        'Preventive maintenance plan must link to an asset, a room, or both.',
      );
    }

    const asset =
      createPlanDto.assetId === undefined || createPlanDto.assetId === null
        ? null
        : await this.ensureActiveAsset(createPlanDto.assetId);
    const room =
      createPlanDto.roomId === undefined || createPlanDto.roomId === null
        ? null
        : await this.ensureActiveRoom(createPlanDto.roomId);
    const planNumber = await this.generatePreventivePlanNumber();
    const plan = await this.preventiveMaintenancePlansRepository.createPlan({
      planNumber,
      assetId: asset?.id ?? null,
      roomId: room?.id ?? null,
      title: this.normalizeRequiredString(
        createPlanDto.title,
        'Preventive maintenance plan title is required.',
      ),
      description: this.normalizeOptionalString(createPlanDto.description),
      status: PreventiveMaintenanceStatus.ACTIVE,
      intervalDays: createPlanDto.intervalDays,
      nextDueDate: this.parseRequiredDate(
        createPlanDto.nextDueDate,
        'next due date',
      ),
      createdByUserId: currentUser.sub,
    });

    await this.recordPreventivePlanAudit(
      currentUser,
      'maintenance.preventive_plans.created',
      plan,
      {
        planNumber: plan.planNumber,
        assetId: plan.assetId,
        roomId: plan.roomId,
        intervalDays: plan.intervalDays,
        nextDueDate: plan.nextDueDate.toISOString(),
      },
    );

    return this.serializePreventivePlan(plan);
  }

  async listPreventivePlans(
    _currentUser: CurrentUserPayload,
    query: GetPreventiveMaintenancePlansQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, plans] =
      await this.preventiveMaintenancePlansRepository.listPlans({
        skip: (page - 1) * limit,
        take: limit,
        search: this.normalizeOptionalString(query.search) ?? undefined,
        status: query.status,
        assetId: query.assetId,
        roomId: query.roomId,
        dueFrom: this.parseOptionalDate(query.dueFrom),
        dueTo: this.parseOptionalDate(query.dueTo),
      });

    return {
      items: plans.map((plan) => this.serializePreventivePlan(plan)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPreventivePlanById(
    _currentUser: CurrentUserPayload,
    planId: number,
  ) {
    return this.serializePreventivePlan(
      await this.ensurePreventivePlan(planId),
    );
  }

  async updatePreventivePlan(
    currentUser: CurrentUserPayload,
    planId: number,
    updatePlanDto: UpdatePreventiveMaintenancePlanDto,
  ) {
    const plan = await this.ensurePreventivePlan(planId);
    const data: Prisma.PreventiveMaintenancePlanUncheckedUpdateInput = {};

    if (updatePlanDto.title !== undefined) {
      data.title = this.normalizeRequiredString(
        updatePlanDto.title,
        'Preventive maintenance plan title is required.',
      );
    }

    if (updatePlanDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updatePlanDto.description,
      );
    }

    if (updatePlanDto.assetId !== undefined) {
      data.assetId =
        updatePlanDto.assetId === null
          ? null
          : (await this.ensureActiveAsset(updatePlanDto.assetId)).id;
    }

    if (updatePlanDto.roomId !== undefined) {
      data.roomId =
        updatePlanDto.roomId === null
          ? null
          : (await this.ensureActiveRoom(updatePlanDto.roomId)).id;
    }

    const resultingAssetId =
      updatePlanDto.assetId === undefined
        ? plan.assetId
        : updatePlanDto.assetId;
    const resultingRoomId =
      updatePlanDto.roomId === undefined ? plan.roomId : updatePlanDto.roomId;

    if (resultingAssetId === null && resultingRoomId === null) {
      throw new BadRequestException(
        'Preventive maintenance plan must link to an asset, a room, or both.',
      );
    }

    if (updatePlanDto.intervalDays !== undefined) {
      data.intervalDays = updatePlanDto.intervalDays;
    }

    if (updatePlanDto.nextDueDate !== undefined) {
      data.nextDueDate = this.parseRequiredDate(
        updatePlanDto.nextDueDate,
        'next due date',
      );
    }

    if (updatePlanDto.status !== undefined) {
      data.status = updatePlanDto.status;
    }

    if (Object.keys(data).length === 0) {
      return this.serializePreventivePlan(plan);
    }

    const updatedPlan =
      await this.preventiveMaintenancePlansRepository.updatePlan(plan.id, data);

    await this.recordPreventivePlanAudit(
      currentUser,
      'maintenance.preventive_plans.updated',
      updatedPlan,
      {
        previous: this.preventivePlanAuditSnapshot(plan),
        current: this.preventivePlanAuditSnapshot(updatedPlan),
      },
    );

    return this.serializePreventivePlan(updatedPlan);
  }

  async deletePreventivePlan(currentUser: CurrentUserPayload, planId: number) {
    const plan = await this.ensurePreventivePlan(planId);

    if (plan.status === PreventiveMaintenanceStatus.CANCELLED) {
      return this.serializePreventivePlan(plan);
    }

    const updatedPlan =
      await this.preventiveMaintenancePlansRepository.updatePlan(plan.id, {
        status: PreventiveMaintenanceStatus.CANCELLED,
      });

    await this.recordPreventivePlanAudit(
      currentUser,
      'maintenance.preventive_plans.deleted',
      updatedPlan,
      {
        previousStatus: plan.status,
        status: updatedPlan.status,
      },
    );

    return this.serializePreventivePlan(updatedPlan);
  }

  async createTicketFromPreventivePlan(
    currentUser: CurrentUserPayload,
    planId: number,
    createTicketDto: CreateTicketFromPreventivePlanDto,
  ) {
    const plan = await this.ensurePreventivePlan(planId);

    if (plan.status !== PreventiveMaintenanceStatus.ACTIVE) {
      throw new ConflictException(
        'Only active preventive maintenance plans can create tickets.',
      );
    }

    const existingTicket =
      await this.maintenanceTicketsRepository.findActiveTicketBySource({
        sourceType: 'PREVENTIVE_PLAN',
        sourceId: plan.id,
      });

    if (existingTicket) {
      throw new ConflictException(
        'An active maintenance ticket already exists for this preventive plan.',
      );
    }

    const assignedUser =
      createTicketDto.assignedToUserId === undefined
        ? null
        : await this.ensureActiveUser(createTicketDto.assignedToUserId);
    const ticketNumber = await this.generateTicketNumber();
    const nextDueDate = new Date(plan.nextDueDate);
    nextDueDate.setUTCDate(nextDueDate.getUTCDate() + plan.intervalDays);

    const { ticket, updatedPlan } =
      await this.maintenanceTicketsRepository.runInTransaction(async (tx) => {
        const createdTicket =
          await this.maintenanceTicketsRepository.createTicket(
            {
              ticketNumber,
              roomId: plan.roomId,
              assetId: plan.assetId,
              source: MaintenanceTicketSource.PREVENTIVE,
              sourceType: 'PREVENTIVE_PLAN',
              sourceId: plan.id,
              issueType:
                createTicketDto.issueType ?? MaintenanceIssueType.OTHER,
              status: assignedUser
                ? MaintenanceTicketStatus.ASSIGNED
                : MaintenanceTicketStatus.OPEN,
              priority: createTicketDto.priority ?? MaintenancePriority.NORMAL,
              title: plan.title,
              description: plan.description,
              reportedByUserId: currentUser.sub,
              assignedToUserId: assignedUser?.id ?? null,
              assignedByUserId: assignedUser ? currentUser.sub : null,
              assignedAt: assignedUser ? new Date() : null,
            },
            tx,
          );
        const advancedPlan =
          await this.preventiveMaintenancePlansRepository.updatePlan(
            plan.id,
            {
              nextDueDate,
            },
            tx,
          );

        return {
          ticket: createdTicket,
          updatedPlan: advancedPlan,
        };
      });

    await this.recordTicketAudit(
      currentUser,
      'maintenance.tickets.created_from_preventive_plan',
      ticket,
      {
        ticketNumber: ticket.ticketNumber,
        preventivePlanId: plan.id,
        preventivePlanNumber: plan.planNumber,
        nextDueDate: updatedPlan.nextDueDate.toISOString(),
      },
    );
    await this.recordPreventivePlanAudit(
      currentUser,
      'maintenance.preventive_plans.ticket_created',
      updatedPlan,
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        previousNextDueDate: plan.nextDueDate.toISOString(),
        nextDueDate: updatedPlan.nextDueDate.toISOString(),
      },
    );

    return {
      ticket: this.serializeTicket(ticket),
      preventivePlan: this.serializePreventivePlan(updatedPlan),
    };
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

  clearRoomMaintenance(
    currentUser: CurrentUserPayload,
    roomId: number,
    clearRoomMaintenanceDto: ClearRoomMaintenanceDto,
  ) {
    return this.setRoomMaintenanceStatus({
      currentUser,
      roomId,
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      reason: this.normalizeOptionalString(clearRoomMaintenanceDto.reason),
      auditAction: 'maintenance.rooms.maintenance_cleared',
    });
  }

  private async ensureTicket(ticketId: number) {
    const ticket = await this.maintenanceTicketsRepository.findTicket(ticketId);

    if (!ticket) {
      throw new NotFoundException('Maintenance ticket was not found.');
    }

    return ticket;
  }

  private async ensureAsset(assetId: number) {
    const asset = await this.assetsRepository.findAsset(assetId);

    if (!asset) {
      throw new NotFoundException('Asset was not found.');
    }

    return asset;
  }

  private async ensurePreventivePlan(planId: number) {
    const plan =
      await this.preventiveMaintenancePlansRepository.findPlan(planId);

    if (!plan) {
      throw new NotFoundException('Preventive maintenance plan was not found.');
    }

    return plan;
  }

  private async ensureAssetHasNoActiveTickets(assetId: number) {
    const activeTicketCount =
      await this.assetsRepository.countActiveTickets(assetId);

    if (activeTicketCount > 0) {
      throw new ConflictException(
        'Asset cannot be deactivated or retired while it has active maintenance tickets.',
      );
    }
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

    const updatedRoom =
      await this.maintenanceTicketsRepository.runInTransaction(
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

  private async generatePreventivePlanNumber() {
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
      const planNumber = `PMP-${datePart}-${randomPart}`;
      const existing =
        await this.preventiveMaintenancePlansRepository.findByPlanNumber(
          planNumber,
        );

      if (!existing) {
        return planNumber;
      }
    }

    throw new BadRequestException(
      'Unable to generate preventive maintenance plan.',
    );
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

  private recordAssetAudit(
    currentUser: CurrentUserPayload,
    action: string,
    asset: AssetRecord,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Asset',
      entityId: String(asset.id),
      metadata,
    });
  }

  private recordPreventivePlanAudit(
    currentUser: CurrentUserPayload,
    action: string,
    plan: PreventiveMaintenancePlanRecord,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'PreventiveMaintenancePlan',
      entityId: String(plan.id),
      metadata,
    });
  }

  private assetAuditSnapshot(asset: AssetRecord): Prisma.InputJsonObject {
    return {
      assetNumber: asset.assetNumber,
      name: asset.name,
      category: asset.category,
      location: asset.location,
      roomId: asset.roomId,
      status: asset.status,
      description: asset.description,
      purchaseDate: asset.purchaseDate?.toISOString() ?? null,
      warrantyUntil: asset.warrantyUntil?.toISOString() ?? null,
    };
  }

  private serializeAsset(asset: AssetRecord) {
    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      category: asset.category,
      location: asset.location,
      roomId: asset.roomId,
      status: asset.status,
      description: asset.description,
      purchaseDate: asset.purchaseDate,
      warrantyUntil: asset.warrantyUntil,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      room: asset.room,
    };
  }

  private preventivePlanAuditSnapshot(
    plan: PreventiveMaintenancePlanRecord,
  ): Prisma.InputJsonObject {
    return {
      planNumber: plan.planNumber,
      assetId: plan.assetId,
      roomId: plan.roomId,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      intervalDays: plan.intervalDays,
      nextDueDate: plan.nextDueDate.toISOString(),
      lastCompletedAt: plan.lastCompletedAt?.toISOString() ?? null,
    };
  }

  private serializePreventivePlan(plan: PreventiveMaintenancePlanRecord) {
    return {
      id: plan.id,
      planNumber: plan.planNumber,
      assetId: plan.assetId,
      roomId: plan.roomId,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      intervalDays: plan.intervalDays,
      nextDueDate: plan.nextDueDate,
      lastCompletedAt: plan.lastCompletedAt,
      createdByUserId: plan.createdByUserId,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      asset: plan.asset,
      room: plan.room,
      createdBy: plan.createdBy,
    };
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
      notes: ticket.notes.map((note) => this.serializeTicketNote(note)),
      photos: ticket.photos.map((photo) => this.serializeTicketPhoto(photo)),
    };
  }

  private serializeTicketNote(note: MaintenanceTicketNoteRecord) {
    return {
      id: note.id,
      ticketId: note.ticketId,
      authorUserId: note.authorUserId,
      note: note.note,
      createdAt: note.createdAt,
      author: note.author,
    };
  }

  private serializeTicketPhoto(photo: MaintenanceTicketPhotoRecord) {
    return {
      id: photo.id,
      ticketId: photo.ticketId,
      uploadedByUserId: photo.uploadedByUserId,
      url: photo.url,
      description: photo.description,
      createdAt: photo.createdAt,
      uploadedBy: photo.uploadedBy,
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

  private parseNullableDate(value: string | null | undefined, label: string) {
    if (value === null || value === undefined) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label}.`);
    }

    return date;
  }

  private parseRequiredDate(value: string, label: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label}.`);
    }

    return date;
  }
}
