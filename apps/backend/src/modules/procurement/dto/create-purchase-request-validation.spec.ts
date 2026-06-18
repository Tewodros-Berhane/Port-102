import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePurchaseRequestDto } from './create-purchase-request.dto';

describe('CreatePurchaseRequestDto', () => {
  it('requires at least one purchase request item', async () => {
    const dto = plainToInstance(CreatePurchaseRequestDto, { items: [] });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'items')).toBe(true);
  });
});
