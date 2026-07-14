import { NotificationType, Prisma } from '../../../generated/prisma/client';
export type CreateNotificationInput = {
  userId: number;
  type?: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
};
