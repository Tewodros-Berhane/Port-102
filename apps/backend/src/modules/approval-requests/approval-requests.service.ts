import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ApprovalRequestType,
  ApprovalStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { DecideApprovalRequestDto } from './dto/decide-approval-request.dto';
import { ListApprovalRequestsQueryDto } from './dto/list-approval-requests-query.dto';
import { ApprovalRequestsRepository } from './repositories/approval-requests.repository';

const TYPE_APPROVAL_PERMISSION_KEYS: Record<ApprovalRequestType, string> = {
  LARGE_DISCOUNT: 'large_discount.approve',
  REFUND: 'refund.approve',
  INVENTORY_ADJUSTMENT: 'inventory_adjustment.approve',
  PURCHASE_REQUEST: 'purchase_request.approve',
  PURCHASE_ORDER: 'purchase_order.approve',
  ROOM_OUT_OF_ORDER: 'room_out_of_order.approve',
};

type ApprovalRequestRecord = {
  id: number;
  type: ApprovalRequestType;
  status: ApprovalStatus;
  title: string;
  reason: string | null;
  payload: unknown;
  decisionNote: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requestedByUser: {
    id: number;
    email: string;
    fullName: string;
  };
  decidedByUser: {
    id: number;
    email: string;
    fullName: string;
  } | null;
};

@Injectable()
export class ApprovalRequestsService {
  constructor(
    private readonly approvalRequestsRepository: ApprovalRequestsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    currentUser: CurrentUserPayload,
    createApprovalRequestDto: CreateApprovalRequestDto,
  ) {
    const type = this.ensureSupportedApprovalType(
      createApprovalRequestDto.type,
    );
    const approvalRequest =
      await this.approvalRequestsRepository.createApprovalRequest({
        requestedByUserId: currentUser.sub,
        type,
        title: this.normalizeRequiredString(
          createApprovalRequestDto.title,
          'Approval request title is required.',
        ),
        reason: this.normalizeOptionalString(createApprovalRequestDto.reason),
        payload: this.toInputJson(createApprovalRequestDto.payload),
      });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'approval_request.created',
      entityType: 'ApprovalRequest',
      entityId: String(approvalRequest.id),
      metadata: {
        approvalRequestId: approvalRequest.id,
        type: approvalRequest.type,
        status: approvalRequest.status,
      },
    });

    return this.serializeApprovalRequest(approvalRequest);
  }

  async list(
    _currentUser: CurrentUserPayload,
    query: ListApprovalRequestsQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const type = query.type
      ? this.ensureSupportedApprovalType(query.type)
      : undefined;
    const [total, approvalRequests] =
      await this.approvalRequestsRepository.listApprovalRequests({
        skip: (page - 1) * pageSize,
        take: pageSize,
        status: query.status,
        type,
      });

    return {
      items: approvalRequests.map((approvalRequest) =>
        this.serializeApprovalRequest(approvalRequest),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, approvalRequestId: number) {
    const approvalRequest =
      await this.findRequiredApprovalRequest(approvalRequestId);

    return this.serializeApprovalRequest(approvalRequest);
  }

  approve(
    currentUser: CurrentUserPayload,
    approvalRequestId: number,
    decideApprovalRequestDto: DecideApprovalRequestDto,
  ) {
    return this.decide(
      currentUser,
      approvalRequestId,
      decideApprovalRequestDto,
      ApprovalStatus.APPROVED,
      'approval_request.approved',
    );
  }

  reject(
    currentUser: CurrentUserPayload,
    approvalRequestId: number,
    decideApprovalRequestDto: DecideApprovalRequestDto,
  ) {
    return this.decide(
      currentUser,
      approvalRequestId,
      decideApprovalRequestDto,
      ApprovalStatus.REJECTED,
      'approval_request.rejected',
    );
  }

  private async decide(
    currentUser: CurrentUserPayload,
    approvalRequestId: number,
    decideApprovalRequestDto: DecideApprovalRequestDto,
    status: typeof ApprovalStatus.APPROVED | typeof ApprovalStatus.REJECTED,
    auditAction: string,
  ) {
    const approvalRequest =
      await this.findRequiredApprovalRequest(approvalRequestId);
    const type = this.ensureSupportedApprovalType(approvalRequest.type);

    if (approvalRequest.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        'Only pending approval requests can be approved or rejected.',
      );
    }

    const decidedApprovalRequest =
      await this.approvalRequestsRepository.decideApprovalRequest({
        approvalRequestId,
        status,
        decidedByUserId: currentUser.sub,
        decisionNote: this.normalizeOptionalString(
          decideApprovalRequestDto.decisionNote,
        ),
      });

    if (!decidedApprovalRequest) {
      throw new ConflictException(
        'Only pending approval requests can be approved or rejected.',
      );
    }

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: auditAction,
      entityType: 'ApprovalRequest',
      entityId: String(approvalRequestId),
      metadata: {
        approvalRequestId,
        type,
        status,
      },
    });

    return this.serializeApprovalRequest(decidedApprovalRequest);
  }

  private async findRequiredApprovalRequest(approvalRequestId: number) {
    const approvalRequest =
      await this.approvalRequestsRepository.findApprovalRequest(
        approvalRequestId,
      );

    if (!approvalRequest) {
      throw new NotFoundException('Approval request was not found.');
    }

    return approvalRequest;
  }

  private ensureSupportedApprovalType(type: ApprovalRequestType) {
    if (!TYPE_APPROVAL_PERMISSION_KEYS[type]) {
      throw new BadRequestException('Approval request type is not supported.');
    }

    return type;
  }

  private serializeApprovalRequest(approvalRequest: ApprovalRequestRecord) {
    return {
      id: approvalRequest.id,
      type: approvalRequest.type,
      status: approvalRequest.status,
      title: approvalRequest.title,
      reason: approvalRequest.reason,
      payload: approvalRequest.payload,
      decisionNote: approvalRequest.decisionNote,
      decidedAt: approvalRequest.decidedAt,
      createdAt: approvalRequest.createdAt,
      updatedAt: approvalRequest.updatedAt,
      requestedBy: {
        user: approvalRequest.requestedByUser,
      },
      decidedBy: approvalRequest.decidedByUser
        ? {
            user: approvalRequest.decidedByUser,
          }
        : null,
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

  private toInputJson(value?: Record<string, unknown> | null) {
    return value === undefined ? undefined : (value as Prisma.InputJsonValue);
  }
}
