import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PurchaseOrderItemDto } from './purchase-order-item.dto';

describe('PurchaseOrderItemDto', () => {
  it('rejects non-positive purchase order quantity', async () => {
    const dto = plainToInstance(PurchaseOrderItemDto, {
      itemId: 1,
      quantity: 0,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'quantity')).toBe(true);
  });
});
