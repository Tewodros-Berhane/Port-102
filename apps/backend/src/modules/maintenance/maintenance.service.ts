import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
  MaintenanceTicketStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { AssignMaintenanceTicketDto } from './dto/assign-maintenance-ticket.dto';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { GetMaintenanceTicketsQueryDto } from './dto/get-maintenance-tickets-query.dto';
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
      },
    );

    return this.serializeTicket(updatedTicket);
  }

  private async ensureTicket(ticketId: number) {
    const ticket = await this.maintenanceTicketsRepository.findTicket(ticketId);

    if (!ticket) {
      throw new NotFoundException('Maintenance ticket was not found.');
    }

    return ticket;
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
