import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CancelPurchaseOrderDto } from './cancel-purchase-order.dto';

describe('CancelPurchaseOrderDto', () => {
  it('requires a purchase order cancellation reason', async () => {
    const dto = plainToInstance(CancelPurchaseOrderDto, {});

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });
});
