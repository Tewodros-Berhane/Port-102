import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SubmitPurchaseRequestDto } from './submit-purchase-request.dto';

describe('SubmitPurchaseRequestDto', () => {
  it('accepts an empty submit payload', async () => {
    const dto = plainToInstance(SubmitPurchaseRequestDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
