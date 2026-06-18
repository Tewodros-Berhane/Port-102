import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MarkPurchaseOrderOrderedDto } from './mark-purchase-order-ordered.dto';

describe('MarkPurchaseOrderOrderedDto', () => {
  it('accepts an ordered timestamp', async () => {
    const dto = plainToInstance(MarkPurchaseOrderOrderedDto, {
      orderedAt: '2026-06-20T08:30:00.000Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
