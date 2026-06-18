import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PostGoodsReceivedDto } from './post-goods-received.dto';

describe('PostGoodsReceivedDto', () => {
  it('accepts optional posting notes', async () => {
    const dto = plainToInstance(PostGoodsReceivedDto, {
      notes: 'Verified against delivery note',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
