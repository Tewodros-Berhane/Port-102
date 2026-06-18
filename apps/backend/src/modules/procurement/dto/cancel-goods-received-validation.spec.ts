import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CancelGoodsReceivedDto } from './cancel-goods-received.dto';

describe('CancelGoodsReceivedDto', () => {
  it('requires a goods received cancellation reason', async () => {
    const dto = plainToInstance(CancelGoodsReceivedDto, {});

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });
});
