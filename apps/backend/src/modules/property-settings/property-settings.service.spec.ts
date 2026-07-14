import { PropertySettingsService } from './property-settings.service';
describe('PropertySettingsService', () => {
  const settings = {
    id: 1,
    name: 'Port-102',
    code: 'P102',
    timezone: 'America/New_York',
    defaultCurrency: 'ETB',
    locale: 'en-ET',
    defaultTaxRate: null,
    defaultServiceChargeRate: null,
  };
  const repository = {
    find: jest.fn().mockResolvedValue(settings),
    initialize: jest.fn(),
    update: jest.fn().mockResolvedValue(settings),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new PropertySettingsService(
    repository as never,
    audit as never,
  );
  beforeEach(() => jest.clearAllMocks());
  it('returns the singleton record', async () =>
    expect(await service.get()).toBe(settings));
  it('initializes defaults when missing', async () => {
    repository.find.mockResolvedValueOnce(null);
    repository.initialize.mockResolvedValueOnce(settings);
    expect(await service.get()).toBe(settings);
  });
  it('audits updates with before and after settings', async () => {
    await service.update({ timezone: 'Africa/Addis_Ababa' }, {
      sub: 1,
    } as never);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROPERTY_SETTINGS_UPDATED',
        actorUserId: 1,
      }),
    );
  });
  it('uses DST-safe IANA day boundaries', async () => {
    const bounds = await service.getPropertyDayBounds('2026-03-08');
    expect(
      (bounds.to.getTime() - bounds.from.getTime()) / 3_600_000,
    ).toBeCloseTo(23, 1);
  });
});
