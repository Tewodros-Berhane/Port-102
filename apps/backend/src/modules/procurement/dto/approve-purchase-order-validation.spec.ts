import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ApprovePurchaseOrderDto } from './approve-purchase-order.dto';

describe('ApprovePurchaseOrderDto', () => {
  it('accepts optional approval notes', async () => {
    const dto = plainToInstance(ApprovePurchaseOrderDto, {
      notes: 'Approved for ordering',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
