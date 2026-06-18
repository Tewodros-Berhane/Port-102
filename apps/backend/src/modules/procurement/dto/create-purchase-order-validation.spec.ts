import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

describe('CreatePurchaseOrderDto', () => {
  it('requires at least one purchase order item', async () => {
    const dto = plainToInstance(CreatePurchaseOrderDto, { items: [] });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'items')).toBe(true);
  });
});
