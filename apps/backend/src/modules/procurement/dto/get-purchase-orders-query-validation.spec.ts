import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PurchaseOrderStatus } from '../../../generated/prisma/client';
import { GetPurchaseOrdersQueryDto } from './get-purchase-orders-query.dto';

describe('GetPurchaseOrdersQueryDto', () => {
  it('accepts purchase order status filters', async () => {
    const dto = plainToInstance(GetPurchaseOrdersQueryDto, {
      status: PurchaseOrderStatus.ORDERED,
      supplierId: '4',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.supplierId).toBe(4);
  });
});
