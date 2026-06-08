import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  MenuItemStatus,
  OutletType,
  PosOrderSource,
  PosOrderStatus,
  PosPaymentMethod,
} from '../../../generated/prisma/client';
import { AddPosOrderItemDto } from './add-pos-order-item.dto';
import { CreateMenuItemDto } from './create-menu-item.dto';
import { CreateOutletDto } from './create-outlet.dto';
import { CreatePosOrderDto } from './create-pos-order.dto';
import { GetMenuItemsQueryDto } from './get-menu-items-query.dto';
import { GetOutletsQueryDto } from './get-outlets-query.dto';
import { GetPosOrdersQueryDto } from './get-pos-orders-query.dto';
import { RecordPosOrderPaymentDto } from './record-pos-order-payment.dto';
import { UpdateMenuItemDto } from './update-menu-item.dto';
import { UpdatePosOrderItemDto } from './update-pos-order-item.dto';
import { UpdatePosOrderDto } from './update-pos-order.dto';
import { VoidPosOrderItemDto } from './void-pos-order-item.dto';

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

  it('transforms a true outlet activity filter', async () => {
    const query = plainToInstance(GetOutletsQueryDto, {
      isActive: 'true',
    });

    expect(query.isActive).toBe(true);
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('transforms a false outlet activity filter', async () => {
    const query = plainToInstance(GetOutletsQueryDto, {
      isActive: 'false',
    });

    expect(query.isActive).toBe(false);
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('rejects an invalid outlet activity filter', async () => {
    const errors = await validationErrors(GetOutletsQueryDto, {
      isActive: 'yes',
    });

    expect(errors.some((error) => error.property === 'isActive')).toBe(true);
  });

  it('rejects outlet query limits above 100', async () => {
    const errors = await validationErrors(GetOutletsQueryDto, {
      limit: 101,
    });

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('accepts a valid POS order creation payload', async () => {
    await expect(
      validationErrors(CreatePosOrderDto, {
        outletId: 4,
        source: PosOrderSource.TABLE_SERVICE,
        tableNumber: 'T-12',
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects an invalid POS order outlet ID', async () => {
    const errors = await validationErrors(CreatePosOrderDto, {
      outletId: 0,
    });

    expect(errors.some((error) => error.property === 'outletId')).toBe(true);
  });

  it('rejects an unknown POS order source', async () => {
    const errors = await validationErrors(CreatePosOrderDto, {
      outletId: 4,
      source: 'PHONE',
    });

    expect(errors.some((error) => error.property === 'source')).toBe(true);
  });

  it('rejects an oversized POS table number', async () => {
    const errors = await validationErrors(CreatePosOrderDto, {
      outletId: 4,
      tableNumber: 'T'.repeat(81),
    });

    expect(errors.some((error) => error.property === 'tableNumber')).toBe(true);
  });

  it('accepts nullable POS order update metadata', async () => {
    await expect(
      validationErrors(UpdatePosOrderDto, {
        tableNumber: null,
        notes: null,
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects oversized POS order notes', async () => {
    const errors = await validationErrors(UpdatePosOrderDto, {
      notes: 'N'.repeat(501),
    });

    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });

  it('transforms POS order pagination and outlet filters', async () => {
    const query = plainToInstance(GetPosOrdersQueryDto, {
      page: '3',
      limit: '50',
      outletId: '4',
      status: PosOrderStatus.OPEN,
    });

    expect(query).toMatchObject({
      page: 3,
      limit: 50,
      outletId: 4,
      status: PosOrderStatus.OPEN,
    });
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('rejects invalid POS order date and status filters', async () => {
    const errors = await validationErrors(GetPosOrdersQueryDto, {
      createdFrom: 'not-a-date',
      status: 'PENDING',
    });

    expect(errors.some((error) => error.property === 'createdFrom')).toBe(true);
    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it('accepts a valid POS order item payload', async () => {
    await expect(
      validationErrors(AddPosOrderItemDto, {
        menuItemId: 7,
        quantity: 2,
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects invalid POS order item quantities', async () => {
    const errors = await validationErrors(AddPosOrderItemDto, {
      menuItemId: 7,
      quantity: 0,
    });

    expect(errors.some((error) => error.property === 'quantity')).toBe(true);
  });

  it('rejects an invalid POS order item menu ID', async () => {
    const errors = await validationErrors(AddPosOrderItemDto, {
      menuItemId: 0,
      quantity: 1,
    });

    expect(errors.some((error) => error.property === 'menuItemId')).toBe(true);
  });

  it('rejects oversized POS order item notes', async () => {
    const errors = await validationErrors(AddPosOrderItemDto, {
      menuItemId: 7,
      notes: 'N'.repeat(501),
    });

    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });

});
