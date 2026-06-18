import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PurchaseRequestItemDto } from './purchase-request-item.dto';

describe('PurchaseRequestItemDto', () => {
  it('rejects non-positive purchase request quantity', async () => {
    const dto = plainToInstance(PurchaseRequestItemDto, {
      itemId: 1,
      quantity: 0,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'quantity')).toBe(true);
  });
});
