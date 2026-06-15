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

  it('accepts valid stock movement filters', async () => {
    const dto = plainToInstance(GetStockMovementsQueryDto, {
      page: '1',
      limit: '50',
      type: StockMovementType.RECEIPT,
      itemId: '7',
      locationId: '4',
      createdFrom: '2026-06-01T00:00:00.000Z',
      createdTo: '2026-06-30T23:59:59.999Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.itemId).toBe(7);
  });

  it('rejects invalid movement enums and dates', async () => {
    const dto = plainToInstance(GetStockMovementsQueryDto, {
      type: 'PURCHASE',
      createdFrom: 'not-a-date',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'type')).toBe(true);
    expect(errors.some((error) => error.property === 'createdFrom')).toBe(true);
  });

});
