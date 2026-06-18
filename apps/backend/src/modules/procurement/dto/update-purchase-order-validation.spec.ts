import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdatePurchaseOrderDto } from './update-purchase-order.dto';

describe('UpdatePurchaseOrderDto', () => {
  it('accepts an expected delivery date update', async () => {
    const dto = plainToInstance(UpdatePurchaseOrderDto, {
      expectedAt: '2026-06-25T00:00:00.000Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
