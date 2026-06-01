import { Injectable } from '@nestjs/common';

import {
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  Prisma,
  UserStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
} as const;

const taskSelect = {
  id: true,
  taskNumber: true,
  roomId: true,
  type: true,
  status: true,
  priority: true,
  assignedToUserId: true,
  assignedByUserId: true,
  startedAt: true,
  completedAt: true,
  inspectedAt: true,
  approvedAt: true,
  rejectedAt: true,
  cancelledAt: true,
  completedByUserId: true,
  inspectedByUserId: true,
  approvedByUserId: true,
  rejectedByUserId: true,
  cancelledByUserId: true,
  notes: true,
  completionNotes: true,
  inspectionNotes: true,
  rejectionReason: true,
  cancellationReason: true,
  sourceType: true,
  sourceId: true,
  createdAt: true,
  updatedAt: true,
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      floorId: true,
      roomTypeId: true,
      occupancyStatus: true,
      cleaningStatus: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
  assignedTo: {
    select: userSummarySelect,
  },
  assignedBy: {
    select: userSummarySelect,
  },
  completedBy: {
    select: userSummarySelect,
  },
  inspectedBy: {
    select: userSummarySelect,
  },
  approvedBy: {
    select: userSummarySelect,
  },
  rejectedBy: {
    select: userSummarySelect,
  },
  cancelledBy: {
    select: userSummarySelect,
  },
} as const;

const activeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
  role: {
    select: {
      id: true,
      key: true,
      systemKey: true,
      name: true,
      isActive: true,
