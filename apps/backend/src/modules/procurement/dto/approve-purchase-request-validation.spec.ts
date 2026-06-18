import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ApprovePurchaseRequestDto } from './approve-purchase-request.dto';

describe('ApprovePurchaseRequestDto', () => {
  it('accepts an optional approval note', async () => {
    const dto = plainToInstance(ApprovePurchaseRequestDto, {
      decisionNote: 'Approved within budget',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
