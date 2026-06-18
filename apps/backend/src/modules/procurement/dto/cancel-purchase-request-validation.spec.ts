import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CancelPurchaseRequestDto } from './cancel-purchase-request.dto';

describe('CancelPurchaseRequestDto', () => {
  it('requires a cancellation reason', async () => {
    const dto = plainToInstance(CancelPurchaseRequestDto, {});

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'decisionNote')).toBe(
      true,
    );
  });
});
