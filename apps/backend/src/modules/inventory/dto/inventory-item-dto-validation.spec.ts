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

  it('rejects invalid item numbers and missing units of measure', async () => {
    const errors = await validationErrors(CreateInventoryItemDto, {
      itemNumber: 'INV FOOD 0001',
      name: 'Basmati Rice',
      type: InventoryItemType.FOOD,
      unitOfMeasure: '',
    });

    expect(errors.some((error) => error.property === 'itemNumber')).toBe(true);
    expect(errors.some((error) => error.property === 'unitOfMeasure')).toBe(
      true,
    );
  });

  it('rejects negative and over-precision inventory values', async () => {
    const errors = await validationErrors(CreateInventoryItemDto, {
      itemNumber: 'INV-FOOD-0001',
      name: 'Basmati Rice',
      type: InventoryItemType.FOOD,
      unitOfMeasure: 'KG',
      reorderLevel: -1,
      reorderQuantity: 10.123,
      averageCost: -5,
    });

    expect(errors.some((error) => error.property === 'reorderLevel')).toBe(
      true,
    );
    expect(errors.some((error) => error.property === 'reorderQuantity')).toBe(
      true,
    );
    expect(errors.some((error) => error.property === 'averageCost')).toBe(true);
  });

  it('accepts nullable cost and reorder fields on update', async () => {
    await expect(
      validationErrors(UpdateInventoryItemDto, {
        reorderLevel: null,
        reorderQuantity: null,
        averageCost: null,
      }),
    ).resolves.toHaveLength(0);
  });

  it('transforms and validates inventory item query filters', async () => {
    const query = plainToInstance(GetInventoryItemsQueryDto, {
      page: '2',
      limit: '25',
      status: InventoryItemStatus.ACTIVE,
      type: InventoryItemType.FOOD,
    });

    expect(query).toMatchObject({
      page: 2,
      limit: 25,
      status: InventoryItemStatus.ACTIVE,
      type: InventoryItemType.FOOD,
    });
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('rejects item query limits above 100 and unknown enums', async () => {
    const errors = await validationErrors(GetInventoryItemsQueryDto, {
      limit: 101,
      status: 'ARCHIVED',
      type: 'MEDICINE',
    });

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
    expect(errors.some((error) => error.property === 'status')).toBe(true);
    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });
});
