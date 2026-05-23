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
  decidedByUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

@Injectable()
export class ApprovalRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createApprovalRequest(data: {
    requestedByUserId: number;
    type: ApprovalRequestType;
    title: string;
    reason?: string | null;
    payload?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.approvalRequest.create({
      data: {
        requestedByUserId: data.requestedByUserId,
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
    skip,
    take,
    status,
    type,
  }: {
    skip: number;
    take: number;
    status?: ApprovalStatus;
    type?: ApprovalRequestType;
  }) {
    const where = {
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

  findApprovalRequest(approvalRequestId: number) {
    return this.prisma.approvalRequest.findUnique({
      where: {
        id: approvalRequestId,
      },
      include: approvalRequestInclude,
    });
  }

  decideApprovalRequest(data: {
    approvalRequestId: number;
    status: typeof ApprovalStatus.APPROVED | typeof ApprovalStatus.REJECTED;
    decidedByUserId: number;
    decisionNote?: string | null;
  }) {
    return this.prisma.$transaction(async (prisma) => {
      const result = await prisma.approvalRequest.updateMany({
        where: {
          id: data.approvalRequestId,
          status: ApprovalStatus.PENDING,
        },
        data: {
          status: data.status,
          decidedByUserId: data.decidedByUserId,
          decisionNote: data.decisionNote ?? null,
          decidedAt: new Date(),
        },
      });

      if (result.count === 0) {
        return null;
      }

      return prisma.approvalRequest.findUnique({
        where: {
          id: data.approvalRequestId,
        },
        include: approvalRequestInclude,
      });
    });
  }
}
