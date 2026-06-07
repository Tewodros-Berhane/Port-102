import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  MenuItemStatus,
  OutletType,
  PosOrderSource,
  PosOrderStatus,
} from '../../../generated/prisma/client';
import { CreateMenuItemDto } from './create-menu-item.dto';
import { CreateOutletDto } from './create-outlet.dto';
import { CreatePosOrderDto } from './create-pos-order.dto';
import { GetMenuItemsQueryDto } from './get-menu-items-query.dto';
import { GetOutletsQueryDto } from './get-outlets-query.dto';
import { GetPosOrdersQueryDto } from './get-pos-orders-query.dto';
import { UpdateMenuItemDto } from './update-menu-item.dto';
import { UpdatePosOrderDto } from './update-pos-order.dto';

async function validationErrors<T extends object>(
  dtoClass: new () => T,
  payload: Record<string, unknown>,
) {
  return validate(plainToInstance(dtoClass, payload));
}

describe('Restaurant DTO validation', () => {
  it('accepts a valid menu item creation payload', async () => {
    await expect(
      validationErrors(CreateMenuItemDto, {
        outletId: 1,
        name: 'Special Tibs',
        code: 'TIBS-01',
        price: 450,
        status: MenuItemStatus.ACTIVE,
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects a menu item with an invalid outlet ID', async () => {
    const errors = await validationErrors(CreateMenuItemDto, {
      outletId: 0,
      name: 'Special Tibs',
      code: 'TIBS-01',
      price: 450,
    });

    expect(errors.some((error) => error.property === 'outletId')).toBe(true);
  });

  it('rejects a blank menu item name', async () => {
    const errors = await validationErrors(CreateMenuItemDto, {
      outletId: 1,
      name: '',
      code: 'TIBS-01',
      price: 450,
    });

    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });

  it('rejects a menu item code containing spaces', async () => {
    const errors = await validationErrors(CreateMenuItemDto, {
      outletId: 1,
      name: 'Special Tibs',
      code: 'TIBS 01',
      price: 450,
    });

    expect(errors.some((error) => error.property === 'code')).toBe(true);
  });

  it('rejects a non-positive menu item price', async () => {
    const errors = await validationErrors(CreateMenuItemDto, {
      outletId: 1,
      name: 'Special Tibs',
      code: 'TIBS-01',
      price: 0,
    });

    expect(errors.some((error) => error.property === 'price')).toBe(true);
  });

  it('rejects a menu item price with more than two decimal places', async () => {
    const errors = await validationErrors(CreateMenuItemDto, {
      outletId: 1,
      name: 'Special Tibs',
      code: 'TIBS-01',
      price: 450.123,
    });

    expect(errors.some((error) => error.property === 'price')).toBe(true);
  });

  it('rejects an unknown menu item status', async () => {
    const errors = await validationErrors(CreateMenuItemDto, {
      outletId: 1,
      name: 'Special Tibs',
      code: 'TIBS-01',
      price: 450,
      status: 'DISCONTINUED',
    });

    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it('accepts a partial menu item update', async () => {
    await expect(
      validationErrors(UpdateMenuItemDto, {
        price: 475,
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects an invalid outlet ID on a menu item update', async () => {
    const errors = await validationErrors(UpdateMenuItemDto, {
      outletId: -1,
    });

    expect(errors.some((error) => error.property === 'outletId')).toBe(true);
  });

  it('rejects a zero price on a menu item update', async () => {
    const errors = await validationErrors(UpdateMenuItemDto, {
      price: 0,
    });

    expect(errors.some((error) => error.property === 'price')).toBe(true);
  });

  it('transforms menu item pagination and outlet filters', async () => {
    const query = plainToInstance(GetMenuItemsQueryDto, {
      page: '2',
      limit: '25',
      outletId: '4',
    });

    expect(query).toMatchObject({ page: 2, limit: 25, outletId: 4 });
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('rejects menu item query limits above 100', async () => {
    const errors = await validationErrors(GetMenuItemsQueryDto, {
      limit: 101,
    });

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects an unknown menu item status filter', async () => {
    const errors = await validationErrors(GetMenuItemsQueryDto, {
      status: 'DISCONTINUED',
    });

    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it('accepts a valid outlet creation payload', async () => {
    await expect(
      validationErrors(CreateOutletDto, {
        name: 'Main Restaurant',
        code: 'MAIN-RESTAURANT',
        type: OutletType.RESTAURANT,
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects an outlet code containing spaces', async () => {
    const errors = await validationErrors(CreateOutletDto, {
      name: 'Main Restaurant',
      code: 'MAIN RESTAURANT',
      type: OutletType.RESTAURANT,
    });

    expect(errors.some((error) => error.property === 'code')).toBe(true);
  });

  it('rejects an unknown outlet type', async () => {
    const errors = await validationErrors(CreateOutletDto, {
      name: 'Main Restaurant',
      code: 'MAIN-RESTAURANT',
      type: 'DINING_ROOM',
    });

    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });

});
