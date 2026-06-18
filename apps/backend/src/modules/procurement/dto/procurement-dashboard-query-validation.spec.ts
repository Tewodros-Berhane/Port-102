import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ProcurementDashboardQueryDto } from './procurement-dashboard-query.dto';

describe('ProcurementDashboardQueryDto', () => {
  it('rejects dashboard recent limits above 20', async () => {
    const dto = plainToInstance(ProcurementDashboardQueryDto, {
      recentLimit: '21',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentLimit')).toBe(true);
  });
});
