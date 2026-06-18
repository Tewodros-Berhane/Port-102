import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RejectPurchaseRequestDto } from './reject-purchase-request.dto';

describe('RejectPurchaseRequestDto', () => {
  it('requires a rejection reason', async () => {
    const dto = plainToInstance(RejectPurchaseRequestDto, {});

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'decisionNote')).toBe(
      true,
    );
  });
});
