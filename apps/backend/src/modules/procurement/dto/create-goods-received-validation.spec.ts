import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateGoodsReceivedDto } from './create-goods-received.dto';

describe('CreateGoodsReceivedDto', () => {
  it('requires a receiving location', async () => {
    const dto = plainToInstance(CreateGoodsReceivedDto, {
      items: [{ itemId: 1, quantity: 1 }],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'locationId')).toBe(true);
  });
});
