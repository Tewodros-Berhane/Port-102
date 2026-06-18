import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SupplierStatus } from '../../../generated/prisma/client';
import { GetSuppliersQueryDto } from './get-suppliers-query.dto';

describe('GetSuppliersQueryDto procurement regression', () => {
  it('accepts active supplier status filters', async () => {
    const dto = plainToInstance(GetSuppliersQueryDto, {
      status: SupplierStatus.ACTIVE,
      limit: '25',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.limit).toBe(25);
  });
});
