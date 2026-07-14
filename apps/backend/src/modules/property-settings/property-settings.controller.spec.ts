import { PropertySettingsController } from './property-settings.controller';
describe('PropertySettingsController', () => {
  it('delegates singleton reads and updates', async () => {
    const service = {
      get: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const controller = new PropertySettingsController(service as never);
    expect(await controller.get()).toEqual({ id: 1 });
    await controller.update({ timezone: 'Africa/Addis_Ababa' }, {
      sub: 2,
    } as never);
    expect(service.update).toHaveBeenCalledWith(
      { timezone: 'Africa/Addis_Ababa' },
      expect.objectContaining({ sub: 2 }),
    );
  });
});
