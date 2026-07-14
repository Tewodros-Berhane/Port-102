import { NotificationsController } from './notifications.controller';
describe('NotificationsController', () => {
  it('always delegates inbox operations with current user id', async () => {
    const service = { list: jest.fn().mockResolvedValue({ data: [] }) };
    const controller = new NotificationsController(service as never);
    await controller.list({ sub: 8 } as never, {
      page: 1,
      limit: 20,
      includeArchived: false,
    });
    expect(service.list).toHaveBeenCalledWith(8, expect.any(Object));
  });
});
