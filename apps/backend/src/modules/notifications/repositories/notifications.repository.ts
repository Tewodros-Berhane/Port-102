import { Injectable } from '@nestjs/common';
import {
  NotificationStatus,
  NotificationType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotificationInput } from '../types/create-notification.type';
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(
    userId: number,
    args: {
      skip: number;
      take: number;
      status?: NotificationStatus;
      type?: NotificationType;
      from?: Date;
      to?: Date;
      includeArchived: boolean;
    },
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(args.status
        ? { status: args.status }
        : !args.includeArchived
          ? { status: { not: NotificationStatus.ARCHIVED } }
          : {}),
      ...(args.type ? { type: args.type } : {}),
      ...(args.from || args.to
        ? { createdAt: { gte: args.from, lte: args.to } }
        : {}),
    };
    return Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip: args.skip,
        take: args.take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  }
  findOwned(id: number, userId: number) {
    return this.prisma.notification.findFirst({ where: { id, userId } });
  }
  unreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId, status: NotificationStatus.UNREAD },
    });
  }
  create(data: CreateNotificationInput) {
    return this.prisma.notification.create({ data });
  }
  createMany(data: CreateNotificationInput[]) {
    return this.prisma.notification.createMany({ data });
  }
  roleUserIds(roleKey: string) {
    return this.prisma.user.findMany({
      where: { status: 'ACTIVE', role: { key: roleKey, isActive: true } },
      select: { id: true },
    });
  }
  updateOwned(
    id: number,
    userId: number,
    data: Prisma.NotificationUpdateInput,
  ) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data });
  }
  readAll(userId: number, now: Date) {
    return this.prisma.notification.updateMany({
      where: { userId, status: NotificationStatus.UNREAD },
      data: { status: NotificationStatus.READ, readAt: now },
    });
  }
  deleteOwned(id: number, userId: number) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }
  findUnreadDuplicate(
    userId: number,
    entityType: string,
    entityId: string,
    type: NotificationType,
  ) {
    return this.prisma.notification.findFirst({
      where: {
        userId,
        entityType,
        entityId,
        type,
        status: NotificationStatus.UNREAD,
      },
    });
  }
}
