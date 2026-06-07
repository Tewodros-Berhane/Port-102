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

});
