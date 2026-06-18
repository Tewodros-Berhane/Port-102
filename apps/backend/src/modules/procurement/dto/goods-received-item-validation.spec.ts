import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { GoodsReceivedItemDto } from './goods-received-item.dto';

describe('GoodsReceivedItemDto', () => {
  it('rejects non-positive received quantity', async () => {
    const dto = plainToInstance(GoodsReceivedItemDto, {
      itemId: 1,
      quantity: 0,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'quantity')).toBe(true);
  });
});
