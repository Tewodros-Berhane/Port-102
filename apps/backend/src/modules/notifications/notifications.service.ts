import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  NotificationStatus,
  NotificationType,
} from '../../generated/prisma/client';
import { NotificationQueryDto } from './dto/notification.dto';
import { NotificationsRepository } from './repositories/notifications.repository';
import { CreateNotificationInput } from './types/create-notification.type';
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly repository: NotificationsRepository) {}
  async list(userId: number, query: NotificationQueryDto) {
    const [total, items] = await this.repository.list(userId, {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      status: query.status,
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      includeArchived: query.includeArchived,
    });
    return {
      data: items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  unreadCount(userId: number) {
    return this.repository.unreadCount(userId).then((count) => ({ count }));
  }
  async get(userId: number, id: number) {
    const value = await this.repository.findOwned(id, userId);
    if (!value) throw new NotFoundException('Notification was not found.');
    return value;
  }
  async markRead(userId: number, id: number) {
    await this.get(userId, id);
    await this.repository.updateOwned(id, userId, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });
    return this.get(userId, id);
  }
  readAll(userId: number) {
    return this.repository.readAll(userId, new Date());
  }
  async archive(userId: number, id: number) {
    await this.get(userId, id);
    await this.repository.updateOwned(id, userId, {
      status: NotificationStatus.ARCHIVED,
      archivedAt: new Date(),
    });
    return this.get(userId, id);
  }
  async remove(userId: number, id: number) {
    await this.get(userId, id);
    await this.repository.deleteOwned(id, userId);
    return { deleted: true };
  }
  createForUser(input: CreateNotificationInput) {
    return this.repository.create(input);
  }
  async createForUsers(
    userIds: number[],
    input: Omit<CreateNotificationInput, 'userId'>,
  ) {
    return this.repository.createMany(
      [...new Set(userIds)].map((userId) => ({ ...input, userId })),
    );
  }
  async createForRole(
    roleKey: string,
    input: Omit<CreateNotificationInput, 'userId'>,
  ) {
    const users = await this.repository.roleUserIds(roleKey);
    return this.createForUsers(
      users.map(({ id }) => id),
      input,
    );
  }
  async createDeduplicated(
    input: CreateNotificationInput & { entityType: string; entityId: string },
  ) {
    const type = input.type ?? NotificationType.OPERATIONAL_ALERT;
    const existing = await this.repository.findUnreadDuplicate(
      input.userId,
      input.entityType,
      input.entityId,
      type,
    );
    return existing ?? this.createForUser({ ...input, type });
  }
  async createDeduplicatedForRole(
    roleKey: string,
    input: Omit<CreateNotificationInput, 'userId'> & {
      entityType: string;
      entityId: string;
    },
  ) {
    const users = await this.repository.roleUserIds(roleKey);
    return Promise.all(
      users.map(({ id }) => this.createDeduplicated({ ...input, userId: id })),
    );
  }
  async safelyCreate(operation: () => Promise<unknown>) {
    try {
      await operation();
    } catch (error) {
      this.logger.error(
        'Operational notification creation failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
