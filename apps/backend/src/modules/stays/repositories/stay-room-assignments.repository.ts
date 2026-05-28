import { Injectable } from '@nestjs/common';

import {
  Prisma,
  StayRoomAssignmentStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const stayRoomAssignmentSelect = {
  id: true,
  stayId: true,
  roomId: true,
  reservationRoomId: true,
  status: true,
  assignedAt: true,
  releasedAt: true,
  assignedByUserId: true,
  releasedByUserId: true,
  reason: true,
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      roomTypeId: true,
      occupancyStatus: true,
      cleaningStatus: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
  reservationRoom: {
    select: {
      id: true,
      reservationId: true,
      roomTypeId: true,
      roomId: true,
      status: true,
    },
  },
  assignedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  releasedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type StayRoomAssignmentRecord = Prisma.StayRoomAssignmentGetPayload<{
  select: typeof stayRoomAssignmentSelect;
}>;

type StayRoomAssignmentClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'stayRoomAssignment'
>;

@Injectable()
export class StayRoomAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createAssignment(
    data: Prisma.StayRoomAssignmentUncheckedCreateInput,
    client: StayRoomAssignmentClient = this.prisma,
  ) {
    return client.stayRoomAssignment.create({
      data,
      select: stayRoomAssignmentSelect,
    });
  }

  findAssignment(assignmentId: number) {
    return this.prisma.stayRoomAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      select: stayRoomAssignmentSelect,
    });
  }

  listActiveAssignmentsForStay(stayId: number) {
    return this.prisma.stayRoomAssignment.findMany({
      where: {
        stayId,
        status: StayRoomAssignmentStatus.ACTIVE,
      },
      select: stayRoomAssignmentSelect,
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
    });
  }

  updateAssignment(
    assignmentId: number,
    data: Prisma.StayRoomAssignmentUncheckedUpdateInput,
    client: StayRoomAssignmentClient = this.prisma,
  ) {
    return client.stayRoomAssignment.update({
      where: {
        id: assignmentId,
      },
      data,
      select: stayRoomAssignmentSelect,
    });
  }
}
