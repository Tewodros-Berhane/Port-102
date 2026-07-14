import { NotFoundException } from '@nestjs/common';
import {
  NotificationStatus,
  NotificationType,
} from '../../generated/prisma/client';
import { NotificationsService } from './notifications.service';
describe('NotificationsService', () => {
  const item = { id: 1, userId: 2, status: NotificationStatus.UNREAD };
  const repository = {
    list: jest.fn().mockResolvedValue([1, [item]]),
    unreadCount: jest.fn().mockResolvedValue(1),
    findOwned: jest.fn().mockResolvedValue(item),
    updateOwned: jest.fn(),
    readAll: jest.fn(),
    deleteOwned: jest.fn(),
    create: jest.fn().mockResolvedValue(item),
    createMany: jest.fn(),
    roleUserIds: jest.fn().mockResolvedValue([{ id: 2 }, { id: 3 }]),
    findUnreadDuplicate: jest.fn(),
  };
  const service = new NotificationsService(repository as never);
  beforeEach(() => jest.clearAllMocks());
  it('lists only through the authenticated user scope', async () => {
    await service.list(2, { page: 1, limit: 20, includeArchived: false });
    expect(repository.list).toHaveBeenCalledWith(2, expect.any(Object));
  });
  it('rejects access to another users notification', async () => {
    repository.findOwned.mockResolvedValueOnce(null);
    await expect(service.get(9, 1)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('marks read idempotently', async () => {
    await service.markRead(2, 1);
    expect(repository.updateOwned).toHaveBeenCalledWith(
      1,
      2,
      expect.objectContaining({ status: NotificationStatus.READ }),
    );
  });
  it('creates efficiently for every active user in a role', async () => {
    await service.createForRole('MANAGER', {
      type: NotificationType.APPROVAL,
      title: 'Approval',
      message: 'Review',
    });
    expect(repository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 2 }),
      expect.objectContaining({ userId: 3 }),
    ]);
  });
  it('deduplicates identical unread operational alerts', async () => {
    repository.findUnreadDuplicate.mockResolvedValueOnce(item);
    expect(
      await service.createDeduplicated({
        userId: 2,
        title: 'Low stock',
        message: 'Low',
        entityType: 'InventoryItemLocation',
        entityId: '5:8',
      }),
    ).toBe(item);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
