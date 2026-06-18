import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PurchaseRequestStatus } from '../../../generated/prisma/client';
import { GetPurchaseRequestsQueryDto } from './get-purchase-requests-query.dto';

describe('GetPurchaseRequestsQueryDto', () => {
  it('transforms purchase request pagination filters', async () => {
    const dto = plainToInstance(GetPurchaseRequestsQueryDto, {
      page: '2',
      limit: '10',
      status: PurchaseRequestStatus.SUBMITTED,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 2, limit: 10 });
  });
});
