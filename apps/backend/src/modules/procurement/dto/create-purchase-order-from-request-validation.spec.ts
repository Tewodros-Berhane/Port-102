import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePurchaseOrderFromRequestDto } from './create-purchase-order-from-request.dto';

describe('CreatePurchaseOrderFromRequestDto', () => {
  it('transforms supplier id from query-like input', async () => {
    const dto = plainToInstance(CreatePurchaseOrderFromRequestDto, {
      supplierId: '3',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.supplierId).toBe(3);
  });
});
