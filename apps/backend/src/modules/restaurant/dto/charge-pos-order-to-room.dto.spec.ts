import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ChargePosOrderToRoomDto } from './charge-pos-order-to-room.dto';

describe('ChargePosOrderToRoomDto', () => {
  it('accepts a valid stay and defaults closeOrder to true', async () => {
    const dto = plainToInstance(ChargePosOrderToRoomDto, { stayId: '42' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toEqual({ stayId: 42, closeOrder: true });
  });

  it('rejects invalid stay identifiers', async () => {
    const dto = plainToInstance(ChargePosOrderToRoomDto, { stayId: 0 });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
