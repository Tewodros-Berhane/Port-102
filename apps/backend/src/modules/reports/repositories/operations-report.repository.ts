import { Injectable } from '@nestjs/common';

import {
  HousekeepingTaskStatus,
  MaintenancePriority,
  MaintenanceTicketStatus,
  PreventiveMaintenanceStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OperationsReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  listHousekeepingTasks(from: Date, to: Date) {
    return this.prisma.housekeepingTask.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        approvedAt: true,
        assignedToUserId: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
    });
  }

  listMaintenanceTickets(from: Date, to: Date) {
    return this.prisma.maintenanceTicket.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        status: true,
        priority: true,
        issueType: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        approvedAt: true,
        assignedToUserId: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
    });
  }

  countPendingHousekeepingTasks() {
    return this.prisma.housekeepingTask.count({
      where: {
        status: {
          in: [
            HousekeepingTaskStatus.PENDING,
            HousekeepingTaskStatus.ASSIGNED,
            HousekeepingTaskStatus.IN_PROGRESS,
            HousekeepingTaskStatus.INSPECTION_PENDING,
          ],
        },
      },
    });
  }

  countOpenMaintenanceTickets() {
    return this.prisma.maintenanceTicket.count({
      where: {
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
    });
  }

  countUrgentMaintenanceTickets() {
    return this.prisma.maintenanceTicket.count({
      where: {
        priority: MaintenancePriority.URGENT,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
    });
  }

  listUrgentMaintenanceTickets() {
    return this.prisma.maintenanceTicket.findMany({
      where: {
        priority: MaintenancePriority.URGENT,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        roomId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  listOverdueHousekeepingTasks(cutoff: Date) {
    return this.prisma.housekeepingTask.findMany({
      where: {
        createdAt: { lt: cutoff },
        status: {
          in: [
            HousekeepingTaskStatus.PENDING,
            HousekeepingTaskStatus.ASSIGNED,
            HousekeepingTaskStatus.IN_PROGRESS,
            HousekeepingTaskStatus.INSPECTION_PENDING,
          ],
        },
      },
      select: {
        id: true,
        taskNumber: true,
        roomId: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  countOverduePreventivePlans(now: Date) {
    return this.prisma.preventiveMaintenancePlan.count({
      where: {
        status: PreventiveMaintenanceStatus.ACTIVE,
        nextDueDate: { lt: now },
      },
    });
  }
}
