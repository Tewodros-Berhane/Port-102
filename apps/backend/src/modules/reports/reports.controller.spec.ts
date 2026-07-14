import { REQUIRED_PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  it('delegates dashboard queries to the service', () => {
    const service = { getDashboard: jest.fn().mockReturnValue({ ok: true }) };
    const controller = new ReportsController(service as never);
    const query = { from: '2026-07-01', to: '2026-07-31' };
    expect(controller.dashboard(query)).toEqual({ ok: true });
    expect(service.getDashboard).toHaveBeenCalledWith(query);
  });

  it.each([
    ['dashboard', 'reports.dashboard.read'],
    ['dailySummary', 'reports.daily_summary.read'],
    ['occupancy', 'reports.occupancy.read'],
    ['revenue', 'reports.revenue.read'],
    ['payments', 'reports.payment_summary.read'],
    ['inventory', 'reports.inventory.read'],
    ['procurement', 'reports.procurement.read'],
  ])('protects %s with %s', (method, permission) => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ReportsController.prototype[method as keyof ReportsController],
      ),
    ).toEqual([permission]);
  });
});
