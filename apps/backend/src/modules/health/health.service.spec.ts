import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns an ok health status', () => {
    const service = new HealthService();

    expect(service.check()).toMatchObject({
      status: 'ok',
      service: 'port-102-backend',
    });
  });
});
