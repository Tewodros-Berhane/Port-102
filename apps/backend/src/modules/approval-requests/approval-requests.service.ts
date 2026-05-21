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
  requestedByHotelUser: {
    id: number;
    role: {
      id: number;
      key: string;
      name: string;
    };
  } | null;
  decidedByUser: {
    id: number;
    email: string;
    fullName: string;
  } | null;
  decidedByHotelUser: {
    id: number;
    role: {
      id: number;
      key: string;
      name: string;
    };
  } | null;
};

@Injectable()
export class ApprovalRequestsService {
  constructor(
    private readonly approvalRequestsRepository: ApprovalRequestsRepository,
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
        hotelId: currentUser.hotelId,
        requestedByUserId: currentUser.sub,
        requestedByHotelUserId: currentUser.membershipId,
        type,
        title: this.normalizeRequiredString(
          createApprovalRequestDto.title,
          'Approval request title is required.',
        ),
        reason: this.normalizeOptionalString(createApprovalRequestDto.reason),
        payload: this.toInputJson(createApprovalRequestDto.payload),
      });

    return this.serializeApprovalRequest(approvalRequest);
  }

  async list(
    currentUser: CurrentUserPayload,
    query: ListApprovalRequestsQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const type = query.type
      ? this.ensureSupportedApprovalType(query.type)
      : undefined;
    const [total, approvalRequests] =
      await this.approvalRequestsRepository.listApprovalRequests({
        hotelId: currentUser.hotelId,
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

  async getById(currentUser: CurrentUserPayload, approvalRequestId: number) {
    const approvalRequest = await this.findRequiredApprovalRequest(
      currentUser.hotelId,
      approvalRequestId,
    );

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
    const approvalRequest = await this.findRequiredApprovalRequest(
      currentUser.hotelId,
      approvalRequestId,
    );
    const type = this.ensureSupportedApprovalType(approvalRequest.type);

    if (approvalRequest.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        'Only pending approval requests can be approved or rejected.',
      );
    }

    const decidedApprovalRequest =
      await this.approvalRequestsRepository.decideApprovalRequest({
        hotelId: currentUser.hotelId,
        approvalRequestId,
        requestType: type,
        status,
        decidedByUserId: currentUser.sub,
        decidedByHotelUserId: currentUser.membershipId,
        decisionNote: this.normalizeOptionalString(
          decideApprovalRequestDto.decisionNote,
        ),
        auditAction,
      });

    if (!decidedApprovalRequest) {
      throw new ConflictException(
        'Only pending approval requests can be approved or rejected.',
      );
    }

    return this.serializeApprovalRequest(decidedApprovalRequest);
  }

  private async findRequiredApprovalRequest(
    hotelId: number,
    approvalRequestId: number,
  ) {
    const approvalRequest =
      await this.approvalRequestsRepository.findApprovalRequest(
        hotelId,
        approvalRequestId,
      );

    if (!approvalRequest) {
      throw new NotFoundException(
        'Approval request was not found in this hotel.',
      );
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
        hotelUser: approvalRequest.requestedByHotelUser,
      },
      decidedBy: approvalRequest.decidedByUser
        ? {
            user: approvalRequest.decidedByUser,
            hotelUser: approvalRequest.decidedByHotelUser,
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
