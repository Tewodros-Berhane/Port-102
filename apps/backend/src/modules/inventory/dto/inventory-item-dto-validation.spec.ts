import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  InventoryItemStatus,
  InventoryItemType,
} from '../../../generated/prisma/client';
import { CreateInventoryItemDto } from './create-inventory-item.dto';
import { GetInventoryItemsQueryDto } from './get-inventory-items-query.dto';
import { UpdateInventoryItemDto } from './update-inventory-item.dto';

async function validationErrors<T extends object>(
  dtoClass: new () => T,
  payload: Record<string, unknown>,
) {
  return validate(plainToInstance(dtoClass, payload));
}

describe('Inventory item DTO validation', () => {
  it('accepts a valid inventory item payload', async () => {
    await expect(
      validationErrors(CreateInventoryItemDto, {
        itemNumber: 'INV-FOOD-0001',
        name: 'Basmati Rice',
        type: InventoryItemType.FOOD,
        unitOfMeasure: 'KG',
        reorderLevel: 25,
        reorderQuantity: 100,
        averageCost: 145.5,
      }),
    ).resolves.toHaveLength(0);
  });

});
