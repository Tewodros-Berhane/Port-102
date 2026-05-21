import { Injectable } from '@nestjs/common';

import {
  ApprovalRequestType,
  ApprovalStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const approvalRequestInclude = {
  requestedByUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  requestedByHotelUser: {
    select: {
      id: true,
      role: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
    },
  },
  decidedByUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  decidedByHotelUser: {
    select: {
      id: true,
      role: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class ApprovalRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createApprovalRequest(data: {
    hotelId: number;
    requestedByUserId: number;
    requestedByHotelUserId?: number | null;
    type: ApprovalRequestType;
    title: string;
    reason?: string | null;
    payload?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.approvalRequest.create({
      data: {
        hotelId: data.hotelId,
        requestedByUserId: data.requestedByUserId,
        requestedByHotelUserId: data.requestedByHotelUserId ?? null,
        type: data.type,
        title: data.title,
        reason: data.reason ?? null,
        ...(data.payload === undefined
          ? {}
          : { payload: data.payload ?? Prisma.JsonNull }),
      },
      include: approvalRequestInclude,
    });
  }

  listApprovalRequests({
    hotelId,
    skip,
    take,
    status,
    type,
  }: {
    hotelId: number;
    skip: number;
    take: number;
    status?: ApprovalStatus;
    type?: ApprovalRequestType;
  }) {
    const where = {
      hotelId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    return Promise.all([
      this.prisma.approvalRequest.count({ where }),
      this.prisma.approvalRequest.findMany({
        where,
        skip,
        take,
        include: approvalRequestInclude,
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      }),
    ]);
  }

  findApprovalRequest(hotelId: number, approvalRequestId: number) {
    return this.prisma.approvalRequest.findFirst({
      where: {
        id: approvalRequestId,
        hotelId,
      },
      include: approvalRequestInclude,
    });
  }

  decideApprovalRequest(data: {
    hotelId: number;
    approvalRequestId: number;
    requestType: ApprovalRequestType;
    status: typeof ApprovalStatus.APPROVED | typeof ApprovalStatus.REJECTED;
    decidedByUserId: number;
    decidedByHotelUserId?: number | null;
    decisionNote?: string | null;
    auditAction: string;
  }) {
    return this.prisma.$transaction(async (prisma) => {
      const result = await prisma.approvalRequest.updateMany({
        where: {
          id: data.approvalRequestId,
          hotelId: data.hotelId,
          status: ApprovalStatus.PENDING,
        },
        data: {
          status: data.status,
          decidedByUserId: data.decidedByUserId,
          decidedByHotelUserId: data.decidedByHotelUserId ?? null,
          decisionNote: data.decisionNote ?? null,
          decidedAt: new Date(),
        },
      });

      if (result.count === 0) {
        return null;
      }

      await prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          actorUserId: data.decidedByUserId,
          actorHotelUserId: data.decidedByHotelUserId ?? null,
          action: data.auditAction,
          entityType: 'ApprovalRequest',
          entityId: String(data.approvalRequestId),
          metadata: {
            approvalRequestId: data.approvalRequestId,
            type: data.requestType,
            status: data.status,
          },
        },
      });

      return prisma.approvalRequest.findFirst({
        where: {
          id: data.approvalRequestId,
          hotelId: data.hotelId,
        },
        include: approvalRequestInclude,
      });
    });
  }
}
