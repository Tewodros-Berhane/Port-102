import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { GoodsReceivedStatus } from '../../../generated/prisma/client';
import { GetGoodsReceivedQueryDto } from './get-goods-received-query.dto';

describe('GetGoodsReceivedQueryDto', () => {
  it('accepts goods received location and status filters', async () => {
    const dto = plainToInstance(GetGoodsReceivedQueryDto, {
      status: GoodsReceivedStatus.DRAFT,
      locationId: '5',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.locationId).toBe(5);
  });
});
