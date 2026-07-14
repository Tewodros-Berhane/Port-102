import { NotificationStatus } from '../../../generated/prisma/client';
import { NotificationsRepository } from './notifications.repository';
describe('NotificationsRepository', () => {
  it('scopes ownership and unread status in the database query', async () => {
    const prisma = {
      notification: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new NotificationsRepository(prisma as never);
    await repository.list(4, { skip: 0, take: 20, includeArchived: false });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 4, status: { not: NotificationStatus.ARCHIVED } },
    });
  });
});
