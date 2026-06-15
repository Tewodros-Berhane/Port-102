import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { StockMovementType } from '../../../generated/prisma/client';
import { GetStockBalancesQueryDto } from './get-stock-balances-query.dto';
import { GetStockMovementsQueryDto } from './get-stock-movements-query.dto';
import { ReceiveStockDto } from './receive-stock.dto';

describe('Stock operation DTO validation', () => {
  it('transforms stock balance pagination and identifiers', async () => {
    const dto = plainToInstance(GetStockBalancesQueryDto, {
      page: '2',
      limit: '25',
      itemId: '7',
      locationId: '4',
    });

    expect(dto).toMatchObject({
      page: 2,
      limit: 25,
      itemId: 7,
      locationId: 4,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

});
