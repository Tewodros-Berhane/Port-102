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

  it('rejects invalid stock balance limits and identifiers', async () => {
    const dto = plainToInstance(GetStockBalancesQueryDto, {
      limit: 101,
      itemId: 0,
      locationId: -1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
    expect(errors.some((error) => error.property === 'itemId')).toBe(true);
    expect(errors.some((error) => error.property === 'locationId')).toBe(true);
  });

});
