import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdatePurchaseRequestDto } from './update-purchase-request.dto';

describe('UpdatePurchaseRequestDto', () => {
  it('accepts a notes-only purchase request update', async () => {
    const dto = plainToInstance(UpdatePurchaseRequestDto, {
      notes: 'Change delivery priority',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
